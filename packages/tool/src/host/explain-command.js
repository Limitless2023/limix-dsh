/**
 * [INPUT]: 宿主 commands、systemPrompt 与 Agent.followup；已接纳附件。
 * [OUTPUT]: 注册 /limix-explain，约束输入、带符号摘要、输出尺度与证据表达。
 * [POS]: LimiX preset 专属解释入口；复用 limix explain 工具与结果卡。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { randomUUID } from 'node:crypto'

const WORKFLOW = `当用户要求解释预测或使用 /limix-explain：
1. 识别局部预测归因或全局关系探索。表格局部归因用 explain --mode local --train 参考CSV --data 待解释CSV --target 目标 --task-type regression或classification --row 1。行号从1开始，不含表头。批量使用 --rows 1-10、--rows 1,3,5-8 或 --rows all，与 --row 互斥；不能把标识列当特征。时序局部归因用 explain --mode local --task-type timeseries --result-version-id 已完成时序预测的结果版本ID，沿用原预测数据、目标、特征、窗口、步长和模型，不能再传 data/train/target/features/model/row/rows/prediction。缺少数据、目标或时序结果版本时只问必要信息，不扫描工作区找案例。
2. 全局有向关系用 explain --mode directed --data 含目标的CSV --target 目标 --features 特征1,特征2；无向关系用 undirected。所选列必须是完整有限数值。保持默认阈值，不为得到更好看的图调阈值。先用 --help 查参数，不猜参数。
3. 所有解释经 limix 工具调用 command=explain，不走 shell。必须 --output 唯一的绝对路径.json。工具自动上传、等待、保存原始JSON与贡献/边CSV。不要手写或篡改解释结果。--labels 可使用已知字段字典 JSON（fields、target_label、unit）；--prediction 可传同一输入逐行对应的原预测CSV作对比。用户指定全部样本时直接使用 --rows all；数据说明中的示例行数不能覆盖本轮需求，不需要额外先提交10行任务。
4. 表格解释会重算预测，使用工具 explanation.prediction 并称“解释时预测”。有 prior_prediction 与 prediction_delta 时简要说明差异，不能冒充与原预测完全一致。时序 prediction_scale=unverified 时称“解释模型输出”：业务尺度尚未核实，不附目标单位，不与原预测做差，不根据数值形态自行做 exp 等逆变换；target_unit 只描述业务目标，不是解释模型输出的单位。贡献分数无目标单位，不得写成增减多少MPa；方向表示模型归因，不是调参的实际因果效果。分类接口未声明 sign_scores 对应哪一类别，只称“服务返回的贡献方向”，不能解释为提升类别1或某个类别的概率，也不能把不同预测标签的平均方向当成同一类别的效果。
5. 图的边权是模型关系分数，不是增益、实验效应或已验证概率。发现图与物理机制相符可表述为“一致”，不能声称证明因果或个体反事实。实验记录与模型发现分开。不要自动请求预留自然语言报告接口。
6. 终态使用 task_status；succeeded 才是完整成功。degraded_succeeded 或 partially_succeeded 必须说明限制。等待超时按 task_id 和原参数/output续查，不重复提交；缺回执但有请求文件时先通过api GET /v1/extensions/tasks排查。
7. 批量结果返回 requested_count、explained_count、missing_rows 和带正负的平均贡献（各影响因子影响分数对比）。平均贡献按每条 abs(score)×direction 求平均，按平均值绝对大小排序；未知方向不补零。samples 完整矩阵由界面按 detail_path 加载。missing_rows 非空时不得称全部完成；mapping=input_order 表示服务未返回索引、按输入顺序对应，不能声称已用服务索引核验。样本不足且没有索引时工具拒绝错配。时序行代表预测步，时间与特征名称只使用返回值；整体贡献排名不是有向因果图。
8. 贡献解释说明模型使用了哪些信号，不能证明预测误差的原因。可描述具体偏差日期和数值；缺少天气、日历信息不足、分布变化等只能作为待验证假设。没有补充数据或对照实验，不得断言某因素是误差的主要来源，或模型仅凭某些特征就无法提前预测。中性或零贡献不等于该变量没有实际作用，也不能仅凭零贡献断定其由共线性造成。
9. 结果卡已显示贡献、关系图和下载链接，最终用两三句话说明结果、重要边界和文件链接，不重复全部表格。标准模式不执行此命令。`

export function registerExplainCommand(ctx) {
  ctx.systemPrompt.section({ name: 'limix:explain-workflow', order: 510, text: WORKFLOW, interpolate: false })
  ctx.commands.register({
    name: 'limix-explain', definitionId: 'dsh-limix-tool:explain',
    description: '解释单条或批量预测，探索变量关系，保存完整结果',
    input: { hint: '描述要解释的样本或变量，附上数据文件', attachments: true },
    handler: ({ agent, rawInput, attachments = [], signal }) => {
      signal?.throwIfAborted()
      const input = rawInput.trim()
      agent.followup(Object.freeze({ id: randomUUID(), role: 'user', source: Object.freeze({ kind: 'user' }),
        content: Object.freeze([...attachments, Object.freeze({ type: 'text', text: input
          ? `请执行 /limix-explain 解释流程。\n${input}` : '请执行 /limix-explain，先帮我明确解释对象和数据。' })]),
      }))
      return { kind: 'success', text: '解释助手已启动' }
    },
  })
}
