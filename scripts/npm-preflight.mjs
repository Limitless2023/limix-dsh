/**
 * [INPUT]: release.sh 生成的五包、版本清单与 npm CLI。
 * [OUTPUT]: npm-preflight.json；检查元数据并逐包执行 publish --dry-run。
 * [POS]: npm 发布前检查；无实际发布入口，不修改 registry 或凭据。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const directories = ['data', 'tool', 'agent', 'preset', 'brand']
const definitions = await Promise.all(directories.map(async dir => ({ dir,
  manifest: JSON.parse(await readFile(resolve(root, 'packages', dir, 'package.json'), 'utf8')),
})))
const version = definitions[0].manifest.version
const output = resolve(root, 'dist', `v${version}`)
const release = JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8'))
assert.equal(release.version, version)
assert.equal(release.packages.length, 5)
assert.equal(release.source_dirty, false, '候选包须从干净提交重建')
assert.equal(release.source_commit, execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), '候选包须对应当前提交')
assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(), '', '预检前须提交本轮修改')
const checks = []
for (const { dir, manifest } of definitions) {
  const expected = `dsh-limix-${dir === 'brand' ? 'cover' : dir}`
  assert.equal(manifest.name, expected)
  assert.equal(manifest.version, version)
  assert.notEqual(manifest.private, true)
  assert.equal(manifest.engines?.dsh, '>=0.2.1-rc.5')
  assert.equal(manifest.publishConfig?.registry, 'https://registry.npmjs.org/')
  assert.equal(manifest.publishConfig?.access, 'public')
  assert.equal(manifest.license, 'PolyForm-Noncommercial-1.0.0')
  assert.equal(manifest.repository?.directory, `packages/${dir}`)
  assert.ok(!manifest.scripts?.prepublishOnly && !manifest.scripts?.publish)
  for (const [name, spec] of Object.entries(manifest.dependencies || {})) {
    assert.ok(!/^(file:|link:|workspace:)/.test(spec), `${name}: 本地依赖不能分发`)
    if (name.startsWith('dsh-limix-')) assert.equal(spec, version)
  }
  const entry = release.packages.find(p => p.name === expected)
  assert.ok(entry)
  const tarball = resolve(output, entry.filename)
  assert.equal(createHash('sha256').update(await readFile(tarball)).digest('hex'), entry.sha256)
  const packedManifest = JSON.parse(execFileSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8' }))
  assert.deepEqual(packedManifest, manifest)
  for (const filename of ['LICENSE', 'LICENSING.md', 'THIRD-PARTY-NOTICES.md']) {
    const packaged = execFileSync('tar', ['-xOf', tarball, `package/${filename}`], { encoding: 'utf8' })
    assert.equal(packaged, await readFile(resolve(root, filename), 'utf8'), `${expected}: ${filename} 须随包分发且与根目录一致`)
  }
  const result = JSON.parse(execFileSync('npm', ['publish', tarball, '--dry-run', '--ignore-scripts', '--json'], { encoding: 'utf8' }))
  assert.equal(result.id, `${expected}@${version}`)
  checks.push({ name: expected, version, dry_run: 'passed', license: manifest.license || 'UNDECLARED' })
}
await writeFile(resolve(output, 'npm-preflight.json'), JSON.stringify({
  status: 'prepared-not-published', checks,
  publication_performed: false,
  remaining: ['发布账号登录及2FA', '实际发布与公共 registry 安装验收'],
}, null, 2) + '\n')
console.log(`五包 dry-run 通过；未发布：${output}`)
