/**
 * [INPUT]: pipeline-model 的轮次与 pipeline-stage 的工具事实、参数和结构化结果。
 * [OUTPUT]: 收集 Markdown 与 HTML 报告路径； FlowStep、flowSteps、flowState、stepTitle、stepSummary、stepFiles、explanationMode。
 * [POS]: 将相邻操作归并为业务步骤；仅按明确文件类型、命令与操作说明分类，不生成分析结论。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Round } from './pipeline-model.ts'
import type { Stage } from './pipeline-stage.ts'

export interface FlowStep { key: string; title: string; stages: Stage[]; limix: boolean; cwd?: string }
export interface FlowFile { path: string; role: 'input' | 'output'; label: string }
const REPORT = /\.(md|html?|pdf|docx|pptx)$/i
const DATA = /\.(csv|tsv|xlsx?|parquet|json)$/i
export const fileName = (p: string) => p.split(/[/\\]/).pop() || p
export function argument(stage: Stage, name: string): string {
  const args = Array.isArray(stage.args.args) ? stage.args.args : []
  const index = args.indexOf(name)
  return index >= 0 && typeof args[index + 1] === 'string' ? args[index + 1] : ''
}
export function explanationMode(stage: Stage): string {
  const mode = stage.data?.explanation?.mode ?? argument(stage, '--mode')
  if (mode === 'directed') return '全局因果 · 有向'
  if (mode === 'undirected') return '全局因果 · 无向'
  // CLI explain 默认 local；API 直调模式不明时不猜测。
  if (mode === 'local' || stage.args.command === 'explain') {
    return argument(stage, '--task-type') === 'timeseries' ? '局部归因 · 时序' : '局部归因'
  }
  return '解释模式见调用详情'
}

/** 文件只取结构化参数与回执；失败写入不产生可打开的输出。 */
export function stageFiles(stage: Stage): FlowFile[] {
  const files: FlowFile[] = []
  const add = (path: unknown, role: FlowFile['role'], label: string) => {
    if (typeof path === 'string' && path && !/[\u0000-\u001f]/.test(path)) files.push({ path, role, label })
  }
  if (stage.toolName === 'limix') {
    for (const [flag, label] of [['--train', '参考数据'], ['--predict', '待预测数据'], ['--data', '解释数据'], ['--truth', '真值数据'], ['--manifest', '比较清单']]) add(argument(stage, flag), 'input', label)
    if (stage.ok && !stage.running) {
      add(stage.data?.saved_to, 'output', '结果文件')
      add(stage.data?.csv_path, 'output', '结果数据')
      add(stage.data?.report_path, 'output', '分析报告')
      add(stage.data?.markdown_path, 'output', 'Markdown 报告')
    }
  } else {
    const path = stage.args.file_path ?? stage.args.path
    if (stage.toolName === 'read') add(path, 'input', '读取文件')
    if (['write', 'edit'].includes(stage.toolName) && stage.ok && !stage.running) add(path, 'output', stage.toolName === 'edit' ? '修订文件' : '生成文件')
    if (stage.toolName === 'present' && stage.ok && !stage.running && Array.isArray(stage.args.files)) {
      for (const file of stage.args.files) add(file?.path, 'output', '展示文件')
    }
    if (stage.ok && !stage.running) add(stage.data?.saved_to, 'output', '生成文件')
  }
  return files
}
export function stepFiles(step: FlowStep): FlowFile[] {
  const unique = new Map<string, FlowFile>()
  for (const stage of step.stages) for (const file of stageFiles(stage)) {
    const relative = !/^(?:[/\\]|[A-Za-z]:)/.test(file.path)
    const path = (relative && step.cwd ? `${step.cwd}/${file.path}` : file.path).replace(/\\/g, '/').replace(/\/\.\//g, '/')
    const key = `${file.role}:${path}`
    const previous = unique.get(key)
    unique.set(key, { ...file, path, label: previous?.label === '修订文件' ? previous.label : file.label })
  }
  return [...unique.values()]
}

function category(stage: Stage, afterPrediction: boolean): string {
  if (stage.title === '查看命令说明') return '准备工作'
  if (stage.toolName === 'limix') return stage.title === '上传数据' || stage.title === '查询数据版本' ? '数据处理' : stage.title
  const path = String(stage.args.file_path ?? stage.args.path ?? '')
  if (['write', 'edit'].includes(stage.toolName) && REPORT.test(path)) return '报告输出'
  if (stage.toolName === 'present') {
    return stageFiles(stage).some(file => REPORT.test(file.path)) ? '报告输出' : '结果分析'
  }
  if (stage.toolName === 'read' && REPORT.test(path)) return '结果分析'
  if (stage.toolName === 'datasource' || DATA.test(path)) return afterPrediction ? '结果分析' : '数据处理'
  if (stage.toolName === 'bash') {
    const description = String(stage.args.description ?? '')
    if (/依赖|环境|目录|deps|dependenc|environment|output dir/i.test(description)) return '准备工作'
    if (/报告|report/i.test(description) && /生成|写入|保存|修订|修改|输出|create|write/i.test(description)) return '报告输出'
    if (/分析|预测结果|指标|比较|评估|统计|绘图|图表|analy[sz]|evaluat|prediction|benchmark|artifact|explain|contribution/i.test(description)) return '结果分析'
    if (/数据|字段|缺失|清洗|转换|划分|csv|data|column/i.test(description)) return '数据处理'
    return afterPrediction ? '结果分析' : '准备工作'
  }
  if (['read', 'glob', 'grep'].includes(stage.toolName)) return afterPrediction ? '结果分析' : '准备工作'
  if (['load_workspace_dependencies', 'skill', 'todo_write'].includes(stage.toolName)) return '准备工作'
  return stage.title
}

/** 只合并相邻本地同类操作；相同参数的失败重试可归入同一步。 */
export function flowSteps(round: Round, cwd?: string): FlowStep[] {
  const steps: FlowStep[] = []
  let afterPrediction = false
  let reportPhase = false
  for (const [index, stage] of round.stages.entries()) {
    let title = category(stage, afterPrediction)
    const core = ['分类预测', '回归预测', '时序预测', '因果解释', '模型比较'].includes(title)
    if (core) reportPhase = false
    if (!stage.limix && !core) {
      if (title === '报告输出') reportPhase = true
      else if (reportPhase) title = '报告输出'
      else if (afterPrediction) title = '结果分析'
      else if (title === '结果分析' && round.stages.some(s => ['分类预测', '回归预测', '时序预测', '因果解释', '模型比较'].includes(s.title))) title = '数据处理'
      else if (!['数据处理', '准备工作', '结果分析'].includes(title)) title = '准备工作'
    }
    const path = String(stage.args.file_path ?? stage.args.path ?? '')
    const next = round.stages[index + 1]
    const previous = steps[steps.length - 1]
    // 同一报告的读取、修订、复核属于一次交付；读取其他报告仍是结果分析。
    if (stage.toolName === 'read' && REPORT.test(path) && (
      (previous?.title === '报告输出' && stepFiles(previous).some(f => f.path === path)) ||
      (next && ['write', 'edit'].includes(next.toolName) && (next.args.file_path ?? next.args.path) === path))) title = '报告输出'
    // 环境准备保留在业务步骤的执行记录里，不占一个一级节点。
    if (title === '准备工作' && previous && !previous.limix) { previous.stages.push(stage); continue }
    if (previous?.title === '准备工作' && !stage.limix && title !== '准备工作') {
      previous.title = title; previous.stages.push(stage); continue
    }
    if (['分类预测', '回归预测', '时序预测', '因果解释', '模型比较'].includes(title)) afterPrediction = true
    const prev = steps[steps.length - 1]
    const last = prev?.stages[prev.stages.length - 1]
    const retry = last && last.stateKind === 'error' && last.toolName === stage.toolName && JSON.stringify(last.args) === JSON.stringify(stage.args)
    if (prev && prev.title === title && ((!prev.limix && !stage.limix && !['模型比较'].includes(title)) || retry)) {
      prev.stages.push(stage)
    } else steps.push({ key: stage.key, title, stages: [stage], limix: stage.limix, cwd })
  }
  return steps
}

export function flowState(stages: Stage[]): { kind: string; label: string } {
  if (stages.some(s => s.running || s.stateKind === 'running')) return { kind: 'running', label: '进行中' }
  if (stages.some(s => s.stateKind === 'error')) return { kind: 'error', label: '有未完成步骤' }
  if (stages.some(s => s.stateKind === 'warning')) return { kind: 'warning', label: '部分完成' }
  if (stages.some(s => s.stateKind === 'idle')) return { kind: 'idle', label: stages.find(s => s.stateKind === 'idle')!.stateLabel }
  return { kind: 'done', label: '已完成' }
}

export function stepSummary(step: FlowStep): string {
  const last = step.stages[step.stages.length - 1]
  if (step.title === '因果解释') return [explanationMode(last), last.outcome].filter(Boolean).join(' · ')
  if (['分类预测', '回归预测', '时序预测', '模型比较'].includes(step.title)) {
    const target = argument(last, '--target')
    const horizon = argument(last, '--horizon')
    return [target && `目标 ${target}`, horizon && `未来 ${horizon} 步`, last.outcome || last.stateLabel].filter(Boolean).join(' · ')
  }
  const files = stepFiles(step)
  const outputs = files.filter(f => f.role === 'output')
  if (step.title === '报告输出' && outputs.length) {
    const descriptions = outputs.map(f => {
      const format = /\.md$/i.test(f.path) ? '分析报告' : /\.html?$/i.test(f.path) ? 'HTML 报告' : fileName(f.path)
      return `${format}${f.label === '修订文件' ? '已修订' : '已保存'}`
    })
    return [...new Set(descriptions)].join('；') + (flowState(step.stages).kind !== 'done' ? '；仍有操作未完成' : '')
  }
  return localSummary(step)
}

/** 名称取自实际操作对象；缺少依据时保留通用标题。 */
export function stepTitle(step: FlowStep): string {
  if (step.title !== '结果分析') return step.title
  const text = step.stages.map(s => String(s.args.description ?? '')).join(' ')
  if (/contribution|attribution|归因|贡献/i.test(text)) return '归因结果解读'
  if (/explan|解释/i.test(text)) return '解释结果核对'
  if (/prediction|预测/i.test(text)) return '预测结果核对'
  if (/benchmark|comparison|模型比较|基线/i.test(text)) return '模型比较复核'
  if (/artifact|产物|交付/i.test(text)) return '交付文件核对'
  return step.title
}

/** 只陈述已返回操作的动作；指标仍只读结构化 metrics，不从脚本日志推算。 */
function localSummary(step: FlowStep): string {
  const completed = step.stages.filter(s => s.ok && !s.running && s.stateKind === 'done')
  if (!completed.length) return flowState(step.stages).kind === 'running' ? '正在执行，结果返回后更新摘要' : '未完成，展开查看原因与执行记录'
  const descriptions = completed.map(s => String(s.args.description ?? '')).join(' ')
  const actions: string[] = []
  const add = (text: string) => { if (!actions.includes(text)) actions.push(text) }
  if (step.title === '数据处理') {
    if (/reference|参考|训练/i.test(descriptions) && /predict|待预测/i.test(descriptions) && /truth|真值/i.test(descriptions)) add('核对参考数据、待预测数据与真值')
    if (completed.some(s => s.toolName === 'read' && /target_label/.test(s.output) && /fields/.test(s.output))) add('读取字段说明')
  }
  if (step.title === '结果分析') {
    if (/summari[sz]|汇总|rank|排序/i.test(descriptions) && /contribution|归因|贡献/i.test(descriptions)) add('汇总逐样本特征贡献')
    if (completed.some(s => /解释时预测.*原预测|逐行预测对照|prior vs explanation/i.test(s.output + String(s.args.description ?? '')))) add('对照解释时预测与原预测')
    if (!actions.length && /prediction|预测/i.test(descriptions) && /compar|benchmark|比较/i.test(descriptions)) add('读取预测结果与模型比较明细')
    if (!actions.length && /explan|解释/i.test(descriptions)) add('核对解释明细与结果结构')
    if (!actions.length && /artifact|产物/i.test(descriptions)) add('核对输出文件与结果清单')
  }
  if (!actions.length) {
    for (const stage of completed) {
      const description = String(stage.args.description ?? '')
      if (/清洗|clean/i.test(description)) add('执行数据清洗')
      else if (/转换|convert|transform/i.test(description)) add('转换数据格式')
      else if (/划分|split/i.test(description)) add('划分训练与预测数据')
      else if (/检查|核对|检验|inspect|check|verify|profile/i.test(description) && /data|csv|字段|数据/i.test(description)) add('检查数据内容与字段')
      else if (stage.toolName === 'read') add(`读取 ${fileName(String(stage.args.file_path ?? stage.args.path ?? '文件'))}`)
      else if (/[\u4e00-\u9fff]/.test(description)) add(description)
    }
  }
  const outputs = stepFiles(step).filter(f => f.role === 'output')
  if (outputs.length && step.title !== '报告输出') add(`输出 ${fileName(outputs[0].path)}`)
  const summary = actions.slice(0, 2).join('；') || '执行记录已返回，可展开查看输入与输出'
  return summary + (flowState(step.stages).kind !== 'done' ? '；仍有操作未完成' : '')
}
