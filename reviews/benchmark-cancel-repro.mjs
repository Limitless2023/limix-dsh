/**
 * [INPUT]: 实际宿主 registerLimixTool 与 benchmark.run；短时假解释器。
 * [OUTPUT]: AbortError 与内层是否继续写文件；全部文件仅在临时目录。
 * [POS]: reviews 的取消证据；不运行 UI 或生产请求，不读取业务配置。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { registerLimixTool } from '../packages/tool/src/host/tool.js'

const folder = await mkdtemp(join(tmpdir(), 'limix-cancel-review-'))
const child = join(folder, 'fake-python'), outer = join(folder, 'outer.py')
const marker = join(folder, 'finished.txt'), started = join(folder, 'started.txt')
const assets = fileURLToPath(new URL('../packages/tool/assets', import.meta.url))
try {
  await writeFile(child, '#!/usr/bin/env python3\nimport time,os\nfrom pathlib import Path\n'
    + `Path(${JSON.stringify(started)}).write_text(str(os.getpid()))\n`
    + `time.sleep(2)\nPath(${JSON.stringify(marker)}).write_text("continued")\n`)
  await chmod(child, 0o700)
  await writeFile(outer, `import sys,argparse\nsys.path.insert(0,${JSON.stringify(assets)})\n`
    + 'import limix_benchmark as b\n'
    + `a=argparse.Namespace(python=${JSON.stringify(child)},manifest="unused.json",models="BASELINE",seed=42,timeout=1,output="unused.json",datasets=None)\n`
    + 'b.run({"base_url":"https://limix-api.stable-ai.cn"},a,None)\n')
  let definition
  registerLimixTool({ tools: { register: value => { definition = value } } },
    { cliPath: outer, pythonBin: 'python3', timeoutMs: 10000 })
  const controller = new AbortController()
  const task = definition.execute({ command: 'benchmark', args: [], workdir: folder },
    { signal: controller.signal }).then(value => ({ returned: value }), error => ({ error: error.name }))
  for (let i = 0; i < 40 && !existsSync(started); i++) await delay(100)
  console.log('child_started', existsSync(started))
  controller.abort()
  console.log('tool_result', await task)
  await delay(2300)
  console.log('child_survived_cancel', existsSync(marker))
} finally {
  await rm(folder, { recursive: true, force: true })
}
