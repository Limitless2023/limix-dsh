# LimiX 五插件 npm 分发准备

状态：**0.3.10 候选包尚未发布 npm**。当前公开版本是 GitHub Release v0.3.9。本文件中的 0.3.10 命令须在发布获批、五包均可从公共 npm 下载后使用。

## 发布方案

保留五个包名：`dsh-limix-data`、`dsh-limix-tool`、`dsh-limix-agent`、`dsh-limix-preset`、`dsh-limix-cover`。五包统一版本；npm 与 GitHub Release 使用同一批 tgz，SHA256SUMS 校验这些文件。

0.3.9 已发布，本次 npm 准备另用 0.3.10，避免同一版本存在不同包内容。候选代码保存在 `npm-distribution-prep` 分支，未合并到正式版。

五包没有互相声明 npm 依赖，需一次安装全部五包。preset 在 LimiX 模式中加载 tool；tool 的空 bundle patch 是有意设计，不额外挂载全局工具。data 保留 mysql2、pg 运行依赖；其余包随包提供构建产物，使用者无需编译。不会打包另一份 Harness。

包名在 2026-11-02 查询公共 registry 均不存在。这不代表已保留名称或已取得发布权限。当前 npm 登录检查返回 E401，发布前需使用有权限的账号登录；不要在聊天中发送 token。

四包尚无许可证声明，cover 保留已有 MIT。本次没有擅自给其余代码添加开源授权。**发布前必须确认许可证和发布账号。**

## 支持条件

- 最低支持及验收版本：**DeepSeek Harness 0.2.1-rc.5**。五包顶层声明 `engines.dsh: >=0.2.1-rc.5`。rc.4 与 0.2.0 被宿主兼容检查拒绝；不建议绕过检查。未声称已对全部后续版本验收。
- 使用同一套 Harness 安装附带的 CLI。先执行 `dsh --version`，确认没有指向旧版全局 CLI。
- Python 3.12+；首次使用比较功能需要能访问 PyPI，插件会准备独立依赖环境。
- 已有 API Key、数据源配置继续沿用。插件安装不等于获得 LimiX 或 DeepSeek 服务凭据。
- 桌面版先正常启动一次，再完全退出应用后运行安装或更新命令；完成后重新打开。

macOS 可直接使用桌面附带的 CLI，避免 PATH 中旧版 CLI：

```sh
DSH='/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh'
"$DSH" --version
```

其他平台使用安装时配置的 `dsh` 命令；本轮未做 Windows 实机验收。

## 可供 GTM 与飞书使用的安装说明（发布后启用）

先完全退出 DeepSeek Harness。在终端执行以下**一条命令**，安装五个同版本插件：

```sh
dsh plugin --profile desktop add --save-exact --registry=https://registry.npmjs.org/ dsh-limix-data@0.3.10 dsh-limix-tool@0.3.10 dsh-limix-agent@0.3.10 dsh-limix-preset@0.3.10 dsh-limix-cover@0.3.10
```

macOS 若使用上方 `DSH` 变量，把命令开头 `dsh` 换成 `"$DSH"`。Web 用户将 `desktop` 换成实际使用的 profile，例如 `web`。不要新建 profile 代替原 profile，否则会看不到原来的插件与配置选择。

**升级和从 tgz 迁移：运行同一条命令。** 同名包会替换原版本，原 `file:...tgz` 依赖改为固定 npm 版本。无需先卸载插件，无需删除数据源或重新配置 API Key。不要使用 `--from-default-profile`，它会重置 profile。

升级前备份自己的 DSH_HOME 和 `~/.limix/config.json`，备份仅留本机。默认 DSH_HOME 为 `~/.dsh`；自定义环境应使用原路径。数据源存于 `DSH_HOME/limix-datasource.json`；API Key 使用 `LIMIX_API_KEY` 或 `~/.limix/config.json`。环境变量必须对实际启动 DSH 的进程可见。

重启后，在“插件”确认五包均为 0.3.10；进入“设置 → 数据源”检查已有连接；新建会话选择 LimiX Agent，执行服务连接检查。标准模式默认选择会保留。历史会话仍沿用自己的预设。

命令行核对：

```sh
dsh plugin --profile desktop list --depth 0
```

未来更新时，将五处版本号同时换成发布说明中的同一版本。不要分别追逐 `latest`，避免五包不同步。npm 五包发布不是原子操作，只有五包全部发布并验收通过，才对外宣布可安装。

GitHub tgz 安装继续支持：从对应 Release 下载五个文件，在“插件 → 添加插件”逐个安装；也可在上述 `add --save-exact` 后传五个 tgz 的绝对路径。回退时同样安装完整上一版五包，不清空配置。

## 本次验收

使用独立 `DSH_HOME` 和 `npm-fresh`、`npm-upgrade`、`tgz-migration` 三个 profile；未修改日常使用的 desktop profile。测试 registry 只监听本机，只有读取接口，不接受发布。

| 项目 | 结果与范围 |
| --- | --- |
| npm 首次安装 | 本地 registry 安装五个 0.3.10 包；独立 DSH 启动，插件页显示五包，tool 详情显示 npm 包名与版本。 |
| npm 升级 | 0.3.8 → 0.3.10；五包版本一致、bundle 无重复、宿主组合配置通过。 |
| tgz 转 npm | 分别安装 0.3.8 和 0.3.9 tgz，再安装 npm 0.3.10；依赖由 file 路径改为精确版本，重启成功。 |
| API Key 保留 | 安装后的真实 CLI 凭据读取器识别测试环境 Key；真实 `~/.limix/config.json` 前后哈希不变。未向服务发送测试 Key。 |
| 数据源保留 | 配置文件字节不变；重启后设置页仍显示测试连接，配置路由返回 200。此项验证配置保留，未连接该虚拟数据库。 |
| 默认模式保留 | profile 中 standard 选择未改写；重启后新会话显示 Standard mode。 |
| 最低版本 | 当前 rc.5 实际启动；调用宿主原生兼容检查，rc.4 与 0.2.0 被拒绝。 |
| 打包内容 | 五包入口/资源/Python 模块、版本、哈希、公开发布配置检查通过；无 node_modules、缓存、环境文件或本机绝对路径。 |
| 发布预演 | 五包 `npm publish --dry-run --ignore-scripts --json` 通过；没有实际 publish。 |

mysql2 解析到 3.24.6 时，pnpm 提示缺少类型 peer `@types/node`。它不影响已验证的 JavaScript 宿主加载和数据源配置页，本次保留记录，未给使用者强加 TypeScript 开发依赖。

**未验收：**公共 npm 发布后的下载与安装权限、Windows/第二台电脑、独立环境中的真实预测和数据库查询。已有 UI 真实调用与 v0.3.9 完整回归另见 UI review。报告仍需人工审阅；光学20变量无向解释上游失败未修复。

## 维护者发布前步骤

1. 确认四包许可证、npm 账号与公开发布授权。
2. 将确认后的元数据提交；在干净提交运行 `./release.sh`，再运行 `node scripts/npm-preflight.mjs`。清单必须 `source_dirty: false`。
3. 用户批准后，发布这批已经核验的五个 tgz；不要临时从目录重新打出不同内容。
4. 从公共 npm 按固定版本安装到新 profile，核对五包版本与 tarball integrity，再创建对应 GitHub Release，上传同一批 tgz、manifest 和 SHA256SUMS。
5. 两种渠道均可用后，将上方安装说明同步到 GTM 和飞书；去掉“发布后启用”。

当前没有执行第3步，也没有修改线上 GTM 或飞书安装说明。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
