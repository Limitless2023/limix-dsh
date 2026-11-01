/**
 * [INPUT]: 真实分析过程组件、按 DSH 节点结构构造的脱敏日志与宿主 React。
 * [OUTPUT]: node:test 验证 LimiX 分类、次数、接口步骤、失败原因、业务流程、辅助步骤归并、文件去重、业务摘要与默认折叠。
 * [POS]: 分析过程的解析与渲染回归检查；不从日志猜指标。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(
    fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText, filename)
}
const load = require
const client = (name) => path.resolve(__dirname, '../src/client', name)
const { parseRounds, roundDur } = load(client('pipeline-model.ts'))
const { flowSteps, stepTitle, stepSummary, stepFiles, explanationMode } = load(client('pipeline-flow.ts'))
const { classifyLimix, parseSteps } = load(client('pipeline-stage.ts'))
const { LimixPipelineView } = load(client('LimixPipelineView.tsx'))

const user = (seq, text) => ({ kind: 'user', seq, time: seq * 1000, content: [{ type: 'text', text }] })
const assistant = (seq, blocks) => ({ kind: 'assistant', seq, time: seq * 1000, blocks })
const tool = (seq, name, args, text, extra = {}) => ({
  kind: 'tool-result', seq, time: seq * 1000, callTime: seq * 1000 - 400,
  call: { name, argsRaw: JSON.stringify(args) }, content: [{ type: 'text', text }], ...extra,
})
const regressArgs = { command: 'regress', args: ['--train', '/d/reference.csv', '--predict', '/d/predict.csv', '--target', 'y', '--truth', '/d/truth.csv'] }
const regressText = `${JSON.stringify({ task_id: 'task-p', status: 'finished', model_type: 'LIMIX_16M', result_version_id: 'version-p', metrics: { n: 5, r2: 0.8881, rmse: 95.9253 } })}\n[stderr]\n上传成功: reference.csv → a (249行×14列, reused)\n已提交异步任务 task-p\n任务 task-p: queued\n任务 task-p: running\n任务 task-p: finished\n已下载 → /d/my result.csv (412 bytes)\n`
const explainArgs = { command: 'explain', args: ['--mode', 'local', '--data', '/d/predict.csv', '--target', 'y', '--task-type', 'regression', '--rows', 'all', '--model', 'LIMIX_16M', '-o', '/d/e.json'] }
const explainText = `${JSON.stringify({ task_id: 'task-e', task_status: 'succeeded', result_id: 'result-e', explanation: { mode: 'local', requested_count: 5, explained_count: 5, feature_names: ['a', 'b'] } })}\n[stderr]\n解释任务 task-e；回执 /d/e.receipt.json\n任务 task-e: running\n任务 task-e: succeeded\n已保存解释 → /d/e.json\n`
const benchmarkArgs = { command: 'benchmark', args: ['--manifest', '/d/m.json', '--models', 'LIMIX_16M,BASELINE', '-o', '/d/b.json'] }
const benchmarkText = `${JSON.stringify({ kind: 'benchmark', status: 'succeeded', datasets: [{ id: 's', name: '钢材', task_type: 'regression', unit: 'MPa' }], runs: [
  { dataset_id: 's', model: 'LIMIX_16M', status: 'succeeded', metrics: { rmse: 95.9253 } },
  { dataset_id: 's', model: 'BASELINE', status: 'succeeded', metrics: { rmse: 431.1327 } },
] })}\n[stderr]\nbenchmark s/LIMIX_16M: succeeded\n`
const graphText = JSON.stringify({ task_id: 'task-g', task_status: 'succeeded', explanation: { mode: 'directed', nodes: ['a', 'b', 'y'], edges: [{ source: 'a', target: 'y', weight: 0.9 }] } })

test('本地报告不计入 API 调用，分析过程收集 HTML 与 Markdown', () => {
  assert.deepEqual(classifyLimix({ command: 'report', args: [] }), { title: '报告输出', limix: false })
  const result = JSON.stringify({ kind: 'report', status: 'succeeded', saved_to: '/d/report.html', report_path: '/d/report.html', markdown_path: '/d/report.md', chart_count: 3 })
  const nodes = [user(1, '生成报告'), tool(2, 'limix', { command: 'report', args: [] }, result)]
  const html = render(nodes)
  assert.match(html, /报告输出/)
  const files = stepFiles(flowSteps(parseRounds(nodes, [])[0])[0]).map(f => f.path)
  assert.deepEqual(files, ['/d/report.html', '/d/report.md'])
})

const render = (nodes) => renderToStaticMarkup(React.createElement(LimixPipelineView, {
  useTrajectory: (select) => select({ eventNodes: nodes, runningCalls: [] }),
}))
/** 组件在独立 vm 中运行，数组原型不同；比较前转成本上下文的普通值 */
const plain = (value) => JSON.parse(JSON.stringify(value))
const session = () => [
  user(1, '预测并解释'),
  assistant(2, [{ kind: 'reasoning', text: 'Let me read the files.' }, { kind: 'text', text: '我先核对输入文件。' }]),
  tool(3, 'read', { file_path: '/d/reference.csv' }, 'a,b,y'),
  tool(4, 'limix', regressArgs, regressText),
  tool(5, 'limix', explainArgs, explainText),
  tool(6, 'bash', { command: "python3 - <<'PY'", description: '核对预测范围' }, 'ok'),
  tool(7, 'write', { file_path: '/d/REPORT.md', content: '# 报告' }, 'written'),
  assistant(8, [{ kind: 'text', text: '## 结论\n模型可用于初筛。' }]),
]

