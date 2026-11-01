/**
 * [INPUT]: 宿主 commands、systemPrompt 与 Agent.followup；已接纳的附件。
 * [OUTPUT]: registerPredictCommand，注册 preset 专属 /limix-predict 与简短结论指引。
 * [POS]: 预测流程入口；复用 limix 工具完成执行，不另建预测通道。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { randomUUID } from 'node:crypto'

const WORKFLOW = `当用户使用 /limix-predict 时，执行完整预测流程，全程用用户的语言交流，默认中文：
1. 从用户描述、附件和会话中识别训练数据、待预测数据、目标列及业务问题。缺少信息时，用一条简短问题列出缺少的内容；不要猜测文件或目标列。空命令且没有已知数据时，先问用户要预测什么、训练和待预测文件在哪里，不扫描工作区寻找样例。任务类型由你根据数据判断，不要求用户选择 classify/regress 等内部命令。
2. 查看文件列名、样本与行数，用 Python 标准库 csv 即可，不需要 pandas。选择 classify（类别）、regress（连续数值）或 forecast（时间序列）。保留待预测数据中的真实目标列供评估；没有真值也能预测，但不能报告准确率。不要把训练集直接当作测试集。
3. 通过 limix 工具的一次 classify/regress/forecast 调用完成上传、提交、轮询、下载。直接传本地文件绝对路径给 --train 和 --predict，不要先调用 upload 换成版本 ID，否则会丢失本地评估来源。必须传 --target 和 --output；结果保存到会话工作目录，用唯一文件名 limix-<目标列>-<时间戳>.csv，避免覆盖已有文件。workdir 传会话工作目录。
4. forecast 还需要 --date、--context、--horizon；有未来协变量时传包含未来协变量的 --predict，没有协变量时可省略 --predict。P10/P50/P90 使用 --quantile --levels 0.1,0.5,0.9，不要猜参数或自行估算平台区间；不确定时先用 limix 工具的 args=["--help"] 查参数。--context 已限制历史长度，无需剪裁文件。不要把未来真值用作模型输入。有独立真实值文件时，通过 --truth 传给本地评估；时序真实值文件须包含日期列和目标列，并与预测日期逐行一致。--truth 不上传、不参与预测。
5. 成功后检查 saved_to、metrics 与任务终态。工具卡已自动展示图表、混淆矩阵和指标，不另写脚本重算或重画。最终回复只写两三句话：完成了多少条预测、一项主要指标、结果文件链接；不重复数据清单、矩阵、指标定义或逐类分析。metrics 来自本地真实值对照，不称为服务端评估。只使用工具实际返回的指标，不猜测价格或误差单位，不凭 R² 或 MAE/RMSE 断言没有偏差、没有异常点。合成样例只说明流程可用。无真值时明确说明无法评估。用户无需再要求下载，不要再次运行 download。
6. 上传或字段校验失败时指出具体问题。提交结果不确定或等待超时时，按返回的任务 ID 查询现有任务，禁止盲目重新提交。未完成不能称成功，任务 ID 和内部命令不放在主要说明里。`

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
