/**
 * [INPUT]: 实际宿主 runCli/registerLimixTool、benchmark.run 和离线假解释器。
 * [OUTPUT]: POSIX 取消子孙进程实测；Windows taskkill 调用与超时分支断言。
 * [POS]: benchmark 取消链集成测试；不读取业务配置、不发网络请求。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, chmod, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { registerLimixTool, runCli } from '../../packages/tool/src/host/tool.js'

test('取消宿主后，独立解释器与忽略 TERM 的孙进程都停止', { skip: process.platform === 'win32' }, async () => {
  const folder = await mkdtemp(join(tmpdir(), 'limix-cancel-test-'))
  const child = join(folder, 'fake-python'), outer = join(folder, 'outer.py')
  const started = join(folder, 'started.json'), grandStarted = join(folder, 'grand-started')
  const childFinished = join(folder, 'child-finished'), grandFinished = join(folder, 'grand-finished')
  const assets = fileURLToPath(new URL('../../packages/tool/assets', import.meta.url))
  let pids = []
  try {
    const grand = 'import signal,time,os\nfrom pathlib import Path\n'
      + 'signal.signal(signal.SIGTERM,signal.SIG_IGN)\n'
      + `Path(${JSON.stringify(grandStarted)}).write_text(str(os.getpid()))\n`
      + `time.sleep(1.2)\nPath(${JSON.stringify(grandFinished)}).write_text("continued")\n`
    await writeFile(child, '#!/usr/bin/env python3\nimport time,os,subprocess,sys,json\nfrom pathlib import Path\n'
      + `grand=subprocess.Popen([sys.executable,"-c",${JSON.stringify(grand)}])\n`
      + `Path(${JSON.stringify(started)}).write_text(json.dumps([os.getpid(),grand.pid]))\n`
      + `time.sleep(1.2)\nPath(${JSON.stringify(childFinished)}).write_text("continued")\n`)
    await chmod(child, 0o700)
    await writeFile(outer, `import sys,argparse\nsys.path.insert(0,${JSON.stringify(assets)})\n`
      + 'import limix_benchmark as b\n'
      + `a=argparse.Namespace(python=${JSON.stringify(child)},manifest="unused.json",models="BASELINE",seed=42,timeout=1,output="unused.json",datasets=None)\n`
      + 'b.run({"base_url":"https://example.invalid"},a,None)\n')
    let definition
    registerLimixTool({ tools: { register: value => { definition = value } } },
      { cliPath: outer, pythonBin: 'python3', timeoutMs: 10000 })
    const controller = new AbortController()
    const task = definition.execute({ command: 'benchmark', args: [], workdir: folder },
      { signal: controller.signal })
    const rejected = assert.rejects(task, { name: 'AbortError' })
    for (let i = 0; i < 60 && !existsSync(grandStarted); i++) await delay(50)
    assert.ok(existsSync(grandStarted), '子进程与孙进程确实已启动')
    pids = JSON.parse(await readFile(started, 'utf8'))
    controller.abort()
    await rejected
    await delay(1500)
    assert.equal(existsSync(childFinished), false)
    assert.equal(existsSync(grandFinished), false)
    for (const pid of pids) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' })
  } finally {
    for (const pid of pids) { try { process.kill(pid, 'SIGKILL') } catch { /* 已退出 */ } }
    await rm(folder, { recursive: true, force: true })
  }
})

function windowsRuntime() {
  const child = new EventEmitter()
  child.pid = 123456
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  const calls = []
  return { calls, child, runtime: { platform: 'win32', spawn(command, args, options) {
    calls.push({ command, args, options })
    if (command === 'taskkill') {
      queueMicrotask(() => child.emit('close', null))
      return new EventEmitter()
    }
    return child
  } } }
}

test('Windows 取消使用进程树终止，不交给 Node 单进程 Abort', async () => {
  const fake = windowsRuntime(), controller = new AbortController()
  const task = runCli('python', 'cli.py', 'benchmark', [], '.', 10000, controller.signal, fake.runtime)
  controller.abort()
  await assert.rejects(task, { name: 'AbortError' })
  assert.deepEqual(fake.calls[1].args, ['/PID', '123456', '/T', '/F'])
  assert.equal(fake.calls[0].options.signal, undefined)
})

test('Windows 超时同样终止进程树', async () => {
  const fake = windowsRuntime()
  await assert.rejects(runCli('python', 'cli.py', 'benchmark', [], '.', 5, undefined, fake.runtime), { name: 'TimeoutError' })
  assert.equal(fake.calls[1].command, 'taskkill')
  assert.deepEqual(fake.calls[1].args, ['/PID', '123456', '/T', '/F'])
})
