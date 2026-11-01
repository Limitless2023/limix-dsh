# 移植笔记（0.2.1）

## 2026-11-01：0.3.0 发布验收

- 四个普通用户案例完成预测与解释：混凝土205行、红酒10行、采暖154行、单车14步。
- 独立重算四个案例指标，核对解释维度与样本对应；单车预测效果较差，保留真实负R²。
- 热力图使用全量样本；右侧仅显示带正负平均贡献，中性计零，未知方向不补零。
- 筛选支持CSV数值字符串；原始数据可检索分页；SVG/PNG保留完整矩阵。
- 时序解释尺度未核实，不显示业务单位或与原预测的差值。分类重算显示类别变化。
- 同源无向三变量对照成功且零边；完整20变量返回服务执行错误，未声称修复上游。
- 三组固定数据拆分完成7M/16M/XGBoost/基线共12组实测，并独立重算指标。
- 比较输出计划在依赖加载、写锁、计算和上传前拦截输入覆盖；独立15组对抗验证通过。
- 全屏退出先清除模态语义，再恢复焦点；实机下载后退出，导航与输入框恢复可访问。
- 离线验证：Python解释49项、Python比较29项、Node前端/宿主/数据/取消59项；类型检查通过。
- 五包统一0.3.0；临时目录安装核验入口、数据库驱动及CLI帮助，不修改宿主安装配置。
- 修复宿主裁剪414KB比较JSON导致的空卡：工具只返回约6KB摘要，全量原件保留；数据集切换、全屏与CSV下载实机复测通过。
- 最终源码与附件对应关系由Release的manifest.json和SHA256SUMS给出。
- Windows锁与取消仅做模拟验证。MCP服务独立部署，不包含在DSH五包中。

## 2026-11-01：关系图说明减负

- 正文只保留「6 个变量未检出连线」，删除「保留显示」。
- 关系分数含义和循环限制收进「关系图说明」；删除泛化的实验核对提醒。
- 说明图标与贡献图共用即时悬停、点击固定和 Esc 关闭交互。
- 实机验证普通卡片、全屏、键盘和目标聚焦；聚焦视图无环时不提示循环。
- 钢材说明回归通过；Node36项、类型检查与构建通过。
- 截图：../causal-demo/screenshots/optics-notes-clean-fullscreen.png 与 optics-notes-help.png。

## 2026-10-31：平均贡献说明即时展开

- 移除说明图标的原生 title 延迟，改为悬停或聚焦立即显示。
- 单击固定，再次单击、点击外部或 Esc 关闭。
- 全屏中 Esc 先关闭说明，再次 Esc 退出整卡。
- 实机验证普通卡片与63行全屏；Node36项、类型检查、构建通过。
- 截图：../causal-demo/screenshots/steel-impact-help-card.png 与 steel-impact-help-fullscreen.png。

## 2026-10-31：影响分数对比收敛为单一口径

- 按用户要求移除平均绝对贡献选项、状态和前端冗余计算。
- 标题改为「各影响因子影响分数对比」，保留带正负均值、蓝负绿正与绝对大小排序。
- 原生界面核对标题、无切换入口、63行全屏与Esc退出。Node36项、类型检查、构建通过。
- 最新截图：../causal-demo/screenshots/steel-impact-score-comparison.png。

## 2026-10-31：按 PRD 展示带正负的平均贡献

- 热力图右侧默认对每个样本计算 abs(score)×direction，再求平均。
- 条形以零为中心，蓝色向左、绿色向右；按均值的绝对大小排序。
- 保留「平均绝对贡献」切换，热力图的原始行列与全量色阶不变。
- 非零贡献缺少方向时，显示方向未定，不补零、不丢弃该样本后求平均。
- 实机验证10行和63行、鼠标与键盘切换、全屏退出保留口径。
- 独立重算全部13个特征。63行钛 −0.03956459，钴 +0.01253546；10行钴 +0.11848145。
- Node36项、类型检查、构建和差异检查通过；没有重提模型任务。
- 最终截图见 ../causal-demo/screenshots/steel-signed-mean-card.png 与 steel-signed-mean-fullscreen.png。

## 2026-10-31：解释卡全屏与贡献口径

