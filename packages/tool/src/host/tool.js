/**
 * [INPUT]: 仅 Node 内建（child_process/fs/path/url）；limix CLI 由本包 assets/limix.py 自带，
 *          解析链 config.cliPath > LIMIX_CLI_PATH > <包>/assets/limix.py
 * [OUTPUT]: registerLimixTool(ctx, config) 与可离线验证的 runCli；注册 `limix` 工具（15 个子命令，
 *          提供按需帮助，覆盖预测、解释与比较，并登记结果文件读取权限）
 * [POS]: dsh-limix-agent 的宿主工具面。**不 import @deepseek-ai/dsh-tools**：
 *        树外包在 profile 的 node_modules 下按 Node 规则解析，够不到 dsh 安装里的包；
 *        这里直接给出 register 需要的规范化定义（等价于 defineTool 的产物）。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

/** 模型可见的子命令词表（scripts/limix.py）。 */
const COMMANDS = [
  'health', 'check', 'upload', 'classify', 'regress', 'forecast',
  'task', 'tasks', 'cancel', 'result', 'download', 'data', 'api', 'explain', 'benchmark',
]

const DESCRIPTION = `调用 LimiX 开放平台 API 完成表格数据预测（免训练、零调参），覆盖 上传数据 → 分类/回归/时序预测 → 任务轮询 → 结果下载 全流程。
子命令：health / check（连通性）；upload <文件>（上传得 data_version_id）；classify / regress / forecast（上传→提交→轮询→下载一条龙，需 --train --predict --target，时序另需 --date --context --horizon；时序的 --predict 可选，不传则按 --horizon 自动外推）；task <id> / tasks（查任务）；result <id> / download <id> -o 文件（取结果）；data files|versions（查数据）；api <METHOD> <path>（逃生舱裸调任意端点）。
参数帮助：通过本工具传 command="forecast"、args=["--help"]（其它子命令同理）。CLI 由本工具封装，不在 shell 的 PATH 中，不要搜索或执行 shell limix 命令。
时序区间：--quantile --levels 0.1,0.5,0.9 返回 P10/P50/P90；--context 90 直接使用最近 90 个历史点，无需剪裁原始文件。--output 指定保存 CSV 的路径。
评估：可传 --truth 本地 CSV，含目标列，时序还须含日期列；它只用于本地对照，不会上传。
解释：explain --mode local --train 参考CSV --data 待解释CSV --target 目标 --task-type regression或classification --row 1 --output 解释.json。全局图用 --mode directed或undirected --data 含目标CSV --target 目标 --features 特征1,特征2；字段须完整数值。可选 --labels 字段字典.json、--prediction 原预测.csv。解释自动上传、轮询和保存JSON/CSV；--task-id 续查，不重复提交。参数未知、版本变化或参数校验失败时用 explain --help；已有适用说明直接复用。
模型比较：benchmark --manifest 数据集清单.json --models LIMIX_7M,LIMIX_16M,XGBoost,BASELINE --output 比较.json；自动保存可恢复回执、JSON/CSV/HTML，使用同一固定拆分。比较入口需要 numpy/pandas/scikit-learn，选择 XGBoost 时另需 xgboost；--python 指定独立 Python 环境。仅支持回归/分类；参数未知、版本变化或参数校验失败时查 --help。
时序解释：explain --mode local --task-type timeseries --result-version-id 已完成时序预测的结果版本ID --output 解释.json，沿用原预测参数，不传 data/train/target。
终态口径：预测任务成功须 status=finished 且有 result_version_id（is_ready=true 仅表示停止轮询）；扩展解释使用 task_status=succeeded，降级或部分成功须说明。凭据由现有配置读取，无需额外传参。文件路径用绝对路径，或相对调用时所在目录的相对路径。`

/** Python CLI 入口的解析链：显式配置 > 环境变量 > 包内自带。 */
function resolveCli(config) {
  const bundled = fileURLToPath(new URL('../assets/limix.py', import.meta.url))
  const tried = [config?.cliPath, process.env.LIMIX_CLI_PATH, bundled].filter(Boolean)
  const found = tried.find((p) => existsSync(p))
  if (!found) {
    throw new Error(
      'limix CLI 未找到：包内 assets/limix.py 缺失。可用 LIMIX_CLI_PATH 指向 scripts/limix.py 覆盖。'
      + '已尝试：' + (tried.join(' , ') || '（无候选）'),
    )
  }
  return found
}

