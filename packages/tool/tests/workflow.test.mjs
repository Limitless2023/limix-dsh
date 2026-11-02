/**
 * [INPUT]: node:test；构建后的工具入口、preset 补丁、命令与 CSV 边界。
 * [OUTPUT]: preset 默认配置与挂载隔离、工作流注册、附件传递、取消、文件边界与历史报告保留验证。
 * [POS]: tool 宿主契约测试，不调用生产 API。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, symlink, unlink, rm, realpath, truncate } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerPredictCommand } from '../src/host/predict-command.js'
import { createCsvAccess } from '../src/host/csv-access.js'
import { registerExplainCommand } from '../src/host/explain-command.js'

test('构建产物在挂载时只注册一次四段流程，工具 schema 包含全部执行入口', async () => {
  const { apply } = await import('../lib/index.js')
  const sections = [], commands = [], tools = [], effects = []
  const ctx = {
    limixDatasource: { register() {} },
    systemPrompt: { section: value => sections.push(value) },
    commands: { register: value => commands.push(value) },
    tools: { register: value => tools.push(value) },
    effect: value => effects.push(value),
  }
  assert.equal(sections.length, 0, '导入模块不向全局注册提示词')
  apply(ctx)
  assert.deepEqual(sections.map(s => [s.name, s.order]), [
    ['limix:predict-workflow', 500], ['limix:explain-workflow', 510], ['limix:benchmark-workflow', 520], ['limix:report-workflow', 530],
  ])
  assert.ok(sections.every(s => s.interpolate === false))
  assert.deepEqual(commands.map(c => c.name), ['limix-predict', 'limix-explain', 'limix-compare'])
  assert.deepEqual(tools.map(t => t.name), ['limix'])
  for (const command of ['classify','regress','forecast','explain','benchmark']) assert.ok(tools[0].parameters.properties.command.enum.includes(command))
})

test('安装补丁设置 LimiX 默认值，工具包不向标准模式挂载', async () => {
  const preset = await readFile(new URL('../../preset/cordis.patch.yml', import.meta.url), 'utf8')
  const tool = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  const operations = preset.split('\n').filter(line => /^- /.test(line))
  assert.deepEqual(operations, ['- id: agent-preset-registry', '- insert:'], '只允许修改 registry 并添加 LimiX preset，不覆盖标准 preset')
  assert.match(preset, /^- id: agent-preset-registry\n  name: '@deepseek-ai\/dsh-agent-preset-registry'\n  config:\n    default: limix\n    selectedDefault: limix\n- insert:/m)
  assert.equal((preset.match(/^    - id:/gm) ?? []).length, 1)
  assert.match(preset, /^    - id: preset-limix$/m)
  assert.match(preset, /^        id: limix$/m)
  assert.match(preset, /^          - id: limix-tool\n            name: 'dsh-limix-tool'$/m)
  assert.equal(tool.split('\n').filter(line => !line.trimStart().startsWith('#')).join('\n').trim(), '[]')
})

test('解释入口保留附件且只排入一条消息', () => {
  let definition
  const messages = []
  registerExplainCommand({ commands: { register: d => { definition = d } }, systemPrompt: { section() {} } })
  const file = { type: 'file', path: '/data/input.csv' }
  definition.handler({ agent: { followup: m => messages.push(m) }, rawInput: '解释第一条', attachments: [file] })
  assert.equal(definition.name, 'limix-explain')
  assert.equal(messages.length, 1)
  assert.equal(messages[0].content[0], file)
  assert.match(messages[0].content[1].text, /解释第一条/)
})

test('解释下载只开放已登记 JSON/CSV，不因位于工作区而放行', async () => {
  const root = await mkdtemp(join(tmpdir(), 'limix-artifacts-'))
  try {
    const result = join(root, 'result.json'), secret = join(root, 'config.json'), html = join(root, 'report.html')
    await writeFile(result, '{"task_status":"succeeded"}'); await writeFile(secret, '{"key":"private"}'); await writeFile(html, '<script/>')
    const receipt = join(root, 'receipts.json')
    const access = createCsvAccess([root], receipt, { extensions: ['.json', '.csv'], registeredOnly: true })
    assert.equal(await access.resolve(result), null)
    await access.remember([result, html], root)
    assert.equal(await access.resolve(result), await realpath(result))
    assert.equal(await access.resolve(secret), null)
    assert.equal(await access.resolve(html), null)
    assert.equal(await createCsvAccess([root], receipt).resolve(result), null)
  } finally { await rm(root, { recursive: true, force: true }) }
})

function command() {
  let definition
  registerPredictCommand({ commands: { register: d => { definition = d } }, systemPrompt: { section() {} } })
  return definition
}

test('预测命令保留输入与已接纳附件，每次只排入一条消息', () => {
  const messages = []
  const file = Object.freeze({ type: 'file', path: '/data/with space.csv' })
  const definition = command()
  assert.equal(definition.input.attachments, true)
  const result = definition.handler({ agent: { followup: m => messages.push(m) }, rawInput: '  预测 price  ', attachments: [file] })
  assert.equal(result.kind, 'success')
  assert.equal(messages.length, 1)
  assert.equal(messages[0].role, 'user')
  assert.equal(messages[0].content[0], file)
  assert.match(messages[0].content[1].text, /预测 price$/)
  assert.match(messages[0].id, /^[0-9a-f-]{36}$/)
  assert.ok(Object.isFrozen(messages[0].content))
})

test('空命令进入引导；取消的命令不开始预测', () => {
  const messages = []
  const invocation = { agent: { followup: m => messages.push(m) }, rawInput: '' }
  command().handler(invocation)
  assert.match(messages[0].content[0].text, /明确需要的数据和预测目标/)
  assert.throws(() => command().handler({ ...invocation, signal: AbortSignal.abort() }))
  assert.equal(messages.length, 1)
})

test('仅已登记的外部 CSV 可读，重载可恢复；相邻文件与链接越界被拒绝', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'limix-csv-'))
  try {
    const root = join(temp, 'root'), outside = join(temp, 'outside')
    await mkdir(root); await mkdir(outside)
    const result = join(outside, 'result.csv'), secret = join(outside, 'private.csv')
    await writeFile(result, 'pred_label\n1\n'); await writeFile(secret, 'secret\n2\n')
    const receipt = join(temp, 'state', 'files.json')
    const access = createCsvAccess([root], receipt)
    assert.equal(await access.resolve(result), null)
    await access.remember([result], outside)
    const restored = createCsvAccess([root], receipt)
    assert.equal(await restored.resolve(result), await realpath(result))
    assert.equal(await restored.resolve(secret), null)
    await symlink(secret, join(root, 'escape.csv'))
    assert.equal(await restored.resolve(join(root, 'escape.csv')), null)
    await unlink(result); await symlink(secret, result)
    assert.equal(await restored.resolve(result), null)
  } finally { await rm(temp, { recursive: true, force: true }) }
})

test('并发登记合并记录，超大文件与非 CSV 不公开', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'limix-csv-'))
  try {
    const root = join(temp, 'root'); await mkdir(root)
    const files = ['a.csv', 'b.csv', 'large.csv', 'note.txt'].map(p => join(temp, p))
    await Promise.all(files.map(p => writeFile(p, p.endsWith('large.csv') ? '0'.repeat(5_000_001) : 'x')))
    const access = createCsvAccess([root], join(temp, 'files.json'))
    await Promise.all(files.map(p => access.remember([p], temp)))
    assert.equal(await access.resolve(files[0]), await realpath(files[0]))
    assert.equal(await access.resolve(files[1]), await realpath(files[1]))
    assert.equal(await access.resolve(files[2]), null)
    assert.equal(await access.resolve(files[3]), null)
  } finally { await rm(temp, { recursive: true, force: true }) }
})

test('旧登记的 HTML/MD/SVG 在超过1000个普通产物后仍可读，普通产物保留上限不变', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'limix-report-retention-'))
  try {
    const receipt = join(temp, 'files.json')
    const history = ['old.html', 'old.md', 'old.SVG'].map(file => join(temp, file))
    const secret = join(temp, 'unregistered.html')
    await Promise.all([...history, secret].map(file => writeFile(file, 'history')))
    // 直接写入升级前的共享登记格式，不能要求用户重新生成旧报告。
    await writeFile(receipt, JSON.stringify(await Promise.all(history.map(file => realpath(file)))))
    const artifacts = Array.from({ length: 1002 }, (_, i) => join(temp, `result-${i}.${i % 2 ? 'csv' : 'json'}`))
    await Promise.all(artifacts.map(file => writeFile(file, '1')))
    const access = createCsvAccess([temp], receipt, { extensions: ['.csv', '.json'], registeredOnly: true })
    await access.remember(artifacts, temp)
    const reports = createCsvAccess([temp], receipt, { extensions: ['.html', '.md', '.svg'], registeredOnly: true })
    for (const file of history) assert.equal(await reports.resolve(file), await realpath(file))
    assert.equal(await reports.resolve(secret), null)
    assert.equal(await access.resolve(artifacts[0]), null)
    assert.equal(await access.resolve(artifacts[1]), null)
    assert.equal(await access.resolve(artifacts[2]), await realpath(artifacts[2]))
    assert.equal(await access.resolve(artifacts.at(-1)), await realpath(artifacts.at(-1)))
    assert.equal(JSON.parse(await readFile(receipt, 'utf8')).length, 1003)
    await unlink(history[0])
    assert.equal(await reports.resolve(history[0]), null, '登记不绕过文件存在性检查')
    await unlink(history[1]); await symlink(secret, history[1])
    assert.equal(await reports.resolve(history[1]), null, '旧路径替换为未登记文件的链接仍拒绝')
  } finally { await rm(temp, { recursive: true, force: true }) }
})

test('模型比较命令保留附件、可取消且不自动扫描工作区', async () => {
  const { registerBenchmarkCommand } = await import('../src/host/benchmark-command.js')
  let definition
  const messages = []
  registerBenchmarkCommand({ commands: { register: d => { definition = d } }, systemPrompt: { section() {} } })
  const file = { type: 'file', path: '/data/test.csv' }
  definition.handler({ agent: { followup: m => messages.push(m) }, rawInput: '比较这份数据', attachments: [file] })
  assert.equal(definition.name, 'limix-compare')
  assert.equal(messages[0].content[0], file)
  assert.match(messages[0].content[1].text, /比较这份数据/)
  assert.throws(() => definition.handler({ signal: AbortSignal.abort(), rawInput: '' }))
})


test('已登记的大型时序原始 JSON 可下载，普通 CSV 与超限文件仍拒绝', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'limix-large-artifacts-'))
  try {
    const largeJson = join(temp, 'raw.json'), tooLarge = join(temp, 'oversized.json'), csv = join(temp, 'large.csv')
    await Promise.all([largeJson, tooLarge, csv].map(file => writeFile(file, '{}')))
    await truncate(largeJson, 10_000_000); await truncate(tooLarge, 50_000_001); await truncate(csv, 6_000_000)
    const receipt = join(temp, 'receipt.json')
    const access = createCsvAccess([temp], receipt, { extensions: ['.json', '.csv'], registeredOnly: true, maxBytes: 50_000_000 })
    assert.equal(await access.resolve(largeJson), null)
    await access.remember([largeJson, tooLarge, csv], temp)
    assert.equal(await access.resolve(largeJson), await realpath(largeJson))
    assert.equal(await access.resolve(tooLarge), null)
    assert.equal(await createCsvAccess([temp], receipt).resolve(csv), null)
    assert.throws(() => createCsvAccess([temp], receipt, { maxBytes: -1 }))
  } finally { await rm(temp, { recursive: true, force: true }) }
})
