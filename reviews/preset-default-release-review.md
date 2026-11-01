# 0.3.2 默认预设验证

日期：2026-11-01（Asia/Shanghai）。基线：c2cc3c5（v0.3.1）。

## 变更范围

preset 通过宿主支持的 registry 配置，将 default 和 selectedDefault 设为 limix。DSH 的 profile 配置优先于 bundle，保留用户已保存的默认选择。没有安装脚本，也不写用户配置文件。工具列表、提示词及其他四包的业务代码不变。旧测试只允许 insert 操作，已改为仅允许 registry 覆盖及 LimiX 插入。

## 安装与界面证据

使用桌面应用附带 CLI 0.2.1-rc.5、独立 DSH_HOME 和全新 web profile。通过 dsh plugin add 安装五个 0.3.2 tarball，使用桌面运行时提供的 Web UI 验证。

1. 安装前 registry.default 为 standard；安装后 default 与 selectedDefault 均为 limix。
2. 未操作模式菜单，首个空白会话显示 LimiX Agent 及预测引导。
3. 设置页显示 New task default: LimiX Agent。
4. 在设置页改选 Standard mode；新建会话显示 Standard mode，无 LimiX 预测引导。
5. 停止并重新启动测试宿主；新建会话仍为 Standard mode。
6. 设置页再改选 LimiX Agent；新建会话恢复 LimiX Agent 及预测引导。
7. 逐项比较安装前后四个内置 preset，配置完全一致。

本机截图位于 Coffee/_recon/preset-default-validation/：fresh-install-default.png、standard-new-session.png、restart-preserves-standard.png。未改动日常 desktop profile。

## 自动化检查

- agent 与 tool Node 测试：56/56。
- tool Python 测试：49/49。
- data 契约测试：2/2。
- agent TypeScript 检查与 brand smoke 检查通过。
- release.sh 构建五包并验证入口、资源、CLI 模块和禁入文件。

## 边界

未重新执行生产预测、解释或比较；这些实现与 v0.3.1 一致。未做 Windows 实机验证。已有用户默认选择不会被强制覆盖。截图来自桌面同版本运行时的浏览器界面，不是原生 Electron 窗口。

## 对外措辞检查

按 copy-check 检查 RELEASE-NOTES.md 全文及 README.md、INSTALL.md 的本次新增说明，共 3 个文件、12 段新增可见文案。未发现黑话、内部纪律词、夸大或无证据的验证声明。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
