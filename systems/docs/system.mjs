// systems/docs/system.mjs — docs system config.

export const workers = [];

export const devServers = [
  {
    name: 'docs-dev',
    command: 'cd systems/docs/website && bun x vitepress dev --port 5176',
  },
];

// Build pipeline config — consumed by scripts/build.mjs.
export const building = {
  name: 'docs',
  order: 10,
  steps: [
    { name: 'llm-docs', command: 'bun scripts/build-llm-docs.ts' },
    { name: 'vitepress', command: 'cd systems/docs/website && bun install --silent && bun run build' },
  ],
};