test('解释与比较按真实语义分类', () => {
  assert.equal(classifyLimix(explainArgs).title, '因果解释')
  assert.equal(classifyLimix({ command: 'explain', args: ['--mode', 'directed'] }).title, '因果解释')
  assert.equal(classifyLimix({ command: 'explain', args: ['--mode', 'undirected'] }).title, '因果解释')
  assert.equal(classifyLimix({ command: 'explain', args: ['--mode', 'local', '--task-type', 'timeseries'] }).title, '因果解释')
  assert.equal(classifyLimix(benchmarkArgs).title, '模型比较')
})
test('--help 与纯本地比较不计入 LimiX 调用', () => {
  assert.equal(classifyLimix({ command: 'explain', args: ['--help'] }).limix, false)
  assert.equal(classifyLimix({ command: 'benchmark', args: ['--models', 'XGBoost,BASELINE'] }).limix, false)
  const [round] = parseRounds([user(1, '看用法'), tool(2, 'limix', { command: 'explain', args: ['--help'] }, 'usage: limix.py explain')], [])
  assert.equal(round.stages.filter(s => s.limix).length, 0)
  assert.equal(round.stages[0].title, '查看命令说明')
})
test('接口步骤合并轮询，并兼容旧会话日志', () => {
  assert.deepEqual(plain(parseSteps(regressText)), ['上传 reference.csv', '提交任务', '任务完成', '下载 my result.csv'])
  assert.deepEqual(plain(parseSteps(explainText)), ['提交解释', '任务完成', '保存 e.json'])
  assert.deepEqual(plain(parseSteps('{}\n[stderr]\n上传成功: explain-row.csv → b\n解释任务 t；回执 r\n')), ['上传 explain-row.csv', '提交解释'])
  assert.deepEqual(plain(parseSteps('{}\n[stderr]\n续查解释任务 t\n任务 t: failed\n')), ['续查任务', '任务失败'])
  assert.deepEqual(plain(parseSteps('{}')), [])
})
test('结果行来自工具输出，不从日志猜指标', () => {
  const [round] = parseRounds([user(1, 'x'), tool(2, 'limix', regressArgs, regressText), tool(90000, 'limix', explainArgs, explainText),
    tool(180000, 'limix', benchmarkArgs, benchmarkText), tool(270000, 'limix', { command: 'explain', args: ['--mode', 'directed'] }, graphText)], [])
  const [predict, local, compare, graph] = round.stages
  assert.equal(predict.meta, 'LIMIX_16M · 目标 y · 参考 reference.csv · 预测 predict.csv')
  assert.equal(predict.outcome, '5 行 · 拟合度 R² 0.8881 · 均方根误差 95.9253')
  assert.equal(local.meta, 'LIMIX_16M · 全部样本 · 目标 y · predict.csv')
  assert.equal(local.outcome, '已解释 5/5 行 · 2 个特征')
  assert.deepEqual(plain(local.ids[1]), ['解释结果', 'result-e'])
  assert.equal(compare.outcome, 'RMSE：LIMIX_16M 95.93，BASELINE 431.13 MPa')
  assert.equal(graph.outcome, '3 个变量 · 1 条关系')
  const noMetric = parseRounds([user(1, 'x'), tool(2, 'limix', regressArgs, '{"status":"finished"}\n[stderr]\nr2: 1.0')], [])[0].stages[0]
  assert.equal(noMetric.outcome, '')
})
test('失败、超时等待和降级保留真实状态', () => {
  const failed = tool(2, 'limix', explainArgs, '\n[stderr]\n上传成功: a.csv → b\n{\n  "ok": false,\n  "error": "服务执行失败"\n}')
  const stage = parseRounds([user(1, 'x'), failed], [])[0].stages[0]
  assert.equal(stage.ok, false)
  assert.equal(stage.stateLabel, '未完成')
  assert.equal(stage.errLine, '服务执行失败')
  const degraded = tool(3, 'limix', explainArgs, JSON.stringify({ task_id: 't', task_status: 'degraded_succeeded', explanation: {} }))
  assert.equal(parseRounds([user(1, 'x'), degraded], [])[0].stages[0].stateLabel, '降级完成')
})
test('stderr 错误 JSON 译成可读失败原因', () => {
  const text = '\n[stderr]\n{"ok": false, "error": "解释仍在运行，保留回执", "task_id": "t"}'
  const stage = parseRounds([user(1, 'x'), tool(2, 'limix', explainArgs, text)], [])[0].stages[0]
  assert.equal(stage.errLine, '解释仍在运行，保留回执')
})
test('本地工具按宿主现行名称翻译', () => {
  const [round] = parseRounds(session(), [])
  const titles = round.stages.filter(s => !s.limix).map(s => s.title)
  assert.deepEqual(plain(titles), ['读取文件 reference.csv', '核对预测范围', '生成报告 REPORT.md'])
})
test('时间线按发生顺序保留回复、思考和工具', () => {
  const [round] = parseRounds(session(), [])
  assert.deepEqual(plain(round.timeline.map(e => e.type)), ['thinking', 'reply', 'stage', 'stage', 'stage', 'stage', 'stage', 'reply'])
  assert.equal(round.result, '模型可用于初筛。')
  assert.equal(roundDur(round), '4s')
})
test('运行中的调用进入当前轮，不计完成耗时', () => {
  const [round] = parseRounds([user(1, 'x')], [{ name: 'limix', callId: 'c', argsRaw: JSON.stringify(explainArgs) }])
  assert.equal(round.stages[0].running, true)
  assert.equal(round.stages[0].title, '因果解释')
  assert.equal(roundDur(round), '运行中')
})
test('统一流程保留数据、预测、因果解释与报告，默认不展示日志', () => {
  const html = render(session())
  for (const title of ['数据处理', '回归预测', '因果解释', '报告输出']) assert.match(html, new RegExp(title))
  assert.doesNotMatch(html, /简略版|详细版|Let me read|结论：|提交解释|原始参数/)
  assert.doesNotMatch(html, /\/d\/reference.csv/)
})
test('本地分析也呈现完整流程，无工具时显示空状态', () => {
  assert.match(render([user(1, '分析已有结果'), tool(2, 'bash', { command: 'ls', description: '分析已有预测结果' }, 'ok')]), /结果分析/)
  assert.match(render([user(1, '你好'), assistant(2, [{ kind: 'text', text: '你好' }])]), /还没有分析活动/)
})
test('相邻数据读取归并；失败报告写入没有文件入口', () => {
  const [round] = parseRounds([user(1, '分析'), tool(2, 'read', {file_path:'/d/a.csv'}, 'a'),
    tool(3, 'read', {file_path:'/d/b.csv'}, 'b'), tool(4, 'write', {file_path:'/d/report.md'}, 'failed', {isError:true})], [])
  const steps = flowSteps(round)
  assert.deepEqual(steps.map(s => s.title), ['数据处理', '报告输出'])
  assert.equal(stepSummary(steps[0]), '读取 a.csv；读取 b.csv')
  assert.equal(stepFiles(steps[1]).length, 0)
})
test('因果解释使用官方三种模式名称', () => {
  for (const [mode, label] of [['local', '局部归因'], ['directed', '全局因果 · 有向'], ['undirected', '全局因果 · 无向']]) {
    const [round] = parseRounds([user(1, '解释'), tool(2, 'limix', {command:'explain',args:['--mode',mode]}, '{}')], [])
    assert.equal(explanationMode(round.stages[0]), label)
  }
})
test('跨轮次按发生顺序展示，原始回复不冒充结论', () => {
  const html = render([...session(), user(9, '修订报告'), tool(10, 'edit', {file_path:'/d/REPORT.md'}, 'edited')])
  assert.ok(html.indexOf('开始分析') < html.indexOf('报告修订'))
  assert.doesNotMatch(html, /模型可用于初筛/)
})
test('结论行保留链接标题，不露出 Markdown 路径', () => {
  const [round] = parseRounds([user(1, 'x'), assistant(2, [{ kind: 'text', text: '修订后的报告已打开：[report.md](<_recon/a b/report.md>)。' }])], [])
  assert.equal(round.result, '修订后的报告已打开：report.md。')
  const [plainRound] = parseRounds([user(1, 'x'), assistant(2, [{ kind: 'text', text: '无向**没跑通**，状态 `failed`。' }])], [])
  assert.equal(plainRound.result, '无向没跑通，状态 failed。')
})
test('空思考块不进入时间线', () => {
  const [round] = parseRounds([user(1, 'x'), assistant(2, [{ kind: 'reasoning', text: '' }, { kind: 'text', text: '好的，开始。' }])], [])
  assert.deepEqual(plain(round.timeline.map(e => e.type)), ['reply'])
})

