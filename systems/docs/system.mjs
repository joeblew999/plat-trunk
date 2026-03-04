// systems/docs/system.mjs — docs system config.

export const workers = [];

export const devServers = [
  {
    name: 'docs-dev',
    command: 'cd systems/docs/website && bun x vitepress dev --port 5176',
  },
];
