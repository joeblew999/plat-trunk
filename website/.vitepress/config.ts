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
      { text: 'Getting Started', link: '/docs/user/getting-started' },
      { text: 'Creating Shapes', link: '/docs/user/creating-shapes' },
      { text: 'Moving Objects', link: '/docs/user/moving-objects' },
      { text: 'Sketch & Extrude', link: '/docs/user/sketch-and-extrude' },
      { text: 'Boolean Operations', link: '/docs/user/boolean-operations' },
      { text: 'Scene Management', link: '/docs/user/scene-management' },
      { text: 'Save & Load', link: '/docs/user/save-load' },
      { text: 'Known Issues', link: '/docs/user/known-issues' },
    ],
  },
  {
    text: 'Technical',
    collapsed: true,
    items: [
      { text: 'Architecture', link: '/docs/technical/architecture' },
      { text: 'Truck (CAD Kernel)', link: '/docs/technical/truck' },
      { text: 'WebGPU', link: '/docs/technical/webgpu' },
      { text: 'Sketch System', link: '/docs/technical/sketch' },
      { text: 'Gizmo', link: '/docs/technical/gizmo' },
      { text: 'Undo / Redo', link: '/docs/technical/undo-redo' },
      { text: 'Automerge (CRDT)', link: '/docs/technical/automerge' },
      { text: 'kkrpc', link: '/docs/technical/kkrpc' },
      { text: 'MCP Integration', link: '/docs/technical/mcp' },
      { text: 'Direct vs Parametric', link: '/docs/technical/direct-vs-parametric' },
    ],
  },
  {
    text: 'Roadmap',
    link: '/docs/ROADMAP',
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
      pattern: 'https://github.com/joeblew999/plat-trunk/edit/main/website/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'CAD Documentation',
      copyright: 'Copyright © 2024-present',
    },
    nav: [
      { text: 'Docs', link: '/docs/user/getting-started' },
      { text: 'Technical', link: '/docs/technical/architecture' },
      { text: 'CAD App', link: 'https://cad.ubuntusoftware.net' },
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
    server: {
      allowedHosts: true,
    },
  },
})
