// build-llm-docs — Generates llms.txt, llms-full.txt, llms-small.txt
// Runs before vitepress build (called from root build:docs script).

import fs from 'node:fs'
import path from 'node:path'
import { glob } from 'node:fs/promises'
import cfDeploy from '../cf-deploy.json'

const docsDir = path.resolve('systems/docs/website/docs')
const publicDir = path.resolve('systems/docs/website/public')
const frontmatterRegex = /^\n*---(\n.+)*?\n---\n/
const siteUrl = cfDeploy.workers.router.production + cfDeploy.endpoints.docs

function title(file: string) {
  return file.replace(/\.(?:md|txt)$/, '').split('/').pop()!
    .split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
}

async function concat(pattern: string, header: string): Promise<string> {
  let out = header + '# Start of CAD documentation\n'
  for await (const file of await glob(pattern, { cwd: docsDir })) {
    console.log(`> ${file}`)
    out += fs.readFileSync(path.resolve(docsDir, file), 'utf-8').replace(frontmatterRegex, '') + '\n\n'
  }
  return out
}

async function main() {
  // llms.txt — index of all doc pages
  const links: string[] = []
  for await (const file of await glob('**/*.md', { cwd: docsDir })) {
    links.push(`- [${title(file)}](${siteUrl}${file.replace(/\.md$/, '')})`)
  }
  const thirdParty: string[] = []
  const llmsDir = path.resolve(publicDir, 'llms')
  if (fs.existsSync(llmsDir)) {
    for (const f of fs.readdirSync(llmsDir).filter(f => f.endsWith('.txt')))
      thirdParty.push(`- [${title(f)}](${siteUrl}llms/${f})`)
  }
  fs.writeFileSync(path.join(publicDir, 'llms.txt'), [
    '# CAD Documentation', '',
    '> Browser-based 3D CAD built with Truck, WebGPU, Hono, and Automerge.', '',
    '## Docs', '',
    `- [Full Docs](${siteUrl}llms-full.txt): Complete documentation.`,
    `- [Compact Docs](${siteUrl}llms-small.txt): User guide only.`, '',
    '## Pages', '', ...links,
    ...(thirdParty.length ? ['', '## Third-Party References', '', ...thirdParty] : []),
  ].join('\n'), 'utf-8')
  console.log('< llms.txt')

  // llms-full.txt — all docs concatenated
  fs.writeFileSync(path.join(publicDir, 'llms-full.txt'),
    await concat('**/*.md', '<SYSTEM>Full developer documentation for CAD.</SYSTEM>\n\n'), 'utf-8')
  console.log('< llms-full.txt')

  // llms-small.txt — user guide only
  fs.writeFileSync(path.join(publicDir, 'llms-small.txt'),
    await concat('user/**/*.md', '<SYSTEM>User guide for CAD.</SYSTEM>\n\n'), 'utf-8')
  console.log('< llms-small.txt')
}

main().catch(console.error)
