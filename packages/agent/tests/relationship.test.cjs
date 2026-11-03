/** [INPUT]: 图与贡献纯函数；[OUTPUT]: 阈值、缺方向、分组与任务身份回归；[POS]: 新关系视图契约。[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,f)
const {graphEdges,graphConclusion}=require('../src/client/relationship-data.ts')
const {predictionGroups}=require('../src/client/ExplanationInsight.tsx')
const {validGraphDetail}=require('../src/client/explanation-data.ts')
test('threshold keeps direction, excludes diagonal and zero',()=>{const d={mode:'directed',target:'b',nodes:['a','b'],graph_weights:[[1,.9],[.2,0]]};assert.deepEqual(graphEdges(d,.8),[{source:'a',target:'b',weight:.9}]);assert.match(graphConclusion({...d,edges:graphEdges(d,.8)}),/1 条/);assert.equal(graphEdges(d,1).length,0)})
test('groups prefer original prediction and never split classification numerically',()=>{const d={mode:'local',samples:[{prior_prediction:100,prediction:5},{prior_prediction:200,prediction:4},{prior_prediction:300,prediction:3}]};const g=predictionGroups(d);assert.equal(g.median,200);assert.equal(g.low.samples.length,1);assert.equal(g.high.samples.length,2);assert.equal(g.label,'原预测');assert.equal(predictionGroups({...d,task_type:'classification'}),null);assert.equal(predictionGroups({...d,task_type:'timeseries'}),null)})
test('graph detail rejects wrong task and sample shape',()=>{const d={mode:'directed',target:'b',source_task_id:'one',source_sha256:'hash',nodes:['a','b'],graph_weights:[[0,.9],[0,0]],input_rows:2,graph_sample_count:2};const v={...d,graph_sample_names:['a','b'],graph_samples:[[1,2],[3,4]]};assert(validGraphDetail(v,d));assert(!validGraphDetail({...v,source_task_id:'two'},d));assert(!validGraphDetail({...v,graph_samples:[[1],[2]]},d))})

test('single sample summary cannot retain batch scope',()=>{const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');const {ExplanationInsight}=require('../src/client/ExplanationInsight.tsx');const d={mode:'local',target:'y',row_number:5,feature_names:['a'],samples:[{row_number:1,scores:[1],directions:[1]},{row_number:5,scores:[2],directions:[-1]}]};const html=renderToStaticMarkup(React.createElement(ExplanationInsight,{data:require('../src/client/explanation-data.ts').singleSampleMatrix(d)}));assert.match(html,/当前 1 个样本/);assert.doesNotMatch(html,/平均贡献/)})

test('comparison ranks absolute score differences and keeps below-threshold counterpart',()=>{
 const {rankedRelations}=require('../src/client/relationship-data.ts')
 const rows=[{source:'a',target:'b',left_weight:.95,right_weight:.94,left_present:true,right_present:true},{source:'c',target:'b',left_weight:.2,right_weight:.9,left_present:false,right_present:true},{source:'d',target:'b',left_weight:.1,right_weight:.7,left_present:false,right_present:false}]
 const d={mode:'directed',target:'b',nodes:['a','b','c','d'],comparison:{left:{label:'A'},right:{label:'B'},threshold:.8,description:'分组',records:rows}}
 assert.deepEqual(rankedRelations(d).map(r=>r.source),['c','a']);assert.equal(rows[0].source,'a')
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{RelationshipView}=require('../src/client/RelationshipView.tsx')
 d.comparison.left={...d,comparison:undefined,nodes:d.nodes,graph_weights:d.nodes.map(()=>[0,0,0,0]),label:'A'};d.comparison.right={...d.comparison.left,label:'B'}
 const html=renderToStaticMarkup(React.createElement(RelationshipView,{data:d}))
 assert.equal(require('../src/client/ExplanationDataTable.tsx').explanationRecords(d)[1].values[4],'0.2');assert.match(html,/分数差异最大/);assert.match(html,/仅B达到显示阈值/);assert.match(html,/width:20%/);assert.match(html,/data-compare-panel="matrix"/);assert.doesNotMatch(html,/<section class="lx-scenario-panel"/);assert.doesNotMatch(html,/<details class="lx-scenario-(context|matrices)"/)
})
test('comparison preview verifies both source identities',()=>{
 const {validComparisonDetail}=require('../src/client/explanation-data.ts')
 const g={mode:'directed',target:'b',nodes:['a','b'],graph_weights:[[0,.9],[0,0]],source_task_id:'a',source_sha256:'h',input_rows:1,graph_sample_count:1,graph_sample_names:['a','b'],graph_samples:[[1,2]],label:'A'}
 const d={mode:'directed',target:'b',nodes:g.nodes,comparison:{threshold:.8,description:'same',records:[],left:g,right:{...g,source_task_id:'b',label:'B'}}}
 assert(validComparisonDetail(d,d));assert(!validComparisonDetail({...d,comparison:{...d.comparison,right:{...g,label:'B'}}},d))
})

test('comparison descriptor verifies file digest before rendering',async()=>{
 const {parseComparisonDetail}=require('../src/client/explanation-data.ts'),{createHash}=require('node:crypto')
 const g={mode:'directed',target:'b',nodes:['a','b'],graph_weights:[[0,.9],[0,0]],input_rows:1,graph_sample_count:1,graph_sample_names:['a','b'],graph_samples:[[1,2]],label:'A'}
 const d={mode:'directed',target:'b',nodes:g.nodes,comparison:{threshold:.8,description:'same',records:[],left:g,right:{...g,label:'B'}}}
 const text=JSON.stringify(d),descriptor={mode:'directed',target:'b',detail_sha256:createHash('sha256').update(text).digest('hex')}
 assert.deepEqual(await parseComparisonDetail(text,descriptor),d)
 await assert.rejects(parseComparisonDetail(text+' ',descriptor),/已变化/)
 await assert.rejects(parseComparisonDetail(text,{...descriptor,target:'wrong'}),/格式不匹配/)
})
