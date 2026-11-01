/**
 * [INPUT]: 文件系统；宿主 webServer、tools、commands、systemPrompt 与 limixDatasource
 * [OUTPUT]: Cordis 插件 —— ① 注册 `limix` 与 `datasource`，限于当前 preset
 *           ② 注册三类命令、带图报告生成器与受控结果通道
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
import { runReportCommand } from './report/index'
export { runReportCommand } from './report/index'

export const name = 'limix-agent'
export const inject = ['webServer', 'tools', 'limixDatasource', 'commands', 'systemPrompt']

interface Config {
  /** 允许读取的根目录白名单（realpath 前缀判定）；进程 cwd 恒在名单内。 */
  csvRoots?: string[]
  /** limix CLI 覆盖：默认用包内 assets/limix.py。 */
  cliPath?: string
  /** python 解释器；默认 python3。 */
  pythonBin?: string
  /** 默认在 LimiX preset 激活后预准备独立比较环境。 */
  preparePython?: boolean
}

export function apply(ctx: any, config: Config = {}): void {
  ctx.limixDatasource.register(ctx)
  const roots = [...(config.csvRoots ?? []).filter((r) => typeof r === 'string' && r.length > 0), process.cwd()]
  const csv = createCsvAccess(roots)
  // 时序原始解释同时包含矩阵与长表，480×43 的真实返回约10MB。
  const artifacts = createCsvAccess(roots, undefined, { extensions: ['.json', '.csv'], registeredOnly: true, maxBytes: 50_000_000 })
  const previews = createCsvAccess(roots, undefined, { extensions: ['.svg'], registeredOnly: true, maxBytes: 50_000_000 })
  const reports = createCsvAccess(roots, undefined, { extensions: ['.html', '.md'], registeredOnly: true, maxBytes: 50_000_000 })
  registerLimixTool(ctx, { cliPath: config.cliPath, pythonBin: config.pythonBin, preparePython: config.preparePython, csv, artifacts, reports, previews, reportCommand: runReportCommand })
  registerPredictCommand(ctx)
  registerExplainCommand(ctx)
  registerBenchmarkCommand(ctx)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/limix-ui/report-status',
    handler: async (req: any, res: any) => {
      if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const primary = await reports.resolve(url.searchParams.get('path') ?? '')
        const fallback = primary ? null : await reports.resolve(url.searchParams.get('fallback') ?? '')
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
        res.end(JSON.stringify({ status: primary ? 'available' : fallback ? 'fallback' : 'missing', path: primary ?? fallback }))
      } catch { res.writeHead(500); res.end() }
    },
  }), 'limix-agent: 已登记报告可用性检查')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/limix-ui/report-preview',
    handler: async (req: any, res: any) => {
      if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
      try {
        const target = await previews.resolve(new URL(req.url ?? '/', 'http://localhost').searchParams.get('path') ?? '')
        if (!target) { res.writeHead(404); res.end('not found'); return }
        res.writeHead(200, { 'content-type': 'image/svg+xml', 'content-security-policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'", 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' })
        res.end(await readFile(target))
      } catch { res.writeHead(500); res.end('图表预览不可用，请打开 HTML 报告') }
    },
  }), 'limix-agent: 已登记图表预览')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/limix-ui/report',
    handler: async (req: any, res: any) => {
      if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const target = await reports.resolve(url.searchParams.get('path') ?? '')
        if (!target) { res.writeHead(404); res.end('not found'); return }
        const content = await readFile(target)
        res.writeHead(200, {
          'content-type': target.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/markdown; charset=utf-8',
          'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(basename(target))}`,
          'content-security-policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
          'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
        })
        res.end(content)
      } catch { res.writeHead(500); res.end('无法读取报告文件') }
    },
  }), 'limix-agent: 已登记报告下载')

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
