/**
 * [INPUT]: 包清单、npm pack 返回的文件列表与源码包目录。
 * [OUTPUT]: assertPackageFiles 核验分发入口；createIsolationDirectory 创建全新隔离目录。
 * [POS]: validate/release 共用的 tarball 契约，禁止旧解包文件掩盖漏包。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import assert from 'node:assert/strict'
import { mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export async function assertPackageFiles(manifest, packedFiles, packageDirectory) {
  const files = new Set(packedFiles)
  const required = new Set(['package.json', 'cordis.patch.yml'])
  if (manifest.main) required.add(manifest.main.replace(/^\.\//, ''))
  const visit = value => {
    if (typeof value === 'string' && value.startsWith('./') && !value.includes('*')) required.add(value.slice(2))
    else if (value && typeof value === 'object') Object.values(value).forEach(visit)
  }
  visit(manifest.exports)
  if (manifest.name === 'dsh-limix-tool') {
    for (const file of await readdir(join(packageDirectory, 'assets'))) {
      if (/^limix.*\.py$/.test(file)) required.add(`assets/${file}`)
    }
  }
  for (const file of required) assert.ok(files.has(file), `${manifest.name}: 缺少 ${file}`)
  for (const file of files) {
    assert.ok(!/(^|\/)(\.DS_Store|node_modules|__pycache__)(\/|$)|(^|\/)\.env(?:\.|\/|$)/.test(file), `禁止打包 ${file}`)
  }
}

// 放在系统临时目录，既不复用旧文件，也不从仓库祖先继承 node_modules。
export function createIsolationDirectory() {
  return mkdtemp(join(tmpdir(), 'limix-package-isolated-'))
}
