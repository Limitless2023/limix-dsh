/**
 * [INPUT]: React 生命周期与原生 dialog；卡片内 data-lx-fullscreen 按钮。
 * [OUTPUT]: 整卡全屏状态、原位占位、Esc 关闭；清除模态语义后恢复焦点和滚动。
 * [POS]: LimixToolCard 的展示外壳；保持同一棵内容树，不重载解释文件。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react'

export const CARD_FULLSCREEN_CSS = `
.lx-card-host{display:flow-root;min-width:0}
.lx-fullscreen-dialog:not([open]){display:contents}
.lx-fullscreen-dialog[open]{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;box-sizing:border-box;margin:0;padding:0;border:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;background:var(--dsw-alias-background-primary,#fff);color:var(--dsw-alias-label-primary);font:inherit}
.lx-fullscreen-dialog::backdrop{background:var(--dsw-alias-background-primary,#fff)}
.lx-fullscreen-dialog[open]>.lx-result{box-sizing:border-box;min-height:100%;max-width:1600px;margin:0 auto;border:0;border-radius:0;padding:24px clamp(18px,3vw,52px)}
.lx-result button.lx-fullscreen-button{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:28px;height:28px;padding:0;border-radius:5px;color:var(--dsw-alias-label-secondary)}
.lx-result button.lx-fullscreen-button:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f5f8);color:var(--dsw-alias-state-business-primary,#3465ce)}
.lx-fullscreen-dialog[open] .lx-result-head{position:sticky;top:-1px;z-index:2;background:var(--dsw-alias-background-primary,#fff);padding:7px 0}
.lx-fullscreen-dialog[open] .lx-matrix-svg{max-height:max(340px,calc(100dvh - 350px))}
.lx-fullscreen-dialog[open] .lx-causal-graph{max-height:max(340px,calc(100dvh - 350px))!important}
`

export function useCardFullscreen() {
  const hostRef = useRef<HTMLDivElement>(null), dialogRef = useRef<HTMLDialogElement>(null)
  const [expanded, setExpanded] = useState(false), [error, setError] = useState('')
  const triggerRef = useRef<HTMLElement | null>(null), restoreFocus = useRef(false)
  useEffect(() => {
    if (expanded || !restoreFocus.current) return
    const frame = requestAnimationFrame(() => {
      if (!restoreFocus.current || dialogRef.current?.open) return
      restoreFocus.current = false
      if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [expanded])
  useEffect(() => {
    const host = hostRef.current, dialog = dialogRef.current
    if (!host || !dialog) return
    let scrolls: Array<{ element: HTMLElement; top: number; left: number }> = []
    const clearModal = () => {
      dialog.setAttribute('aria-modal', 'false'); dialog.setAttribute('role', 'presentation')
    }
    const closeDialog = () => { clearModal(); dialog.close() }
    const close = () => {
      if (dialog.open) return
      clearModal(); restoreFocus.current = true
      host.style.height = ''; setExpanded(false)
      for (const s of scrolls) { s.element.scrollTop = s.top; s.element.scrollLeft = s.left }
    }
    const click = (event: Event) => {
      const button = (event.target as Element).closest<HTMLElement>('[data-lx-fullscreen]')
      if (!button || !dialog.contains(button)) return
      event.stopPropagation()
      if (dialog.open) { closeDialog(); return }
      triggerRef.current = button; restoreFocus.current = false; scrolls = []; setError('')
      for (let parent = host.parentElement; parent; parent = parent.parentElement) {
        if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) scrolls.push({ element: parent, top: parent.scrollTop, left: parent.scrollLeft })
      }
      host.style.height = `${host.getBoundingClientRect().height}px`
      dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('role', 'dialog')
      try { dialog.showModal(); dialog.scrollTop = 0; setExpanded(true); button.focus({ preventScroll: true }) }
      catch { clearModal(); host.style.height = ''; setError('暂时无法打开全屏，请重试。') }
    }
    const keydown = (event: KeyboardEvent) => {
      if (dialog.open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDialog() }
    }
    const cancel = (event: Event) => { event.preventDefault(); closeDialog() }
    dialog.addEventListener('click', click); dialog.addEventListener('close', close); dialog.addEventListener('cancel', cancel); dialog.addEventListener('keydown', keydown, true)
    return () => {
      dialog.removeEventListener('click', click); dialog.removeEventListener('close', close); dialog.removeEventListener('cancel', cancel); dialog.removeEventListener('keydown', keydown, true)
      restoreFocus.current = false
      if (dialog.open) closeDialog()
      host.style.height = ''
    }
  }, [])
  return { hostRef, dialogRef, expanded, error }
}
