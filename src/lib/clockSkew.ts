/**
 * Detects a wrong device clock, which silently breaks staying signed in.
 *
 * Supabase decides whether an access token has expired using the *local*
 * clock. A device whose time is wrong therefore treats a freshly issued token
 * as already expired, forces a refresh on auth-js's first 30-second tick, and
 * gets signed out when that refresh is rejected. To the person it looks like
 * "I log in, and 30 seconds later I am back at the login page" — on that one
 * machine, while every other device works.
 *
 * Skew is measured from the access token's own `iat` claim rather than from a
 * Date response header: `Date` is not a CORS-safelisted response header, so
 * reading it from a cross-origin fetch always yields null in a browser. The
 * JWT arrives in the response body, so it is always readable — and it is the
 * more relevant comparison anyway, since it is exactly the timestamp the
 * expiry maths is based on.
 */

const STORAGE_KEY = 'sdms_clock_skew_minutes';

/** Beyond this, the clock will start causing spurious sign-outs. */
export const CLOCK_SKEW_LIMIT_MS = 2 * 60 * 1000;

/** Reads the `iat` claim from a JWT without verifying it. */
const readIssuedAt = (accessToken: string): number | null => {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));

    return typeof decoded?.iat === 'number' ? decoded.iat * 1000 : null;
  } catch {
    return null;
  }
};

/**
 * Device clock minus token issue time, in milliseconds.
 * Positive means the device is running ahead. Null if it cannot be determined.
 */
export const measureSkewFromToken = (accessToken?: string | null): number | null => {
  if (!accessToken) return null;
  const issuedAt = readIssuedAt(accessToken);
  if (issuedAt === null) return null;
  return Date.now() - issuedAt;
};

/**
 * Remembers a significant skew so the login screen can explain the sign-out
 * afterwards — by which point the session, and any in-memory state, is gone.
 */
export const rememberSkew = (skewMs: number | null): void => {
  try {
    if (skewMs !== null && Math.abs(skewMs) > CLOCK_SKEW_LIMIT_MS) {
      localStorage.setItem(STORAGE_KEY, String(Math.round(skewMs / 60000)));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* storage unavailable — the warning is a nicety, never a blocker */
  }
};

/** Minutes of skew last measured, or null if the clock looked fine. */
export const getRememberedSkewMinutes = (): number | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const minutes = Number(stored);
    return Number.isFinite(minutes) && minutes !== 0 ? minutes : null;
  } catch {
    return null;
  }
};
