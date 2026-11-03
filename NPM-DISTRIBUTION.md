# LimiX 五插件 npm 分发

当前套件版本：**0.3.14**。五包统一更新，咨询推断的已知问题见 [提示词验收记录](docs/PROMPT-EVALUATION.md)。GitHub Release tgz 分发继续保留。

## 发布方案

保留五个包名：`dsh-limix-data`、`dsh-limix-tool`、`dsh-limix-agent`、`dsh-limix-preset`、`dsh-limix-cover`。五包统一版本；npm 与 GitHub Release 使用同一批 tgz，SHA256SUMS 校验这些文件。

0.3.10 的 npm 首装与 tgz 迁移验证保留为历史记录；本次使用新版本 0.3.14，避免同一版本存在不同包内容。发布前从干净提交打包，并核对源码提交与包清单。

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
dsh plugin --profile desktop add --save-exact --registry=https://registry.npmjs.org/ dsh-limix-data@0.3.14 dsh-limix-tool@0.3.14 dsh-limix-agent@0.3.14 dsh-limix-preset@0.3.14 dsh-limix-cover@0.3.14
```

macOS 若使用上方 `DSH` 变量，把命令开头 `dsh` 换成 `"$DSH"`。Web 用户将 `desktop` 换成实际使用的 profile，例如 `web`。不要新建 profile 代替原 profile，否则会看不到原来的插件与配置选择。

**升级和从 tgz 迁移：运行同一条命令。** 同名包会替换原版本，原 `file:...tgz` 依赖改为固定 npm 版本。无需先卸载插件，无需删除数据源或重新配置 API Key。不要使用 `--from-default-profile`，它会重置 profile。

升级前备份自己的 DSH_HOME 和 `~/.limix/config.json`，备份仅留本机。默认 DSH_HOME 为 `~/.dsh`；自定义环境应使用原路径。数据源存于 `DSH_HOME/limix-datasource.json`；API Key 使用 `LIMIX_API_KEY` 或 `~/.limix/config.json`。环境变量必须对实际启动 DSH 的进程可见。

重启后，在“插件”确认五包均为 0.3.14；进入“设置 → 数据源”检查已有连接；新建会话选择 LimiX Agent，执行服务连接检查。标准模式默认选择会保留。历史会话仍沿用自己的预设。

命令行核对：

```sh
dsh plugin --profile desktop list --depth 0
```

未来更新时，将五处版本号同时换成发布说明中的同一版本。不要分别追逐 `latest`，避免五包不同步。npm 五包发布不是原子操作，只有五包全部发布并验收通过，才对外宣布可安装。

GitHub tgz 安装继续支持：从对应 Release 下载五个文件，在“插件 → 添加插件”逐个安装；也可在上述 `add --save-exact` 后传五个 tgz 的绝对路径。回退时同样安装完整上一版五包，不清空配置。

## 验证范围

上一版公共 npm 0.3.13 五包下载与 GitHub Release 的 SHA256 一致。独立环境已验证公共 npm 首装和 0.3.9 tgz 迁移；0.3.10→0.3.11、0.3.11→0.3.12 和 0.3.12→0.3.13 已完成公共 npm 跨版本升级验证；五包版本、标准模式选择与数据源配置保留通过。本轮没有重做首次安装或 tgz 迁移。配置保留不等于验证数据库真实连接。

详细历史结果、peer 提示和未验收项见 [分发审查](reviews/npm-distribution-review.md)。Windows、第二台电脑及隔离环境的真实预测和数据库查询尚未验收。报告仍需人工审阅；光学 20 变量无向解释上游错误未修复。

本次 0.3.14 五包已发布到公共 npm，下载 SHA256 与发布包一致。独立环境完成 0.3.13→0.3.14 升级，五包版本、标准模式选择、数据源文件和凭据解析验证通过。本机日常 desktop 从 0.3.12 升至 0.3.14，API Key、数据源和服务凭据文件摘要未变，升级前 325 个会话文件保留，重启后原有工作区与会话可见。首次发布遇到 npm CDN 短暂 404 缓存，缓存过期后正常安装通过。

## 维护者发布步骤

1. 核对 LICENSING.md 与五包许可文件，完成代码和界面验收，五包统一使用新的版本号。已有 0.3.14 不可覆盖。
2. 用 Node 24、npm 11.15.0，在 data/tool/agent 目录分别运行 `npm ci --ignore-scripts`，重建 lib。提交锁文件、源码与构建产物，使再次构建后的工作树保持干净。
3. 用户批准后，按下方可信发布流程在 Actions 手动发版。若选择本机发布，仍须先在干净提交执行 `./release.sh` 和 `node scripts/npm-preflight.mjs`，并完成 npm 登录及二次验证。
4. 从公共 npm 按固定版本安装到新 profile，核对五包版本与 tarball integrity，再创建对应 GitHub Release。Actions 发版须上传该次运行归档中的五个 tgz、manifest 和 SHA256SUMS，不在本机重新打包。
5. 两种渠道均可用后，将上方安装说明同步到 GTM 和飞书。

公共 npm 验收记录在 reviews/npm-distribution-review.md 更新。对外安装页面应引用本文的同版本安装指令。

## npm 可信发布（五包信任已配置，尚未实发验证）

目的：一次配置包与 GitHub 工作流之间的信任，后续由 Actions 使用短期 OIDC 身份发布，不再逐次索要维护者的 Passkey。仍保留手动发版入口，不因 push、tag 或 PR 自动发布。

仓库：`Limitless2023/limix-dsh`。工作流：`.github/workflows/publish.yml`。npm 信任配置中的文件名只填 `publish.yml`，大小写须一致，不填完整路径。

工作流使用 GitHub 托管 Ubuntu runner、Node 24、npm 11.15.0。权限只有 `contents: read` 和 `id-token: write`；无需添加 `NPM_TOKEN`。不使用 GitHub Environment，配置 npm 信任时也不要额外填写 Environment。

### 首次配置，由包维护者在自己的终端执行

推荐 Node 24。用 `npm whoami` 确认账号有五包写权限；未登录时运行 `npm login`。下方命令通过 npx 固定使用 npm 11.15.0，避免系统 npm 11.12.1 不识别 `--allow-publish`，无需升级全局 npm。账号须启用 2FA，跳过 2FA 的 granular token 不适用于创建信任。

```sh
npx --yes npm@11.15.0 trust github dsh-limix-data --repo Limitless2023/limix-dsh --file publish.yml --allow-publish
npx --yes npm@11.15.0 trust github dsh-limix-tool --repo Limitless2023/limix-dsh --file publish.yml --allow-publish
npx --yes npm@11.15.0 trust github dsh-limix-agent --repo Limitless2023/limix-dsh --file publish.yml --allow-publish
npx --yes npm@11.15.0 trust github dsh-limix-preset --repo Limitless2023/limix-dsh --file publish.yml --allow-publish
npx --yes npm@11.15.0 trust github dsh-limix-cover --repo Limitless2023/limix-dsh --file publish.yml --allow-publish
```

逐条执行。首次 Passkey 验证时勾选“5 分钟内不再验证”，随后执行剩余四条；两条命令之间间隔约 2 秒。这样可减少重复验证，但以 npm 实际提示为准。若已有配置，先用 `npm trust list 包名` 核对，不要盲目删除重建。

在准备好首次新版本后再配信任。npm 公告规定：新建后 48 小时内须成功发布，否则未验证配置失效；首次成功发布后不受该期限限制。过期时需重新配置。配置成功不代表 OIDC 发布已验证。

### 每次发版

1. 将已批准的版本和工作流推送到 `master`。仅推送工作流不会自动发布；首次正式运行前须准备尚未发布的新套件版本。
2. 在 GitHub 的 Actions → **Publish npm suite** → **Run workflow**，选择 `master`，输入五包共同版本（不带 `v`）。其他分支不会执行发布 job。
3. 工作流按锁文件安装依赖，运行 `./release.sh`，执行离线回归测试及 npm 发布预检。构建导致跟踪文件变化时停止，修正并提交后重试，不能跳过干净工作树检查。
4. 工作流保存完整 `dist/v版本/` 为 Actions artifact，再发布 manifest 列出的五个 tgz。发布前重验 SHA256、SHA512、大小、五包集合与预检收据。
5. 同版本已存在且 integrity 相同则跳过；内容不同或 registry 请求异常则停止。五包先全部检查，再开始发布。五包发布并非原子操作；部分成功后，从同一提交重跑并确认产物一致，不能覆盖已发布版本。
6. 发布后核对公共 registry 的五包 integrity。Actions artifact 保留 30 天；下载后用于 GitHub Release，并完成公共 npm 安装验收。该工作流没有仓库写权限，不自动创建 GitHub Release，也不升级本机 DSH。

若发布后 registry 暂时未返回新版本，运行可能显示核验失败。先查看 npm 实际状态，待 registry 可读后重跑相同提交；不要立即修改同版本内容。

新建信任、改仓库或改工作流名称时仍需维护者确认。后续普通版本发布无需重复配置；维护者可在 npm 撤销信任。

### 本轮验证范围

- `actionlint` 工作流语法检查通过。
- 独立临时副本使用 Node 24.22.2 / npm 11.15.0，从三份锁文件重新安装依赖；`./release.sh` 成功构建并核验五包，构建后工作树干净。
- 133 个 Node 测试、78 个 Python 测试通过。包含五包缺失、内容篡改、同版本冲突、部分发布恢复和 Actions 身份边界测试。
- 2026-11-03，维护者完成五包信任配置；通过 `npm trust list` 逐包核对仓库 `Limitless2023/limix-dsh`、工作流 `publish.yml` 和直接发布权限，均一致。
- 尚未触发 GitHub Ubuntu runner 或执行真实 OIDC 发布；npm 发布预演也未在本轮执行。现有界面与模型回复的人工验收结论不因此改变。

依据：[npm 可信发布文档](https://docs.npmjs.com/trusted-publishers/)、[npm trust 命令](https://docs.npmjs.com/cli/v11/commands/npm-trust/)、[未验证配置 48 小时到期公告](https://github.blog/changelog/2026-10-02-unvalidated-npm-trusted-publishing-configurations-now-expire/)。核对日期：2026-11-03。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
