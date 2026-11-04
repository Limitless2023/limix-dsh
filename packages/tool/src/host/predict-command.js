/**
 * [INPUT]: 宿主 commands、systemPrompt 与 Agent.followup；已接纳的附件。
 * [OUTPUT]: registerPredictCommand，注册 preset 专属预测、数据可用性与效果解读指引。
 * [POS]: 区分咨询与已授权执行；预测流程入口；复用 limix 工具完成执行，不另建预测通道。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { randomUUID } from 'node:crypto'

const WORKFLOW = `以下是执行指引，仅在用户已要求实际执行对应任务时应用；咨询能否做、讨论方法或只读检查不触发提交，也不需要先检查运行环境。已有执行授权继续有效，不重复确认。
当用户要求预测、分类、回归、时序外推，或使用 /limix-predict，执行预测流程：
1. 识别业务目标、训练数据、待预测数据与目标列，查看列名、样本和行数。任务类型由你根据数据判断：classify（类别）、regress（连续数值）、forecast（时间序列）。用户尚未给数据时只问必要信息，不要求用户选择内部命令。
2. 核对特征在业务预测时点是否可获得，排除目标泄漏、事后信息和纯标识列。保留待预测数据的真实目标值供本地评估，不能把训练集直接当测试集。需要拆分时，分类分层，同一实体或重复样本按组，时序按时间；拆分规则不能按测试成绩调整。
3. 通过一次 limix classify/regress/forecast 调用完成上传、提交、轮询和保存。分类和回归传 --train 与 --predict 的本地绝对路径；时序按下一条决定是否需要 --predict。提交前确认所有输入文件已存在，不能把计划生成的文件名当作现成输入。不先 upload 换成版本 ID，以保留本地评估来源。必须传 --target、--output，workdir 传会话工作目录；输出文件采用 limix-<目标列>-<时间戳>.csv。用户指定模型时必须显式传 --model（如 LIMIX_7M），不能遗漏后使用服务默认模型；未指定才使用默认。提交后核对回执中的实际模型，未知时不把期望模型写成已使用的模型；模型不符时如实说明并纠正，不混入指定模型的报告结论。
4. forecast 还需 --date、--context、--horizon。根据频率、可用历史和主要周期选择 context；历史不足一个完整周期时说明限制，不凭空补齐。未来协变量须覆盖预测日期，并区分预先已知信息、当时可用的预测信息和事后观测；事后真值不能作为模型输入。有未来协变量时传 --predict，没有时省略 --predict，按 --horizon 外推。--context 已限制历史长度，无需剪裁文件。P10/P50/P90 用 --quantile --levels 0.1,0.5,0.9，不自行估算区间。
5. 有独立真值时传 --truth 本地 CSV；时序真值须含日期列与目标列，日期逐行对齐预测。--truth 不上传、不参与预测。没有真值也能预测，但无法评估。metrics 是本地真实值对照，不称为服务端评估。--truth 是预测流程参数，不是现成 CSV 的独立评分入口；后补真值时不能承诺传 --truth 就无需重跑预测。
6. 成功须 status=finished、result_version_id 和 saved_to；任务仍为 queued/running 时继续查询同一 task_id，即使 is_ready=true 也不能宣告失败或重复提交。报告交代业务目标、实际数据和预测范围，引用关键 metrics 并解释其含义：回归 MAE/RMSE 越低越好，R² 越高越好，负值表示在本测试集上不如用测试真值均值作常数预测（区别于训练均值基线）；分类准确率须结合类别分布解读。只使用已核对的单位，不凭 R² 或 MAE/RMSE 断言没有偏差或异常点。没有业务容差时不声称已达到生产要求；合成样例只说明流程可用。预测成功状态与效果评价分开；R²<0 时直接说明效果较弱，不能因任务完成就推荐使用。日频时序可引用工具返回的 baseline_evaluation：只使用预测起点前历史，超过7天递归使用基线预测，不用未来真值。基线不可用时说明原因，不强行套周周期。误差原因只列有证据的观察或待验证假设。上传或字段校验失败时指出具体问题。`

export function registerPredictCommand(ctx) {
  ctx.systemPrompt.section({ name: 'limix:predict-workflow', order: 500, text: WORKFLOW, interpolate: false })
  ctx.commands.register({
    name: 'limix-predict',
    definitionId: 'dsh-limix-tool:predict',
    description: '上传数据并预测，自动保存结果、展示图表与评估指标',
    input: { hint: '描述预测目标，附上数据文件或路径', attachments: true },
    handler: ({ agent, rawInput, attachments = [], signal }) => {
      signal?.throwIfAborted()
      const input = rawInput.trim()
      agent.followup(Object.freeze({
        id: randomUUID(), role: 'user', source: Object.freeze({ kind: 'user' }),
        content: Object.freeze([...attachments, Object.freeze({ type: 'text',
          text: input ? `请执行 /limix-predict 预测流程。\n${input}` : '请执行 /limix-predict，先帮我明确需要的数据和预测目标。',
        })]),
      }))
      return { kind: 'success', text: '预测助手已启动' }
    },
  })
}
