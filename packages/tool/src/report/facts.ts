/**
 * [INPUT]: 图表已对齐的预测、真值、日期及解释覆盖数量。
 * [OUTPUT]: 程序生成的指标定义、日期表与报告事实块。
 * [POS]: 报告事实层；模型不能通过正文改写指标方向或日历映射。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { escapeHtml } from './markdown'
export type Fact = { name: string; value: string | number; meaning?: string }
export const metricFacts = (values: Record<string, number | null | undefined>): Fact[] => {
  const definitions: Record<string, [string, string]> = {
    n: ['评估样本数', '本次有效对照数量'], mae: ['MAE', '平均绝对误差；越低越好'],
    rmse: ['RMSE', '均方根误差；越低越好'], r2: ['R²', '拟合优度；越高越好，不是误差指标'],
    accuracy: ['准确率', '正确分类比例；越高越好'],
  }
  return Object.entries(definitions).filter(([key]) => values[key] !== undefined).map(([key, [name, meaning]]) => ({ name, value: values[key] === null ? '无定义' : Number(values[key]!.toFixed(6)), meaning }))
}
export function weekday(date: string): string {
  // 仅解析无歧义的 ISO 日期；不猜 DD/MM 或日历字段的整数编码。
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '未解析'
  const time = new Date(date + 'T00:00:00Z')
  return Number.isFinite(time.getTime()) && time.toISOString().slice(0, 10) === date ? ['周日','周一','周二','周三','周四','周五','周六'][time.getUTCDay()] : '未解析'
}
export function factsMarkdown(title: string, facts: Fact[]) {
  const cell = (s: unknown) => String(s).replace(/\|/g, '／').replace(/[\r\n]/g, ' ')
  return `### ${cell(title)}\n\n| 项目 | 本次结果 | 说明 |\n| --- | --- | --- |\n` + facts.map(f => `| ${cell(f.name)} | ${cell(f.value)} | ${cell(f.meaning ?? '')} |`).join('\n')
}
export function factsHtml(facts: Fact[]) {
  if (!facts.length) return ''
  return '<details class="verified-facts" open><summary>已核验数据 · 程序生成</summary><div class="table-scroll"><table><thead><tr><th>项目</th><th>本次结果</th><th>说明</th></tr></thead><tbody>' + facts.map(f => `<tr><td>${escapeHtml(f.name)}</td><td>${escapeHtml(f.value)}</td><td>${escapeHtml(f.meaning ?? '')}</td></tr>`).join('') + '</tbody></table></div></details>'
}

/** 确定性文案检查；只拦截明确冲突，不把自然语言审查冒充完整事实验证。 */
export function validateNarrative(markdown: string): void {
  const body = markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
  const errors: string[] = []
  for (const line of body.split('\n')) {
    if (/(?:R²|R2|R\^2)[\s*]*(?:指标)?[\s*]*(?:为|是|应)?[\s*]*越低越好/i.test(line) && !/不能|不要|错误|并非/.test(line)) errors.push('R² 越高越好，不是越低越好')
    if (/(?:MAE|RMSE)[\s*]*(?:指标)?[\s*]*(?:为|是|应)?[\s*]*越高越好/i.test(line) && !/不能|不要|错误|并非/.test(line)) errors.push('MAE/RMSE 越低越好')
    if (/说明模型用上了.*信息|说明模型利用了.*信息/.test(line)) errors.push('基线对照不能证明模型内部机制，请只描述本次指标差异')
    if (/RMSE.*MAE.*(?:说明|证明).*集中/.test(line)) errors.push('RMSE 与 MAE 的比值不能单独证明误差集中，请引用逐样本核验或删除该推断')
    for (const match of line.matchAll(/(\d{4}-\d{2}-\d{2})[（(\s]*(?:星期|周)([一二三四五六日天])/g)) {
      const actual = weekday(match[1]), stated = '周' + (match[2] === '天' ? '日' : match[2])
      if (actual !== '未解析' && actual !== stated) errors.push(match[1] + ' 应为 ' + actual)
    }
  }
  if ((body.match(/（/g) ?? []).length !== (body.match(/）/g) ?? []).length) errors.push('中文括号未配对，请检查残缺句子')
  if (errors.length) throw new Error('报告正文核验未通过：' + [...new Set(errors)].join('；'))
}
