#!/usr/bin/env node
/**
 * Regression guard for the Supabase auth deadlock.
 *
 * Background
 * ----------
 * supabase-js emits auth state events from inside its own auth lock. Every
 * PostgREST request begins by calling auth.getSession() to obtain a token,
 * which needs that same lock. So `await`ing any Supabase call inside an
 * onAuthStateChange callback is a circular wait: the callback waits on the
 * query, the query waits on the lock, and the lock is held by the emitter
 * waiting on the callback. The whole client hangs for the life of the tab —
 * no products, no categories, no login — until a full page reload.
 *
 * It only fires when a stored token is expired at boot (or on the periodic
 * auto-refresh), which is why it presented as "only some devices, and only
 * until you refresh".
 *
 * This script checks two things:
 *   1. BEHAVIOUR  — proves the deadlock is real against the installed library,
 *                   and that the deferred pattern avoids it.
 *   2. SOURCE     — fails if anyone reintroduces an awaited Supabase call
 *                   inside an onAuthStateChange callback.
 *
 * Run: npm run check:auth-deadlock
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QUERY_TIMEOUT_MS = 4000;

let failures = 0;
const fail = (msg) => { console.error(`  FAIL  ${msg}`); failures += 1; };
const pass = (msg) => console.log(`  ok    ${msg}`);

// ---------------------------------------------------------------------------
// 1. Behavioural proof
// ---------------------------------------------------------------------------

const { createClient } = require(path.join(ROOT, 'node_modules/@supabase/supabase-js'));

const STORAGE_KEY = 'deadlock-check-auth';

const user = {
  id: 'user-123',
  email: 'admin@example.com',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: new Date(0).toISOString(),
};

// Already expired, so _recoverAndRefresh() must refresh it on boot and emit
// TOKEN_REFRESHED from inside the auth lock.
const expiredSession = {
  access_token: 'expired-token',
  refresh_token: 'refresh-me',
  expires_at: Math.floor(Date.now() / 1000) - 3600,
  expires_in: -3600,
  token_type: 'bearer',
  user,
};

const stubFetch = (url) => {
  const body = String(url).includes('/auth/v1/token')
    ? {
        access_token: 'fresh-token',
        refresh_token: 'refresh-again',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user,
      }
    : [{ id: user.id, email: user.email }];

  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
};

const makeClient = () => {
  const store = new Map([[STORAGE_KEY, JSON.stringify(expiredSession)]]);
  return createClient('https://example.supabase.co', 'anon-key', {
    auth: {
      storageKey: STORAGE_KEY,
      storage: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, v),
        removeItem: (k) => store.delete(k),
      },
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: { fetch: stubFetch },
  });
};

/** Resolves true if an ordinary data query completes, false if it hangs. */
const ordinaryQueryCompletes = async (registerCallback) => {
  const supabase = makeClient();

  registerCallback(supabase, async () => {
    await supabase.from('admin_users').select('id, email').eq('id', user.id);
  });

  return Promise.race([
    supabase.from('products').select('id').limit(1).then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), QUERY_TIMEOUT_MS)),
  ]);
};

async function behaviouralChecks() {
  console.log('\nBehaviour (against the installed @supabase/supabase-js):');

  // The broken pattern must still deadlock — if this stops reproducing, the
  // library changed and this guard needs revisiting rather than deleting.
  const brokenCompleted = await ordinaryQueryCompletes((supabase, work) => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'TOKEN_REFRESHED') await work();
    });
  });

  if (brokenCompleted) {
    console.log('  note  awaiting Supabase inside the callback no longer deadlocks');
    console.log('        (library behaviour changed — re-check before relaxing the source rule)');
  } else {
    pass('awaiting Supabase inside onAuthStateChange still deadlocks (as expected)');
  }

  const deferredCompleted = await ordinaryQueryCompletes((supabase, work) => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') setTimeout(work, 0);
    });
  });

  if (deferredCompleted) {
    pass('deferring the Supabase call keeps the client responsive');
  } else {
    fail('the deferred pattern did NOT complete — data loading is broken');
  }
}

// ---------------------------------------------------------------------------
// 2. Source guard
// ---------------------------------------------------------------------------

const collectSourceFiles = (dir, acc = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
};

