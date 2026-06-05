export default {
  plugins: {
    // Tailwind 3's JIT engine already tree-shakes unused classes based on the
    // `content` globs in tailwind.config.ts, so the generated CSS is already
    // minimal. Do NOT add @fullhuman/postcss-purgecss here: its extractor can't
    // tokenize arbitrary-value classes (e.g. text-[22px], max-w-[1240px]) and
    // silently strips every one of them in production builds, which collapses
    // the layout to default sizing ("everything huge"). Dev builds skip PurgeCSS,
    // so the breakage only ever showed up on the deployed site.
    tailwindcss: {},
    autoprefixer: {},
  },
}
