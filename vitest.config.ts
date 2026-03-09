// Root vitest config — excludes vendored .src/ and node_modules from test discovery.
// Without this, `vitest run` from root picks up ifc-lite and cloudflare-template tests
// that fail outside their original project context.
//
// System-specific tests should be run via `bun run test` (scripts/test.mjs)
// or from within each system's worker directory.

export default {
  test: {
    exclude: [
      '**/node_modules/**',
      '**/.src/**',
      '**/dist/**',
      '**/pkg/**',
      '**/pkg-*/**',
      '**/target/**',
      '**/e2e/**',
      '**/worker/**',
    ],
  },
};