- 解释卡右上角增加全屏图标；原生 dialog 覆盖应用窗口，卡片标题、图表、明细和下载一起放大。
- 复用同一棵内容树，保留热力图/逐样本视图、选中样本与节点高亮；Esc 或图标退出，恢复焦点和对话滚动位置。
- 原生界面验证 63×13 热力图、第63行切换、20变量关系图、高亮保留及目标聚焦（6变量5条边）。
- 全屏下载 ui-all-fullscreen.csv 与原件逐字节一致，39,454 bytes。未重复调用模型接口。
- 平均绝对贡献旁增加悬浮解释：先取绝对值再求平均，只比较大小；官方截图保留正负方向，具体聚合公式尚未确认。
- 批量卡不再常驻样本索引和调节收益长句；移到样本数量右侧的数据说明图标，点击展开/收起。部分返回等异常仍直接提示。
- Node35项、类型检查、构建和差异检查通过；真实截图及操作记录见 ../causal-demo/README.md。

## 2026-10-31：批量解释、完整网络与全量热力图

- explain 支持 --rows 1-10、all、非连续行；保留原始行号和完整 CSV。
- 完整矩阵通过受控 .view.json 读取；Agent 上下文仅保留摘要。
- 钢材界面独立实调前10行与全部63行，分别返回130和819条贡献。
- 默认展示全量样本×特征热力图与平均绝对贡献排序；保留逐样本分页和单条解释。
- 蓝负绿正的线性色阶固定在全量最大绝对值；未知方向为灰色。
- 原生界面验证：完整矩阵、色块点击、键盘选格、行63、下拉选行、7页、展开13因素与重启恢复。
- 光学完整案例使用官方随机实验1000行、20变量，实际28条边；保留6个孤立变量和循环提示。
- 官方 charts 实调4102权限不足；使用原始数值绘图，不声称获得官方图片。
- Python30项、Node34项、类型检查、构建、差异检查通过。六份下载与原件逐字节一致。
- sample_index缺失时只有完整返回才按输入顺序对应，并明确说明；贡献不当作调节收益。
- 数据、复现、截图与界面记录见 ../causal-demo/README.md。

## 2026-10-31：公开钢材数据端到端验证

- 选用 matminer steel_strength；312 条钢材实测数据，13 个成分字段。
- 原文件摘要与 matminer 官方元数据一致；本地数据目录为 ../materials-demo-steel。
- 固定种子 42，249 行参考、63 行测试；预测输入不含目标值。
- 从首页材料入口开始，在文件选择器添加参考与预测 CSV。
- 使用 /limix-predict 和 --truth，一次 regress 完成上传、预测、下载与本地指标。
- 任务 5fefbe978148b82a0a6bea5a9fa79891，LIMIX_16M，终态 finished。
- R² 0.9298，MAE 68.1314 MPa，RMSE 95.9578 MPa，MAPE 4.319%。
- 独立重算指标一致，63 行成分与输入逐行一致。
- 点击下载并在系统窗口保存；Downloads 文件与原结果逐字节一致。
- 卡片图表、指标和结果表格预览均实测通过，无需修复产品代码。
- 截图：../_recon/t5-materials-metrics-verified.png、t5-materials-result-file.png、t5-materials-upload.png。
- 本数据没有工艺参数；本次仅验证成分到性能，不代表新材料外推能力。

## 2026-10-31：材料性能示例

- 用户暂停首页布局调整，未采用 A/B 预览。
- 「客户分层」替换为「材料性能预测」，图标改为烧瓶。
- 示例根据材料配方和工艺参数预测抗拉强度。
- 草稿要求先确认实验数据、字段及强度单位，再做回归预测。
- 类型检查、构建与差异检查通过。
- 实机点击后草稿正确，未发送消息或调用预测。
- 截图：../_recon/t4-material-example-verified.png。

## 2026-10-31：首页示例视觉调整

- 长问题改为「预测销量」「客户分层」「预测电价」三个短入口。
- 使用小线条图标、圆角轮廓和淡蓝灰底色，移除外链箭头。
- 辅助说明收短为「上传数据，或告诉我你想预测什么。」
- 完整问题保留为悬停提示；填入的草稿内容不变。
- 类型检查、构建和差异检查通过；实机核对布局并验证销量入口填草稿。
- 截图：../_recon/t4-welcome-refined-actions.png。

## 2026-10-31：首页紧凑问题按钮

- 三个问题保留按文字宽度排列，增加淡底色和 1px 细边框。
- 按钮最小高度 34px，间距 8px；辅助说明保留在输入框下方。
- 沿用宿主主题颜色、悬停反馈与键盘焦点；不改填草稿行为。
- 构建与差异检查通过；实机确认底色、边框和填草稿行为。
- 截图：../_recon/t4-welcome-compact-buttons.png。