/**
 * Removes `setTimeout(...)` regions from a callback body.
 *
 * Deferring to a fresh task is precisely the sanctioned fix, so awaits that
 * live inside a setTimeout are correct and must not be reported. Everything
 * left after this strip runs synchronously within the auth lock.
 */
const stripDeferredBlocks = (code) => {
  let result = code;
  let marker = result.indexOf('setTimeout(');

  while (marker !== -1) {
    let depth = 0;
    let end = -1;

    for (let i = marker + 'setTimeout'.length; i < result.length; i += 1) {
      const char = result[i];
      if (char === '(') depth += 1;
      else if (char === ')') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }

    if (end === -1) break;

    result = result.slice(0, marker) + result.slice(end + 1);
    marker = result.indexOf('setTimeout(', marker);
  }

  return result;
};

/** Returns the block starting at the first `{` at or after `from`. */
const readBlockAt = (source, from) => {
  let depth = 0;
  let start = -1;

  for (let i = from; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) return source.slice(start, i + 1);
    }
  }

  return null;
};

/**
 * Extracts the body of each onAuthStateChange(...) callback.
 *
 * Handles both an inline function literal and a named handler passed by
 * reference — the latter is how the bug originally hid from a naive scan:
 * `onAuthStateChange(handleAuthStateChange)` looks clean at the call site
 * while the awaited query sits in the handler's own declaration.
 */
const extractCallbackBodies = (source) => {
  const bodies = [];
  const marker = 'onAuthStateChange(';
  let index = source.indexOf(marker);

  while (index !== -1) {
    const after = source.slice(index + marker.length);

    // Passed by reference: onAuthStateChange(someHandler)
    const byReference = after.match(/^\s*([A-Za-z_$][\w$]*)\s*\)/);

    if (byReference) {
      const name = byReference[1];
      const declaration = new RegExp(
        `(?:const|let|var|function)\\s+${name}\\b`
      ).exec(source);

      if (declaration) {
        const body = readBlockAt(source, declaration.index);
        if (body) bodies.push(body);
      } else {
        // Can't resolve it here — surface it rather than passing silently.
        bodies.push(`/*UNRESOLVED_HANDLER:${name}*/`);
      }
    } else {
      const body = readBlockAt(source, index + marker.length);
      if (body) bodies.push(body);
    }

    index = source.indexOf(marker, index + marker.length);
  }

  return bodies;
};

function sourceChecks() {
  console.log('\nSource (no awaited Supabase calls inside onAuthStateChange):');

  const files = collectSourceFiles(path.join(ROOT, 'src'));
  let checked = 0;

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('onAuthStateChange(')) continue;

    checked += 1;
    const relative = path.relative(ROOT, file).replace(/\\/g, '/');

    for (const body of extractCallbackBodies(source)) {
      // Strip comments so the explanatory notes don't trip the scan, then
      // strip deferred blocks, which are the correct pattern.
      const code = stripDeferredBlocks(
        body
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/(^|[^:])\/\/.*$/gm, '$1')
      );

      const offenders = [
        [/await\s+supabase\b/, 'await supabase...'],
        [/await\s+\w*[Ff]etchAdminData\b/, 'await fetchAdminData(...)'],
        [/await\s+lookupAdmin\b/, 'await lookupAdmin(...)'],
        [/await\s+\w*syncFromSession\b/, 'await syncFromSession(...)'],
      ];

      const unresolved = code.match(/UNRESOLVED_HANDLER:(\w+)/);
      if (unresolved) {
        fail(`${relative}: could not resolve auth handler "${unresolved[1]}" — inline it or move it into this file so it can be checked`);
        continue;
      }

      for (const [pattern, label] of offenders) {
        if (pattern.test(code)) {
          fail(`${relative}: "${label}" inside an onAuthStateChange callback — defer it with setTimeout(fn, 0)`);
        }
      }
    }
  }

  if (failures === 0) {
    pass(`${checked} file(s) with auth subscriptions are clean`);
  }
}

(async () => {
  try {
    await behaviouralChecks();
    sourceChecks();
  } catch (error) {
    console.error('\nCheck crashed:', error);
    process.exit(1);
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.\n`);
    process.exit(1);
  }

  console.log('\nAll auth deadlock checks passed.\n');
  process.exit(0);
})();
