/**
 * [INPUT]: 操作名称、原生链接或按钮。
 * [OUTPUT]: 可键盘展开、外部点击与 Esc 关闭的操作菜单；支持顶层浮层避免宿主滚动区裁切。
 * [POS]: 解释卡数据下载、文件操作与图表导出共用；保留宿主原生事件委托。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, type ReactNode } from 'react'
export function ActionMenu({ label, children, up = false }: { label: string; children: ReactNode; up?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current, panel = panelRef.current
    if (!el || !panel) return
    // Popover 保持原 DOM 和原生委托，同时脱离宿主的裁切区域。
    const floating = typeof panel.showPopover === 'function'
    if (floating) panel.setAttribute('popover', 'manual')
    const place = () => {
      if (!floating || !el.open) return
      const anchor = el.querySelector('summary')!.getBoundingClientRect()
      const rect = panel.getBoundingClientRect()
      const x = up ? anchor.left : anchor.right - rect.width
      const above = up || window.innerHeight - anchor.bottom < rect.height + 8
      panel.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`
      panel.style.top = `${Math.max(8, Math.min(above ? anchor.top - rect.height - 5 : anchor.bottom + 5, window.innerHeight - rect.height - 8))}px`
    }
    const toggle = () => {
      if (!floating) return
      if (el.open) { panel.showPopover(); place() }
      else if (panel.matches(':popover-open')) panel.hidePopover()
    }
    const close = (event: Event) => { if (!el.contains(event.target as Node)) el.open = false }
    const key = (event: KeyboardEvent) => { if (el.open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); el.open = false; el.querySelector('summary')?.focus() } }
    const choose = (event: Event) => { if ((event.target as Element).closest('a,button')) { el.open = false; el.querySelector('summary')?.focus() } }
    document.addEventListener('pointerdown', close, true); document.addEventListener('keydown', key, true); el.addEventListener('click', choose); el.addEventListener('toggle', toggle)
    window.addEventListener('resize', place); document.addEventListener('scroll', place, true)
    return () => { document.removeEventListener('pointerdown', close, true); document.removeEventListener('keydown', key, true); el.removeEventListener('click', choose); el.removeEventListener('toggle', toggle); window.removeEventListener('resize', place); document.removeEventListener('scroll', place, true); if (floating && panel.matches(':popover-open')) panel.hidePopover() }
  }, [])
  return <details className="lx-action-menu" ref={ref} data-up={up}>
    <style>{`.lx-action-menu{position:relative;font-size:12px}.lx-action-menu>summary{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;cursor:pointer;list-style:none;color:var(--dsw-alias-state-business-primary,#3465ce);padding:3px 0}.lx-action-menu>summary::-webkit-details-marker{display:none}.lx-action-menu>summary:focus-visible{outline:2px solid #466eb9;outline-offset:3px}.lx-action-chevron{display:block;flex:none;width:12px;height:12px;transition:transform .15s ease}.lx-action-menu[open]>summary .lx-action-chevron{transform:rotate(180deg)}@media(prefers-reduced-motion:reduce){.lx-action-chevron{transition:none}}.lx-action-menu-panel{position:absolute;z-index:20;top:100%;right:0;min-width:160px;padding:6px;background:var(--dsw-alias-background-primary,#fff);border:1px solid var(--dsw-alias-border-l3,#e3e6eb);border-radius:8px;box-shadow:0 6px 22px #152b4914}.lx-action-menu[data-up=true]>.lx-action-menu-panel{top:auto;bottom:100%;left:0;right:auto}.lx-result .lx-action-menu-panel>a,.lx-result .lx-action-menu-panel>button{display:block;width:100%;padding:7px 10px;text-align:left;white-space:nowrap}.lx-action-menu-panel>a:hover,.lx-action-menu-panel>button:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f5f8)}`}</style>
    <style>{`.lx-action-menu>.lx-action-menu-panel[popover]{position:fixed;inset:auto;margin:0;box-sizing:border-box;max-height:calc(100dvh - 16px);max-width:calc(100vw - 16px);overflow:auto;color:inherit;font:inherit}.lx-action-menu[data-up=true]>.lx-action-menu-panel[popover]{bottom:auto;right:auto}`}</style>
    <summary><span>{label}</span><svg className="lx-action-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg></summary><div className="lx-action-menu-panel" ref={panelRef}>{children}</div>
  </details>
}
