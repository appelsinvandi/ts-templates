import fs from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'
import { capitalCase, snakeCase } from 'change-case'
import esbuild from 'esbuild'
import { z } from 'zod'
import pkg from './package.json' with { type: 'json' }

const pkgInfoSchema = z.object({
  name: z
    .string({ error: 'Please add the "name" field to your "package.json" file.' })
    .min(1, { error: 'Please add the "name" field to your "package.json" file.' }),
  description: z
    .string({ error: 'Please add the "description" field to your "package.json" file.' })
    .min(1, { error: 'Please add the "description" field to your "package.json" file.' }),
  version: z
    .string({ error: 'Please add the "version" field to your "package.json" file.' })
    .regex(/^\d+\.\d+\.\d+$/, { error: 'Please use a valid semver version in your "package.json" file.' }),
  userscript: z.object({
    homepage: z.url().optional(),
    downloadUrl: z.url().optional(),
    updateUrl: z.url().optional(),
    matchUrl: z.string({
      error: 'Please add the "userscript.matchUrl" field to your "package.json" file.',
    }),
    grants: z
      .enum([
        'unsafeWindow',
        'GM_addElement',
        'GM_addStyle',
        'GM_download',
        'GM_getResourceText',
        'GM_getResourceURL',
        'GM_info',
        'GM_log',
        'GM_notification',
        'GM_openInTab',
        'GM_registerMenuCommand',
        'GM_unregisterMenuCommand',
        'GM_setClipboard',
        'GM_getTab',
        'GM_saveTab',
        'GM_getTabs',
        'GM_setValue',
        'GM_getValue',
        'GM_deleteValue',
        'GM_listValues',
        'GM_addValueChangeListener',
        'GM_removeValueChangeListener',
        'GM_xmlhttpRequest',
        'GM_webRequest',
        'GM_cookie.list',
        'GM_cookie.set',
        'GM_cookie.delete',
        'window.onurlchange',
        'window.close',
        'window.focus',
      ])
      .array()
      .refine((v) => v.filter((e, i, a) => a.indexOf(e) !== i).length === 0, {
        error: 'Please ensure that all "userscript.grants" values are unique.',
      })
      .optional(),
  }),
})

const pkgInfo = pkgInfoSchema.safeParse(pkg)
if (!pkgInfo.success) {
  console.dir(pkgInfo.error.format(), { depth: Number.POSITIVE_INFINITY })
  process.exit(1)
}

const outDir = path.resolve(import.meta.dirname, 'dist')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)
const outFile = `${pkgInfo.data.name
  .split('/')
  .map((e) => snakeCase(e))
  .join('___')}.user.js`
const outPath = path.resolve(outDir, outFile)
if (fs.existsSync(outPath)) fs.unlinkSync(outPath)

const ctx = await esbuild.context({
  entryPoints: [path.resolve(import.meta.dirname, 'src', 'index.mts')],
  outfile: outPath,
  bundle: true,
  target: 'es2018',
  platform: 'browser',
  sourcemap: 'inline',
  format: 'iife',
})
const _rebuildRes = await ctx.rebuild()
const buildOutput = fs.readFileSync(outPath)
fs.writeFileSync(outPath, `${GenerateUserscriptHead(pkgInfo.data)}\n\n${buildOutput}`)
ctx.dispose()

export function GenerateUserscriptHead(pkgInfo: typeof pkgInfoSchema._output) {
  const host = new URL(pkgInfo.userscript.matchUrl)

  const headerElements: (readonly [key: string, value: string] | null)[] = [
    [
      'name',
      pkgInfo.name
        .split('/')
        .map((e) => capitalCase(e))
        .join(' - '),
    ],
    ['namespace', 'http://tampermonkey.net/'],
    ['version', pkgInfo.version],
    ['description', pkgInfo.description],
    pkgInfo.userscript.homepage ? ['homepage', pkgInfo.userscript.homepage] : null,
    pkgInfo.userscript.downloadUrl ? ['downloadURL', pkgInfo.userscript.downloadUrl] : null,
    pkgInfo.userscript.updateUrl ? ['updateURL', pkgInfo.userscript.updateUrl] : null,
    ['run-at', 'document-idle'],
    ['match', pkgInfo.userscript.matchUrl],
    ['icon', `https://www.google.com/s2/favicons?domain=${host}`],
    ...(pkgInfo.userscript.grants?.map((e) => ['grant', e] as const) ?? []),
  ]

  return [
    '// ==UserScript==',
    ...headerElements
      .filter((e): e is NonNullable<typeof e> => e != null)
      .map(([k, v]) => `// @${k.padEnd(16, ' ')} ${v}`),
    '// ==/UserScript==',
  ].join('\n')
}