## 2026-10-31：首页引导减重

- 辅助说明和推荐问题统一放在输入框下方。
- 三张双层卡片改成按文字宽度排列的无边框按钮。
- 说明用 12px 次级文字；问题保留悬停反馈和键盘焦点。
- 按钮最小高度 32px，窄窗口自动换行；点击仍只填草稿。
- 10 项组件检查、类型检查和构建通过。
- 实机确认三个问题填草稿、键盘 Tab/Enter 操作及标准模式隐藏正常。
- 截图：../_recon/t4-welcome-lightweight.png。

## 2026-10-31：首页推荐问题位置

- 开场白保留在输入框上方，三个推荐问题移到下方。
- 宿主首页没有输入框下方槽位；Portal 挂载在 composer.bar 锚点之后。
- 视觉与键盘阅读顺序一致；切模式、切会话时移除挂载点。
- 示例只填草稿；仅空白 LimiX 会话显示。
- 10 项组件检查、类型检查与构建通过。
- 实机逐个点击三个示例，草稿正确且未发送；标准模式隐藏，切回后恢复一组。
- 截图：../_recon/t4-examples-below-input.png。

## 2026-10-31：修复官方 Logo 上下裁切

- 原因是宿主字标容器固定 24px，插件原图显示高度为 32px。
- 品牌按钮隐藏溢出内容，导致原图上下被裁掉。
- 仅将包含本插件 Logo 的 brandIdentity、brandName 改为自动高度。
- 保留官网原图字节、显示比例和宿主的溢出保护。
- 品牌构建和烟测通过；完全退出并重开桌面后，原图边缘显示完整。
- Cmd+R 未重载品牌插件；上一轮截图仍为旧图，不能作为原版验收证据。
- 本次有效截图：../_recon/t5-official-logo-spacing-fixed.png。
- 收起、再展开侧栏正常；原图 SHA-256 未变。

## 2026-10-31：恢复官方原版 Logo

- 用户明确要求官方原版，撤下此前 AI 去纹理素材。
- 官网导航 Logo 用于展开侧栏；官网图标用于封面、折叠侧栏和插件列表。
- 文件未经修改；本地资源与构建内联图片的 SHA-256 均匹配官网原文件。
- 只做等比显示；保留官方纹理、图形、颜色和字标。
- 已同步当前桌面链接 ../limix-cover；未改 profile 配置或 app.asar。
- 来源与校验值见 packages/brand/assets/SOURCES.md。
- 品牌构建与烟测通过；该轮只核实文件与内联资源一致。
- 旧截图 t5-official-logo-verified.png、t5-official-logo-collapsed.png 仍含缓存图片，已由上方完整重启验收替代。

## 2026-10-30：T4、结果卡和官方品牌

- 采用 `conversation.input.dock` 的 session 作用域；hero.brand.mark 属于 root，不能直接依赖会话状态。
- 开场白读取 `useSessions(...projectionValues.agentPreset)`，仅 session.blank 且 preset=limix 时渲染。
- 三个示例调用 `inputActions.setDraft`，不调用 submit。已在真实界面逐个点击验证。
- 标准模式切换与刷新均不显示引导；发送消息后引导消失。
- 结果卡删除默认键值表和命令行；改为指标、状态、样本数、文件入口，技术信息默认折叠。
- 修复原始文本无法解析时 Object.keys(null) 的崩溃风险。失败和排队状态不再误报完成。
- 轮次摘要移除牌堆交互与任务 ID；与工具卡共用 tool-result.ts。
- 结果文件按钮使用宿主 openFile，已在真实 CSV 上验证打开表格。
- 侧栏换完整官方标志；折叠态保留图标。素材来源记录在 brand/assets/SOURCES.md。
- 本机 brand 包实际链接 ../limix-cover；只同步品牌源码、素材与构建产物，不改 profile。
- 10 项组件测试、类型检查、两包构建与品牌烟测通过；没有发布新版本。
- 实机截图：../_recon/t4-welcome.png、t4-standard.png、t4-card-final.png。

## 2026-10-30：T1/T2 实机验收与修复

