/**
 * [INPUT]: 当前会话标识、目标工具节点和宿主页签。
 * [OUTPUT]: 跨视图一次性定位请求；按会话隔离。
 * [POS]: 对话尾部不具备宿主 openView，沿当前 DOM 祖先定位本会话注册页签。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const pending = new Map<string, string>()
export function openTurnFlow(root: HTMLElement, sessionId: string, stageKey: string): boolean {
  const panel = root.closest<HTMLElement>('[data-slot="main.conversation"]')
  const identity = root.closest<HTMLElement>('[data-conversation-session]')
  if (!panel || identity?.dataset.conversationSession !== sessionId) return false
  const tab = [...panel.querySelectorAll<HTMLElement>('[role="tab"]')].find(el => ['任务流程','Task flow'].includes(el.textContent?.trim() ?? ''))
  if (tab) { pending.set(sessionId, stageKey); tab.click(); return true }
  return false
}
export function pendingTurnFlow(sessionId: string) { return pending.get(sessionId) }
export function clearTurnFlow(sessionId: string) { pending.delete(sessionId) }
