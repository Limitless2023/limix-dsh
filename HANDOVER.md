# LimiX × DeepSeek Harness 插件：交接文档

> 读者：接手开发的人/Agent（此前没有接触过 DeepSeek Harness 的插件体系）。
> 目标：让你能独立完成「改代码 → 构建 → 安装 → 在 GUI 里验证」这个闭环。
> 最后更新：2026-11-01（DSH 0.2.1-rc.5，插件套件 0.3.1）

> **换机接手入口：先读 [USER-ACCEPTANCE.md](USER-ACCEPTANCE.md)。** 新电脑使用 v0.3.1 发布 tarball，不复制下文维护者的 profile、开发软链接或独立 MCP。本文后续保留历史开发笔记；安装以 INSTALL.md 为准，验收以 USER-ACCEPTANCE.md 为准。测试数据另随便携交接包提供，未放入源码仓库。

> 0.3.1 本轮交付：默认业务分析报告与 Markdown 文件、中文专属提示词、紧凑辅助卡及长特征标签。标准模式隔离保留。审查与验证见 reviews/report-release-review.md。

> 0.3.0 历史交付：分类/回归/时序解释、筛选与全样本对照、原始数据检索、SVG/PNG 导出、多模型比较及五包统一封装。四个业务案例与三组固定拆分比较见 GOAL-PLAN.md。
> 输出保护已修复：模型比较在写入和上传前检查全部衍生产物、回执目录与输入路径，包含软硬链接及大小写祖先别名。独立审查无未关闭阻塞项，见 reviews/。
> 无向接口边界：同源三变量成功返回零条边；完整20变量两次服务执行失败，尚需上游日志。时序解释值标为“解释模型输出”，不套用未经核验的业务单位。
> 本轮本地证据：../causal-demo/validation-20261101/，包含独立数值验算、下载摘要、光学诊断及 screenshots/。公开模型比较结果已放入 benchmarks/results/，不含服务回执或本机路径。

> 品牌修正：已撤下 AI 重绘素材。品牌包只使用 limix.ai 官网原始 PNG；来源和 SHA-256 见 packages/brand/assets/SOURCES.md。禁止重绘、去纹理或改字形。
> 已修复 24px 宿主容器裁切 32px Logo；完整重启后验收截图：../_recon/t5-official-logo-spacing-fixed.png。Cmd+R 不会重载当前桌面品牌插件，旧截图含缓存图片。
> 首页布局调整已暂停，保留淡底圆角按钮。「客户分层」已替换为「材料性能预测」，使用材料配方和工艺参数预测抗拉强度。入口填草稿已实测，未发送预测。最新截图：../_recon/t4-material-example-verified.png。
> 材料案例已用公开 steel_strength 数据跑通上传、预测、系统下载与指标。249 行参考、63 行测试，R² 0.9298；本数据只含成分。数据与复现说明见 ../materials-demo-steel/README.md；实机截图见 ../_recon/t5-materials-result-file.png。
> 因果解释已验收：新增 `/limix-explain`、`limix explain`、贡献卡与有向图。钢材单样本解释、光学预测与有向关系均已实调，并在桌面上传、运行和下载。完整记录与截图见 ../causal-demo/README.md。
> 解释输出使用 `task_status`；只有 `succeeded` 是完整成功，降级须显示限制。单条局部解释明确显示“解释时预测”，不把贡献分数当成 MPa 或调参收益。JSON/CSV 下载只开放工具登记的文件。
> 批量解释已实调10/63行；默认全量热力图与带刻度色阶，可切换逐样本。完整光学案例20变量28条边。重启、下载和交互验收见 ../causal-demo/extended-ui-observations.json；最终截图 steel-heatmap-all.png。
> 解释卡新增右上角全屏图标：覆盖应用窗口，保留样本、视图、节点高亮，Esc/图标退出并恢复滚动与焦点。热力图、光学图及全屏下载已实测。
> 右侧标题为「各影响因子影响分数对比」，只展示带正负的平均贡献，按绝对大小排序；蓝负绿正。用户已要求撤下平均绝对贡献选项。方向缺失不补零。Node36项及桌面验证通过；最新截图 steel-impact-score-comparison.png。仅称贡献分数，不声称接口值是SHAP或因果效应。
> 平均贡献说明已改为即时悬停、聚焦展开，单击固定；再次点击、点击外部或 Esc 关闭。全屏先关闭说明，再按 Esc 退出整卡。普通/全屏已实测，截图 steel-impact-help-card.png 与 steel-impact-help-fullscreen.png。
> 关系图正文只保留未连线数量。分数含义与循环限制移入「关系图说明」，与贡献图共用即时提示交互。普通/全屏、键盘与目标聚焦已验证；最新截图 optics-notes-clean-fullscreen.png。
> MCP 服务独立升级到 2.1.0，新连接可见 15 个工具；当前 Codex 连接须重连。扩展历史列表受 Key 权限限制，保存 task_id/result_id 供续查。源码与验证见 ../../stable-ai/80-Agent与Skill工具箱/mcp-server/。

