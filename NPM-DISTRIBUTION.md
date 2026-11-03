# LimiX 五插件 npm 分发

当前套件版本：**0.3.13**。五包统一更新，咨询推断的已知问题见 [提示词验收记录](docs/PROMPT-EVALUATION.md)。GitHub Release tgz 分发继续保留。

## 发布方案

保留五个包名：`dsh-limix-data`、`dsh-limix-tool`、`dsh-limix-agent`、`dsh-limix-preset`、`dsh-limix-cover`。五包统一版本；npm 与 GitHub Release 使用同一批 tgz，SHA256SUMS 校验这些文件。

0.3.10 的 npm 首装与 tgz 迁移验证保留为历史记录；本次使用新版本 0.3.13，避免同一版本存在不同包内容。发布前从干净提交打包，并核对源码提交与包清单。

五包没有互相声明 npm 依赖，需一次安装全部五包。preset 在 LimiX 模式中加载 tool；tool 的空 bundle patch 是有意设计，不额外挂载全局工具。data 保留 mysql2、pg 运行依赖；其余包随包提供构建产物，使用者无需编译。不会打包另一份 Harness。

五包已由 npm 账号 `limix2026` 发布。自有代码采用 PolyForm Noncommercial 1.0.0；商业授权与第三方权利见 [许可说明](LICENSING.md)。

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

## 安装、更新与迁移

先完全退出 DeepSeek Harness。在终端执行以下**一条命令**，安装五个同版本插件：

```sh
dsh plugin --profile desktop add --save-exact --registry=https://registry.npmjs.org/ dsh-limix-data@0.3.13 dsh-limix-tool@0.3.13 dsh-limix-agent@0.3.13 dsh-limix-preset@0.3.13 dsh-limix-cover@0.3.13
```

macOS 若使用上方 `DSH` 变量，把命令开头 `dsh` 换成 `"$DSH"`。Web 用户将 `desktop` 换成实际使用的 profile，例如 `web`。不要新建 profile 代替原 profile，否则会看不到原来的插件与配置选择。

**升级和从 tgz 迁移：运行同一条命令。** 同名包会替换原版本，原 `file:...tgz` 依赖改为固定 npm 版本。无需先卸载插件，无需删除数据源或重新配置 API Key。不要使用 `--from-default-profile`，它会重置 profile。

升级前备份自己的 DSH_HOME 和 `~/.limix/config.json`，备份仅留本机。默认 DSH_HOME 为 `~/.dsh`；自定义环境应使用原路径。数据源存于 `DSH_HOME/limix-datasource.json`；API Key 使用 `LIMIX_API_KEY` 或 `~/.limix/config.json`。环境变量必须对实际启动 DSH 的进程可见。

重启后，在“插件”确认五包均为 0.3.13；进入“设置 → 数据源”检查已有连接；新建会话选择 LimiX Agent，执行服务连接检查。标准模式默认选择会保留。历史会话仍沿用自己的预设。

命令行核对：

```sh
dsh plugin --profile desktop list --depth 0
```

未来更新时，将五处版本号同时换成发布说明中的同一版本。不要分别追逐 `latest`，避免五包不同步。npm 五包发布不是原子操作，只有五包全部发布并验收通过，才对外宣布可安装。

GitHub tgz 安装继续支持：从对应 Release 下载五个文件，在“插件 → 添加插件”逐个安装；也可在上述 `add --save-exact` 后传五个 tgz 的绝对路径。回退时同样安装完整上一版五包，不清空配置。

## 验证范围

公共 npm 0.3.13 五包下载与 GitHub Release 的 SHA256 一致。独立环境已验证公共 npm 首装和 0.3.9 tgz 迁移；0.3.10→0.3.11、0.3.11→0.3.12 和本次 0.3.12→0.3.13 已完成公共 npm 跨版本升级验证；五包版本、标准模式选择与数据源配置保留通过。本轮没有重做首次安装或 tgz 迁移。配置保留不等于验证数据库真实连接。

详细历史结果、peer 提示和未验收项见 [分发审查](reviews/npm-distribution-review.md)。Windows、第二台电脑及隔离环境的真实预测和数据库查询尚未验收。报告仍需人工审阅；光学 20 变量无向解释上游错误未修复。

## 维护者发布步骤

1. 核对 LICENSING.md 与五包许可文件，登录有发布权限的 npm 账号。
2. 将确认后的元数据提交；在干净提交运行 `./release.sh`，再运行 `node scripts/npm-preflight.mjs`。清单必须 `source_dirty: false`。
3. 用户批准后，发布这批已经核验的五个 tgz；不要临时从目录重新打出不同内容。
4. 从公共 npm 按固定版本安装到新 profile，核对五包版本与 tarball integrity，再创建对应 GitHub Release，上传同一批 tgz、manifest 和 SHA256SUMS。
5. 两种渠道均可用后，将上方安装说明同步到 GTM 和飞书。

公共 npm 验收记录在 reviews/npm-distribution-review.md 更新。对外安装页面应引用本文的同版本安装指令。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
