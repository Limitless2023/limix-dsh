/**
 * [INPUT]: 真实批量/时序解释夹具与筛选、原始表、SVG 导出纯函数。
 * [OUTPUT]: 行步身份、方向语义、未知尺度、筛选和独立导出的回归测试。
 * [POS]: 解释交互的数据契约；桌面验证负责点击与 PNG 下载。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const { test } = require('node:test'), assert = require('node:assert/strict')
const fs = require('node:fs'), ts = require('typescript'), React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
for (const ext of ['.ts','.tsx']) require.extensions[ext] = (module,file) => module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file)
const { emptyFilter, filterSamples, filterFields, filterError, filterDescription } = require('../src/client/explanation-filter.ts')
const { contributionMatrix, contributionScales } = require('../src/client/contribution-matrix.ts')
const { contributionExportSvg, singleContributionExportSvg, graphExportSvg } = require('../src/client/explanation-export.ts')
const { explanationRecords } = require('../src/client/ExplanationDataTable.tsx')
const { batchDetailKey, validBatchDetail, sampleView, sampleLabel } = require('../src/client/explanation-data.ts')
const { ContributionHeatmap } = require('../src/client/ContributionHeatmap.tsx')
const { ExplanationView } = require('../src/client/ExplanationView.tsx')
const { LocalExplanation } = require('../src/client/LocalExplanation.tsx')
const { ExplanationDataTable } = require('../src/client/ExplanationDataTable.tsx')
const batch = require('./fixtures/explanation-batch.json'), timeseries = require('./fixtures/explanation-timeseries.json'), graph = require('./fixtures/explanation-network.json')

test('筛选只保留原始样本，行范围与数值条件求交集，兼容旧文件', () => {
  const threshold = Math.max(...batch.samples.slice(9,19).map(s => s.prediction))
  const filter = { ...emptyFilter, rowFrom:'10',rowTo:'19',field:'prediction',max:String(threshold) }
  const matches = filterSamples(batch,filter)
  assert.deepEqual(matches.map(s => s.row_number), Array.from({length:10},(_,i) => i + 10))
  assert.equal(matches[0], batch.samples[9])
  assert.deepEqual(filterFields(batch).map(f => f.key),['prediction'])
  const html = renderToStaticMarkup(React.createElement(ContributionHeatmap,{ data:{...batch,samples:matches} }))
  assert.match(html,/data-row="10" data-index="0"/)
  assert.match(html,/第 10 行/)
  assert.equal(filterSamples(batch,{...filter,min:String(threshold + 1),max:''}).length,0)
})

test('特征原值支持数值与类别，缺失原值不命中，不把零当缺失', () => {
  const data = {mode:'local',target:'y',feature_names:['x','category'],samples:[
    {row_number:8,prediction:'A',scores:[.1,.2],directions:[1,-1],feature_values:[0,'a']},
    {row_number:21,prediction:'B',scores:[.2,.3],directions:[1,-1],feature_values:[10,'b']},
    {row_number:65,prediction:'A',scores:[.3,.4],directions:[1,-1],feature_values:[null,null]},
  ]}
  assert.deepEqual(filterFields(data).map(f => f.numeric),[false,true,false])
  assert.deepEqual(filterSamples(data,{...emptyFilter,field:'feature:0',min:'0',max:'0'}).map(s => s.row_number),[8])
  assert.deepEqual(filterSamples(data,{...emptyFilter,field:'feature:1',equals:'b'}).map(s => s.row_number),[21])
  assert.deepEqual(filterSamples(data,{...emptyFilter,field:'prediction',equals:'A'}).map(s => s.row_number),[8,65])
  for(const filter of [{rowFrom:'2.5'},{rowFrom:'0'},{rowFrom:'20',rowTo:'10'},{min:'Infinity'},{min:'3',max:'2'},{field:'feature:8'}]) assert.ok(filterError({...emptyFilter,...filter},data))
})

test('筛选均值比总体更大时两组仍共用色阶与均值轴，不截断条形', () => {
  const data = {mode:'local',target:'y',feature_names:['a'],samples:[{row_number:1,prediction:1,scores:[1],directions:[1]},{row_number:2,prediction:2,scores:[1],directions:[-1]}]}
  const filtered = {...data,samples:[data.samples[0]]}, scales = contributionScales(data,filtered)
  assert.deepEqual(scales,{maximum:1,meanMaximum:1})
  const full = renderToStaticMarkup(React.createElement(ContributionHeatmap,{data,scales})), subset = renderToStaticMarkup(React.createElement(ContributionHeatmap,{data:filtered,scales}))
  assert.match(full,/data-value="0"/); assert.match(subset,/data-value="1"/)
  assert.match(full,/负向 −1/); assert.match(subset,/负向 −1/)
})

test('原始表保留全部贡献及数值精度，数据顺序独立于贡献排名', () => {
  const records = explanationRecords(batch)
  assert.equal(records.length,63 * 13)
  assert.equal(records[13].row,2)
  assert.equal(records[13].values[3],batch.feature_names[0])
  assert.equal(records[13].values[5],String(batch.samples[1].scores[0]))
  assert.equal(records.at(-1).row,63)
  assert.equal(explanationRecords(graph).length,28)
})

test('真实时序保留不连续预测步和服务时间，不要求伪造预测或原值', () => {
  assert.ok(validBatchDetail(timeseries,timeseries))
  const missing = structuredClone(timeseries); delete missing.samples[0].prediction
  assert.ok(validBatchDetail(missing,timeseries))
  const wrong = structuredClone(timeseries); wrong.samples[0].feature_values = [1]
  assert.equal(validBatchDetail(wrong,timeseries),false)
  assert.deepEqual(timeseries.samples.map(s => s.step),[1,2,240,480])
  const match = filterSamples(timeseries,{...emptyFilter,rowFrom:'240'})
  assert.deepEqual(match.map(s => s.row_number),[240,480])
  const view = sampleView(timeseries,match[1])
  assert.equal(view.step,480); assert.equal(view.timestamp,timeseries.samples[3].timestamp)
  assert.match(sampleLabel(match[1],timeseries),/第 480 步 · 2026-/)
  const html = renderToStaticMarkup(React.createElement(ExplanationView,{data:timeseries}))
  assert.equal((html.match(/class="lx-matrix-cell"/g)??[]).length,4 * 43)
  assert.ok(html.includes(timeseries.samples[3].timestamp))
  assert.deepEqual(filterFields(timeseries).map(f => f.key),['prediction'])
})

test('独立 SVG 导出包含全部色块、筛选覆盖率、完整字段、时间与显式主题色', () => {
  const filter = {...emptyFilter,rowFrom:'10',rowTo:'19'}, filtered = {...batch,samples:filterSamples(batch,filter)}
  const svg = contributionExportSvg(batch,filtered,filterDescription(filter,batch),{background:'#17202a',foreground:'#f0f4f8',border:'#445566'})
  assert.equal((svg.match(/fill-opacity=/g)??[]).length,(63 + 10) * 13)
  assert.match(svg,/当前筛选 · 10 个样本 · 覆盖率/); assert.match(svg,/原始行 10–19/)
  assert.match(svg,/#17202a/); assert.match(svg,/#f0f4f8/)
  assert.match(svg,/各影响因子影响分数对比/); assert.match(svg,/蓝色负向 · 绿色正向/)
  assert.doesNotMatch(svg,/var\(|currentColor|foreignObject|NaN|Infinity/)
  for(const name of batch.feature_names) assert.ok(svg.includes(name))
  const timeSvg = contributionExportSvg(timeseries)
  assert.ok(timeSvg.includes(timeseries.samples[0].timestamp)); assert.ok(timeSvg.includes(timeseries.samples[3].timestamp))
  const emptySvg = contributionExportSvg(batch,{...batch,samples:[]},'零命中')
  assert.match(emptySvg,/没有符合条件的样本/); assert.doesNotMatch(emptySvg,/NaN|Infinity/)
})

test('关系 SVG 保留完整网络并转义外部标签，不引入可执行内容', () => {
  const svg = graphExportSvg(graph)
  assert.equal((svg.match(/<rect x=/g)??[]).length,20)
  assert.equal((svg.match(/marker-end=/g)??[]).length,28)
  assert.match(svg,/20 个变量 · 28 条关系/)
  assert.doesNotMatch(svg,/var\(|currentColor|foreignObject/)
  const escaped = graphExportSvg({...graph,target_label:'<script>alert(1)</script>'})
  assert.match(escaped,/&lt;script&gt;/); assert.doesNotMatch(escaped,/<script>/)
})

test('明确中性计入零均值，缺失方向不补零；表格、图例和导出保持同一口径', () => {
  const data = { mode:'local',target:'y',feature_names:['neutral','unknown'],samples:[
    {row_number:1,prediction:1,scores:[.8,.8],directions:[0,null]},
    {row_number:2,prediction:2,scores:[.4,.4],directions:[0,null]},
  ] }
  const matrix = contributionMatrix(data), [neutral,unknown] = matrix.ranking
  assert.equal(neutral.mean,0); assert.equal(neutral.unknownCount,0)
  assert.equal(unknown.mean,null); assert.equal(unknown.unknownCount,2)
  const html=renderToStaticMarkup(React.createElement(ContributionHeatmap,{data}))
  assert.match(html,/neutral neutral · 贡献 0.8 · 中性/)
  assert.match(html,/unknown unknown · 贡献 0.8 · 方向未定/)
  assert.match(html,/灰蓝：中性/); assert.match(html,/灰色：方向未定/)
  assert.match(html,/neutral neutral：平均贡献 0/)
  assert.deepEqual(explanationRecords(data).slice(0,2).map(r=>r.values[6]),['中性','方向未定'])
  const svg=contributionExportSvg(data)
  assert.match(svg,/<title>第 1 行 · neutral · 0.8 · 中性<\/title>/)
  assert.match(svg,/<title>第 1 行 · unknown · 0.8 · 方向未定<\/title>/)
  assert.match(svg,/中性按 0 计入均值/)
  for (const name of ['snowfall','calendar_0']) {
    const feature=contributionMatrix(timeseries).ranking.find(f=>f.name===name)
    assert.ok(feature); assert.equal(feature.mean,0); assert.equal(feature.unknownCount,0)
  }
})

test('详情必须匹配任务、字段顺序、版本和原始行边界，不能加载同目标同数量的另一份文件', () => {
  const original={...batch,task_type:'regression',result_version_id:'version-a',source_task_id:'task-a'}
  const {samples,row_numbers,...expected}=original
  assert.ok(validBatchDetail(original,expected))
  for(const mutate of [
    value=>value.task_type='classification',
    value=>value.feature_names.reverse(),
    value=>value.feature_names[0]='unrelated',
    value=>value.input_rows++,
    value=>value.mapping='sample_index',
    value=>value.result_version_id='version-b',
    value=>value.source_task_id='task-b',
    value=>value.samples[0].row_number=64,
  ]) {
    const value=structuredClone(original); mutate(value)
    assert.equal(validBatchDetail(value,expected),false)
  }
  const subset={...original,requested_count:2,explained_count:2,row_numbers:[2,10],samples:[samples[1],samples[9]]}
  assert.ok(validBatchDetail(subset,subset))
  assert.equal(validBatchDetail({...subset,samples:[samples[2],samples[9]]},subset),false)
})

test('详情身份与对象引用无关，同路径同数量更换任务或字段时必须失效', () => {
  const data={...batch,detail_path:'/tmp/reused.view.json',task_type:'regression',result_version_id:'version-a'}
  const key=batchDetailKey(data)
  assert.equal(batchDetailKey(structuredClone(data)),key)
  assert.equal(batchDetailKey({...data,target_label:'仅修改展示名称'}),key)
  for(const update of [
    {task_type:'classification'}, {feature_names:[...batch.feature_names].reverse()},
    {result_version_id:'version-b'}, {row_numbers:[2,3]}, {input_rows:64},
    {mapping:'sample_index'}, {detail_path:undefined},
  ]) assert.notEqual(batchDetailKey({...data,...update}),key)
})

test('时序详情保留合法非连续步，并拒绝越界、错位步序与更换预测窗口', () => {
  const {samples,...expected}=timeseries
  assert.ok(validBatchDetail(timeseries,expected))
  for(const mutate of [
    value=>value.horizon=481,
    value=>{value.samples[0].row_number=481;value.samples[0].step=481},
    value=>value.samples[0].step=481,
    value=>value.samples[0].step=2,
  ]) {
    const value=structuredClone(timeseries); mutate(value)
    assert.equal(validBatchDetail(value,expected),false)
  }
})

test('旧时序文件也按未核实尺度展示，不套业务单位或比较原预测', () => {
  for(const scale of [undefined,'unverified']) {
    const data={...sampleView(timeseries,timeseries.samples[0]),unit:'元/MWh',prediction_scale:scale,
      prior_prediction:300,prediction_delta:-294}
    const html=renderToStaticMarkup(React.createElement(LocalExplanation,{data}))
    assert.doesNotMatch(html,/解释模型输出/); assert.doesNotMatch(html,/元\/MWh|原预测|重算差异|解释时预测/)
    const batchData={...data,samples:[timeseries.samples[0]]}
    const matrixHtml=renderToStaticMarkup(React.createElement(ContributionHeatmap,{data:batchData}))
    assert.doesNotMatch(matrixHtml,/解释模型输出/); assert.doesNotMatch(matrixHtml,/元\/MWh|解释时预测/)
    const { PredictionCheck } = require('../src/client/PredictionCheck.tsx')
    const checked=renderToStaticMarkup(React.createElement(PredictionCheck,{data:batchData}))
    assert.match(checked,/解释模型输出/); assert.doesNotMatch(checked,/元\/MWh|原预测|与原预测相差/)
    assert.equal(filterFields(batchData)[0].label,'解释模型输出')
    assert.match(renderToStaticMarkup(React.createElement(ExplanationDataTable,{data:batchData})),/<th>解释模型输出<\/th>/)
  }
  const regression={mode:'local',task_type:'regression',target:'strength',unit:'MPa',prediction:200,prior_prediction:190,prediction_delta:10}
  const html=renderToStaticMarkup(React.createElement(LocalExplanation,{data:regression}))
  assert.doesNotMatch(html,/解释时预测|MPa|重算差异/)
  const { PredictionCheck } = require('../src/client/PredictionCheck.tsx')
  const checked=renderToStaticMarkup(React.createElement(PredictionCheck,{data:regression}))
  assert.match(checked,/解释时预测/); assert.match(checked,/MPa/); assert.match(checked,/与原预测相差/)
})

test('无向 SVG 的可读关系说明也不暗示方向', () => {
  const data={mode:'undirected',target:'y',nodes:['x','y'],edges:[{source:'x',target:'y',weight:.5}]}
  const svg=graphExportSvg(data)
  assert.match(svg,/<title>x — y：0.5<\/title>/)
  assert.doesNotMatch(svg,/marker-end=|x → y/)
  assert.match(graphExportSvg({...data,mode:'directed'}),/<title>x → y：0.5<\/title>/)
})

 test('单条导出只包含选中行的双向贡献，分组导出不冒充筛选覆盖率', () => {
  const sample=sampleView(batch,batch.samples[8]),svg=singleContributionExportSvg(sample)
  assert.match(svg,/第 9 行/);assert.doesNotMatch(svg,/全样本|当前筛选|解释时预测|fill-opacity=/)
  assert.equal((svg.match(/<rect x=/g)??[]).length,13)
  assert.match(svg,/#4168a9/);assert.match(svg,/#248575/)
  const low={...batch,samples:batch.samples.slice(0,25)},high={...batch,samples:batch.samples.slice(25)}
  const pair=contributionExportSvg(high,low,'高低组对比',undefined,['低预测组','高预测组'])
  assert.match(pair,/低预测组 · 25 个样本/);assert.match(pair,/高预测组 · 38 个样本/)
  assert.doesNotMatch(pair,/当前筛选|覆盖率|全样本/)
 })
