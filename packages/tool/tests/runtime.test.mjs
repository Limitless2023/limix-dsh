/**
 * [INPUT]: 环境管理器与受控进程替身。
 * [OUTPUT]: 验证安装合并、失败可重试、显式取消及 ready 状态。
 * [POS]: Python 环境生命周期离线测试，不安装依赖。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPythonRuntime } from '../src/host/python-runtime.js'

test('并发准备只安装一次，失败后可重试，成功后复用', async () => {
  let installs=0, fail=true
  const runtime=createPythonRuntime({ runtimePath:'/pkg/assets/limix_runtime.py',pythonBin:'python3',runCli:async (py,path)=>{
    if(path==='-c')return {exitCode:0}
    installs++
    await new Promise(r=>setTimeout(r,5))
    return {exitCode:fail?2:0,stdout:JSON.stringify(fail?{error:'offline'}:{status:'ready',python:'/cache/bin/python'})}
  }})
  const first=await Promise.allSettled([runtime.prepare(),runtime.prepare()])
  assert.equal(installs,1);assert.ok(first.every(x=>x.status==='rejected'))
  fail=false
  assert.equal((await runtime.prepare()).python,'/cache/bin/python')
  await runtime.prepare();assert.equal(installs,2)
})

test('取消一次等待不终止其他会话共享的准备过程', async()=>{
  let finish
  const runtime=createPythonRuntime({runtimePath:'/pkg/limix_runtime.py',pythonBin:'python3',runCli:async(py,path)=>path==='-c'?{exitCode:0}:new Promise(r=>{finish=()=>r({exitCode:0,stdout:'{"status":"ready","python":"ready"}'})})})
  const controller=new AbortController()
  const waiting=runtime.wait(controller.signal)
  await new Promise(r=>setTimeout(r,1))
  controller.abort()
  await assert.rejects(waiting,{name:'AbortError'})
  finish()
  assert.equal((await runtime.prepare()).status,'ready')
})


test('外部预测 CLI 不改变包内环境安装器路径', async () => {
  const calls=[]
  const runtime=createPythonRuntime({cliPath:'/custom/scripts/limix.py',runtimePath:'/bundle/assets/limix_runtime.py',pythonBin:'python3',runCli:async(py,path)=>{
    calls.push(path)
    return path==='-c'?{exitCode:0}:{exitCode:0,stdout:'{"status":"ready","python":"ready"}'}
  }})
  await runtime.wait()
  assert.deepEqual(calls,['-c','/bundle/assets/limix_runtime.py'])
})