- T1 初测卡片能显示指标，但 CLI 错把结果的 `price` 真值列当作预测列，满分无效。
- 指标拆入 `tool/assets/limix_metrics.py`。表格读取 `pred_label`；时序读取 `pred_<target>`。不再用目标列兜底。
- 缺真值、缺预测列或行数不等时不报指标。分类跳过空标签；数值指标排除 NaN/Infinity。
- 任务卡删除猜测性指标正则与作用域外的 `n` 引用；仅读取 `metrics` 中有限数值。
- T1 修复后会话：`session-dfcf7ca5-b49f-4f66-a079-eef89333eae3`；任务：`585435b65cff3f9ba89bf3c6c00d5b46`。
- 不传 `-o`，40 行输出 `r2=0.9992, mae=12.6473, rmse=14.6387, mape=0.755`；卡片显示 `0.9992 R²`。
- T2 初测设置中没有数据源入口。data 移到 profile 后只提供设置路由与 `limixDatasource` 工厂；tool 在 preset 上下文调用工厂。
- 本地 MySQL 9.3.0 只读账号验证新增、测试、保存、刷新、错误密码与清理。PostgreSQL 实例未测。
- 作用域从实际 `request/header.tools` 验证：标准模式 `session-085d39bc-8f90-4d7e-9ec0-8309c8b44db6` 为 37 个，无 limix/datasource；LimiX 会话 `session-3bce2fc2-3ff6-405f-a7bc-7aee06afb1f8` 为 39 个，两工具均实调成功。
- 测试：8 项 Python 指标/临时下载测试、4 项任务卡渲染测试、2 项 data 注册契约测试。三个包构建成功。
- 分发烟测：tool 本地 tarball 含两个 Python 文件，解压后 `limix.py --help` 成功。本轮未发布新版本。
- 本地截图：`../_recon/t1-fixed.png` 与 `../_recon/t2-connected.png`。


## 2026-10-26：datasource 参数定义修复

- 症状：安装 data 包后，每轮请求被拒绝，报 `Invalid schema for function 'datasource'`。
- 根因：`parameters` 是字段表，本地适配器却将它当作完整 schema，转换结果为 `{}`。
- 修复：`src/host/define-tool.ts` 先补 `type: object` 和 `properties`，再转换字段。
- 构建：复用本机已有 tsdown 0.15.12，按 data 的宿主构建配置重建 `lib/index.js`。
- 回归：`cd packages/data && node --test tests/tool-contract.test.mjs`；旧产物失败，新产物通过。
- 桌面验收：重启 DeepSeek Harness 后，在「数据源命令列表」会话实调 `datasource {"command":"list"}`，轨迹返回空数据源清单，模型正常完成回复。
- 边界：本机没有配置数据源；本次未验证数据库连接、查询和 CSV 导出。

## 已验证

- `limix` 工具端到端可用：子 agent 真实调用 `{"command":"health"}` → `{"status":"ok"}`
  （工具注册 ✔ / 包内 `assets/limix.py` 解析 ✔ / 凭据 ✔）
- 「分析过程」视图在 0.2.1 注册成功并渲染空态；`useSession(s => s.nodes / s.runningCalls)` 选择器仍然有效
- `tool.call.toolview` 0.2.1 契约：`{ phase: 'preparing'|'start'|'result', block, callId, toolName, cwd?, home?, openFile, loadImage, inspect? }`
  —— 旧代码读的 `block.call/.argsRaw/.content` 作为 legacy 字段仍在

## 关键约束：树外宿主插件不能 import `@deepseek-ai/dsh-*`

- profile 里没有这些包；Node 按插件 realpath 向上找不到；app-boot 里 `NODE_PATH` 只出现在“禁止 .env 设置”的名单里，没有注入解析
- `@deepseek-ai/dsh-tools` 自身又 import cordis / dsh-llm / dsh-sandbox / dsh-scope / dsh-brand / dsh-util-values
  → 想靠打包内联也做不到（会把整个宿主框架卷进来）
- 结论：宿主半只允许用 **node 内建 + `ctx.*` 服务 + 普通 npm 依赖**，
  需要 schema/工具定义时自己写等价 shim（agent 包已这么做）

## data 包的范围决定

| 候选 | module scope import | 可分发性 |
|---|---|---|
| `limix-datasource`（NL2SQL 旧入口） | 仅 `@deepseek-ai/dsh-tools` + node 内建 | ✅ 换成本地 `defineTool` shim（~30 行 DSL→JSON Schema）即可 |
| `limix-data-agent`（/data-source 数据中心 fork） | dsh-storage / -domain / -json / dsh-credentials / dsh-tools | ❌ 不重写就用不了：这些是宿主内部包，装成 npm dep 会得到第二份服务类 |