test('已有返回结果时，后续调用运行中仍显示运行中', () => {
  const [round] = parseRounds([user(1, '继续分析'), tool(2, 'limix', regressArgs, regressText)],
    [{ name: 'limix', callId: 'later', argsRaw: JSON.stringify(explainArgs) }])
  assert.equal(roundDur(round), '运行中')
})
test('比较摘要排除失败组和溢出的数值', () => {
  const text = '{"kind":"benchmark","status":"partial","datasets":[{"task_type":"regression"}],"runs":[{"model":"bad","status":"failed","metrics":{"rmse":1}},{"model":"overflow","status":"succeeded","metrics":{"rmse":1e400}}]}'
  const [round] = parseRounds([user(1, '比较'), tool(2, 'limix', benchmarkArgs, text)], [])
  assert.equal(round.stages[0].outcome, '1/2 组完成')
  assert.equal(round.stages[0].stateLabel, '部分完成')
})

test('环境准备、帮助与报告复核进入业务步骤，记录不丢失', () => {
  const nodes = [user(1, '分析'), tool(2, 'read', {file_path:'/d/a.csv'}, 'a'),
    tool(3, 'load_workspace_dependencies', {}, '{}'), tool(4, 'limix', {command:'explain',args:['--help']}, 'usage'),
    tool(5, 'limix', regressArgs, regressText), tool(6, 'write', {file_path:'/d/report.md'}, 'written'),
    tool(7, 'bash', {description:'Verify report contents',command:'cat report.md'}, 'ok'),
    tool(8, 'present', {files:[{path:'report.md'}]}, 'shown')]
  const steps = flowSteps(parseRounds(nodes, [])[0], '/d')
  assert.deepEqual(steps.map(s => s.title), ['数据处理', '回归预测', '报告输出'])
  assert.equal(steps.reduce((n,s)=>n+s.stages.length,0), 7)
  assert.equal(stepFiles(steps[2]).filter(f=>f.role==='output').length, 1)
})
test('不同因果解释模式和不同预测参数保持独立步骤', () => {
  const nodes = [user(1, '比较'), tool(2,'limix',explainArgs,explainText),
    tool(3,'limix',{command:'explain',args:['--mode','directed']},graphText),
    tool(4,'limix',regressArgs,regressText), tool(5,'limix',{command:'classify',args:[]},'{}')]
  const steps=flowSteps(parseRounds(nodes,[])[0])
  assert.equal(steps.length,4)
  assert.deepEqual(steps.map(s=>s.title),['因果解释','因果解释','回归预测','分类预测'])
})
test('运行中默认展开；失败原因在收起状态也可见', () => {
  const html=renderToStaticMarkup(React.createElement(LimixPipelineView,{
    useTrajectory:select=>select({eventNodes:[user(1,'解释')],runningCalls:[{name:'limix',argsRaw:JSON.stringify(explainArgs)}]})
  }))
  assert.match(html,/aria-expanded="true"/)
  assert.match(html,/局部归因/)
  const failed=render([user(1,'预测'),tool(2,'limix',regressArgs,'{"ok":false,"error":"输入缺少目标列"}')])
  assert.match(failed,/输入缺少目标列/)
  assert.match(failed,/有未完成步骤/)
})