---

## 1. 这套东西是什么

LimiX 是一个预训练的结构化数据基础模型（表格 / 时序预测，免训练免调参）。这套插件把 LimiX 接进 DeepSeek Harness（下称 DSH），让用户在 DSH 的对话里用自然语言跑预测，并且**看得见调用过程**。

交付形态（repo：`~/Desktop/Projects/Coffee/limix-dsh`，GitHub `Limitless2023/limix-dsh`）：

| 包 | 作用 | 装在哪 |
|---|---|---|
| `packages/tool` (`dsh-limix-tool`) | 宿主半：`limix` 工具 + 通过 data 工厂注册 `datasource` + CSV 只读路由 | **只在 LimiX Agent preset 下** |
| `packages/data` (`dsh-limix-data`) | 全局设置页、配置/连接路由与 `limixDatasource` 工厂 | profile 层；不在全局注册工具 |
| `packages/agent` (`dsh-limix-agent`) | 浏览器半：limix 工具结果卡 + 「分析过程」视图 + 本轮任务卡堆 | profile 层（全局 UI） |
| `packages/brand` (`dsh-limix-cover`) | 封面 + 侧边栏 LimiX 品牌 | profile 层（全局） |
| `packages/preset` (`dsh-limix-preset`) | 声明 `preset-limix`，即「LimiX Agent」模式 | profile 层（只声明，不挂功能） |

关键产品形态：DSH 的模式菜单里多一个 **「LimiX Agent」**。选中它的新会话才有 `limix` / `datasource` 工具；标准模式等其它模式完全没有这两个工具，但保留 bash/文件/web 等通用能力。

---

## 2. 环境

| 项 | 值 |
|---|---|
| DSH 应用 | `/Applications/DeepSeek Harness.app`（版本 0.2.1-rc.5，代码在 `Contents/Resources/app.asar` 里，**asar 有签名与完整性校验，不要改它**） |
| 当前 profile | `desktop`，目录 `~/.dsh/profiles/desktop`（`package.json` 的 `dsh.profile.bundles` 决定装了什么） |
| 仓库 | `~/Desktop/Projects/Coffee/limix-dsh` |
| 构建工具链 | `tsdown`（在 `~/Desktop/Projects/DeepSeek_Harness/packages/limix-ui/node_modules` 里；构建时把这个 node_modules 软链到目标包即可，见 §5） |
| 本机 Python | `/Users/limitless/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3` |
| GUI | 每次启动端口都变，从 `$DSH_WEB_URL` 读 |
| LimiX 凭据 | `~/.limix/config.json`（已有）；也可用 `LIMIX_API_KEY` |

> **审批**：`plugin_manager` 的每个动作（包括 list）都要求 Full access 或审批。会话审批策略若为 `never`，安装动作会被自动拒绝——这时只能改文件 + 让用户重启，或让用户自己跑命令。

---

## 3. 必须先懂的 6 条硬约束

这 6 条是踩出来的，违反任何一条都会得到看不懂的报错。

### 3.1 树外插件不能 `import '@deepseek-ai/dsh-*'`

profile 里的包按 Node 规则从自己的 realpath 向上找模块，`@deepseek-ai/*` 在 app.asar 里，找不到。而且 `dsh-tools` 自身又 import cordis/llm/sandbox，打包内联也不可行。

**结论**：宿主半只能用 `node:` 内置模块 + `ctx.*` 服务 + 普通 npm 依赖。需要工具定义就自己写（见 `packages/tool/src/host/tool.js` 里的 `ctx.tools.register({name, description, parameters, output, execute})`），不要 `defineTool`。

### 3.2 一个包只能对应一个客户端行

`dsh.client` 扫描按「包名」识别浏览器模块；同一包被两行加载会报 `Distinct active Loader sources resolving to one package name are rejected`。

