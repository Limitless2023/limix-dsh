# dsh-limix

LimiX 的 DSH（DeepSeek Harness）插件套件：把 LimiX 开放平台的预测能力、它的调用过程视图，以及 LimiX 品牌外观装进 DSH。

三个包各自独立安装、独立开关：

| 包 | 装了什么 | npm 依赖 | 前置条件 |
|---|---|---|---|
| `dsh-limix-agent` | `limix` 工具（13 个子命令：上传 → 分类/回归/时序 → 轮询 → 下载）+ 工具结果卡片（时序曲线 / 混淆矩阵 / 回归散点）+「分析过程」视图 + `/limix-ui/csv` 只读路由 | 零 | `~/.limix/config.json` 凭据、`python3` |
| `dsh-limix-data` | `datasource` 工具（NL2SQL，三闸只读）+ 设置页数据源管理 | `pg`、`mysql2` | 一个可读的数据库 |
| `dsh-limix-cover` | 空白会话封面 + 侧边栏品牌（LimiX 标 + 文案） | 零 | 无 |

## 安装

在 DSH 的 Web GUI 里用「插件 → 添加插件」，或让 agent 调 `plugin_manager`（`action: install_bundle`，`target` 给包的绝对路径 / tarball URL / npm spec / git spec）。

本机开发时直接指目录：

```
plugin_manager install_bundle  target = /绝对路径/limix-dsh/packages/agent
```

发布版用 Release 里的 tarball（见 [INSTALL.md](INSTALL.md)，里面有一段可以直接发给同事的 prompt）。

## 验证

- 插件页出现对应条目（`LimiX Agent` / `LimiX Data` / `LimiX 品牌封面`），开关为开
- 新会话里输入 `用 limix 做一次健康检查`，应出现一张 limix 工具卡
- 会话视图栏出现 **分析过程**
- 数据包：设置 → 数据源，能新增连接并「测试连接」

## 卸载

`plugin_manager`（`action: remove_bundle`）或插件页里关掉/卸载。品牌包卸载后封面与侧边栏恢复 DeepSeek 默认。

## 结构

```
packages/agent/   dsh-limix-agent   （宿主：工具 + csv 路由 / 浏览器：卡片 + 分析过程）
packages/data/    dsh-limix-data    （从 limix-datasource 移植）
packages/brand/   dsh-limix-cover   （已有）
```

每个包自带 `cordis.patch.yml`（安装即挂载）、`locale/*.json` + `icon`（插件页显示）、`lib/`（构建产物，安装时无需构建）。

## 构建

```bash
cd packages/agent && pnpm install && pnpm build     # tsdown → lib/index.js + lib/client.js
cd packages/brand && node build.mjs                 # 无依赖
```

## 已知边界

- **`limix-data-agent`（`/data-source` 数据中心 fork）没有收进这套**：它在 module scope import 了 `@deepseek-ai/dsh-storage` / `-domain` / `-json` / `dsh-credentials`，树外插件在 profile 里解析不到这些宿主内部包；装成 npm 依赖会得到第二份服务类。见 [NOTES.md](NOTES.md)。
- 案例库（`/cases`、`/limix-ui/samples`、`/limix-ui/case`）已按分发范围裁掉，保留 `/limix-ui/csv`。
- 「分析过程」视图读 `useSession` 的 `nodes` / `runningCalls`；DSH 若改这两个投影字段，视图会退化为空态（不会白屏）。
