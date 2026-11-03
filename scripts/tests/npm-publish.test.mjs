/**
 * [INPUT]: 临时发布清单、模拟 registry 与 Actions 身份。
 * [OUTPUT]: 哈希、五包集合、版本冲突、失败重试与发布身份边界测试。
 * [POS]: 可信发布回归测试；不请求 registry、不执行 npm publish。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { verifyArchives, publicationPlan, assertPublisherContext } from '../npm-publish.mjs'

const entries = ['data', 'tool', 'agent', 'preset', 'cover'].map(name => ({ name: `dsh-limix-${name}`, version: '1.2.3', integrity: `sha512-${name}` }))

test('首次五包发布与部分成功后的重试计划', async () => {
  const fresh = await publicationPlan(entries, async () => null)
  assert.equal(fresh.filter(p => p.action === 'publish').length, 5)
  const resumed = await publicationPlan(entries, async p => p.name.endsWith('data') ? p.integrity : null)
  assert.equal(resumed[0].action, 'already-published')
  assert.equal(resumed.filter(p => p.action === 'publish').length, 4)
})

test('同版本不同内容与 registry 故障不能生成发布计划', async () => {
  await assert.rejects(publicationPlan(entries, async () => 'sha512-other'), /同版本内容不同/)
  await assert.rejects(publicationPlan(entries, async () => { throw new Error('HTTP 503') }), /503/)
})

test('实际发布限制为指定仓库 master 的手动 OIDC 工作流', () => {
  const env = {
    GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Limitless2023/limix-dsh',
    GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/master',
    GITHUB_WORKFLOW_REF: 'Limitless2023/limix-dsh/.github/workflows/publish.yml@refs/heads/master',
    ACTIONS_ID_TOKEN_REQUEST_URL: 'fixture', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'fixture',
  }
  assert.doesNotThrow(() => assertPublisherContext(env))
  for (const key of Object.keys(env)) assert.throws(() => assertPublisherContext({ ...env, [key]: '' }))
  assert.throws(() => assertPublisherContext({ ...env, GITHUB_EVENT_NAME: 'pull_request' }))
})

test('发布前必须拥有完整五包、预检收据与一致的压缩包字节', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'limix-publish-test-'))
  try {
    const packages = []
    for (const entry of entries) {
      const bytes = Buffer.from(entry.name), filename = `${entry.name}-1.2.3.tgz`
      await writeFile(join(dir, filename), bytes)
      packages.push({ ...entry, filename, bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` })
    }
    const manifest = { version: '1.2.3', source_commit: 'commit', source_dirty: false, packages }
    const save = () => writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest))
    await save()
    await writeFile(join(dir, 'SHA256SUMS'), packages.map(p => `${p.sha256}  ${p.filename}`).join('\n') + '\n')
    const receipt = { status: 'prepared-not-published', checks: entries.map(p => ({ ...p, dry_run: 'passed' })) }
    await writeFile(join(dir, 'npm-preflight.json'), JSON.stringify(receipt))
    assert.equal((await verifyArchives(dir, '1.2.3', 'commit')).length, 5)
    await assert.rejects(verifyArchives(dir, '1.2.4', 'commit'))
    await assert.rejects(verifyArchives(dir, '1.2.3', 'other-commit'))
    manifest.source_dirty = true; await save()
    await assert.rejects(verifyArchives(dir, '1.2.3', 'commit'))
    manifest.source_dirty = false
    const last = packages.pop(); await save()
    await assert.rejects(verifyArchives(dir, '1.2.3', 'commit'), /必须恰好包含五包/)
    packages.push(last); await save()
    const file = join(dir, packages[0].filename), original = await readFile(file)
    await writeFile(file, Buffer.alloc(original.length))
    await assert.rejects(verifyArchives(dir, '1.2.3', 'commit'), /SHA256 不一致/)
    await writeFile(file, original)
    receipt.checks[0].dry_run = 'failed'
    await writeFile(join(dir, 'npm-preflight.json'), JSON.stringify(receipt))
    await assert.rejects(verifyArchives(dir, '1.2.3', 'commit'))
  } finally { await rm(dir, { recursive: true, force: true }) }
})
