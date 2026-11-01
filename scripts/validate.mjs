/**
 * [INPUT]: 五包源码、共用分发契约、固定测试、npm、Python；可选 --output 验证目录。
 * [OUTPUT]: 本地五包、测试日志、隔离载入结果和 validation.json；不发布。
 * [POS]: 可重复的发布前自动检查；界面演示和第二台电脑验收独立记录。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {spawnSync} from 'node:child_process'
import {mkdir,readFile,readdir,writeFile,mkdtemp} from 'node:fs/promises'
import {resolve,dirname,join} from 'node:path'
import {tmpdir} from 'node:os'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {assertPackageFiles,createIsolationDirectory} from './package-contract.mjs'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const args=process.argv.slice(2)
if(args.length && (args.length!==2 || args[0]!=='--output')) throw new Error('使用 node scripts/validate.mjs [--output 目录]')
const output=args[1]?resolve(args[1]):await mkdtemp(join(tmpdir(),'limix-validation-'))
await mkdir(output,{recursive:true})
const checks=[]
async function run(name,command,args,cwd=root){
 const result=spawnSync(command,args,{cwd,encoding:'utf8',stdio:'pipe',maxBuffer:32*1024*1024})
 await writeFile(join(output,name+'.log'),String(result.stdout??'')+String(result.stderr??''))
 if(result.error || result.status!==0)throw new Error(name+' 失败，见 '+output)
 checks.push({name,status:'passed'})
 return result.stdout
}
const packages=['data','tool','agent','preset','brand'],packed=[]
try {
 for(const name of packages){const cwd=join(root,'packages',name);const manifest=JSON.parse(await readFile(join(cwd,'package.json'),'utf8'));if(manifest.scripts?.build)await run('build-'+name,'npm',['run','build'],cwd)}
 await run('node-release-contract','node',['--test','scripts/tests/package-contract.test.mjs'])
 for(const name of ['data','tool','agent']){const folder=join(root,'packages',name,'tests');const files=(await readdir(folder)).filter(f=>/\.test\.(mjs|cjs)$/.test(f));await run('node-'+name,'node',['--test',...files.map(f=>join(folder,f))])}
 await run('node-benchmark-cancel','node',['--test','benchmarks/tests/cancellation.test.mjs'])
 await run('python-tool','python3',['-m','unittest','discover','-s','packages/tool/tests','-v'])
 for(const name of packages){
  const cwd=join(root,'packages',name),manifest=JSON.parse(await readFile(join(cwd,'package.json'),'utf8'))
  const [item]=JSON.parse(await run('pack-'+name,'npm',['pack','--json','--ignore-scripts','--pack-destination',output],cwd))
  await assertPackageFiles(manifest,item.files.map(f=>f.path),cwd)
  const unpack=await createIsolationDirectory();await run('unpack-'+name,'tar',['-xzf',join(output,item.filename),'-C',unpack])
  if(manifest.main)await run('import-'+name,'node',['--input-type=module','-e','await import('+JSON.stringify(pathToFileURL(join(unpack,'package',manifest.main)).href)+')'])
  if(name==='tool')for(const file of ['limix.py','limix_runtime.py'])await run('help-'+file,'python3',[join(unpack,'package','assets',file),'--help'])
  packed.push({name:manifest.name,version:manifest.version,file:item.filename,sha256:createHash('sha256').update(await readFile(join(output,item.filename))).digest('hex')})
 }
 await writeFile(join(output,'validation.json'),JSON.stringify({status:'passed',created_at:new Date().toISOString(),checks,packages:packed,manual_gates:['浏览器实际用户流程及截图','标准模式界面','无真值界面','上游无向解释状态','第二台电脑安装']},null,2))
 console.log('自动检查通过：'+output)
}catch(error){await writeFile(join(output,'validation.json'),JSON.stringify({status:'failed',checks,error:error.message},null,2));throw error}
