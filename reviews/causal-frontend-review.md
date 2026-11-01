# 解释前端与模型比较卡交叉审查

审查日期：2026-11-01。
审查对象：当前工作区源码，包含尚未提交的改动。
审查人：独立子代理 classify_dielectric。
方式：源码审阅、离线真实结果回放、纯函数和服务端渲染验证。
审查阶段只读；主代理修复 F2/F3/F5/F7，benchmark 实现代理修复 F8。
本代理修复 F1/F4/F6 与时序尺度展示，其余修复由本代理独立复核。
主代理独立复查本代理的修复，并补充详情生命周期要求。
全程未操作界面、调用生产接口、运行 build 或提交 Git。

## 结论

初轮未发现 P0/P1 问题，发现 4 项 P2 数据一致性问题与 2 项 P3 展示问题。
全屏补丁复审另发现 1 项 P2 异步关闭竞态。
发版实机验收另发现 1 项 P1：真实大结果无法显示模型比较卡。
八项问题均已修复；下表区分独立复核与本代理实施的离线验证。
现有自动测试全过不能覆盖这些真实输出边界。

| 编号 | 级别 | 问题 | 状态 |
| --- | --- | --- | --- |
| F1 | P2 | 明确中性方向被算作未知，前后端均值不一致 | 已修复，真实 480×43 回放通过 |
| F2 | P2 | 单条原始数据视图丢失已有特征原值 | 已修复，独立复核通过 |
| F3 | P2 | 真实 CSV 数字字符串无法用于数值范围筛选 | 已修复，独立复核通过 |
| F4 | P2 | 批量文件校验未绑定任务类型、字段和行号边界 | 已修复，含详情生命周期隔离 |
| F5 | P3 | 单条未知方向条形使用负向蓝色 | 已修复，源码及测试复核通过 |
| F6 | P3 | 无向图 SVG 的关系说明带有方向箭头 | 已修复，双模式 SVG 测试通过 |
| F7 | P2 | 过期 close 事件撤销重开全屏的状态和模态语义 | 已修复，独立离线调度复核通过 |
| F8 | P1 | 完整 benchmark JSON 被宿主裁剪，比较卡及下载消失 | 已修复，真实输出与摘要独立对照通过 |

## 发现与反例

### F1：明确 0 方向与未知方向必须区分

审查时位置：`packages/agent/src/client/contribution-matrix.ts:20`，以及 `ContributionHeatmap.tsx`、`ContributionLegend.tsx`、`ExplanationDataTable.tsx` 的方向显示。

真实反例来自 `/tmp/limix-timeseries-real.view.json`。
该文件有 480 个预测步与 43 个特征。
`snowfall` 和 `calendar_0` 各有 480 个非零分数，方向全部为 0。
后端 `summarize_features` 的规则是 `abs(score) × direction`，故两者均值均为 0。
前端只接受方向 1 和 -1，故两者得到 `mean=null`、`unknownCount=480`。
界面与 SVG 将真实中性结果显示为“方向未定”，也改变了排名位置。

建议：方向 0 是已知中性，参与分母并贡献 0。
仅 null 或非法方向应使非零分数的均值缺失。
图例、提示、原始表、单条图和导出必须使用同一方向语义。

修复：方向判断、文字和颜色集中于 explanation-data。
0 使用灰蓝“中性”；null 使用灰色“方向未定”。
真实 480×43 回放中，两列均得到 `mean=0`、`unknownCount=0`。

### F2：单条原始表不应重新构造并丢失原值

审查时位置：`packages/agent/src/client/ExplanationSingle.tsx:16`。

后端单条结果同时带有 `feature_names`、`samples[0].feature_values` 和按贡献排序的 `features`。
原实现从已排序 `features` 重建 `samples`，却未携带 `feature_values`。
结果是已经有原值的数据仍在“特征原值”列显示“—”。

反例：原始字段 `[a,b]`，原值 `[0,10]`，贡献排名 `[b,a]`。
修复后 `singleSampleMatrix` 优先使用原样本矩阵。
兼容仅顶层原值时，按字段名重排而非按贡献排名直接配对。
独立复核得到 `[0,10]`，零值未丢失。

### F3：真实 CSV 原值是字符串，不能只接受 number

审查时位置：`packages/agent/src/client/explanation-filter.ts:filterFields` 和 `filterSamples`。

