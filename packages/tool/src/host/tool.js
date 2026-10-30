/**
 * [INPUT]: 仅 Node 内建（child_process/fs/path/url）；limix CLI 由本包 assets/limix.py 自带，
 *          解析链 config.cliPath > LIMIX_CLI_PATH > <包>/assets/limix.py
 * [OUTPUT]: registerLimixTool(ctx, config) —— 向 ctx.tools 注册 `limix` 工具（13 个子命令，
 *          覆盖 上传 → 分类/回归/时序 → 轮询 → 下载 全流程）
 * [POS]: dsh-limix-agent 的宿主工具面。**不 import @deepseek-ai/dsh-tools**：
 *        树外包在 profile 的 node_modules 下按 Node 规则解析，够不到 dsh 安装里的包；
 *        这里直接给出 register 需要的规范化定义（等价于 defineTool 的产物）。
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

/** 模型可见的子命令词表（scripts/limix.py）。 */
const COMMANDS = [
  'health', 'check', 'upload', 'classify', 'regress', 'forecast',
  'task', 'tasks', 'cancel', 'result', 'download', 'data', 'api',
]

const DESCRIPTION = `调用 LimiX 开放平台 API 完成表格数据预测（免训练、零调参），覆盖 上传数据 → 分类/回归/时序预测 → 任务轮询 → 结果下载 全流程。
子命令：health / check（连通性）；upload <文件>（上传得 data_version_id）；classify / regress / forecast（上传→提交→轮询→下载一条龙，需 --train --predict --target，时序另需 --date --context --horizon；时序的 --predict 可选，不传则按 --horizon 自动外推）；task <id> / tasks（查任务）；result <id> / download <id> -o 文件（取结果）；data files|versions（查数据）；api <METHOD> <path>（逃生舱裸调任意端点）。
终态口径：预测任务成功终态判据 is_ready=true（finished）；数据接入/治理/插补/因果任务成功终态 succeeded。凭据已配置于 ~/.limix/config.json，无需额外传参。文件路径用绝对路径，或相对调用时所在目录的相对路径。`

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

/** 一次 CLI 调用；exec.signal 中止子进程，timeoutMs 兜底整体时长。 */
function runCli(pythonBin, cliPath, command, args, workdir, timeoutMs, signal) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(pythonBin, [cliPath, command, ...args], {
      cwd: workdir || process.cwd(),
      signal,
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => resolvePromise({ exitCode: code ?? -1, stdout, stderr }))
  })
}

/**
 * 注册 `limix` 工具。
 * @param ctx 宿主插件上下文（需要 ctx.tools）
 * @param config { cliPath?, pythonBin?, timeoutMs? }
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
      return { command: args.command, exitCode, stdout, stderr }
    },
  })

  // 供诊断：工具注册到的 CLI 路径随启动日志可见
  ctx.logger?.info?.('limix tool ready: %s (%s)', cliPath, pythonBin)
}
