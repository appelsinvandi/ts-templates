import fs from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'
import { capitalCase, snakeCase } from 'change-case'
import esbuild from 'esbuild'
import pkg from './package.json'

const outDir = path.resolve(import.meta.dirname, 'dist')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)
const outFile = `${snakeCase(pkg.name)}.user.js`
const outPath = path.resolve(outDir, outFile)
if (fs.existsSync(outPath)) fs.unlinkSync(outPath)

await buildScript({
  entryPoint: path.resolve(import.meta.dirname, 'src', 'index.mts'),
  scriptName: pkg.name.replace(/^.+\//, ''),
  scriptDescription: pkg.description,
  scriptVersion: pkg.version,
  matchUrl: pkg.userscript.matchUrl,
})

export async function buildScript(
  opts: { entryPoint: string; scriptName: string } & Parameters<typeof GenerateUserscriptHead>[0],
) {
  const ctx = await esbuild.context({
    entryPoints: [opts.entryPoint],
    outfile: outPath,
    bundle: true,
    target: 'es2018',
    platform: 'browser',
    sourcemap: 'inline',
    format: 'iife',
  })

  const _rebuildRes = await ctx.rebuild()

  const buildOutput = fs.readFileSync(outPath)
  fs.writeFileSync(outPath, `${GenerateUserscriptHead(opts)}\n\n${buildOutput}`)

  ctx.dispose()
}

export function GenerateUserscriptHead(opts: {
  scriptName: string
  scriptDescription: string
  scriptVersion: string
  matchUrl: string
}) {
  const host = new URL(opts.matchUrl)

  return [
    '// ==UserScript==',
    `// @name         ${capitalCase(opts.scriptName)}`,
    '// @namespace    http://tampermonkey.net/',
    `// @version      ${opts.scriptVersion}`,
    `// @description  ${opts.scriptDescription}`,
    '// @run-at       document-idle',
    `// @match        ${opts.matchUrl}`,
    `// @icon         https://www.google.com/s2/favicons?domain=${host}`,
    '// ==/UserScript==',
  ].join('\n')
}