**结论**：宿主半和浏览器半要么同包一行（如 `agent` 早期形态），要么拆成两个包。我们最终拆成 `tool`(宿主) + `agent`(浏览器)。

### 3.3 单槽位是「priority 升序取第一个」

`single` 槽位渲染 `entriesOfSlot[0]`；entries 按 `priority` 升序排，同优先级保留注册顺序。官方 occupant 都是 `priority: 0` 且先注册。

**结论**：要覆盖官方 occupant，注册时传 `priority: -1`（见 `packages/brand/src/client.js` 的 `sidebar.brand.mark`）。

### 3.4 对话数据在 `useTrajectory`，不在 `useSession`

0.2.1 的 `conversation.view` 标准 props 里：
- `useSession` 返回的是**会话状态**（`blank/openState/hasMore/running/...`），**没有 nodes**
- `useChat` 返回 `{order, nodes, locations, navigation, timeline, legacy}`，`nodes` 是 keyed 袋（直接迭代会 `nodes is not iterable`）
- **`useTrajectory` 返回 `{eventNodes, eventLocations, requests, callSchemas, partial, runningCalls}`** ← 与旧版的 nodes + runningCalls 对位

**结论**：分析过程视图和本轮任务卡都用 `useTrajectory`。轮次边界用 `turnTail` 的 owner props `turn.start.seq / turn.end.seq` 切。

### 3.5 bundle patch 分两层，挂错会重复注册

- profile 层：`~/.dsh/profiles/desktop/package.json` + 该包自己的 `dsh.bundle.patch`
- preset 层：`preset-limix` 的 `config.plugins` 列表

同一个包若在两个层各挂一行，会得到 `webserver: duplicate exact route`（我们踩过）。当前 `packages/tool/cordis.patch.yml` 是**空数组 `[]`**，只由 preset 挂载。`packages/data` 只在 profile 层挂载 `limix-data-settings`，发布设置页、路由和 `limixDatasource.register` 工厂；tool 在 preset 上下文调用工厂注册 `datasource`。preset 不再挂 data 包，避免客户端重复扫描及重复路由。

### 3.6 改动的生效方式

| 改什么 | 生效方式 |
|---|---|
| `lib/client.js`（浏览器半） | 刷新页面即可（HMR/新 bundle） |
| `lib/index.js`（宿主半） | 需要 Host 重载 → **重启 DSH** |
| `cordis.patch.yml` / preset 声明 | **重启 DSH** |
| `assets/limix.py` / `limix_metrics.py` 等运行时文件 | 立即生效（每次调用时读） |

---

## 4. 代码地图

```
limix-dsh/
├─ packages/
│  ├─ tool/            dsh-limix-tool    宿主：limix 工具、三个命令、受控结果下载
│  │  ├─ src/index.ts        注册工具、命令与路由；Config: csvRoots/cliPath/pythonBin
│  │  ├─ src/host/tool.js    工具定义；成功调用登记 CSV 读取记录
│  │  ├─ src/host/predict-command.js    /limix-predict 与完整预测流程
│  │  ├─ src/host/explain-command.js    /limix-explain 入口与解释口径
│  │  ├─ src/host/benchmark-command.js  /limix-compare 入口；仅分类与回归
│  │  ├─ src/host/csv-access.js       CSV/JSON 真实路径与大小校验；读取记录持久化
│  │  ├─ assets/limix*.py    自带 CLI 的 7 个模块；发布脚本逐个核验
│  │  └─ cordis.patch.yml    空 []（只由 preset 挂载）
│  ├─ agent/           dsh-limix-agent   浏览器：工具卡 + 分析过程 + 本轮卡堆
│  │  ├─ src/index.ts        宿主半：空 apply（只占位，让 dsh.client 被扫描）
│  │  ├─ src/client/index.tsx  注册 3 个槽：toolview(key=limix)、conversation.view、chat.turnTail
│  │  ├─ src/client/LimixToolCard.tsx     单次调用卡（任务 + 指标 + 折叠详情）
│  │  ├─ src/client/LimixPipelineView.tsx 「分析过程」：按请求顺序呈现业务步骤，输入/执行/结果按需展开
│  │  ├─ src/client/pipeline-{model,stage,flow}.ts 分轮、单步翻译与业务流程归并
│  │  ├─ src/client/LimixTurnStack.tsx    本轮任务摘要（类型 + 指标 + 样本数）
│  │  ├─ src/client/LimixWelcome.tsx      空白 LimiX 会话开场白与示例
│  │  ├─ src/client/tool-result.ts        卡片与摘要共用的输出展示模型
│  │  ├─ src/client/Explanation*.tsx      解释卡：热力图、逐样本、筛选、关系图、全屏、导出
│  │  ├─ src/client/BenchmarkView.tsx     模型比较结果
│  │  └─ src/client/{ForecastChart,ScatterChart,ConfusionMatrix}.tsx
│  ├─ data/            dsh-limix-data    全局设置页/路由 + preset 可调用的工具工厂
│  ├─ preset/          dsh-limix-preset  cordis.patch.yml 声明 preset-limix（30 行插件）
│  └─ brand/           dsh-limix-cover   封面 + 侧边栏（priority -1 抢官方槽位）
├─ benchmarks/           公开数据、固定拆分与多模型比较
├─ reviews/              交叉审查与离线复现记录
├─ scripts/release.mjs   构建与核验五包
├─ dist/v<版本>/         npm pack 产物、manifest.json、SHA256SUMS（发布用）
├─ release.sh            发布入口；不上传
├─ NOTES.md              0.2.1 移植约束与验证记录（更细的技术笔记）
├─ INSTALL.md            同事安装说明
├─ USER-ACCEPTANCE.md    换机验收计划
└─ HANDOVER.md           本文
```