test('结果节点按实际对象区分，摘要描述动作而非操作计数', () => {
  const [round] = parseRounds([user(1, '分析'), tool(2, 'limix', regressArgs, regressText),
    tool(3, 'bash', {description:'Show prediction and comparison CSVs'}, 'ok'),
    tool(4, 'limix', explainArgs, explainText),
    tool(5, 'bash', {description:'Summarize per-row contributions and predictions'}, '逐行预测对照（解释时预测 vs 原预测）')], [])
  const results = flowSteps(round).filter(s => s.title === '结果分析')
  assert.deepEqual(results.map(stepTitle), ['预测结果核对', '归因结果解读'])
  assert.deepEqual(results.map(stepSummary), ['读取预测结果与模型比较明细', '汇总逐样本特征贡献；对照解释时预测与原预测'])
  assert.doesNotMatch(render(session()), /项操作/)
})
test('失败与运行中的操作不写成已完成的数据动作', () => {
  const [failed] = parseRounds([user(1, '清洗'), tool(2, 'bash', {description:'清洗数据'}, 'failed', {isError:true})], [])
  assert.equal(stepSummary(flowSteps(failed)[0]), '未完成，展开查看原因与执行记录')
  const [running] = parseRounds([user(1, '清洗')], [{name:'bash',callId:'c',argsRaw:JSON.stringify({description:'清洗数据'})}])
  assert.equal(stepSummary(flowSteps(running)[0]), '正在执行，结果返回后更新摘要')
})
test('报告摘要分别描述保存与修订，不把失败的后续写入算成完成', () => {
  const [round] = parseRounds([user(1, '报告'), tool(2, 'edit', {file_path:'/d/report.md'}, 'edited'),
    tool(3, 'write', {file_path:'/d/report.html'}, 'written'),
    tool(4, 'write', {file_path:'/d/report.pdf'}, 'failed', {isError:true})], [])
  assert.equal(stepSummary(flowSteps(round)[0]), '分析报告已修订；HTML 报告已保存；仍有操作未完成')
})

 test('报告事实核验不冒充生成报告，环境准备不计入 API', () => {
  assert.equal(classifyLimix({command:'report',args:['--inspect']}).title, '结果分析')
  assert.equal(classifyLimix({command:'runtime',args:['status']}).limix, false)
  const [round]=parseRounds([user(1,'核验'),tool(2,'limix',{command:'report',args:['--inspect']},'{"kind":"report_facts","ok":true}')],[])
  assert.equal(round.stages[0].outcome,'已核验图表指标与样本范围')
  assert.equal(stepFiles(flowSteps(round)[0]).length,0)
})
