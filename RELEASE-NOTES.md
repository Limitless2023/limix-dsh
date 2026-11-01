# LimiX Agent 0.3.4

本版修正插件列表中两个插件都显示为“LimiX Agent”的问题，明确区分界面与执行工具。

- **LimiX 分析界面**（dsh-limix-agent）：展示预测、解释和模型比较的结果卡片与图表，提供“分析过程”页面和报告预览。
- **LimiX 预测工具**（dsh-limix-tool）：在 LimiX Agent 模式中执行数据上传、预测、解释和模型比较，并保存结果文件。
- 英文名称与描述同步更新。包名和功能不变，无需卸载旧插件。Agent 预设仍名为“LimiX Agent”。

五个插件统一更新到 0.3.4。请依次安装 data、tool、agent、preset；cover 是可选品牌外观插件。升级后完整退出并重开 DSH，按[安装说明](https://github.com/Limitless2023/limix-dsh/blob/v0.3.4/INSTALL.md)验证。

验证：macOS 原生 DSH 完整重启后，插件列表显示两个新名称及完整描述，两个插件保持启用。五包构建及分发文件核验通过。

本次仅更新展示文案、版本及文档，功能代码沿用 v0.3.3。未重新调用生产预测或解释接口。