---

## 5. 构建

```bash
# 一次性：把工具链软链进来（DeepSeek_Harness 检出里有 tsdown/react/@types）
NM=~/Desktop/Projects/DeepSeek_Harness/packages/limix-ui/node_modules
ln -sfn "$NM" ~/Desktop/Projects/Coffee/limix-dsh/packages/agent/node_modules
ln -sfn "$NM" ~/Desktop/Projects/Coffee/limix-dsh/packages/tool/node_modules
ln -sfn ~/Desktop/Projects/DeepSeek_Harness/packages/limix-datasource/node_modules \
  ~/Desktop/Projects/Coffee/limix-dsh/packages/data/node_modules

# agent（浏览器半）
cd ~/Desktop/Projects/Coffee/limix-dsh/packages/agent && ./node_modules/.bin/tsdown
# → lib/index.js（宿主座位）+ lib/client.js（浏览器 bundle，约 200KB）

# tool（宿主半）
cd ../tool && ./node_modules/.bin/tsdown
# → lib/index.js（约 26KB，零 @deepseek-ai 依赖）
```

没有 DeepSeek_Harness 检出的机器按 README 运行 `npm install`。npm 会把软链换成真实目录；已在干净克隆验证可构建。

`tsdown.config.ts` 的关键点：
- 浏览器半必须产成 `window.__ModuleLoader__.load({ id: '<包名>', factory: (require) => { ... } })` 的 CJS 闭包（banner/footer/intro 三件套，照抄现有配置，`id` 必须等于包名）
- external 白名单 = 宿主平台模块表（react 等）；其余全部内联
- 宿主半 `platform: 'node'`、format esm，不要 external 任何 `@deepseek-ai/*`（见 3.1）

---

## 6. 安装 / 卸载

```bash
# 装五个包（target 用绝对路径）
# 通过 DSH 工具：
plugin_manager(action="install_bundle", target="/Users/limitless/Desktop/Projects/Coffee/limix-dsh/packages/tool")
# 同样方式装 preset / agent / data / brand
```

- `install_bundle` 返回里的 `application` 字段才是判据：`applied` = 生效；`restart-required` = 让用户重启
- 已装过的包再装会返回 `already-installed`，此时要改配置就只能改文件 + 重启
- 卸载用 `remove_bundle`（带包名）
- 装完的包在 `~/.dsh/profiles/desktop/node_modules/` 里是 symlink（`link:` 协议），所以**改文件就等于改线上包**

> 审批为 `never` 时以上全部会被拒绝。此时的工作方式：改文件 → 让用户重启 → 用 GUI 验证。

---

## 7. 验证（有 computer use 更好）

### 7.1 手动（推荐）

