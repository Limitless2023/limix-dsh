/**
 * [INPUT]: 本地文件系统、显式 CSV 根目录、成功调用的文件路径。
 * [OUTPUT]: createCsvAccess，校验真实路径、扩展名与显式大小限额；解释产物要求登记。
 * [POS]: 图表读取边界；凭据不进入记录，重启后仍可读取已完成的预测。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { readFile, realpath, stat, mkdir, writeFile, rename } from 'node:fs/promises'
import { dirname, isAbsolute, resolve, sep, join } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'

let writes = Promise.resolve()
const DEFAULT_MAX_BYTES = 5_000_000

export function createCsvAccess(roots, receiptPath = join(homedir(), '.limix', 'dsh-csv-files.json'), options = {}) {
  const extensions = options.extensions ?? ['.csv']
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error('文件大小限额须为正整数')
  const allowed = path => typeof path === 'string' && extensions.some(ext => path.toLowerCase().endsWith(ext))
  const readReceipts = async () => {
    try {
      const data = JSON.parse(await readFile(receiptPath, 'utf8'))
      return new Set(Array.isArray(data) ? data.filter(p => typeof p === 'string' && isAbsolute(p)) : [])
    } catch { return new Set() }
  }
  return {
    async remember(paths, cwd) {
      // 串行合并，避免并发预测覆盖彼此的读取记录。
      const save = async () => {
        const files = await readReceipts()
        for (const path of paths) {
          if (!allowed(path)) continue
          try { files.add(await realpath(resolve(cwd, path))) } catch { /* 非本地版本 ID 不登记 */ }
        }
        await mkdir(dirname(receiptPath), { recursive: true })
        const temp = `${receiptPath}.${randomUUID()}.tmp`
        await writeFile(temp, JSON.stringify([...files].slice(-1000)), { mode: 0o600 })
        await rename(temp, receiptPath)
      }
      writes = writes.then(save, save)
      await writes
    },
    async resolve(raw) {
      if (!allowed(raw)) return null
      const files = await readReceipts()
      for (const root of roots) {
        try {
          const real = await realpath(isAbsolute(raw) ? raw : resolve(root, raw))
          const realRoot = await realpath(root)
          if (!files.has(real) && (options.registeredOnly || (real !== realRoot && !real.startsWith(realRoot + sep)))) continue
          const info = await stat(real)
          if (info.isFile() && info.size <= maxBytes) return real
        } catch { /* 不存在或越界时不泄露文件信息 */ }
      }
      return null
    },
  }
}