→ 先发 `limix-datasource` 这条路（设置页 + `datasource` 工具 + 三闸只读），
  data-agent 留给内部 fork（它本来就是跑在源码检出上的）。

## 「分析过程」空白的原因（0.2.1，已定位到数据源层）

`conversation.view` 的 standard props 里，旧版用 `useSession` 取对话节点，0.2.1 已经不对：

| hook | 返回 |
|---|---|
| `useSession` | `sessionId, pendingSubmissions, running, subagent, removed, openState, openError, hasMore, loadingOlder, promptError, blank, lastAgentError, promptAttempted, awaitingFirstTurn`（无 nodes） |
| `useChat` | `order, nodes, locations, navigation, timeline, legacy`（`nodes` 是 keyed 袋，`order` 是 id 序；直接 s.nodes 会 `nodes is not iterable`） |
| `useConversation` | `views, activeTargets` |
| **`useTrajectory`** | **`eventNodes, eventLocations, requests, callSchemas, partial, runningCalls`** ← 与旧版的 `nodes` + `runningCalls` 对位 |

→ 正解：`nodes = useTrajectory(t => t).eventNodes`、`runningCalls = ...runningCalls`，
   再按节点 `kind` 建轮次。最后一公里是 `eventNodes` 的元素结构（kind 词表），
   需渲染一次 `keyof node` 确认。

## 修复（0.1.2）

`useSession` → `useTrajectory`：`nodes = eventNodes`、`runningCalls = runningCalls`；
解析层同时接受 `tool-call`（新）与 `assistant-step`（新名）。实测 `测试 Limix` 会话：
第 1 轮 / LimiX ×23 / 34 阶段 / 2 分 21 秒，并行组与失败节点均正常。

## 0.1.3 打磨

- 卡片字段中文名补全（task_type/engine_type/model_type/config_name/callback_url/priority/created_at/queued_at/…）
- 卡片命令行里的绝对路径按会话 cwd 相对化（`/Users/.../train.csv` → `train.csv`）
- 工具 description 补充：时序 `--predict` 可选，不传按 `--horizon` 自动外推

## 卡片指标来自哪儿（0.1.4）

`limix forecast|regress|classify` 成功后，CLI 会把结果 CSV 落地并**顺带算指标**写进输出的
`metrics` 对象（n / mae / rmse / r2 / mape，分类为 accuracy）。真值来自 `--truth`，
未指定时回退到 `--predict` 的目标列。没有真值时不出指标。
卡片、分析过程、报告三处都从这里取数，不再依赖模型自己算。


### 2026-10-31：T5 与 Logo 修整

- 原生 commands 注册 /limix-predict；commands 与 systemPrompt 均在 preset 作用域注入。
- handler 保留已接纳附件与用户输入，创建唯一消息，交给 Agent.followup。
- 完整预测使用一次 limix classify/regress/forecast 调用，带 --output；本地路径不预先换成版本 ID。
- 图表原先只读宿主 cwd，桌面 cwd 是 profile，无法读取工作区结果。
- 成功调用将结果与输入 CSV 的真实路径记录到 ~/.limix/dsh-csv-files.json；不扩大到整个用户目录。
- 图表与下载复用 CSV 路由；下载设置 Content-Disposition，原生保存对话框已验证。
- 使用内置 image_gen 对官方原稿透明资产去纹理，来源与提示词见 packages/brand/assets/SOURCES.md。
- 新 Logo 已同步桌面当前链接的 ../limix-cover；未修改 profile 配置或 app.asar。

### 2026-10-31：分类与时序补测

- --truth 的文件与列在上传前校验；真值不进入模型请求。
- 时序评估必须逐行匹配日期。浏览器叠加实际曲线也使用相同约束。
- CSV 解析支持 BOM 与非首列日期；空白数值不再被当作零。
- 卡片指标说明和分类明细默认收起；回归图删除重复指标与长段图注。
- 时序图例移到 HTML 中，防止区间和目标列名挤在一起。
- 原生桌面已跑通 60 行三分类与 30 天时序分位数预测；下载文件与原结果一致。
- 时序参数文档缺失曾导致 Agent 猜错参数。已明确 --quantile、--levels 与工具内 --help。
- 帮助调用不计入任务摘要，也不显示预测已完成。
- 31 项测试、TypeScript 与构建通过。数值、文件和截图见 HANDOVER.md。
