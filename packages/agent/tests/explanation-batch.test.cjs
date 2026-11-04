/**
 * [INPUT]: 真实 63×13 贡献与 20 变量网络；批量和布局纯函数。
 * [OUTPUT]: 全量矩阵、带符号均值与未知方向、原始行映射、环图、回绕连线边界及错误文件验证。
 * [POS]: 解释展示契约；交互另在桌面实际验证。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), ts = require('typescript'), React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename)
const { ExplanationView } = require('../src/client/ExplanationView.tsx')
const { sampleView, validBatchDetail } = require('../src/client/explanation-data.ts')
const { contributionMatrix } = require('../src/client/contribution-matrix.ts')
const { contributionFill, number } = require('../src/client/explanation-data.ts')
const { graphLayout } = require('../src/client/graph-layout.ts')
const batch = require('./fixtures/explanation-batch.json'), graph = require('./fixtures/explanation-network.json')

test('真实63条解释默认展示819个贡献色块并可切单条解释', () => {
  const html = renderToStaticMarkup(React.createElement(ExplanationView, { data: batch }))
  assert.match(html, /贡献热力图/); assert.match(html, /单条解释/); assert.match(html, /平均贡献说明/)
  assert.equal((html.match(/class="lx-matrix-cell"/g) ?? []).length, 63 * 13)
  assert.match(html, /共 819 个色块/); assert.match(html, /aria-label="快捷分组说明" aria-expanded="false"/)
  assert.equal(batch.samples.length, 63)
  assert.ok(validBatchDetail(batch, batch))
  const selected = sampleView(batch, batch.samples[62])
  assert.equal(selected.row_number, 63)
  assert.equal(selected.features.length, 13)
  assert.equal(selected.prediction, batch.samples[62].prediction)
})

test('加载文件错行、错目标、错维度会拒绝显示', () => {
  for (const modify of [v => v.target = 'wrong', v => v.samples.pop(), v => v.samples[0].scores.pop(), v => v.samples[0].row_number = v.samples[1].row_number, v => v.samples[0].scores[0] = null]) {
    const value = structuredClone(batch); modify(value); assert.equal(validBatchDetail(value, batch), false)
  }
})

test('完整网络不截掉20个变量、28条边和6个孤立变量', () => {
  const html = renderToStaticMarkup(React.createElement(ExplanationView, { data: graph }))
  assert.equal((html.match(/class="lx-causal-edge"/g) ?? []).length, 28)
  assert.equal((html.match(/class="lx-causal-node"/g) ?? []).length, 20)
  assert.doesNotMatch(html, /6 个变量未检出连线/)
  assert.match(html, /关系图说明/)
  assert.match(html, /aria-label="关系图说明" aria-expanded="false"/)
  assert.doesNotMatch(html, /保留显示|实验依据需另行核对|循环关系/)
  assert.doesNotMatch(html, /聚焦此变量/)
  assert.match(html, /因果关系网络/)
  const layout = graphLayout(graph.nodes, graph.edges)
  assert.equal(layout.positions.size, 20)
  assert.equal(layout.isolated.length, 6)
  assert.ok(layout.positions.get('red')[0] < layout.positions.get('vis_3')[0], '主光源位于读数左侧')
  const coordinates = [...layout.positions.values()]
  coordinates.forEach((a, i) => coordinates.slice(i + 1).forEach(b => assert.ok(Math.abs(a[0] - b[0]) >= 136 || Math.abs(a[1] - b[1]) >= 44)))
})

test('环、孤立变量、空边和空图都有有限且不重叠的位置', () => {
  for (const [nodes, edges] of [[['a','b','z'], [{ source:'a', target:'b' }, { source:'b', target:'a' }]], [['a','b'],[]], [[],[]]]) {
    const layout = graphLayout(nodes, edges)
    assert.equal(layout.positions.size, nodes.length)
    assert.ok(Number.isFinite(layout.width) && Number.isFinite(layout.height))
    assert.equal(new Set([...layout.positions.values()].map(p => p.join(','))).size, nodes.length)
  }
})


test('热力图保留每个原始行列、分数和方向，排序只影响右侧汇总', () => {
  const matrix = contributionMatrix(batch)
  assert.equal(matrix.rows.length, 63)
  assert.equal(matrix.cellCount, 819)
  matrix.rows.forEach((row, i) => {
    assert.equal(row.rowNumber, batch.samples[i].row_number)
    assert.deepEqual(row.cells.map(c => c.name), batch.feature_names)
    assert.deepEqual(row.cells.map(c => c.score), batch.samples[i].scores)
    assert.deepEqual(row.cells.map(c => c.direction), batch.samples[i].directions)
  })
  matrix.ranking.forEach((f,i) => {
    if(i) assert.ok(Math.abs(matrix.ranking[i-1].mean) >= Math.abs(f.mean))
    const expected = batch.samples.reduce((sum,s) => sum + Math.abs(s.scores[f.featureIndex]) * s.directions[f.featureIndex],0) / 63
    assert.equal(f.mean, expected)
  })
  assert.equal(matrix.maximum, Math.max(...batch.samples.flatMap(s => s.scores.map(Math.abs))))
})

test('十行、非连续原始行和部分返回均显示完整矩阵，不补造色块', () => {
  const value = structuredClone(batch)
  value.samples = [batch.samples[62], ...batch.samples.slice(0,9)]
  value.explained_count = 10
  value.missing_rows = [11,12]
  const html = renderToStaticMarkup(React.createElement(ExplanationView, { data:value }))
  assert.equal((html.match(/class="lx-matrix-cell"/g) ?? []).length, 130)
  assert.match(html, /仅解释了部分样本/)
  assert.equal(contributionMatrix(value).rows[0].rowNumber, 63)
})

test('统一色阶反映全量最大值，未知方向保留灰色且不伪造正负', () => {
  assert.match(contributionFill(.3, -1, .3), /#4168a9 100%/)
  assert.match(contributionFill(.3, 1, .3), /#248575 100%/)
  assert.match(contributionFill(.15, 1, .3), /#248575 50%/)
  assert.match(contributionFill(0, -1, .3), / 0%/)
  assert.match(contributionFill(.3, null, .3), /#848991 100%/)
  assert.equal(contributionFill(-.15, 1, .3), contributionFill(.15, 1, .3))
  const html = renderToStaticMarkup(React.createElement(ExplanationView, { data:batch }))
  assert.match(html, /贡献色阶：蓝色负向，绿色正向，深色贡献大/)
  assert.ok(html.includes(`−${number(contributionMatrix(batch).maximum)}`))
})

test('零值、重复值、负分数和分类预测均保留，不产生无效尺寸', () => {
  for (const score of [0, -.4, .4]) {
    const value = { mode:'local',target:'x',feature_names:['a'],samples:Array.from({length:63}, (_,i) => ({row_number:i+1,prediction:'类别A',scores:[score],directions:[i%2 ? 0 : null]})) }
    const matrix = contributionMatrix(value)
    assert.equal(matrix.cellCount,63)
    assert.equal(matrix.ranking[0].mean, score === 0 ? 0 : null)
    const html = renderToStaticMarkup(React.createElement(ExplanationView, { data:{...value,requested_count:63,explained_count:63} }))
    assert.match(html,/方向未定/); assert.doesNotMatch(html,/NaN|Infinity/)
    assert.doesNotMatch(html,/类别A/)
    const checked=renderToStaticMarkup(React.createElement(ExplanationView,{data:{...value,requested_count:63,explained_count:63},showPredictionCheck:true}))
    assert.match(checked,/类别A/)
    if(score === 0) assert.match(html,/贡献均为 0/)
  }
  assert.equal(contributionMatrix({ feature_names:[], samples:[] }).cellCount,0)
})

test('影响分数只展示带符号均值，先抵消再排序，缺失方向不补零', () => {
  const data = { mode:'local',target:'y',requested_count:2,explained_count:2,feature_names:['cancel','negative','positive','unknown','zero'],samples:[
    {row_number:1,prediction:1,scores:[.2,-.8,.4,.5,0],directions:[1,-1,1,1,null]},
    {row_number:2,prediction:2,scores:[.2,.4,.4,.5,0],directions:[-1,-1,1,null,0]},
  ] }
  const matrix = contributionMatrix(data), byName = Object.fromEntries(matrix.ranking.map(f => [f.name,f]))
  assert.equal(byName.cancel.mean,0)
  assert.ok(Math.abs(byName.negative.mean + .6) < 1e-12)
  assert.equal(byName.positive.mean,.4)
  assert.equal(byName.unknown.mean,null); assert.equal(byName.unknown.unknownCount,1)
  assert.equal(byName.zero.mean,0)
  assert.deepEqual(matrix.ranking.map(f => f.name),['negative','positive','cancel','zero','unknown'])
  const html = renderToStaticMarkup(React.createElement(ExplanationView,{data}))
  assert.match(html,/各影响因子影响分数对比/)
  assert.doesNotMatch(html,/平均绝对贡献|data-lx-summary/)
  const bars = [...html.matchAll(/<rect class="lx-contribution-mean"[^>]+>/g)].map(m => m[0])
  assert.equal(bars.length,4,'未知方向不画零值条形')
  const negative = bars.find(b => /fill="#4168a9"/.test(b)), positive = bars.find(b => /fill="#248575"/.test(b))
  const attr = (bar,name) => Number(bar.match(new RegExp(` ${name}="([^"]+)"`))[1])
  assert.equal(attr(negative,'x')+attr(negative,'width'),attr(positive,'x'),'负向终点与正向起点共享零线')
  assert.match(html,/平均贡献 \+0\.4/); assert.match(html,/平均贡献 -0\.6/)
  assert.match(html,/1 个样本缺少方向/)
})

test('最右列循环关系的曲线和分数标签完整落在画布内', () => {
  const { graphEdgeGeometry } = require('../src/client/graph-layout.ts')
  const nodes = ['source', 'middle', 'pressure1', 'pressure2', 'power']
  const edges = [['source','middle'], ['middle','pressure1'], ['pressure1','pressure2'], ['pressure2','power'], ['power','pressure1']].map(([source,target]) => ({source,target,weight:.945}))
  for (const aspect of [1.2, 1.9, 3]) {
    const layout = graphLayout(nodes, edges, aspect)
    const right = Math.max(...[...layout.positions.values()].map(([x]) => x))
    assert.equal(layout.positions.get('pressure2')[0], right)
    for (const edge of edges) {
      const route = graphEdgeGeometry(edge, edges, layout.positions)
      assert.ok(route.right + 12 <= layout.width)
      assert.ok(route.bottom + 12 <= layout.height)
      // 逐点检查实际 Bézier 曲线，避免仅验证边界计算本身。
      const [ax,ay,cx,cy,dx,dy,bx,by] = route.path.match(/-?\d+(?:\.\d+)?/g).map(Number)
      for (let i=0;i<=100;i++) {
        const t=i/100, u=1-t
        const x=u*u*u*ax+3*u*u*t*cx+3*u*t*t*dx+t*t*t*bx
        const y=u*u*u*ay+3*u*u*t*cy+3*u*t*t*dy+t*t*t*by
        assert.ok(x>=6 && x<=layout.width-6)
        assert.ok(y>=6 && y<=layout.height-6)
      }
      assert.ok(route.label[0]+23 <= layout.width-12)
    }
    assert.equal(layout.positions.size, nodes.length)
  }
})
