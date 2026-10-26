/**
 * [INPUT]: 宿主 cordis 服务 slots（插槽注册表）+ locale（自有词条）；组件见同目录 LimixToolCard / LimixPipelineView
 * [OUTPUT]: 浏览器半 Cordis 插件（inject + apply）：
 *           ① tool.call.toolview 以 key='limix' 认领自家工具的结果卡片
 *           ② conversation.view 挂「分析过程」标签（分轮 LimiX 调用管线）
 * [POS]: dsh-limix-agent 的浏览器入口。品牌层由 dsh-limix-cover 负责，案例库由分发范围裁掉
 */
import { LimixToolCard } from './LimixToolCard.tsx'
import { LimixPipelineView } from './LimixPipelineView.tsx'

export const inject = ['slots', 'locale']

export function apply(ctx: any): void {
  ctx.effect(() => ctx.locale.register('limix-agent', {
    zh: { 'view.pipeline': '分析过程' },
    en: { 'view.pipeline': 'Analysis' },
  }), 'limix-agent: dictionaries')

  const t = ctx.locale.bind('limix-agent')

  // keyed 分派：注册自家 wire 工具名；未认领的工具仍走通用卡片
  ctx.slots.inject('tool.call.toolview', () =>
    ctx.slots.register({ name: 'tool.call.toolview', key: 'limix' }, LimixToolCard))

  // 与「对话 / 轨迹」并列的可加性视图；label 用 thunk，切语言即时生效
  ctx.slots.inject('conversation.view', () =>
    ctx.slots.register(
      { name: 'conversation.view', id: 'limix-pipeline', order: 15, label: () => t('view.pipeline') },
      LimixPipelineView,
    ))
}
