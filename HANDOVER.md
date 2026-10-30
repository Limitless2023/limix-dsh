# LimiX × DeepSeek Harness 插件：交接文档

> 读者：接手开发的人/Agent（此前没有接触过 DeepSeek Harness 的插件体系）。
> 目标：让你能独立完成「改代码 → 构建 → 安装 → 在 GUI 里验证」这个闭环。
> 最后更新：2026-10-30（DSH 0.2.1-rc.2）

---

## 1. 这套东西是什么

LimiX 是一个预训练的结构化数据基础模型（表格 / 时序预测，免训练免调参）。这套插件把 LimiX 接进 DeepSeek Harness（下称 DSH），让用户在 DSH 的对话里用自然语言跑预测，并且**看得见调用过程**。

交付形态（repo：`~/Desktop/Projects/Coffee/limix-dsh`，GitHub `Limitless2023/limix-dsh`）：

| 包 | 作用 | 装在哪 |
|---|---|---|
| `packages/tool` (`dsh-limix-tool`) | 宿主半：`limix` 工具（13 个子命令）+ `/limix-ui/csv` 只读路由 | **只在 LimiX Agent preset 下** |
| `packages/data` (`dsh-limix-data`) | 数据源工具 + 设置页 | **只在 LimiX Agent preset 下** |
| `packages/agent` (`dsh-limix-agent`) | 浏览器半：limix 工具结果卡 + 「分析过程」视图 + 本轮任务卡堆 | profile 层（全局 UI） |
| `packages/brand` (`dsh-limix-cover`) | 封面 + 侧边栏 LimiX 品牌 | profile 层（全局） |
| `packages/preset` (`dsh-limix-preset`) | 声明 `preset-limix`，即「LimiX Agent」模式 | profile 层（只声明，不挂功能） |

关键产品形态：DSH 的模式菜单里多一个 **「LimiX Agent」**。选中它的新会话才有 `limix` / `datasource` 工具；标准模式等其它模式完全没有这两个工具，但保留 bash/文件/web 等通用能力。

---

## 2. 环境

| 项 | 值 |
|---|---|
| DSH 应用 | `/Applications/DeepSeek Harness.app`（版本 0.2.1-rc.2，代码在 `Contents/Resources/app.asar` 里，**asar 有签名与完整性校验，不要改它**） |
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

同一个包若在两个层各挂一行，会得到 `webserver: duplicate exact route`（我们踩过）。所以 `packages/tool` 和 `packages/data` 的 `cordis.patch.yml` 是**空数组 `[]`**——它们只由 preset 挂载，profile 只把它们作为依赖装进来（保证 preset 能按名字解析）。

### 3.6 改动的生效方式

| 改什么 | 生效方式 |
|---|---|
| `lib/client.js`（浏览器半） | 刷新页面即可（HMR/新 bundle） |
| `lib/index.js`（宿主半） | 需要 Host 重载 → **重启 DSH** |
| `cordis.patch.yml` / preset 声明 | **重启 DSH** |
| `assets/limix.py` 等运行时文件 | 立即生效（每次调用时读） |

---

## 4. 代码地图

