/**
 * [INPUT]: 真实工具卡、首屏组件与脱敏回归结果。
 * [OUTPUT]: node:test 验证状态、报告附件、帮助卡、指标与模式隔离。
 * [POS]: 防止工具错误误报成功和 LimiX 引导泄漏到标准模式。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(
    fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText, filename)
}
const { LimixToolCard } = require('../src/client/LimixToolCard.tsx')
const { LimixWelcome } = require('../src/client/LimixWelcome.tsx')
const { parseForecastCsv, parseForecastTruth } = require('../src/client/forecast-csv.ts')
const { buildScatter, pickColumn, pickPredLabel } = require('../src/client/eval-csv.ts')
const { ScatterChart } = require('../src/client/ScatterChart.tsx')
const { ExplanationView } = require('../src/client/ExplanationView.tsx')
const { resultState, parseToolResult } = require('../src/client/tool-result.ts')
const fixture = require('./fixtures/regression-node.json')
const explanationLocal = require('./fixtures/explanation-local.json')
const explanationGraph = require('./fixtures/explanation-directed.json')

test('真实局部归因双向贡献条保留全部因素，普通卡折叠，全屏全部展示', () => {
  const html = renderToStaticMarkup(React.createElement(ExplanationView, { data: explanationLocal.explanation }))
  assert.equal((html.match(/class="lx-tornado-bar"/g) ?? []).length, 13)
  assert.match(html, /单条样本正负贡献图/)
  assert.match(html, /nth-child\(n\+7\)/)
  assert.match(html, /data-direction="-1"/)
  assert.match(html, /data-direction="1"/)
  assert.doesNotMatch(html, /解释时预测|重算差异/)
  const checked = renderToStaticMarkup(React.createElement(ExplanationView, { data: explanationLocal.explanation, showPredictionCheck: true }))
  assert.match(checked, /预测值核对|解释时预测/)
  assert.match(checked, /与原预测相差/)
  assert.match(html, /全部 13 个因素/)
  assert.doesNotMatch(html, /贡献分数说明/)
  assert.doesNotMatch(html, /解释模型如何得到本次预测；贡献分数不代表实际调节收益/)
})

test('真实光学图展示两条实际有向边和中文变量', () => {
  const html = renderToStaticMarkup(React.createElement(ExplanationView, { data: explanationGraph.explanation }))
  assert.match(html, /偏振片 1 角度/)
  assert.match(html, /偏振片 2 角度/)
  assert.match(html, /光强读数/)
  assert.equal((html.match(/class="lx-causal-edge"/g) ?? []).length, 2)
  assert.match(html, /0.9596/)
  assert.doesNotMatch(html, /准确率|置信度|提升.*%/)
})

test('扩展任务排队、失败、超时、取消、降级各自保留语义', () => {
  for (const status of ['accepted','queued','running','cancelling']) assert.equal(resultState(true,false,{task_status:status}).kind,'running')
  for (const status of ['failed','timeout']) assert.equal(parseToolResult(JSON.stringify({task_status:status})).failed,true)
  assert.equal(resultState(true,false,{task_status:'cancelled'}).label,'已取消')
  assert.equal(resultState(true,false,{task_status:'degraded_succeeded'}).label,'降级完成')
  assert.equal(resultState(true,false,{task_status:'unknown'}).label,'状态待确认')
})

test('空边列表不伪造关系，非数值分数不渲染', () => {
  const html = renderToStaticMarkup(React.createElement(ExplanationView, {data:{mode:'directed',target:'y',nodes:['x','y'],edges:[]}}))
  assert.match(html,/未发现与目标直接相连/)
  assert.doesNotMatch(html, /<path class="lx-causal-edge"/)
})
const render = (text) => renderToStaticMarkup(React.createElement(LimixToolCard, {
  callId: 'test', block: { ...fixture, kind: 'tool-result', content: [{ type: 'text', text }] },
}))

test('报告卡提供两种文件下载，不重复绘制整份报告', () => {
  const html = renderToStaticMarkup(React.createElement(LimixToolCard, { callId: 'report', openFile() {}, block: {
    kind: 'tool-result', call: { name: 'limix', argsRaw: JSON.stringify({ command: 'report', args: [] }) },
    content: [{ type: 'text', text: JSON.stringify({ kind: 'report', status: 'succeeded', saved_to: '/tmp/report.html', markdown_path: '/tmp/report.md', chart_count: 3 }) }],
  } }))
  assert.match(html, /业务分析报告/)
  assert.match(html, /下载 HTML 报告/)
  assert.match(html, /下载 Markdown/)
  assert.match(html, /3.*张结果图/)
  assert.match(html, /\/limix-ui\/report\?path=/)
  assert.doesNotMatch(html, /lx-bench-chart|lx-contribution-heatmap/)
})

test('真实结果默认展示指标，隐藏 ID、命令和原始返回值', () => {
  const html = render(fixture.content[0].text)
  assert.match(html, /拟合度 R²/)
  assert.match(html, /0.9992/)
  assert.match(html, /0.755%/)
  assert.match(html, /40 个样本参与评估/)
  assert.doesNotMatch(html, /test-regression|result_content|limix regress/)
  assert.match(html, /aria-expanded="false"/)
})
test('非 JSON 与无指标结果不崩溃、不臆造指标', () => {
  assert.match(render('plain output'), /已返回/)
  assert.match(render('{"status":"finished"}'), /未返回评估指标/)
  assert.doesNotMatch(render('{"metrics":{"r2":null}}'), /拟合度 R²/)
})
test('结构化 CLI 失败显示原因，不冒充已完成', () => {
  const html = render('\n[stderr]\n{"ok":false,"error":"目标列不存在","hint":"请检查列名"}')
  assert.match(html, /未完成/)
  assert.match(html, /目标列不存在/)
  assert.match(html, /请检查列名/)
  assert.doesNotMatch(html, /已完成/)
})
test('排队中的异步任务不冒充已完成', () => {
  const html = render('{"task_id":"pending-task","status":"queued","is_ready":false}')
  assert.match(html, /排队中/)
  assert.doesNotMatch(html, /已完成|pending-task/)
})
test('本地报告 error-only 输出显示未完成，不误报成功', () => {
  const html = renderToStaticMarkup(React.createElement(LimixToolCard, { callId: 'report-error', block: {
    kind: 'tool-result', call: { name: 'limix', argsRaw: JSON.stringify({command: 'report'}) },
    content: [{type: 'text', text: JSON.stringify({error: '时序图缺少预测列 pred_cups_sold'})}],
  }}))
  assert.match(html, /未完成/)
  assert.match(html, /时序图缺少预测列/)
  assert.doesNotMatch(html, /已完成|下载 HTML/)
})
test('参数帮助不冒充一次已完成的预测', () => {
  const html = renderToStaticMarkup(React.createElement(LimixToolCard, {
    callId: 'help', block: { kind: 'tool-result', call: { name: 'limix', argsRaw: JSON.stringify({ command: 'forecast', args: ['--help'] }) },
      content: [{ type: 'text', text: 'usage: limix forecast --quantile' }] },
  }))
  assert.match(html, /参数说明/)
  assert.doesNotMatch(html, /时序预测|预测已完成|评估指标/)
})
test('引导仅出现在空白 LimiX 会话', () => {
  const welcome = (preset, blank) => renderToStaticMarkup(React.createElement(LimixWelcome, {
    sessionId: 'test', session: { blank }, inputActions: { setDraft() {} },
    useSessions: select => select({ byId: { test: { projectionValues: { agentPreset: preset } } } }),
  }))
  assert.match(welcome('limix', true), /data-limix-welcome/)
  assert.equal(welcome('standard', true), '')
  assert.equal(welcome(undefined, true), '')
  assert.equal(welcome('limix', false), '')
})

test('默认卡片只显示结果，指标说明收起且图表不重复指标', () => {
  const html = render(fixture.content[0].text)
  assert.match(html, /data-lx="metrics" aria-expanded="false"/)
  assert.doesNotMatch(html, /单位与目标值相同|相对直接猜平均值/)
  const chart = renderToStaticMarkup(React.createElement(ScatterChart, { data: buildScatter(['10', '20'], ['11', '19']) }))
  assert.doesNotMatch(chart, /MAE|RMSE|R²/)
})

test('时序按明确日期列取数，空值不能变成零', () => {
  const csv = '\uFEFFpred_sales,date,pred_q10_sales,pred_q90_sales\n0,2025-01-01,-1,1\n2,2025-01-02,1,3\n'
  const result = parseForecastCsv(csv, 'sales', 'date')
  assert.deepEqual(result.dates, ['2025-01-01', '2025-01-02'])
  assert.deepEqual(result.pred, [0, 2])
  assert.deepEqual(result.p10, [-1, 1])
  assert.equal(parseForecastCsv('date,pred_sales\n2025-01-01,\n', 'sales', 'date'), null)
  assert.equal(parseForecastCsv('date,pred_label\n2025-01-01,1\n'), null)
})

test('时序真值必须与预测日期逐行一致', () => {
  const truth = 'date,sales\n2025-01-01,0\n2025-01-02,2\n'
  assert.deepEqual(parseForecastTruth(truth, 'sales', 'date', ['2025-01-01', '2025-01-02']), [0, 2])
  assert.equal(parseForecastTruth(truth, 'sales', 'date', ['2025-01-02', '2025-01-01']), undefined)
})

test('分类识别 BOM 表头，回归忽略空真值，畸形 CSV 拒绝对齐', () => {
  assert.deepEqual(pickColumn('\uFEFFgrade\nhigh\nlow\n', 'grade'), ['high', 'low'])
  assert.deepEqual(pickPredLabel('\uFEFFpred_label\nhigh\nlow\n'), ['high', 'low'])
  assert.equal(buildScatter(['', '0', '2'], ['100', '0', '2']).n, 2)
  assert.equal(pickColumn('grade,x\nhigh,1\nlow\n', 'grade'), null)
})


test('只有真实解释卡提供全屏入口，入口保留标题和下载', () => {
  for (const output of [explanationLocal, explanationGraph]) {
    const html = renderToStaticMarkup(React.createElement(LimixToolCard, {
      callId:'fullscreen', block:{kind:'tool-result', call:{name:'limix',argsRaw:JSON.stringify({command:'explain',args:[]})},content:[{type:'text',text:JSON.stringify({...output,saved_to:'/tmp/explain.json',csv_path:'/tmp/explain.csv'})}]},
    }))
    assert.match(html,/aria-label="全屏查看解释"/)
    assert.match(html,/class="lx-fullscreen-dialog" role="presentation"/)
    assert.match(html,/原始结果 JSON/)
    assert.doesNotMatch(html, /aria-modal="true"/)
  }
  assert.doesNotMatch(render(fixture.content[0].text),/aria-label="全屏查看解释"/)
})

test('模型比较的部分成功保留结果，失败指标不补零', () => {
  const data = { kind: 'benchmark', status: 'partial', saved_to: '/tmp/comparison.json', csv_path: '/tmp/comparison.csv', report_path: '/tmp/comparison.html',
    datasets: [{ id: 'demo', name: '公开回归样例', task_type: 'regression', train_rows: 80, test_rows: 20, feature_count: 4 }],
    runs: [{ dataset_id: 'demo', model: 'LIMIX_7M', status: 'succeeded', metrics: { rmse: 2.4, r2: -0.3, mae: 1.5 }, elapsed_seconds: 12 },
      { dataset_id: 'demo', model: 'XGBoost', status: 'failed', metrics: { rmse: 0 }, error: '依赖未安装' }] }
  const html = renderToStaticMarkup(React.createElement(LimixToolCard, { callId: 'bench', openFile() {}, block: {
    kind: 'tool-result', call: { name: 'limix', argsRaw: JSON.stringify({ command: 'benchmark' }) }, content: [{ type: 'text', text: JSON.stringify(data) }],
  } }))
  assert.match(html, /部分完成/)
  assert.match(html, /公开回归样例/)
  assert.match(html, /2.4/)
  assert.match(html, /-0.3/)
  assert.match(html, /依赖未安装/)
  assert.match(html, /打开完整报告/)
  assert.match(html, /全屏查看模型比较/)
  assert.doesNotMatch(html, /<td>0<\/td>/)
})

test('单行原始数据保留原值顺序，分类重算不把标签编号相减', () => {
  const { singleSampleMatrix } = require('../src/client/explanation-data.ts')
  const { LocalExplanation } = require('../src/client/LocalExplanation.tsx')
  const data = { mode: 'local', task_type: 'classification', target: 'grade', row_number: 2,
    prediction: 2, prior_prediction: 1, prediction_delta: 1, feature_names: ['a','b'], feature_values: [10,20],
    features: [{ name:'b',label:'乙',score:.8,direction:null },{ name:'a',label:'甲',score:.2,direction:1 }] }
  const matrix=singleSampleMatrix(data)
  assert.deepEqual(matrix.feature_names,['b','a'])
  assert.deepEqual(matrix.samples[0].feature_values,[20,10])
  const html=renderToStaticMarkup(React.createElement(LocalExplanation,{data}))
  assert.doesNotMatch(html,/重算类别/)
  const { PredictionCheck } = require('../src/client/PredictionCheck.tsx')
  const checked=renderToStaticMarkup(React.createElement(PredictionCheck,{data}))
  assert.match(checked,/重算类别 1 → 2/)
  assert.doesNotMatch(checked,/与原预测相差/)
  assert.doesNotMatch(html,/重算差异/)
  assert.match(html,/方向未定/)
})

test('CSV 数字字符串可以按原值范围筛选，空值不当零，分类标签保持类别', () => {
  const { filterFields, filterSamples, emptyFilter } = require('../src/client/explanation-filter.ts')
  const data={task_type:'classification',feature_names:['alcohol'],samples:[
    {row_number:2,prediction:0,feature_values:['9.9']},{row_number:3,prediction:1,feature_values:['9.7']},
    {row_number:4,prediction:1,feature_values:['  ']},{row_number:5,prediction:0,feature_values:['1.06e1']},
  ]}
  assert.equal(filterFields(data)[0].numeric,false)
  assert.equal(filterFields(data)[1].numeric,true)
  assert.deepEqual(filterSamples(data,{...emptyFilter,field:'feature:0',min:'9.8',max:'10'}).map(s=>s.row_number),[2])
  assert.deepEqual(filterSamples(data,{...emptyFilter,field:'feature:0',max:'0'}),[])
})

test('运行态按真实参数区分预测、局部解释、关系探索和比较，未知任务安全回退', () => {
  for (const [command,args,label] of [
    ['regress',[],'LimiX 正在预测'],['classify',[],'LimiX 正在预测类别'],
    ['forecast',[],'LimiX 正在预测未来趋势'],['explain',['--mode','local'],'LimiX 正在分析影响因素'],
    ['explain',['--mode','directed'],'LimiX 正在探索变量关系'],['explain',['--mode','undirected'],'LimiX 正在探索变量关系'],
    ['benchmark',[],'正在比较模型表现'],['unknown',[],'LimiX 正在执行任务'],['forecast',['--help'],'正在读取参数说明'],
  ]) {
    const html=renderToStaticMarkup(React.createElement(LimixToolCard,{callId:'running-test',toolName:'limix',block:{argsRaw:JSON.stringify({command,args})}}))
    assert.ok(html.includes(label),command)
    assert.match(html,/class="lx-running-spinner"/)
    assert.doesNotMatch(html,/class="lx-result-actions"|工具结果/)
  }
})

test('轮尾默认三项，折叠失败可见，辅助调用不计入业务任务数', () => {
  const { LimixTurnStack }=require('../src/client/LimixTurnStack.tsx')
  const nodes=Array.from({length:6},(_,i)=>({seq:i+1,call:{name:'limix',argsRaw:JSON.stringify({command:'regress',args:['--target',`target${i}`]})},isError:i===4,content:[{type:'text',text:JSON.stringify({status:i===4?'failed':'finished'})}]}))
  nodes.push({seq:7,call:{name:'limix',argsRaw:JSON.stringify({command:'health'})},content:[{type:'text',text:'{}'}]})
  const html=renderToStaticMarkup(React.createElement(LimixTurnStack,{turn:{start:{seq:0},end:{seq:8}},sessionId:'test',useTrajectory:fn=>fn({eventNodes:nodes})}))
  assert.match(html,/6 个任务/);assert.match(html,/展开其余 3 个任务 · 其中 1 个未完成/)
  assert.match(html,/target2/);assert.doesNotMatch(html,/target3|其它调用/)
  assert.match(html,/查看本轮任务流程/)
})

test('同一比较续查只显示最新结果，报告核验归辅助调用', () => {
  const {LimixTurnStack}=require('../src/client/LimixTurnStack.tsx')
  const results=[['report',{kind:'report_facts'}],['benchmark',{kind:'benchmark',saved_to:'/tmp/comparison.json',status:'pending'}],['benchmark',{kind:'benchmark',saved_to:'/tmp/comparison.json',status:'finished'}]]
  const nodes=results.map(([command,data],i)=>({seq:i+1,call:{name:'limix',argsRaw:JSON.stringify({command,args:[]})},content:[{type:'text',text:JSON.stringify(data)}]}))
  const html=renderToStaticMarkup(React.createElement(LimixTurnStack,{turn:{start:{seq:0},end:{seq:4}},sessionId:'test',useTrajectory:fn=>fn({eventNodes:nodes})}))
  assert.match(html,/1 个任务/);assert.doesNotMatch(html,/分析报告|处理中/);assert.match(html,/查看辅助调用/)
})