1. 打开 GUI，模式菜单选 **LimiX Agent**，新开会话
2. 发：`用 limix 跑回归：训练集 limix-test/train.csv，预测集也用 limix-test/train.csv，目标列 price`（预测集**必须带目标列**，否则没有真值就没有指标）
3. 看三处：
   - **工具卡**：标题「LimiX 开放平台」+ 完成/失败 + 命令行 + 3 行关键字段 + 「▼ 还有 N 个字段」
   - **结果卡与轮次摘要**：结果卡优先显示任务、指标和样本数；本轮摘要逐行列出任务。数值与工具 `metrics` 一致。任务 ID、命令、原始输出折叠在「调用详情」中。
   - **分析过程**标签：按轮次展开调用管线（阶段耗时、失败节点红框、并行组）
4. 换回标准模式新开会话：确认工具清单里**没有** `limix` / `datasource`

### 7.2 无 GUI 时（我在用的办法）

`_recon/gui-shot.js`：从 Electron 的 Cookies 库里读出 `dsh-auth-*` cookie，用 Playwright 以登录态打开 GUI、截图并 dump 文本。改一下里面的选择器就能复用到任意页面。

```bash
cd ~/Desktop/Projects/Coffee/_recon
node gui-shot.js out.png 7000        # 打开首页截图
node vt.js                            # 打开指定会话并 dump 文本（改脚本里的标题）
```

### 7.3 看会话日志（排障神器）

```bash
S=~/.dsh/sessions/--Users-limitless-Desktop-Projects-Coffee--/session-<id>
zstd -dc "$S/session.v4.jsonl.zstd" | grep -c metrics     # 输出里到底有没有指标
zstd -dc "$S/session.v4.jsonl.zstd" | tail -3             # 看最后几条记录
```
注意：`node zlib.zstdDecompressSync` 只能解第一帧，必须用 `zstd` CLI（`/opt/homebrew/bin/zstd`）。

---

## 8. 当前状态

### 已完成并验证

- LimiX Agent preset 上线，模式菜单可选；标准模式无 limix/datasource（已用 Tool inspect 核对）
- 本轮任务摘要：逐行展示类型、指标和样本数；移除牌堆交互及任务 ID。
- 工具卡默认 3 行字段 + 「还有 N 个字段」折叠
- 分析过程视图（0.2.1 的 `useTrajectory.eventNodes` 修复）
- CLI 指标计算：`metrics{n,mae,rmse,r2,mape}`，分类为 `accuracy`；**不传 `-o` 也会算**（临时文件 → 算完删除）
- persona 已约束：指标必须有真值才给、只引用工具返回的 `metrics`、禁止自己用脚本重算
- 工具卡按任务类型挑字段：预测类优先 `任务ID/状态/结果行数`，`check` 优先权限三元组，其余折叠

**最近一次真实验证（2026-10-30 22:30，Asia/Shanghai）**：重启 DSH，LimiX Agent 新会话用 160 行训练 / 40 行评估，不传 `-o`：
`metrics = {"n": 40, "mae": 12.6473, "rmse": 14.6387, "r2": 0.9992, "mape": 0.755}`。
任务卡实测显示 **`0.9992 R²`**，截图在 `../_recon/t1-fixed.png`。

**纠正此前满分记录**：旧 CLI 优先选择结果中的 `price` 真值列，与评估真值自身比较，因此得到错误的 R²=1 / MAE=0。不能用“合成数据”解释该分数。现改为表格任务读取 `pred_label`，时序读取 `pred_<target>`；旧会话记录不会自动修正。

**数据源验收（22:35–22:39）**：设置页已恢复。用临时本地 MySQL 9.3.0 的只读账号完成新增、连接成功、保存、刷新后读取、错误密码报错、删除后保存。临时配置与数据库进程已清理。PostgreSQL 实例连接本轮未测。

### 待办 / 已知问题

1. **T1 已通过**：修复预测列误选后，新任务卡显示 `0.9992 R²`。旧满分输出无效，不可引用。
2. **指标卡已简化**：仅从 CLI JSON 的 `metrics` 读取有限数值；删除转义/正则兜底，消除缺指标时引用未定义变量的错误。缺指标时显示任务状态。
3. **T2 已通过**：data 设置与路由全局挂载，工具工厂由 preset 调用。标准模式请求有 37 个工具且无 limix/datasource；LimiX 有 39 个且两者调用成功。
4. **limix-gtm 安装入口页尚未创建**（见 §8.5），负责人暂缓，先不做。
5. T7 尚未实施。当前 data 包配置数据库连接；`csvRoots` 属于 tool 包，实施前需核对原任务的配置归属。

---

## 8.6 接手任务单（按优先级）

