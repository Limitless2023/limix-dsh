/**
 * [INPUT]: 宿主 commands、systemPrompt 与 Agent.followup；用户的数据拆分。
 * [OUTPUT]: registerBenchmarkCommand，注册 /limix-compare 与可恢复比较流程。
 * [POS]: 多模型比较入口；复用 limix benchmark，不另建网络调用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { randomUUID } from 'node:crypto'

const WORKFLOW = `当用户要求比较 LimiX 和其他模型或使用 /limix-compare：
1. 先明确数据、目标与独立测试集。同一数据集必须让所有模型使用完全相同的训练/测试拆分和特征；真值仅供本地评估。分类用分层拆分，重复样本放在同组；时序按时间拆分。不能根据成绩挑测试样本或删除差结果。
2. 用 limix 工具 command=benchmark，先用 --help 查契约。manifest JSON 的 datasets 数组包含 id/name/task_type/target/train/predict/truth，文件相对 manifest 所在目录解析。目前比较支持 regression/classification。默认比较 LIMIX_7M、LIMIX_16M、XGBoost 与均值/多数类 BASELINE；固定 --seed，保存唯一 --output 结果路径。
3. XGBoost 需要独立 Python 环境中的 numpy/pandas/scikit-learn/xgboost。先检查已有环境，缺依赖时说明具体缺项；可通过 --python 指定解释器，不修改宿主运行时。预测和解释自身不需要这些第三方库。
4. 命令保存每项回执、JSON、CSV 与 HTML 报告。等待超时使用同一 manifest/参数/output 续跑读取回执，不盲目重提。failed/pending/partial 不称全部完成，缺失指标不能填0。报告按数据集比较，不跨不同单位平均原始误差。
5. 结果卡已展示比较，回复只写完成数量、关键差异和报告链接。测试集上的领先只适用于这次固定拆分，不称模型普遍更好。`

export function registerBenchmarkCommand(ctx) {
  ctx.systemPrompt.section({ name: 'limix:benchmark-workflow', order: 520, text: WORKFLOW, interpolate: false })
  ctx.commands.register({
    name: 'limix-compare', definitionId: 'dsh-limix-tool:compare',
    description: '在相同测试集上比较多个模型，生成指标与可视化报告',
    input: { hint: '描述比较目标，附上数据文件或路径', attachments: true },
    handler: ({ agent, rawInput, attachments = [], signal }) => {
      signal?.throwIfAborted()
      agent.followup(Object.freeze({ id: randomUUID(), role: 'user', source: Object.freeze({ kind: 'user' }),
        content: Object.freeze([...attachments, Object.freeze({ type: 'text', text: rawInput.trim()
          ? `请执行 /limix-compare 比较流程。\n${rawInput.trim()}` : '请先帮我明确比较目标、数据和独立测试集。' })]),
      }))
      return { kind: 'success', text: '模型比较已启动' }
    },
  })
}
