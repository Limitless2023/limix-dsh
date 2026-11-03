/**
 * [INPUT]: 主题感知 SVG 渲染函数与文件名。
 * [OUTPUT]: SVG / PNG 下载和可见失败状态；允许宿主注入同组菜单操作。
 * [POS]: 解释图表导出交互；原生事件适配普通卡和 dialog。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { ActionMenu } from './ActionMenu'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { defaultExportTheme, type ExportTheme } from './explanation-export'

function themeAt(element: HTMLElement): ExportTheme {
  const probe = document.createElement('span')
  probe.style.cssText = 'position:absolute;visibility:hidden;color:var(--dsw-alias-label-primary,#202734);background:var(--dsw-alias-background-primary,#fff);border-color:var(--dsw-alias-border-l3,#dce2eb)'
  element.append(probe)
  const style = getComputedStyle(probe), colors = [style.backgroundColor, style.color, style.borderTopColor]
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
  const context = canvas.getContext('2d')
  const resolve = (color: string, fallback: string) => { if (!context) return fallback; context.clearRect(0,0,1,1); context.fillStyle = color; context.fillRect(0,0,1,1); const rgba = context.getImageData(0,0,1,1).data; return rgba[3] ? `#${[...rgba].slice(0,3).map(v => v.toString(16).padStart(2,'0')).join('')}` : fallback }
  const theme = { background: resolve(colors[0], defaultExportTheme.background), foreground: resolve(colors[1], defaultExportTheme.foreground), border: resolve(colors[2], defaultExportTheme.border) }
  probe.remove(); return theme
}
async function png(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve,reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('图片转换失败，可下载 SVG')); image.src = url })
    const scale = Math.min(2, Math.sqrt(16_000_000 / (image.width * image.height))), canvas = document.createElement('canvas')
    canvas.width = Math.ceil(image.width * scale); canvas.height = Math.ceil(image.height * scale)
    const context = canvas.getContext('2d'); if (!context) throw new Error('浏览器无法导出 PNG，可下载 SVG')
    context.drawImage(image,0,0,canvas.width,canvas.height)
    return await new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 导出失败')), 'image/png'))
  } finally { URL.revokeObjectURL(url) }
}
export function ExplanationExport({ build, filename, menuLabel = "导出图表", children }: { menuLabel?:string; children?:ReactNode; build: (theme: ExportTheme) => string; filename: string }) {
  const root = useRef<HTMLDivElement>(null), busyRef = useRef(false), [status, setStatus] = useState('')
  useEffect(() => {
    const element = root.current
    const click = async (event: Event) => {
      const format = (event.target as Element).closest<HTMLElement>('[data-lx-export]')?.dataset.lxExport
      if (!format || !element || busyRef.current) return
      busyRef.current = true; setStatus('正在导出…')
      try {
        const svg = build(themeAt(element)), blob = format === 'png' ? await png(svg) : new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(blob), anchor = document.createElement('a')
        anchor.href = url; anchor.download = `${filename.replace(/[^\p{L}\p{N}_-]/gu,'-').slice(0,100)}.${format}`; document.body.append(anchor); anchor.click(); anchor.remove()
        setTimeout(() => URL.revokeObjectURL(url), 10000); setStatus('已导出')
      } catch (error) { setStatus(error instanceof Error ? error.message : '导出失败，请重试') } finally { busyRef.current = false }
    }
    element?.addEventListener('click', click)
    return () => element?.removeEventListener('click', click)
  }, [build, filename])
  return <div className="lx-export" ref={root}><ActionMenu label={menuLabel}>{children}<button type="button" data-lx-export="svg" aria-label="导出 SVG 图表">SVG</button><button type="button" data-lx-export="png" aria-label="导出 PNG 图表">PNG</button></ActionMenu><span role="status" className="lx-export-status">{status}</span></div>
}
