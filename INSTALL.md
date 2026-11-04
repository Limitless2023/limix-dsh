# 安装 LimiX Agent 0.3.16

最低支持 DeepSeek Harness **0.2.1-rc.5**。npm 安装、更新和 tgz 迁移指令见 [npm 分发说明](NPM-DISTRIBUTION.md)。商业用途须事先取得单独书面授权，详见 [许可说明](LICENSING.md)。

从 [GitHub Releases](https://github.com/Limitless2023/limix-dsh/releases) 下载 0.3.16 的插件文件。请保留现有 profile，按顺序安装或更新：

1. `dsh-limix-data-0.3.16.tgz`
2. `dsh-limix-tool-0.3.16.tgz`
3. `dsh-limix-agent-0.3.16.tgz`
4. `dsh-limix-preset-0.3.16.tgz`
5. 可选品牌外观：`dsh-limix-cover-0.3.16.tgz`

在 DeepSeek Harness 的“插件 → 添加插件”中选择文件；也可让 DSH Agent 使用 `plugin_manager` 的 `install_bundle`，`target` 传 tarball 的绝对路径。升级时使用同名包的新版，无需手动删配置。

安装器返回 `application: applied` 表示已生效；返回 `restart-required` 时重启 DeepSeek Harness。不要修改 app.asar。单独安装界面包不会提供预测工具。

## 凭据与 Python

确认 `python3` 可用（建议 Python 3.12+），并沿用已有 LimiX 配置。可以使用 `LIMIX_API_KEY` 环境变量或 `~/.limix/config.json`。凭据只在本机配置，不要发到聊天或写入代码仓库。

预测和解释仅使用 Python 标准库。LimiX Agent 启用后默认联网准备独立 Python 环境，固定安装 NumPy、pandas、scikit-learn、XGBoost、openpyxl 和 xlrd；模型比较等待准备完成，后续复用，不修改系统 Python。

自动环境需要已有 Python 3.12+。它不会安装 Python 本体或操作系统原生库。安装失败时可让 Agent 执行 `limix` 工具的 `runtime prepare` 重试，`runtime status` 查看状态；成功后返回独立解释器路径。本地数据脚本使用该路径。已有比较环境仍可通过 `--python` 显式指定。首次安装须能访问官方 PyPI。

安装 preset 后，未保存默认选择的新环境会默认使用 LimiX Agent。已有的用户默认选择优先保留，之后也可在“设置 → Agent 预设”中切换。已有会话不变。

## 安装后验证

1. 新建会话，选择 **LimiX Agent**，输入“用 LimiX 检查服务连接”。
2. 确认出现服务连接卡片，以及“任务流程”页签。
3. 输入 `/limix-predict`、`/limix-explain`、`/limix-compare`，确认命令存在。
4. 用公开演示数据执行一次预测与解释，确认图表、全屏与下载可用。
5. 新建标准模式会话，确认其首屏和工具组合保持标准模式。

如提示 CLI 缺失，先检查 tool 包是否完整安装并与其他包版本一致。不要用历史 agent 包内的旧 CLI 覆盖新版 tool 包。

## 本地开发

插件安装器可将 `packages/data`、`packages/tool`、`packages/agent`、`packages/preset`、`packages/brand` 作为目录安装。界面修改后重建 agent 包；宿主命令修改后重建 tool 包并重新加载插件。GitHub Release 使用构建后的 tarball，用户无需构建。
