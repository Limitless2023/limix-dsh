/**
 * [INPUT]: 宿主 commands、systemPrompt 与 Agent.followup；用户的数据拆分。
 * [OUTPUT]: registerBenchmarkCommand，注册分类/回归比较，约束拆分、模型范围、恢复与基线解读。
 * [POS]: 多模型比较入口；复用 limix benchmark，不另建网络调用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { randomUUID } from 'node:crypto'

const WORKFLOW = `比较依赖由插件激活时预装到独立 Python 环境；先用 runtime status 查看状态，失败用 runtime prepare 重试。不得临时向系统 Python 安装依赖；需要自定义环境时才用 --python。
当用户要求比较 LimiX 与其他模型、比较不同 LimiX 模型，或使用 /limix-compare，执行固定拆分模型比较：
1. 当前 benchmark 仅支持 regression/classification。时序比较尚未接入；收到时序比较请求时先说明边界，不能将任务伪装成回归比较或承诺自动完成。先明确数据、目标和独立测试集；同一数据集的所有模型使用完全相同的训练/测试拆分和特征，真值只用于本地评估。分类分层，同一实体或重复样本放在同组；不按成绩挑样本或删除差结果。
2. 用 limix 工具 command=benchmark；manifest JSON 的 datasets 数组包含 id/name/task_type/target/train/predict/truth，文件相对 manifest 所在目录解析。遵守用户指定模型范围，未指定时默认 LIMIX_7M、LIMIX_16M、XGBoost 与均值/多数类 BASELINE；固定 --seed，保存唯一 --output 路径。核对特征在业务预测时点可获得，不能使用目标泄漏或事后信息。
3. 比较入口需要独立 Python 环境中的 numpy/pandas/scikit-learn；选择 XGBoost 时另需 xgboost，并在固定训练集上训练。先检查已有环境，缺依赖时指出具体缺项，通过 --python 指定解释器，不修改宿主运行时。LimiX 预测和解释自身不需要这些第三方库。
4. 命令保存每项回执、JSON、CSV 与 HTML。等待超时使用同一 manifest/参数/output 续跑读取回执。failed/pending/partial 不称全部完成，缺失指标不填0。报告按数据集比较，不跨不同单位平均原始误差。
5. 报告说明业务目标、数据来源、样本数、固定拆分、参与模型、完成数量、关键指标与报告链接。BASELINE 回归用训练目标均值、分类用训练多数类，对每个测试样本输出同一个值；它不学习特征关系。明确误差越低越好、R²和准确率越高越好，不把长误差条当成更好效果。测试集领先只适用于本次固定拆分，不称模型普遍更好。测试样本很少时说明结论稳定性有限，不把一次小样本演示当成最终选型依据。`

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
