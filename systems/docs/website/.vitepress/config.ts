import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from 'vitepress-plugin-group-icons'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { createFileSystemTypesCache } from '@shikijs/vitepress-twoslash/cache-fs'

const sidebars = (): DefaultTheme.SidebarItem[] => [
  {
    text: 'User Guide',
    collapsed: false,
    items: [
      { text: 'Getting Started', link: '/user/getting-started' },
      { text: 'Creating Shapes', link: '/user/creating-shapes' },
      { text: 'Transforms', link: '/user/transforms' },
      { text: 'Styling', link: '/user/styling' },
      { text: 'Sketch & Extrude', link: '/user/sketch-and-extrude' },
      { text: 'Boolean Operations', link: '/user/boolean-operations' },
      { text: 'Scene Management', link: '/user/scene-management' },
      { text: 'Files & Storage', link: '/user/files-and-storage' },
      { text: 'AI / MCP Guide', link: '/user/mcp-guide' },
      { text: 'Known Issues', link: '/user/known-issues' },
    ],
  },
  {
    text: 'Technical',
    collapsed: true,
    items: [
      { text: 'Architecture', link: '/technical/architecture' },
      { text: 'Developer Guide', link: '/technical/developer-guide' },
      { text: 'Truck (CAD Kernel)', link: '/technical/truck' },
      { text: 'WebGPU', link: '/technical/webgpu' },
      { text: 'Sketch System', link: '/technical/sketch' },
      { text: 'Gizmo', link: '/technical/gizmo' },
      { text: 'Undo / Redo', link: '/technical/undo-redo' },
      { text: 'Automerge (CRDT)', link: '/technical/automerge' },
      { text: 'kkrpc', link: '/technical/kkrpc' },
      { text: 'MCP Integration', link: '/technical/mcp' },
    ],
  },
  {
    text: 'Use Cases',
    link: '/who-is-this-for',
  },
  {
    text: 'Comparison',
    link: '/comparison',
  },
  {
    text: 'Roadmap',
    link: '/ROADMAP',
  },
  {
    text: 'LLM',
    collapsed: true,
    items: [
      { text: 'Docs List', link: '/llms.txt' },
      { text: 'Full Docs', link: '/llms-full.txt' },
      { text: 'Compact Docs', link: '/llms-small.txt' },
    ],
  },
]

export default defineConfig({
  lang: 'en-US',
  title: 'CAD Documentation',
  description:
    'Browser-based CAD application built with Truck, WebGPU, Hono, and Automerge. Local-first, collaborative, deployed on Cloudflare.',
  srcDir: 'docs',
  base: '/docs/',
  lastUpdated: true,
  cleanUrls: true,
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    config(md) {
      md.use(groupIconMdPlugin)
    },
    codeTransformers: [
      transformerTwoslash({
        typesCache: createFileSystemTypesCache(),
      }),
    ],
  },
  themeConfig: {
    siteTitle: 'CAD Docs',
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/joeblew999/plat-trunk' },
    ],
    editLink: {
      pattern: 'https://github.com/joeblew999/plat-trunk/edit/main/systems/docs/website/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'CAD Documentation',
      copyright: 'Copyright © 2024-present',
    },
    nav: [
      { text: 'Docs', link: '/user/getting-started' },
      { text: 'Use Cases', link: '/who-is-this-for' },
      { text: 'Technical', link: '/technical/architecture' },
      { text: 'CAD App', link: '../', target: '_self', rel: '' },
    ],
    sidebar: {
      '/': sidebars(),
    },
  },
  head: [
    ['link', { rel: 'shortcut icon', href: '/favicon.ico' }],
  ],
  titleTemplate: ':title - CAD Docs',
  vite: {
    plugins: [
      groupIconVitePlugin(),
    ],
    publicDir: '../public',
    server: {
      allowedHosts: true,
    },
  },
})
