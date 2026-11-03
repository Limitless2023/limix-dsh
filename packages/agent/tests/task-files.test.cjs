/**
 * [INPUT]: 真实 CLI 参数契约及文件回执形状。
 * [OUTPUT]: 验证本地任务文件提取，不伪造版本 ID 或尚未生成的结果链接。
 * [POS]: Agent 文件菜单回归测试；宿主侧栏交互另在 DSH 验收。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), ts = require('typescript'), React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
for (const extension of ['.ts','.tsx']) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename)
const { taskFiles } = require('../src/client/task-files.ts')
const { LimixToolCard } = require('../src/client/LimixToolCard.tsx')
test('回归输入解析等号、空格文件名与工作目录，输出只来自回执', () => {
 const files=taskFiles('regress',['--train=train data.csv','--predict','test.csv','-o','not-created.csv'],{saved_to:'/work/result.csv'},'/work')
 assert.deepEqual(files.map(f=>[f.label,f.path]),[['训练集','/work/train data.csv'],['预测集','/work/test.csv'],['预测结果','/work/result.csv']])
 assert.deepEqual(taskFiles('forecast',['--train','version-123','-o','not-created.csv'],null),[])
})
test('远程地址与版本 ID 不作为本地文件，保留 Windows 绝对路径', () => {
 for(const input of ['https://example.com/data.csv','data:abc.csv','file:///tmp/a.csv','abc123','--predict']) assert.deepEqual(taskFiles('regress',['--train',input],null),[])
 assert.equal(taskFiles('regress',['--train','C:\\demo\\train.csv'],null)[0].path,'C:/demo/train.csv')
})
test('解释按实际用途展示文件，同路径不重复，时序不猜测训练集', () => {
 const files=taskFiles('explain',['--train','/x/ref.csv','--data','/x/ref.csv','--prediction','/x/pred.csv'],{saved_to:'/x/e.json',csv_path:'/x/e.csv'})
 assert.deepEqual(files.map(f=>f.label),['训练集 / 待解释数据','原预测结果','解释结果','解释数据 CSV'])
 assert.deepEqual(taskFiles('explain',['--result-version-id','123'],{saved_to:'/x/e.json'}).map(f=>f.label),['解释结果'])
 assert.deepEqual(taskFiles('explain',['--compare-left','/x/a.view.json','--compare-right','/x/b.view.json'],null).map(f=>f.label),['场景 A 解释','场景 B 解释'])
})
test('预测和解释卡文件入口使用宿主委托，折叠按钮独立于内容', () => {
 for(const command of ['regress','classify','forecast','explain']) {
 const html=renderToStaticMarkup(React.createElement(LimixToolCard,{callId:'files',cwd:'/work',openFile(){},block:{kind:'tool-result',call:{name:'limix',argsRaw:JSON.stringify({command,args:['--train','train.csv']})},content:[{type:'text',text:JSON.stringify({saved_to:'/work/result.csv',...(command==='explain'?{explanation:{mode:'local',target:'y',features:[]}}:{status:'finished'})})}]}}))
 assert.match(html,/aria-label="收起卡片"/)
 assert.match(html,/data-lx="file" data-path="\/work\/train.csv"/)
 assert.match(html,/打开训练集：train.csv/)
 assert.match(html,/任务文件/)
 }
})