/** 一次 CLI 调用；Windows 使用 taskkill 收掉树，POSIX 委派层转发终止信号。 */
export function runCli(pythonBin, cliPath, command, args, workdir, timeoutMs, signal, runtime = {}) {
  return new Promise((resolvePromise, reject) => {
    const spawnChild = runtime.spawn || spawn
    const windows = (runtime.platform || process.platform) === 'win32'
    const abortError = () => Object.assign(new Error('LimiX 工具已取消'), { name: 'AbortError' })
    if (signal?.aborted) { reject(abortError()); return }
    const child = spawnChild(pythonBin, [cliPath, command, ...args], {
      cwd: workdir || process.cwd(),
      ...(windows ? {} : { signal, timeout: timeoutMs }),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let timer
    let stopping = false
    const stopWindowsTree = (error) => {
      if (stopping) return
      stopping = true
      if (child.pid) {
        // TerminateProcess 不运行 Python signal handler；必须由宿主终止全部后代。
        const killer = spawnChild('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true, stdio: 'ignore',
        })
        killer.on('error', (killError) => { stderr += `\n进程树终止失败：${killError.message}` })
      }
      reject(error)
    }
    const onAbort = () => stopWindowsTree(abortError())
    const cleanup = () => {
      clearTimeout(timer)
      if (windows) signal?.removeEventListener('abort', onAbort)
    }
    if (windows) {
      signal?.addEventListener('abort', onAbort, { once: true })
      if (timeoutMs > 0) timer = setTimeout(() => stopWindowsTree(
        Object.assign(new Error(`LimiX 工具运行超时（${timeoutMs}ms）`), { name: 'TimeoutError' }),
      ), timeoutMs)
    }
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => { cleanup(); reject(error) })
    child.on('close', (code) => { cleanup(); resolvePromise({ exitCode: code ?? -1, stdout, stderr }) })
  })
}

/**
 * 注册 `limix` 工具。
 * @param ctx 宿主插件上下文（需要 ctx.tools）
 * @param config { cliPath?, pythonBin?, timeoutMs?, csv? }
 */
export function registerLimixTool(ctx, config = {}) {
  const cliPath = resolveCli(config)
  const pythonBin = config.pythonBin || process.env.LIMIX_PYTHON_BIN || 'python3'
  const timeoutMs = config.timeoutMs ?? 600_000

  ctx.tools.register({
    name: 'limix',
    description: DESCRIPTION,
    // 规范化后的 JSON Schema（register 收到的是 defineTool 的产物形状）
    parameters: {
      type: 'object',
      required: ['command'],
      additionalProperties: false,
      properties: {
        command: {
          type: 'string',
          enum: COMMANDS,
          description: 'limix 子命令（见 description 里的命令表）',
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: '传给子命令的参数，每项一个 token，不经过 shell 解析（含空格的路径/值直接作为单个 token 传入）',
        },
        workdir: {
          type: 'string',
          description: 'CLI 运行目录（默认：调用方会话的工作目录）',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          command: { type: 'string' },
          exitCode: { type: 'number' },
          stdout: { type: 'string' },
          stderr: { type: 'string' },
        },
        required: ['command', 'exitCode', 'stdout', 'stderr'],
      },
      render(_args, value) {
        return [{ type: 'text', text: value.stdout + (value.stderr ? `\n[stderr]\n${value.stderr}` : '') }]
      },
    },
    async execute(args, exec) {
      if (!COMMANDS.includes(args.command)) {
        throw new Error(`未知的 limix 子命令：${args.command}`)
      }
      const { exitCode, stdout, stderr } = await runCli(
        pythonBin, cliPath, args.command, args.args ?? [], args.workdir, timeoutMs, exec.signal,
      )
      if (exitCode === 0 && config.csv) {
        let data
        try { data = JSON.parse(stdout) } catch { /* 非 JSON 输出没有结果文件 */ }
        if (typeof data?.saved_to === 'string') {
          const paths = [data.saved_to, data.csv_path, data.explanation?.detail_path].filter(p => typeof p === 'string')
          const tokens = args.args ?? []
          if (['classify', 'regress', 'forecast'].includes(args.command)) {
            for (const flag of ['--train', '--predict', '--truth']) {
              const index = tokens.indexOf(flag)
              if (index >= 0 && tokens[index + 1]) paths.push(tokens[index + 1])
            }
          }
          try { await config.csv.remember(paths, args.workdir || process.cwd()) }
          catch (error) { ctx.logger?.warn?.('limix CSV registration failed: %s', error.message) }
          if (['explain', 'benchmark'].includes(args.command) && config.artifacts) {
            try { await config.artifacts.remember(paths, args.workdir || process.cwd()) }
            catch (error) { ctx.logger?.warn?.('limix artifact registration failed: %s', error.message) }
          }
        }
      }
      return { command: args.command, exitCode, stdout, stderr }
    },
  })

  // 供诊断：工具注册到的 CLI 路径随启动日志可见
  ctx.logger?.info?.('limix tool ready: %s (%s)', cliPath, pythonBin)
}