```
limix-dsh/
├─ packages/
│  ├─ tool/            dsh-limix-tool    宿主：limix 工具 + /limix-ui/csv 路由
│  │  ├─ src/index.ts        注册工具 + 路由；Config: csvRoots/cliPath/pythonBin
│  │  ├─ src/host/tool.js    工具定义（参数 schema、execute、输出 render）
│  │  ├─ assets/limix.py     ⭐ 自带 CLI（765+ 行，纯标准库）：13 个子命令 + 指标计算
│  │  └─ cordis.patch.yml    空 []（只由 preset 挂载）
│  ├─ agent/           dsh-limix-agent   浏览器：工具卡 + 分析过程 + 本轮卡堆
│  │  ├─ src/index.ts        宿主半：空 apply（只占位，让 dsh.client 被扫描）
│  │  ├─ src/client/index.tsx  注册 3 个槽：toolview(key=limix)、conversation.view、chat.turnTail
│  │  ├─ src/client/LimixToolCard.tsx     单次调用卡（命令 + 关键字段 + 原始输出）
│  │  ├─ src/client/LimixPipelineView.tsx 「分析过程」：按轮次展开调用管线
│  │  ├─ src/client/LimixTurnStack.tsx    本轮任务卡堆（叠压/平铺/牌堆）
│  │  └─ src/client/{ForecastChart,ScatterChart,ConfusionMatrix,eval-csv,forecast-csv}.tsx
│  ├─ data/            dsh-limix-data    数据源工具 + 设置页；patch 也是 []
│  ├─ preset/          dsh-limix-preset  cordis.patch.yml 声明 preset-limix（30 行插件）
│  └─ brand/           dsh-limix-cover   封面 + 侧边栏（priority -1 抢官方槽位）
├─ dist/                 pnpm pack 产物（发布用）
├─ release.sh            三个包打包到 dist/
├─ NOTES.md              0.2.1 移植约束与验证记录（更细的技术笔记）
├─ INSTALL.md            给同事 agent 的安装 prompt
└─ HANDOVER.md           本文
```

---

## 5. 构建

```bash
# 一次性：把工具链软链进来（DeepSeek_Harness 检出里有 tsdown/react/@types）
NM=~/Desktop/Projects/DeepSeek_Harness/packages/limix-ui/node_modules
ln -sfn "$NM" ~/Desktop/Projects/Coffee/limix-dsh/packages/agent/node_modules
ln -sfn "$NM" ~/Desktop/Projects/Coffee/limix-dsh/packages/tool/node_modules

# agent（浏览器半）
cd ~/Desktop/Projects/Coffee/limix-dsh/packages/agent && ./node_modules/.bin/tsdown
# → lib/index.js（宿主座位）+ lib/client.js（浏览器 bundle，约 80KB）

# tool（宿主半）
cd ../tool && ./node_modules/.bin/tsdown
# → lib/index.js（约 6.6KB，零 @deepseek-ai 依赖）
```

`tsdown.config.ts` 的关键点：
- 浏览器半必须产成 `window.__ModuleLoader__.load({ id: '<包名>', factory: (require) => { ... } })` 的 CJS 闭包（banner/footer/intro 三件套，照抄现有配置，`id` 必须等于包名）
- external 白名单 = 宿主平台模块表（react 等）；其余全部内联
- 宿主半 `platform: 'node'`、format esm，不要 external 任何 `@deepseek-ai/*`（见 3.1）

---

## 6. 安装 / 卸载

```bash
# 装（三个 profile 包 + preset；target 用绝对路径）
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
   - **本轮卡片堆**：一轮结束处，叠压显示任务卡，主数字应是 `1.0 R²`；点任意一张摊成列表；点列表任一行回到叠压；头部「牌堆」切扇形堆叠
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
- 本轮任务卡堆：阶梯叠压 + 点击平铺 + 牌堆开关 + 点行收起
- 工具卡默认 3 行字段 + 「还有 N 个字段」折叠
- 分析过程视图（0.2.1 的 `useTrajectory.eventNodes` 修复）
- CLI 指标计算：`metrics{n,mae,rmse,r2,mape}`，分类为 `accuracy`；**不传 `-o` 也会算**（临时文件 → 算完删除）

### 待办 / 已知问题

1. **指标链路最后一公里**：用户上一次新会话里工具输出仍无 `metrics`，原因是那次调用发生在「不传 -o 也算」修复之前。需在新会话里复测；若仍无，用 §7.3 的日志命令确认 `metrics` 有没有进输出，再决定是 CLI 还是卡片解析的问题。
2. **卡片指标解析**有 4 层兜底（深扫 depth 4 / 信封解包 `stdout` / 转义 JSON / 整节点字符串扫 `"metrics"`），若仍失败，以日志里的真实 JSON 为准重写解析，不要继续加兜底。
3. **`datasource` 拆到 preset 后，设置页「数据源」是否仍能打开**未验证（设置页是 profile 级的浏览器半，理论上不受影响）。
4. 工具卡还能再精简：目前是 3 行，「还有 N 个字段」的口径可以按任务类型定制（如预测类只留 任务ID/状态/输出文件）。
5. **limix-gtm 安装入口页尚未创建**（见 §8.5），这是「同事能自己装上」的最后一环。
6. 数据源包目前只在 preset 内挂载，`csvRoots` 等 Config 默认值仍是空——需要按真实使用补默认值。

---

## 8.5 交付流水线（验证通过后必须走完）

**验证通过 ≠ 交付完成。** 以下顺序不要跳步：

```bash
cd ~/Desktop/Projects/Coffee/limix-dsh

