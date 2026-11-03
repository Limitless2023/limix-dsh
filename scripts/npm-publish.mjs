/**
 * [INPUT]: release.sh 的五包与清单、npm-preflight 收据、公共 registry。
 * [OUTPUT]: 默认只读检查；--publish 在指定 Actions 中发布同一份 tgz，并等待 registry 可见。
 * [POS]: 可信发布执行器；不构建、不打包、不登录、不修改信任配置。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import assert from 'node:assert/strict'
import { readFile, realpath } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { dirname, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const names = ['data', 'tool', 'agent', 'preset', 'cover'].map(p => `dsh-limix-${p}`)
const registry = 'https://registry.npmjs.org/'

export async function verifyArchives(output, version, commit) {
  assert.match(version, /^\d+\.\d+\.\d+$/)
  const release = JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8'))
  assert.equal(release.version, version)
  assert.equal(release.source_commit, commit)
  assert.equal(release.source_dirty, false)
  assert.deepEqual(release.packages.map(p => p.name).sort(), [...names].sort(), '必须恰好包含五包')
  const receipt = JSON.parse(await readFile(resolve(output, 'npm-preflight.json'), 'utf8'))
  assert.equal(receipt.status, 'prepared-not-published')
  assert.deepEqual(receipt.checks.map(p => p.name).sort(), [...names].sort())
  assert.ok(receipt.checks.every(p => p.version === version && p.dry_run === 'passed'))
  const sums = []
  for (const entry of release.packages) {
    assert.equal(entry.version, version)
    assert.equal(entry.filename, `${entry.name}-${version}.tgz`)
    const file = resolve(output, entry.filename)
    assert.equal(dirname(await realpath(file)), await realpath(output), '禁止树外压缩包')
    const bytes = await readFile(file)
    assert.equal(bytes.length, entry.bytes)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, `${entry.name}: SHA256 不一致`)
    assert.equal(`sha512-${createHash('sha512').update(bytes).digest('base64')}`, entry.integrity)
    sums.push(`${entry.sha256}  ${entry.filename}`)
  }
  assert.equal((await readFile(resolve(output, 'SHA256SUMS'), 'utf8')).trim(), sums.join('\n'))
  return release.packages.map(entry => ({ ...entry, file: resolve(output, entry.filename) }))
}

export async function remoteIntegrity(entry) {
  const response = await fetch(`${registry}${entry.name}/${entry.version}`, { signal: AbortSignal.timeout(30000) })
  if (response.status === 404) return null
  assert.ok(response.ok, `${entry.name}: registry HTTP ${response.status}，停止发布`)
  const pkg = await response.json()
  assert.equal(pkg.name, entry.name)
  assert.equal(pkg.version, entry.version)
  assert.ok(pkg.dist?.integrity, `${entry.name}: registry 未返回 integrity`)
  return pkg.dist.integrity
}

export async function publicationPlan(entries, lookup = remoteIntegrity) {
  const plan = []
  // 先检查全部五包，任一冲突/网络错误都不能导致部分发布。
  for (const entry of entries) {
    const integrity = await lookup(entry)
    if (integrity !== null) assert.equal(integrity, entry.integrity, `${entry.name}: 同版本内容不同，必须使用新版本`)
    plan.push({ ...entry, action: integrity === null ? 'publish' : 'already-published' })
  }
  return plan
}

export function assertPublisherContext(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', '实际发布仅允许在 GitHub Actions 中执行')
  assert.equal(env.GITHUB_REPOSITORY, 'Limitless2023/limix-dsh')
  assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch')
  assert.equal(env.GITHUB_REF, 'refs/heads/master')
  assert.equal(env.GITHUB_WORKFLOW_REF, 'Limitless2023/limix-dsh/.github/workflows/publish.yml@refs/heads/master')
  assert.ok(env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, '缺少 OIDC 授权')
}

export async function waitForPublished(entries, {
  lookup = remoteIntegrity,
  pause = ms => new Promise(resolve => setTimeout(resolve, ms)),
  attempts = 60, interval = 10000,
  onPending = () => {},
} = {}) {
  let pending = [...entries]
  for (let attempt = 0; attempt < attempts; attempt++) {
    const missing = []
    for (const entry of pending) {
      const integrity = await lookup(entry)
      if (integrity === null) missing.push(entry)
      else assert.equal(integrity, entry.integrity, `${entry.name}: 发布后内容不一致`)
    }
    if (!missing.length) return
    pending = missing
    onPending(pending)
    if (attempt + 1 < attempts) await pause(interval)
  }
  throw new Error(`npm 尚未公开以下版本：${pending.map(p => `${p.name}@${p.version}`).join(', ')}；请先核查 registry，不要直接重复发布`)
}

async function main() {
  const args = process.argv.slice(2)
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--publish'), '仅支持 --publish；默认只读检查')
  const publishing = args[0] === '--publish'
  if (publishing) assertPublisherContext(process.env)
  const version = process.env.RELEASE_VERSION || JSON.parse(await readFile(resolve(root, 'packages/data/package.json'), 'utf8')).version
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim(), '', '工作树不干净')
  const entries = await verifyArchives(resolve(root, 'dist', `v${version}`), version, commit)
  const plan = await publicationPlan(entries)
  for (const entry of plan) {
    console.log(`${entry.action}: ${entry.name}@${entry.version} (${basename(entry.file)})`)
    if (publishing && entry.action === 'publish') {
      execFileSync('npm', ['publish', entry.file, '--ignore-scripts', '--access', 'public', '--registry', registry], { cwd: root, stdio: 'inherit' })
    }
  }
  if (publishing) {
    await waitForPublished(entries, { onPending: pending => console.log(`等待 npm 公开 ${pending.length} 个包，10 秒后重新核验…`) })
    console.log(`五包 ${version} 的 registry integrity 已核验；GitHub Release 须复用本次 Actions 产物。`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