真实 wine_quality 文件的 11 个原值字段均为字符串，例如 `"7.3"`。
真实 concrete 文件的 8 个原值字段也均为字符串，例如 `"332.5"`。
原实现使用 `typeof value === 'number'` 判断数值列。
这些字段全部进入类别选择，不能输入数值上下界。
原测试只构造 JS number，因此没有暴露此问题。

修复后统一解析非空、有限的十进制或科学计数法字符串。
真实文件复核：wine_quality 的 11/11、concrete 的 8/8 字段支持范围筛选。
范围 0–1000 分别命中 10 和 205 个原始样本。
分类预测标签仍按类别筛选；空串、空白和 null 不当作 0。

### F4：批量详情不能仅凭目标名和样本数认定同一结果

审查时位置：`packages/agent/src/client/explanation-data.ts:48`。

离线反例：以真实 480×43 时序文件作为 expected。
将待加载文件的 `task_type` 改为 regression，字段全部改为 `unrelated_0...42`，原始行号全部加 1000。
保持目标名、请求数量和解释数量不变时，原 `validBatchDetail` 返回 true。
若同一路径文件被另一次任务覆盖，该详情会被错误显示为本次结果。
当前摘要保留字段列表和类型，已有足够数据做更严格比对。

建议：核对任务类型、字段顺序、映射口径和结果版本。
按已知 input_rows/horizon 校验行号及预测步边界。
对存在原请求行号上下文的情况，进一步核对样本集合。
校验失败应保留当前重试提示，不能静默显示另一份矩阵。

修复：校验任务类型、字段完整顺序、映射、结果版本、来源任务及行步边界。
存在请求行号或原始样本时，校验返回样本属于原集合。
时序步与行号须一致，合法非连续步保留。
详情请求、已加载数据及错误绑定稳定身份 key。
同路径、同目标、同数量更换任务时重新校验；旧详情不会先渲染一次。
新对象引用和仅展示名称变化不触发重读。

### F5：未知方向不能沿用负向颜色

审查时位置：`packages/agent/src/client/ExplanationView.tsx:25`，`LocalExplanation.tsx:30`。

原 CSS 将所有单条条形设为蓝色，仅方向 1 改为绿色。
方向 null 的文字虽然显示“方向未定”，条形却与 -1 方向一致。
这与批量热力图的灰色未知方向相矛盾。
修复后默认灰色，只有明确 -1 使用蓝色、1 使用绿色。

### F6：无向图导出提示不应使用箭头

审查时位置：`packages/agent/src/client/explanation-export.ts:72`。

反例：`mode=undirected`，边为 x、y、0.5。
导出的 path 没有 marker，但 title 仍是 `<title>x → y：0.5</title>`。
界面使用 x — y，导出与界面含义不一致。
建议 title 也按 mode 选择 `→` 或 `—`。

修复：无向 title 使用 `—`，有向 title 保留 `→`；测试同时核对 marker。

### F7：过期关闭事件不能撤销新打开的全屏

复审位置：`packages/agent/src/client/use-card-fullscreen.ts` 的 close 监听、showModal 入口及焦点 RAF。
主代理在真实界面发现下载后退出全屏时，AX 树仍局限于已关闭卡片。
主代理加入同步清除模态语义、关闭态明确 false、提交后恢复焦点的最小补丁。
独立审查发现：close 事件排队后、派发前重新打开，会被旧监听设为 expanded=false。
假 DOM 调度直接运行当前 hook，复现 dialog.open=true、aria-modal=false、role=presentation、占位高度清空。

修复：dialog 已重新打开时忽略旧 close 事件。
showModal 前同步恢复 role=dialog、aria-modal=true，避免 state 未变化时 React 不重写属性。
焦点 RAF 检查恢复标记与 dialog.open，防止重开后旧回调抢焦点。
本代理独立验证下列 5 个调度场景通过：

- close 排队期间重开，状态与模态语义保持开启。
- 重开但 React 尚未提交时，旧焦点 RAF 不执行。
- cancel 关闭后，下一帧正常恢复焦点。
- 全屏状态卸载，移除监听、关闭 dialog 并清理占位。
- 关闭状态卸载，取消待执行焦点 RAF。

原有前端测试 46/46、TypeScript 再次通过。
这些检查使用假 DOM，不能证明平台原生 AX 树已恢复。
真实“全屏下载 CSV/JSON → 退出 → 读取完整 AX 树”由主代理验收。

### F8：工具通道不能承载完整 benchmark 原件

