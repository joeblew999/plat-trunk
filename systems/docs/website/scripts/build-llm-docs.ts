import fs from 'node:fs'
import path from 'node:path'
import { glob } from 'node:fs/promises'

const cfDeploy = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../cf-deploy.json'), 'utf8'))
const frontmatterRegex = /^\n*---(\n.+)*?\n---\n/

const docsDir = path.resolve('docs')

const sliceExt = (file: string) => {
  return file.split('.').slice(0, -1).join('.')
}

const extractLabel = (file: string) => {
  return sliceExt(file.split('/').pop() || '')
}

function capitalizeDelimiter(str: string) {
  return str
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

async function generateLLMDocs() {
  const siteUrl = cfDeploy.workers.docs.production

  // --- llms.txt (index) ---
  const outputListFile = path.resolve('public/llms.txt')
  const optionalFiles = await glob('**/*.md', { cwd: docsDir })
  const optionals: string[] = []

  for await (const file of optionalFiles) {
    optionals.push(
      `- [${capitalizeDelimiter(extractLabel(file))}](${siteUrl}/${sliceExt(file)})`
    )
  }

  // Check for third-party LLM refs in public/llms/
  const llmsDir = path.resolve('public/llms')
  const thirdPartyRefs: string[] = []
  if (fs.existsSync(llmsDir)) {
    const llmsFiles = fs.readdirSync(llmsDir).filter((f) => f.endsWith('.txt'))
    for (const file of llmsFiles) {
      const label = capitalizeDelimiter(
        file.replace('.txt', '').replace(/-llms(-full|-small)?/, '')
      )
      thirdPartyRefs.push(`- [${label}](${siteUrl}/llms/${file})`)
    }
  }

  fs.writeFileSync(
    outputListFile,
    [
      '# CAD Documentation',
      '',
      '> Browser-based 3D CAD built with Truck, WebGPU, Hono, and Automerge.',
      '',
      '## Docs',
      '',
      `- [Full Docs](${siteUrl}/llms-full.txt): Full documentation of CAD.`,
      `- [Compact Docs](${siteUrl}/llms-small.txt): User guide only.`,
      '',
      '## Pages',
      '',
      ...optionals,
      ...(thirdPartyRefs.length > 0
        ? ['', '## Third-Party References', '', ...thirdPartyRefs]
        : []),
    ].join('\n'),
    'utf-8'
  )
  console.log(`< Output '${outputListFile}' `)

  // --- llms-full.txt (all user + technical docs) ---
  const outputFullFile = path.resolve('public/llms-full.txt')
  const fullFiles = await glob('**/*.md', { cwd: docsDir })

  const fullContent = await generateContent(
    fullFiles,
    docsDir,
    '<SYSTEM>This is the full developer documentation for CAD.</SYSTEM>\n\n'
  )

  fs.writeFileSync(outputFullFile, fullContent, 'utf-8')
  console.log(`< Output '${outputFullFile}' `)

  // --- llms-small.txt (user docs only) ---
  const outputSmallFile = path.resolve('public/llms-small.txt')
  const smallFiles = await glob('user/**/*.md', { cwd: docsDir })

  const smallContent = await generateContent(
    smallFiles,
    docsDir,
    '<SYSTEM>This is the user guide documentation for CAD.</SYSTEM>\n\n'
  )

  fs.writeFileSync(outputSmallFile, smallContent, 'utf-8')
  console.log(`< Output '${outputSmallFile}' `)
}

async function generateContent(
  files: NodeJS.AsyncIterator<string>,
  docsDir: string,
  header: string
): Promise<string> {
  let content = header + '# Start of CAD documentation\n'

  for await (const file of files) {
    console.log(`> Writing '${file}' `)
    const fileContent = fs.readFileSync(
      path.resolve(docsDir, file),
      'utf-8'
    )
    content += fileContent.replace(frontmatterRegex, '') + '\n\n'
  }

  return content
}

generateLLMDocs().catch(console.error)
