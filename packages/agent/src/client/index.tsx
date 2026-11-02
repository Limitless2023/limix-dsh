/**
 * [INPUT]: 宿主 cordis 服务 slots、locale、sessions、sidebarRight（会话授权文件预览）；组件见同目录 LimixToolCard / LimixPipelineView
 * [OUTPUT]: 浏览器半 Cordis 插件（inject + apply）：
 *           ① tool.call.toolview 以 key='limix' 认领自家工具的结果卡片
 *           ② conversation.view 挂「任务流程」标签（统一业务流程）
 * [POS]: dsh-limix-agent 的浏览器入口。品牌层由 dsh-limix-cover 负责。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { LimixToolCard } from './LimixToolCard.tsx'
import { LimixPipelineView } from './LimixPipelineView.tsx'
import { LimixTurnStack } from './LimixTurnStack.tsx'
import { LimixWelcome } from './LimixWelcome.tsx'

export const inject = ['slots', 'locale', 'sessions', 'sidebarRight']

export function apply(ctx: any): void {
  ctx.effect(() => ctx.locale.register('limix-agent', {
    zh: { 'view.pipeline': '任务流程' },
    en: { 'view.pipeline': 'Task flow' },
  }), 'limix-agent: dictionaries')

  const t = ctx.locale.bind('limix-agent')

  // 输入区已有 session 与 inputActions；组件自行隔离空白 LimiX 会话。
  ctx.slots.inject('conversation.input.dock', () =>
    ctx.slots.register({ name: 'conversation.input.dock', id: 'limix-welcome', order: -10 }, LimixWelcome))

  // keyed 分派：注册自家 wire 工具名；未认领的工具仍走通用卡片
  ctx.slots.inject('tool.call.toolview', () =>
    ctx.slots.register({ name: 'tool.call.toolview', key: 'limix' }, LimixToolCard))

  // 与「对话 / 轨迹」并列的可加性视图；label 用 thunk，切语言即时生效
  // 每轮结束处的 LimiX 卡片堆叠（可加性槽，不影响官方工具行）
  ctx.slots.inject('conversation.chat.turnTail', () =>
    ctx.slots.register({ name: 'conversation.chat.turnTail', id: 'limix-turn-stack', order: 30 }, LimixTurnStack))

  ctx.slots.inject('conversation.view', () =>
    ctx.slots.register(
      { name: 'conversation.view', id: 'limix-pipeline', order: 15, label: () => t('view.pipeline'),
        inject: (sessionId: string) => ({
          cwd: ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd,
          openFile: (path: string) => {
            // 对齐宿主 fileAddressFor；保留会话授权，不拼接裸文件路由。
            const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd?.replace(/\\/g, '/').replace(/\/+$/, '')
            let normalized = path.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '')
            if (cwd && normalized.startsWith(cwd + '/')) normalized = normalized.slice(cwd.length + 1)
            const encode = (value: string) => encodeURIComponent(value).replace(/%3A/gi, ':')
            ctx.sidebarRight.openResource(`dsh-resource://file/session/${encode(sessionId)}/${normalized.split('/').map(encode).join('/')}`)
          },
        }),
      },
      LimixPipelineView,
    ))
}