定位：`limix_benchmark.py:tool_summary/run`、`tool-result.ts:parseToolResult` 和 LimixToolCard 的 benchmark 判定。
真实原件 `causal-demo/validation-20261101/benchmark/results.json` 为 414,001 字节，包含 3 个数据集、12 组运行。
完整原件能够解析；原 CLI 将原件全部输出，宿主随后按 token 预算保留头尾。
会话“用 limix benchmark 比较已有模型数据”的 tool/result seq=114 只剩单文本块 49,933 字符。
其末尾明确记录 `Omitted 364158 bytes`，中间 JSON 在第 886 行解析失败。
当前 app.asar 的 `dsh-spill-policy` 在 tools/post-execute 执行此裁剪，并插入 GAP 和原件位置。
这不是多个文本块拼接或字段名称错误。

本代理用该次实际工具文本复现“已返回”，比较视图、CSV/JSON、报告和全屏入口全部缺失。
修复仅让 CLI 输出明确字段白名单的摘要；不从截断文本猜测 JSON。
下载 JSON、CSV、HTML 仍使用完整保存结果。
委派 Python 子进程经过同一 run()，输出相同摘要。

独立核验结果：

- 实际原件 414,001 字节，摘要 6,282 字节。
- 3 个数据集、12 组运行及所有指标逐字段一致。
- 原件 SHA256 保持 `79e64725a58fbebe1b31c7f4708d320f55e14e2a1a589c31117c97861007fa96`。
- 摘要 SSR 显示“已完成”，比较表、CSV/JSON、报告和全屏入口全部恢复。
- 3 项输出测试通过，包括真实委派子进程、失败/部分完成/等待状态和完整原件。

此核验没有调用 API、构建插件或操作界面。主代理负责重建后的真实缓存续跑与下载验收。

## 通过的独立核验

- 初始前端测试 38/38 通过；初始 TypeScript 无错误。
- 已修复 F2/F3/F5 后，前端测试 40/40 通过，TypeScript 无错误。
- 全部修复后，前端测试 46/46 通过，TypeScript 无错误，git diff --check 通过。
- 真实时序 480×43 在 SSR 产生 20,640 个贡献色块。
- 同一时序独立 SVG 保留 20,640 个色块，约 4.67 MB。
- 时序 SVG 不含 NaN、Infinity、CSS 变量或 foreignObject。
- 第 480 步与服务返回时间保留；没有改成截断的四步测试夹具。
- 修复后完整时序 SVG 为 4,667,471 字节，两个中性字段均值为 0，未知数量为 0。
- 现有筛选测试覆盖原始行号、交集、零命中、同尺度均值和抵消。
- 使用真实三数据集、十二次运行的比较结果，逐数据集渲染四个模型。
- succeeded 且指标缺失显示“—”；failed 即使携带指标 0，也显示“—”。
- 真正成功且指标为 0 保留为 0，不与缺失混淆。
- partial 显示“部分完成”；失败原因保留。
- 比较卡外部数据集名和错误文字经过 React 转义。
- 关系 SVG 标签转义测试覆盖 script 文字，不生成可执行标签。

## 时序尺度补充修复

后端已标记 `prediction_scale=unverified`，当前未取得业务尺度的可核验契约。
前端同时按 `task_type=timeseries` 兜底，覆盖旧文件。
单条卡、热力图提示、原始表、样本表和筛选统一显示“解释模型输出”。
单条卡不添加业务单位，不展示原预测差值。
正常回归仍保留单位与重算差异，分类仍展示类别变化。

## 分类语义与验证边界

主代理同时加固了分类重算展示：显示类别变化，不把类别编号相减。
当前 CLI 从 CSV 读取分类原预测时保留字符串，原有真实 wine 流程未生成数值 delta。
因此这项属于显示契约加固，不计入上面的真实生产缺陷数量。

全屏与宿主事件已做源码审阅：整卡使用同一内容树，按钮采用原生监听；说明的 document capture Esc 早于 dialog capture Esc，关闭说明优先。
本轮没有启动浏览器或桌面应用，未验证焦点恢复、PNG 下载、Canvas 栅格化或平台原生 dialog 行为。
这些交互仍应由主代理的真实界面验收负责，不能用 SSR 通过替代。

详情稳定身份已有纯函数回归测试，生命周期隔离由源码复查确认。
本轮未以浏览器动态切换冒充此项验证。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
