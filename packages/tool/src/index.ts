/**
 * [INPUT]: 文件系统；宿主 webServer、tools、commands、systemPrompt 与 limixDatasource
 * [OUTPUT]: Cordis 插件 —— ① 注册 `limix` 与 `datasource`，限于当前 preset
 *           ② 注册 /limix-predict、/limix-explain、/limix-compare 与受控结果通道
 * [POS]: dsh-limix-tool 的 preset 宿主入口；数据源设置与连接工厂由全局 data 包提供。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { registerLimixTool } from './host/tool.js'
import { registerPredictCommand } from './host/predict-command.js'
import { registerExplainCommand } from './host/explain-command.js'
import { registerBenchmarkCommand } from './host/benchmark-command.js'
import { createCsvAccess } from './host/csv-access.js'

export const name = 'limix-agent'
export const inject = ['webServer', 'tools', 'limixDatasource', 'commands', 'systemPrompt']

interface Config {
  /** 允许读取的根目录白名单（realpath 前缀判定）；进程 cwd 恒在名单内。 */
  csvRoots?: string[]
  /** limix CLI 覆盖：默认用包内 assets/limix.py。 */
  cliPath?: string
  /** python 解释器；默认 python3。 */
  pythonBin?: string
}

export function apply(ctx: any, config: Config = {}): void {
  ctx.limixDatasource.register(ctx)
  const roots = [...(config.csvRoots ?? []).filter((r) => typeof r === 'string' && r.length > 0), process.cwd()]
  const csv = createCsvAccess(roots)
  // 时序原始解释同时包含矩阵与长表，480×43 的真实返回约10MB。
  const artifacts = createCsvAccess(roots, undefined, { extensions: ['.json', '.csv'], registeredOnly: true, maxBytes: 50_000_000 })
  registerLimixTool(ctx, { cliPath: config.cliPath, pythonBin: config.pythonBin, csv, artifacts })
  registerPredictCommand(ctx)
  registerExplainCommand(ctx)
  registerBenchmarkCommand(ctx)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/limix-ui/artifact',
    handler: async (req: any, res: any) => {
      if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const target = await artifacts.resolve(url.searchParams.get('path') ?? '')
        if (!target) { res.writeHead(404); res.end('not found'); return }
        const content = await readFile(target)
        res.writeHead(200, {
          'content-type': target.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(basename(target))}`,
          'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
        })
        res.end(content)
      } catch { res.writeHead(500); res.end('无法读取解释文件') }
    },
  }), 'limix-agent: 已登记解释文件下载')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/limix-ui/csv',
    handler: async (req: any, res: any) => {
      try {
        if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
        const url = new URL(req.url ?? '/', 'http://localhost')
        const raw = url.searchParams.get('path') ?? ''
        if (!raw || !raw.toLowerCase().endsWith('.csv')) {
          res.writeHead(403); res.end('csv only'); return
        }
        const target = await csv.resolve(raw)
        if (!target) { res.writeHead(404); res.end('not found or outside allowed roots'); return }
        const text = await readFile(target, 'utf8')
        const headers: Record<string, string> = { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store' }
        if (url.searchParams.get('download') === '1') {
          headers['content-disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(basename(target))}`
        }
        res.writeHead(200, headers)
        res.end(text)
      } catch (e: any) {
        res.writeHead(500); res.end(String(e?.message ?? e))
      }
    },
  }), 'limix-agent: csv 只读路由')
}