> 每一项都带验收标准。做完一项就更新本节状态，不要留「应该好了」的模糊结论。

| # | 任务 | 怎么做 | 验收标准 |
|---|---|---|---|
| **T1 ✅** | 复测卡片指标渲染 | 重启 DSH → 新会话（LimiX Agent）→ 发「用 limix 跑回归：训练集 `limix-test/holdout_train.csv`，预测集 `limix-test/holdout_eval.csv`，目标列 price」 | 已验证新任务显示 `0.9992 R²`，与修正后的工具指标一致，不再是「已完成」；**若仍失败，先跑 §7.3 的 `zstd -dc … \| grep metrics` 确认输出里有无 `metrics`，再定位是 CLI 还是解析** |
| **T2 ✅** | 验证数据源设置页 | 重启后进 设置 → 数据源，看页面是否渲染、能否新增连接/测试 | 已修复入口缺失；新增/保存/刷新/连接成功与失败均实测，使用本地 MySQL 只读账号 |
| **T3 ✅** | 删除无用指标兜底 | 从日志取一条真实工具输出，按它的实际结构改 `LimixTurnStack.tsx` 的解析；删掉无用的兜底层 | 实际节点文本含 JSON 与 stderr；仅 metrics 供数，4 项组件回归测试通过 |
| **T4 ✅** | LimiX 模式专用开场白 | 在 `conversation.input.dock` 注册引导，用 session.blank 与 agentPreset=limix 隔离 | 已实测三个示例只填草稿；切到标准模式后立即消失，刷新后仍隔离；发送消息后引导消失 |
| **T5 ✅** | `/limix-predict` 命令 | 用 preset 内命令插件串起上传、预测、下载与指标 | 原生桌面已验证回归、分类和时序；支持本地真值评估、区间曲线与 CSV 下载 |
| **T6** | 工具裁剪（**需负责人拍板**） | 评估从 preset 移除 `workflow` / `subagent` / `tool-schedule` 是否影响真实用法 | 拍板后改 `packages/preset/cordis.patch.yml`，重启验证；**未拍板不要动** |
| **T7** | 数据源默认配置 | 给 `packages/data` 的 `csvRoots` / `samplesDir` 补默认值（参考原 `limix-ui` 的 `dshHomePath()` 写法） | 新装用户无需手填即可在设置页看到默认目录 |

### 2026-10-30：T4 与界面打磨验收

- 首屏：选择工作区后，空白 LimiX 会话显示开场白与销量预测、客户分层、电价预测。未选择工作区时沿用宿主提示。
- 示例：逐个点击，文本准确填入输入框；不会自动发消息。
- 模式：LimiX → 标准 → LimiX，首屏引导随模式切换；标准模式刷新后仍无引导。
- 结果卡：显示任务、状态、指标、样本数与已保存文件；ID 和命令只在详情中出现。
- 新实调完成价格预测并保存 `../limix-test/t4-price-result.csv`；「打开结果」已打开真实表格预览。
- 品牌：官方仓库核对图形与专用字标，复用产品透明底完整标志；来源见 `packages/brand/assets/SOURCES.md`。
- 本机 brand 链接仍指向 `../limix-cover`，对应源码、素材和浏览器产物已同步。未修改 profile 配置。
- 交互：详情按钮的鼠标与 Enter 键均可展开；760 px 窗口无横向溢出；收起侧栏后独立图标正常显示。
- 桌面原生窗口也已确认新结果卡及正确指标显示。
- 检查：10 项组件回归测试、TypeScript 检查、agent 构建、brand 构建与静态烟测通过。
- 截图：`../_recon/t4-welcome.png`、`t4-standard.png`、`t4-card-final.png`。
- 本轮为本机验证，没有发布 Release。

### 2026-10-31：T5 本机验收

- 在原生桌面输入 /limix-predict，按引导指定 holdout_train.csv、holdout_eval.csv 和 price。
- 一次 regress 调用完成两份文件上传、异步预测、轮询和结果保存。
- 实测 40 行评估数据：R² 0.9992、MAPE 0.755%、MAE 12.6473、RMSE 14.6387。
- 散点图与指标卡同时显示，结果保存在 ../limix-price-20261031T111420.csv。
- 点击“下载 CSV”，在系统保存窗口确认；Downloads 中的文件与原结果逐字节一致。
- 重启应用后，同一会话的散点图与下载入口正常恢复。
- 标准模式不列出此命令；宿主将未知斜杠文本按普通消息发送，未执行本插件命令。
- 空命令引导已补充：不扫描工作区找样例，由 Agent 判断任务类型；合成数据不代表业务效果。
- 22 项测试通过：8 项 Python 指标测试、4 项宿主契约测试、10 项组件测试；TypeScript 和三个包构建通过。
- 截图：../_recon/t5-result-native.png、t5-command-entry.png。
- 首轮实测为回归；分类与时序的后续实测见下节。
- 未发布 Release。

