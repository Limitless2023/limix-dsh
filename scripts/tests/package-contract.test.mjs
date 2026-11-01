/**
 * [INPUT]: 临时完整/缺入口 tarball 与共用分发契约。
 * [OUTPUT]: 旧解包不掩盖新包缺项、显式入口/Python 模块/敏感文件检查。
 * [POS]: 发布脚本回归测试；不构建生产包、不调用 API。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { assertPackageFiles, createIsolationDirectory } from '../package-contract.mjs'

test('先验完整包后验缺入口包，新隔离目录不能借用上轮 main', async () => {
  const root = await mkdtemp(join(tmpdir(), 'limix-pack-test-'))
  const first = await createIsolationDirectory(), second = await createIsolationDirectory()
  try {
    const pkg = join(root, 'package'), manifest = { name: 'fixture', type: 'module', main: 'lib/index.js' }
    await mkdir(join(pkg, 'lib'), { recursive: true })
    await writeFile(join(pkg, 'package.json'), JSON.stringify(manifest))
    await writeFile(join(pkg, 'cordis.patch.yml'), '[]')
    await writeFile(join(pkg, 'lib/index.js'), 'export const sentinel = true')
    execFileSync('tar', ['-czf', join(root, 'good.tgz'), '-C', root, 'package'])
    await rm(join(pkg, 'lib/index.js'))
    execFileSync('tar', ['-czf', join(root, 'bad.tgz'), '-C', root, 'package'])
    execFileSync('tar', ['-xzf', join(root, 'good.tgz'), '-C', first])
    execFileSync('tar', ['-xzf', join(root, 'bad.tgz'), '-C', second])
    assert.notEqual(first, second)
    assert.match(await readFile(join(first, 'package/lib/index.js'), 'utf8'), /sentinel/)
    await assert.rejects(readFile(join(second, 'package/lib/index.js')), { code: 'ENOENT' })
    await assert.rejects(assertPackageFiles(manifest, ['package.json', 'cordis.patch.yml'], pkg), /缺少 lib\/index.js/)
  } finally { await Promise.all([root, first, second].map(path => rm(path, { recursive: true, force: true }))) }
})

test('非 main 的静态 exports 和本包 Python 模块也必须随包分发', async () => {
  const root = await mkdtemp(join(tmpdir(), 'limix-pack-assets-'))
  try {
    await mkdir(join(root, 'assets')); await writeFile(join(root, 'assets/limix_runtime.py'), '# fixture')
    const manifest = { name: 'dsh-limix-tool', exports: { './icon': './assets/icon.png' } }
    const files = ['package.json', 'cordis.patch.yml', 'assets/limix_runtime.py']
    await assert.rejects(assertPackageFiles(manifest, files, root), /缺少 assets\/icon.png/)
    await assert.rejects(assertPackageFiles(manifest, ['package.json', 'cordis.patch.yml', 'assets/icon.png'], root), /缺少 assets\/limix_runtime.py/)
    await assertPackageFiles(manifest, [...files, 'assets/icon.png'], root)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('拒绝 dotenv 变体与依赖缓存，普通源码允许', async () => {
  const base = ['package.json', 'cordis.patch.yml']
  for (const path of ['.env', '.env.local', 'assets/.env.production', 'node_modules/pkg/index.js', '__pycache__/x.pyc']) {
    await assert.rejects(assertPackageFiles({ name: 'fixture' }, [...base, path]), /禁止打包/)
  }
  await assertPackageFiles({ name: 'fixture' }, [...base, 'src/env.js'])
})
