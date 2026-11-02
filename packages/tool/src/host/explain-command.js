/**
 * [INPUT]: 宿主 commands、systemPrompt 与 Agent.followup；已接纳附件。
 * [OUTPUT]: 注册 /limix-explain，区分预测解释与关系探索，约束模型、范围、尺度与证据。
 * [POS]: 区分咨询与已授权执行；LimiX preset 专属解释入口；复用 limix explain 工具与结果卡。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { randomUUID } from 'node:crypto'

const WORKFLOW = `以下是执行指引，仅在用户已要求实际执行对应任务时应用；咨询能否做、讨论方法或只读检查不触发提交，也不需要先检查运行环境。已有执行授权继续有效，不重复确认。
当用户要求解释预测、分析影响因素、探索变量关系或使用 /limix-explain，先区分预测解释与关系探索：
1. 表格局部归因用 limix explain --mode local --train 参考CSV --data 待解释CSV --target 目标 --task-type regression或classification；单行用 --row，行号从1开始、不含表头。指定多行用 --rows 1-10 或 --rows 1,3,5-8，全部用 --rows all；row 与 rows 互斥。遵守本轮样本范围，不用数据说明中的示例行数覆盖需求，不额外先提交10行任务。工具会预检有限数值并识别具有唯一值证据的常见标识列；--features 可显式覆盖，返回 excluded_identifiers 保留追踪信息。不静默删除业务分类字段；非数值业务列须使用与原预测一致的编码。用户指定前10行就按原行号执行；用户只说“看一些典型样本”且已授权抽样时，分类可用 --sample-count 10 --sample-seed 42 --prediction 原预测CSV 按预测类别抽样。不能把这种均衡抽样当全体分布，更不能当误判抽样。
2. 时序局部归因用 explain --mode local --task-type timeseries --result-version-id 已完成时序预测的结果版本ID。沿用原预测数据、目标、特征、窗口、步长和模型，不能再传 data/train/target/features/model/row/rows/prediction；行代表预测步。按任务类型补充必要参数：时序已有结果版本时不追问数据、目标或样本范围；表格缺数据、目标或样本范围时只问缺项。
3. 全局关系探索用 explain --mode directed或undirected --data 含目标的CSV --target 目标 --features 特征1,特征2。所选列须为完整有限数值。保持默认阈值，不为让图更复杂而调阈值。边权是模型关系分数，不是增益、实验效应或已验证概率；与物理机制相符只称“一致”，不能声称证明因果或个体反事实。实验记录与模型发现分开，不自动请求预留自然语言报告接口。
4. 必须 --output 唯一的绝对路径.json；工具自动保存原始JSON与贡献/边CSV，不手写或篡改结果。--labels 可传已知字段字典 JSON（fields、target_label、unit），--prediction 可传同一输入逐行对应的原预测CSV作对比。
5. 表格解释原预测时，按原预测实际模型显式传 --model；用户单独指定解释模型时遵守指定。核对解释返回的 model_type，不将不同模型的归因冒充原模型的解释；指定模型被服务拒绝时报告失败，不擅自换模型重试。表格解释会重算预测，使用 explanation.prediction 并称“解释时预测”；有 prior_prediction、prediction_delta 时说明差异，不冒充与原预测一致。时序 prediction_scale=unverified 时称“解释模型输出”：不附业务单位，不与原预测做差，不自行做 exp 等逆变换；target_unit 不是解释模型输出的单位。
6. 贡献分数无目标单位，不写成增减多少MPa；方向是模型归因，不是实际调节收益。分类接口未声明 sign_scores 对应哪一类别，只称“服务返回的贡献方向”，不解释为提升某一类别概率，也不把不同预测标签的平均方向当成同一类别效果。中性或零贡献不等于变量没有实际作用，也不能据此断定共线性。
7. 批量核对 requested_count、explained_count、missing_rows。各影响因子影响分数对比采用带正负的平均贡献：每条 abs(score)×direction 求平均，再按平均值绝对大小排序；未知方向不补零。samples 完整矩阵由界面按 detail_path 加载。missing_rows 非空不得称全部完成；mapping=input_order 只是按输入顺序对应，不是服务索引核验。报告区分 input_rows 输入总量、requested_count 请求量和 explained_count 返回量；局部范围不称全样本结论。样本不足且无索引时拒绝错配；时间与特征名称只使用返回值，整体排名不是有向因果图。
8. 解释终态用 task_status；仅 succeeded 是完整成功，degraded_succeeded 或 partially_succeeded 必须说明限制。续查用 task_id 和原参数/output；缺回执但有请求文件时先通过 api GET /v1/extensions/tasks 排查。参数或权限错误先核对帮助、公开文档与原始错误，不猜测 API 端点，不追加用户未请求的探测任务。
9. 用户问预测误差原因时，先区分模型归因与误差诊断。可描述真实值对照中的日期和偏差；缺少天气、日历信息不足或分布变化等只能列为待验证假设。没有补充数据或对照实验，不断言某因素是主要误差原因，也不声称仅凭某些特征就无法提前预测。`

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
