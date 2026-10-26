/**
 * [INPUT]: node:fs/promises、node:path；宿主服务 webServer（只读同源路由）与 tools（工具注册）
 * [OUTPUT]: Cordis 插件 —— ① 注册 `limix` 工具（见 host/tool.js）
 *           ② 注册只读同源路由 GET /limix-ui/csv?path=...（浏览器半取预测结果 CSV 的唯一通道）
 * [POS]: dsh-limix-agent 的宿主半。案例库（/cases、/limix-ui/samples、/limix-ui/case）已按分发范围裁掉
 */

import { readFile, realpath, stat } from 'node:fs/promises'
import { isAbsolute, resolve, sep } from 'node:path'
import { registerLimixTool } from './host/tool.js'

export const name = 'limix-agent'
export const inject = ['webServer', 'tools']

/** 单文件上限：演示级 CSV 远小于此；防误读大文件拖垮内存。 */
const MAX_BYTES = 5_000_000

interface Config {
  /** 允许读取的根目录白名单（realpath 前缀判定）；进程 cwd 恒在名单内。 */
  csvRoots?: string[]
  /** limix CLI 覆盖：默认用包内 assets/limix.py。 */
  cliPath?: string
  /** python 解释器；默认 python3。 */
  pythonBin?: string
}

export function apply(ctx: any, config: Config = {}): void {
  registerLimixTool(ctx, { cliPath: config.cliPath, pythonBin: config.pythonBin })

  const roots = [...(config.csvRoots ?? []).filter((r) => typeof r === 'string' && r.length > 0), process.cwd()]

  /** 把 raw 解析到某个白名单根内的真实文件；越界/不存在/超限返回 null。 */
  async function resolveInRoots(raw: string): Promise<string | null> {
    for (const root of roots) {
      const candidate = isAbsolute(raw) ? raw : resolve(root, raw)
      try {
        const real = await realpath(candidate)
        const realRoot = await realpath(root)
        if (real !== realRoot && !real.startsWith(realRoot + sep)) continue
        const st = await stat(real)
        if (st.isFile() && st.size <= MAX_BYTES) return real
      } catch { /* 此根下无该文件，试下一个 */ }
    }
    return null
  }

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
        const target = await resolveInRoots(raw)
        if (!target) { res.writeHead(404); res.end('not found or outside allowed roots'); return }
        const text = await readFile(target, 'utf8')
        res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store' })
        res.end(text)
      } catch (e: any) {
        res.writeHead(500); res.end(String(e?.message ?? e))
      }
    },
  }), 'limix-agent: csv 只读路由')
}
