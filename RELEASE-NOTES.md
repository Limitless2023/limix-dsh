# LimiX Agent 0.3.2

安装 preset 插件后，未保存默认选择的新环境会自动将 LimiX Agent 设为新任务默认模式。

- 已保存的用户默认选择优先保留。用户之后仍可在“设置 → Agent 预设”中切换默认模式。
- 已有会话不切换模式。标准、PTC、极简和创造模式的配置保持不变。
- 五个插件统一更新到 0.3.2。本版只调整默认预设，不包含开发中的分析过程界面改版。

请依次安装 data、tool、agent、preset；cover 是可选品牌外观插件。安装器提示需要重启时，重启 DSH。
下载本 Release 的 `.tgz` 文件，按[安装说明](https://github.com/Limitless2023/limix-dsh/blob/v0.3.2/INSTALL.md)更新。`SHA256SUMS` 提供文件校验值，`manifest.json` 记录源码提交及打包清单。

验证：在 macOS 的独立 DSH 0.2.1-rc.5 环境安装五个 tarball，确认首次安装的默认模式、新建会话、手动切换、重启后保留选择及切回 LimiX 均正常。107 项自动化测试、agent 类型检查和品牌组件检查通过。

本次未重新调用生产预测 API，未在 Windows 上验证。预测、解释与模型比较沿用 0.3.1 的实现和[已知边界](https://github.com/Limitless2023/limix-dsh/releases/tag/v0.3.1)。
