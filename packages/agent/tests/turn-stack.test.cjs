/**
 * [INPUT]: 真实任务卡组件、脱敏日志节点与宿主 React。
 * [OUTPUT]: node:test 验证指标展示、缺指标降级、轮次隔离与帮助过滤。
 * [POS]: 浏览器卡片的渲染契约回归检查。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const fixture = require('./fixtures/regression-node.json')
const source = fs.readFileSync(require.resolve('../src/client/LimixTurnStack.tsx'), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText
const exports_ = {}
vm.runInNewContext(code, { exports: exports_, require: (name) => name === 'react'
  ? { ...React, useMemo: (f) => f(), useState: (v) => [v, () => {}], useEffect: () => {} }
  : name === './tool-result.ts' ? (() => {
    const helper = {}
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/client/tool-result.ts'), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: helper })
    return helper
  })() : require(name) })
const render = (node) => renderToStaticMarkup(exports_.LimixTurnStack({
  turn: { start: { seq: 1 }, end: { seq: 40 } },
  useTrajectory: (select) => select({ eventNodes: [node] }),
}))
const withText = (text) => ({ ...fixture, content: [{ type: 'text', text }] })

test('真实日志的 metrics 渲染为 R²', () => {
  assert.match(render(fixture), /R²/)
  assert.match(render(fixture), /0.9992/)
  assert.match(render(fixture), /40 行/)
})
test('不从 stderr 猜指标，缺 metrics 不崩溃', () => {
  const html = render(withText('{"status":"finished"}\n[stderr]\nr2: 1.0'))
  assert.match(html, /已完成/)
  assert.doesNotMatch(html, /R²/)
})
test('零分是有效指标，字符串与 null 不是数值', () => {
  assert.match(render(withText('{"metrics":{"r2":0}}')), /R²/)
  for (const value of ['null', '"1.0"']) {
    assert.doesNotMatch(render(withText('{"metrics":{"r2":' + value + '}}')), /R²/)
  }
})
test('只显示当前轮次的 limix 结果', () => {
  assert.equal(render({ ...fixture, seq: 41 }), '')
  assert.equal(render({ ...fixture, call: { name: 'bash' } }), '')
})
test('参数帮助不计入预测任务摘要', () => {
  assert.equal(render({ ...fixture, call: { name: 'limix', argsRaw: JSON.stringify({ command: 'forecast', args: ['--help'] }) } }), '')
})

test('错误与等待状态在轮次摘要中保持一致', () => {
  assert.match(render(withText('\n[stderr]\n{"ok":false,"error":"invalid target"}')), /未完成/)
  assert.match(render(withText('{"status":"queued","is_ready":false}')), /排队中/)
})