### 2026-10-31：分类、时序与说明收起

- 删除回归图下重复指标和长段说明。指标说明改为按需展开。
- 分类卡默认收起各类别表现。鼠标展开、收起已在桌面验证。
- 新增 --truth；独立真值只参与本地评估，不进入上传或预测请求。
- 时序真值按日期逐行核对。不一致时不计算指标或叠加实际曲线。
- 时序图显示历史、预测、实际值与 P10–P90 区间。
- 首次时序测试发现 Agent 猜错区间参数。工具说明已补全 --quantile、--levels 和 --help。
- --context 直接限制历史长度；流程无需 pandas 或裁剪历史文件。
- 参数帮助独立显示，不再冒充预测完成或计入预测任务。
- 分类首轮：60 行，53 条预测正确，准确率 88.33%。独立标签来自 cls_answer.csv。
- 分类复测仍为 88.33%，无失败调用；结果为 ../limix-grade-20261031-1142.csv。
- 时序：最近 90 天预测未来 30 天；日期为 2025-05-31 至 2025-06-29。
- 时序指标：R² 0.355、MAPE 2.083%、MAE 2.956、RMSE 3.626。
- 时序结果：../limix-sales-20261031-1140.csv，含点预测与 P10/P50/P90 列。
- 分类与时序的系统下载文件均已与原结果逐字节核对。
- 31 项测试通过：11 项 Python、4 项宿主、16 项组件；TypeScript 和构建通过。
- 截图：../_recon/t5-classification-verified.png、../_recon/t5-forecast-verified.png。
- Agent 文字回复仍会重复表格；当前以提示词约束，工具卡已默认精简。
- 测试使用合成数据；分数不代表真实业务效果。未发布 Release。

### 2026-11-01：分析过程业务流程改版（fix/analysis-process-view，未发版）

- 页面采用单一业务流程，替代简略版/详细版。按实际顺序展示数据处理、分类/回归/时序预测、因果解释、模型比较与报告输出。
- 本地操作按业务步骤归并。摘要写实际动作与产物；结果节点区分预测核对和归因解读。报告分别标明保存与修订。
- 因果解释沿用 API 口径：局部归因、全局因果·有向、全局因果·无向。结果卡与关系图同步名称。
- 输入、配置、执行内容和结果按需展开。原始参数和输出再折叠一层；不展示模型思考，不截取回复充当结论。
- 紧凑行布局将结果入口置于右侧；LimiX 使用浅蓝底标签，报告行轻量强调。1512×838 下示例会话的报告输出位于首屏。
- 文件按会话 cwd 去重，通过宿主会话授权地址预览。结果图表复用 LimixToolCard，点击后才挂载。
- CLI 补充解释状态变化、保存路径、实际模型与比较提交日志；续查不冒充新提交。错误解析支持进度日志末尾的 JSON；旧会话缺失步骤不补写。
- 验证：70 项 agent 测试、52 项 CLI 测试、13 项暂存快照的宿主契约/取消测试、TypeScript 检查与 agent 构建通过。
- 真实历史会话验证默认收起、鼠标/键盘展开、局部归因热力图、Markdown/HTML 预览；760px 宽流程无横向溢出。
- 最新页面截图：`../_recon/pipeline-flow-brand-tag.png`（本地证据，未纳入仓库）。
- 边界：未重新发起生产预测。benchmark Python 完整套件因运行时缺少 scikit-learn 未通过；运行态、失败、分类/时序与三种解释模式由自动化测试覆盖。

### 每天开工前的固定检查

```bash
# 1) 环境对不对
echo $DSH_PROFILE $DSH_WEB_URL          # 期望 desktop / http://127.0.0.1:<port>
cat ~/.dsh/profiles/desktop/package.json | grep -A12 bundles

# 2) 你改的包是不是 link 安装（是的话改文件即改线上）
ls -l ~/.dsh/profiles/desktop/node_modules | grep limix

# 3) 构建产物是否比源码新
ls -la packages/agent/lib/client.js packages/agent/src/client/*.tsx | head
```

