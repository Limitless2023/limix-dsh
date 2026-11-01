/**
 * [INPUT]: 宿主参数规范化与工具注册入口。
 * [OUTPUT]: 重复命令容错及位置参数原样保留的回归验证。
 * [POS]: 调用边界测试；不请求远端服务。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { normalizeCommandArgs, registerLimixTool } from '../src/host/tool.js'

test('预测移除重复命令词，不改变路径或位置参数', () => {
  assert.deepEqual(normalizeCommandArgs('forecast', ['forecast', '--train', 'a b.csv']), ['--train', 'a b.csv'])
  assert.deepEqual(normalizeCommandArgs('forecast', ['--train', 'forecast']), ['--train', 'forecast'])
  assert.deepEqual(normalizeCommandArgs('upload', ['upload', '--help']), ['upload', '--help'])
  assert.deepEqual(normalizeCommandArgs('task', ['task']), ['task'])
})

test('宿主报告分支同样接收规范化参数', async () => {
  let tool, received
  registerLimixTool({ tools: { register(value) { tool = value } } }, {
    cliPath: fileURLToPath(new URL('../assets/limix.py', import.meta.url)), preparePython: false,
    reportCommand: async (args) => { received = args; return { exitCode: 0, stdout: '{}', stderr: '' } },
  })
  const result = await tool.execute({ command: 'report', args: ['report', '--help'] }, {})
  assert.deepEqual(received, ['--help'])
  assert.equal(result.exitCode, 0)
})