# 1) 改版本号（三个包一起改，保持同一版号）
#    packages/agent、packages/tool、packages/data → 0.1.5
#    packages/brand → 0.2.5（brand 自己一条版本线，历史原因）

# 2) 打包
./release.sh                       # → dist/*.tgz

# 3) 推送代码
git add -A && git commit -m "release: 0.1.5"
git push origin master

# 4) 发布 Release（附件就是 dist 里的三个 tgz）
gh release create v0.1.5 dist/*.tgz --title "v0.1.5" --notes "<本次改了什么>"

# 5) 同步安装说明里的 URL（必须改，否则同事装到旧版）
#    INSTALL.md 与 README.md 里的 v0.1.4 → v0.1.5、包文件名同步
git add -A && git commit -m "docs: point INSTALL at v0.1.5" && git push
```

### 更新到 limix-gtm（最后一步，别漏）

`~/Desktop/Projects/limix-gtm` 是给同事看的 Next.js 站点（含 `docs/`），**目前还没有「安装 LimiX DSH 插件」这个页面**，需要新增：

1. 在 limix-gtm 里新建一个安装引导页 / 区块，内容是：
   - 一段可直接复制给同事 Agent 的安装 prompt（源：本仓库 `INSTALL.md`）
   - 三个 tarball 链接（指向最新的 Release）
   - 三条验收标准（插件页有条目 / 说一句「用 limix 做一次健康检查」出工具卡 / 视图栏有「分析过程」）
2. 页面里**不要**内联技术细节（构建、槽位、preset 机制）——那些留在本仓库 HANDOVER，同事只看「怎么装、装完什么样」
3. 截图用真实运行截图，不要设计稿

> ⚠️ limix-gtm 的具体落点（`docs/` 下新增 md / `app/` 下新增路由 / 现有场景页加一节）**尚未定**，动手前先跟负责人确认，不要自行选位置。

### 完成判据

- [ ] Release 页有三个附件，版本号与包一致
- [ ] `INSTALL.md` / `README.md` 里的 URL 全部指向新版本（`grep -n "releases/download" INSTALL.md` 核对）
- [ ] limix-gtm 的安装入口可访问，链接可下载，prompt 可复制
- [ ] 用全新会话按 INSTALL.md 走一遍能装通（这是最终验收，不是本机灰度）

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
| 卡片显示「已完成」而非指标 | 输出里没有 `metrics` | 见 §8 待办 1；先用日志确认输出内容 |
| `limix CLI 未找到` | 包内 `assets/limix.py` 缺失或被改坏 | 用 `LIMIX_CLI_PATH` 覆盖，或从仓库恢复 |
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
- 发布：`./release.sh` 出三个 tarball；`gh release create vX.Y.Z dist/*.tgz`；改完记得同步 `INSTALL.md` 里的 URL
- 上一版交接记录（更细的 0.2.1 差异）：`NOTES.md`