---

## 8.5 交付流水线

五个包使用同一套件版本，以各包 `package.json` 为准；brand 不再使用独立版本线。

1. 完成离线测试、真实接口调用、界面验收和独立审查。
2. 同步五个 package.json、README.md、INSTALL.md 与验收记录。
3. 运行 `./release.sh`，核验五个 tarball 的安装入口和 CLI 模块。
4. 提交源码与构建产物，再运行 `./release.sh`。
5. 确认 `dist/v<版本>/manifest.json` 的 source_commit 指向该提交，source_dirty 为 false。
6. 推送提交和 `v<版本>` 标签，创建 GitHub Release。
7. 上传五个 tarball、SHA256SUMS 和 manifest.json，下载后复核摘要。

发布器只构建与核验，不提交 Git，不上传附件。禁止使用 dist 根目录的历史包混发。

limix-gtm 安装页面是独立工作，不属于本次插件版本的发布范围；尚未建设，不声称已经完成。

---

## 9. 典型任务怎么做

**加一个新的 limix 子命令**
1. `packages/tool/assets/limix.py` 里加 argparse 子命令 + 实现
2. `packages/tool/src/host/tool.js` 的 `COMMANDS` 数组和 `DESCRIPTION` 同步
3. 无需重建（py 是运行时文件），刷新页面即可；如果改了 `tool.js` 才需要 `tsdown` + 重启

**加一种卡片内容**
1. 改 `packages/agent/src/client/LimixTurnStack.tsx`（本轮卡）或 `LimixToolCard.tsx`（单次卡）
2. `cd packages/agent && ./node_modules/.bin/tsdown`
3. 刷新页面验证；不需要重启

**改 preset 的插件清单**
1. 改 `packages/preset/cordis.patch.yml`（注意：这是完整重述，不是增量）
2. 重启 DSH
3. 用模式菜单验证；旧会话不受影响，必须开新会话

---

## 10. 排障手册

| 现象 | 原因 | 修法 |
|---|---|---|
| preset 卡片显示「加载失败」+ 具体报错 | preset 里某行插件激活失败 | 按报错定位；`duplicate exact route` = 同一包挂了两次（见 3.5） |
| 模式菜单里没有 LimiX Agent | preset 声明未进 roster | 重启；仍无则查 `~/.dsh/profiles/desktop/package.json` 的 bundles 和 preset 的 patch |
| 分析过程空白 | 用了 `useSession().nodes` | 换成 `useTrajectory().eventNodes`（见 3.4） |
| 卡片显示「已完成」而非指标 | 输出里没有有效 `metrics` | 先查日志；真值缺失时不报指标是正常行为 |
| `limix CLI 未找到` | 包内 `assets/limix.py` / `assets/limix_metrics.py` 缺失或被改坏 | 用 `LIMIX_CLI_PATH` 覆盖，或从仓库恢复 |
| 装了没反应 | 改的是 bundle/patch 层但没重启 | 重启 DSH |
| 401 / 未授权 | GUI 的 cookie 绑定端口 | 换端口后要重新从 Cookies 库取 |
| pnpm 报 peer 警告 | 包声明了未装 peer | 删掉 `peerDependencies`（`packages/data` 已清） |

---

## 11. 不要做的事

- **不要改 `/Applications/DeepSeek Harness.app` 里的任何文件**：app.asar 有 SHA256 完整性校验 + Developer ID 签名，改了直接起不来，升级也会覆盖
- **不要在 profile 层直接手写 `cordis.patch.yml` 或 `package.json`**：用 `plugin_manager`；手写容易和 bundle 层冲突（3.5）
- **不要给宿主半 import `@deepseek-ai/*`**（3.1）
- **不要给同一个包挂两行**（3.2）
- **不要假设旧会话会更新**：preset / 插件修订只对新会话生效
- **不要在没看日志的情况下反复改解析**：先 `zstd -dc ... | grep metrics` 确认数据到底在不在

---

## 12. 联系点

- 仓库：https://github.com/Limitless2023/limix-dsh（公开）
- 发布：`./release.sh` 在 dist/v<版本>/ 生成五个 tarball、manifest.json 与 SHA256SUMS；提交后重建，再上传对应版本目录
- 上一版交接记录（更细的 0.2.1 差异）：`NOTES.md`
