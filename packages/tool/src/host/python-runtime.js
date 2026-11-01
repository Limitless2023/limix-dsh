/**
 * [INPUT]: 包内 limix_runtime.py、runCli 进程边界与显式 Python 配置。
 * [OUTPUT]: createPythonRuntime，启动预准备、状态检查、失败后重试及比较解释器。
 * [POS]: preset 专属依赖生命周期；不修改系统 Python，不阻塞普通预测注册。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export function createPythonRuntime({ runtimePath, pythonBin, runCli, logger }) {
  // 安装器属于插件，不能随用户覆盖的预测 CLI 一起换目录。
  const installer = runtimePath
  const lifetime = new AbortController()
  let pending, ready
  const choosePython = async signal => {
    for (const candidate of [...new Set([pythonBin, 'python3.14', 'python3.13', 'python3.12', 'python3', 'python'])]) {
      try {
        const probe = await runCli(candidate, '-c', 'import sys;sys.exit(0 if sys.version_info >= (3,12) else 1)', [], undefined, 15000, signal)
        if (probe.exitCode === 0) return candidate
      } catch (error) { if (signal?.aborted) throw error }
    }
    throw new Error('未找到 Python 3.12+。请安装 Python 3.12 或更新版本，或配置 LIMIX_PYTHON_BIN；模型比较依赖会自动装入独立环境。')
  }
  const prepare = () => {
    if (ready) return Promise.resolve(ready)
    if (!pending) pending = (async () => {
      const python = await choosePython(lifetime.signal)
      const result = await runCli(python, installer, 'prepare', [], undefined, 900000, lifetime.signal)
      let data
      try { data = JSON.parse(result.stdout) } catch { throw new Error(result.stderr || 'Python 环境准备未返回结果') }
      if (result.exitCode !== 0 || data.status !== 'ready') throw new Error(data.error || result.stderr || 'Python 环境准备失败')
      ready = data
      return data
    })().finally(() => { pending = undefined })
    return pending
  }
  return {
    prepare,
    async wait(signal) {
      signal?.throwIfAborted()
      const promise = prepare()
      if (!signal) return promise
      return new Promise((resolve, reject) => {
        const abort = () => reject(Object.assign(new Error('等待 Python 环境已取消；后台安装继续准备'), { name: 'AbortError' }))
        signal.addEventListener('abort', abort, { once: true })
        promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
      })
    },
    status: () => ready ?? { status: pending ? 'preparing' : 'not_ready' },
    start() { prepare().catch(error => logger?.warn?.('LimiX Python 环境准备失败，可用 runtime prepare 重试：%s', error.message)) },
    dispose() { lifetime.abort() },
  }
}
