/**
 * [INPUT]: 五个插件 package.json、源码、npm 及本地构建依赖。
 * [OUTPUT]: dist/v<version> 的 tarball、manifest.json、SHA256SUMS。
 * [POS]: 发布封装器；构建后核验文件，不提交 Git 或上传 Release。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { execFileSync } from 'node:child_process'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packages = ['data', 'tool', 'agent', 'preset', 'brand']
const definitions = await Promise.all(packages.map(async directory => ({ directory,
  manifest: JSON.parse(await readFile(resolve(root, 'packages', directory, 'package.json'), 'utf8')),
})))
const version = definitions[0].manifest.version
assert.match(version, /^\d+\.\d+\.\d+$/)
assert.ok(definitions.every(item => item.manifest.version === version), '五个插件须使用同一套件版本')
const output = resolve(root, 'dist', `v${version}`)
await mkdir(output, { recursive: true })
const results = []
for (const { directory, manifest } of definitions) {
  const cwd = resolve(root, 'packages', directory)
  if (manifest.scripts?.build) execFileSync('npm', ['run', 'build'], { cwd, stdio: 'inherit' })
  const [packed] = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', output], { cwd, encoding: 'utf8' }))
  const files = new Set(packed.files.map(file => file.path))
  const required = ['package.json', 'cordis.patch.yml']
  const visit = value => {
    if (typeof value === 'string' && value.startsWith('./') && !value.includes('*')) required.push(value.slice(2))
    else if (value && typeof value === 'object') Object.values(value).forEach(visit)
  }
  visit(manifest.exports)
  if (directory === 'tool') {
    for (const file of await readdir(resolve(cwd, 'assets'))) if (/^limix.*\.py$/.test(file)) required.push(`assets/${file}`)
  }
  for (const file of required) assert.ok(files.has(file), `${manifest.name}: 缺少 ${file}`)
  for (const file of files) assert.ok(!/(^|\/)(\.DS_Store|\.env|node_modules|__pycache__)(\/|$)/.test(file), `禁止打包 ${file}`)
  const bytes = await readFile(resolve(output, packed.filename))
  results.push({ name: manifest.name, version, filename: packed.filename, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'), integrity: packed.integrity, files: [...files] })
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const dirty = !!execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()
await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ version, source_commit: commit, source_dirty: dirty, packages: results }, null, 2) + '\n')
await writeFile(resolve(output, 'SHA256SUMS'), results.map(item => `${item.sha256}  ${item.filename}`).join('\n') + '\n')
console.log(`已核验 ${results.length} 个插件：${output}${dirty ? '（源码未提交，发布前须在提交后重建）' : ''}`)
