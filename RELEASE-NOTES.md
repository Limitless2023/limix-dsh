# LimiX Agent v0.3.12

五个 Harness 插件统一更新为 0.3.12，保留 npm 与 GitHub Release tgz 分发。

## 本次变化

- 报告工具在指定目录统一生成同版 HTML 和最终 Markdown；Markdown 包含程序核验附录，与历史下载版一致。
- 输出文件冲突时拒绝覆盖；双格式交付失败只回滚本次新建文件。
- 报告回执明确 SVG 预览方式，工作流使用结果卡或浏览器，避免调用不支持 SVG 的位图读取工具。
- 已生成报告的登记预览检查失败，单独显示“报告已生成，预览检查未完成”；其他失败仍保留未完成状态。
- 提示词围绕业务决定、证据范围和方法适用条件组织；标准模式挂载边界与现有配置存储方式不变。

## 安装与更新

最低支持 DeepSeek Harness 0.2.1-rc.5。正常退出桌面应用后，在原 profile 中执行：

```sh
dsh plugin --profile desktop add --save-exact --registry=https://registry.npmjs.org/ dsh-limix-data@0.3.12 dsh-limix-tool@0.3.12 dsh-limix-agent@0.3.12 dsh-limix-preset@0.3.12 dsh-limix-cover@0.3.12
```

完整步骤见 [NPM-DISTRIBUTION.md](NPM-DISTRIBUTION.md)。非商业许可与商业授权入口不变。

## 验证及已知限制

构建、自动测试、五包打包和树外载入检查通过。独立 DSH Web 环境真实生成报告，指定目录与历史副本的 HTML、Markdown 逐字节一致，任务流程显示完成；该任务复用已有预测结果，没有重新调用预测接口。

提示词行为尚未全部通过：咨询仍可能将未确认的业务条件当成事实，报告仍可能扩大数据检查结论。用户确认在保留这些限制的情况下发布；业务判断及报告正文仍需人工审阅，不宣称回答质量稳定提升。详见 [验收记录](reviews/report-delivery-0312-review.md)。

本轮未重新验收 Windows、第二台电脑、日常 desktop 全部流程和所有预测 API；光学 20 变量无向解释上游错误保留。
