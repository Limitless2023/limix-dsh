/**
 * [INPUT]: 依赖 Node 测试库与 lib/index.js 构建产物；临时 DSH_HOME 隔离真实配置。
 * [OUTPUT]: 验证注册给宿主的参数、返回值和空数据源调用契约。
 * [POS]: data 插件的回归入口，阻止无效 schema 进入桌面端。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { apply } from '../lib/index.js'

test('datasource 注册完整 JSON Schema，并能列出空数据源', async () => {
  const home = mkdtempSync(join(tmpdir(), 'limix-data-contract-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const tools = []
    apply({
      tools: { register: (tool) => tools.push(tool) },
      effect: () => {},
    })
    assert.equal(tools.length, 1)
    const tool = tools[0]
    assert.equal(tool.name, 'datasource')
    const parameters = tool.parameters
    assert.equal(parameters.type, 'object')
    assert.equal(parameters.additionalProperties, false)
    assert.deepEqual(parameters.required, ['command'])
    assert.deepEqual(Object.keys(parameters.properties), [
      'command', 'source', 'table', 'sql', 'mode', 'fileName', 'workdir',
    ])
    assert.deepEqual(parameters.properties.command.enum, ['list', 'inspect', 'query'])
    assert.deepEqual(parameters.properties.mode.enum, ['preview', 'materialize'])
    for (const property of Object.values(parameters.properties)) {
      assert.equal(property.type, 'string')
      assert.equal(typeof property.description, 'string')
      assert.equal(Object.hasOwn(property, 'required'), false)
    }
    assert.equal(tool.output.schema.type, 'object')
    assert.deepEqual(tool.output.schema.required, ['command', 'ok', 'text'])
    assert.equal(tool.output.schema.properties.ok.type, 'boolean')
    const result = await tool.execute({ command: 'list' })
    assert.equal(result.ok, true)
    assert.equal(result.command, 'list')
    assert.deepEqual(JSON.parse(result.text).数据源, [])
    assert.deepEqual(tool.output.render({ command: 'list' }, result), [
      { type: 'text', text: result.text },
    ])
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  }
})
