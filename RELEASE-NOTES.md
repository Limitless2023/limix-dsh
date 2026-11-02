# LimiX Agent v0.3.11

五个 Harness 插件统一更新为0.3.11，保留 npm 与 GitHub Release tgz 两种安装方式。

## 本次变化

- LimiX Agent 定位为文理双脑智能体：梳理业务场景，定义预测任务，让 LimiX 落地业务，创造价值。
- 提示词贯通场景梳理、任务定义、数据准备、预测与分析、结果应用；明确任务直接执行，模糊需求先协助定义。
- 报告指引独立维护，仍在 LimiX preset 中加载；不是动态加载。预测、解释与比较区分咨询和实际执行。
- 报告构建统一 React 来源，修复跨包图表服务端渲染中的 hooks 实例冲突。
- 标准模式挂载边界、已有用户默认选择及配置存储方式不变。

## 安装

最低支持 DeepSeek Harness 0.2.1-rc.5。使用桌面版附带的 CLI，正常退出应用后，在原 profile 中更新：

```sh
dsh plugin --profile desktop add --save-exact --registry=https://registry.npmjs.org/ dsh-limix-data@0.3.11 dsh-limix-tool@0.3.11 dsh-limix-agent@0.3.11 dsh-limix-preset@0.3.11 dsh-limix-cover@0.3.11
```

完整安装与迁移步骤见 [NPM-DISTRIBUTION.md](NPM-DISTRIBUTION.md)。非商业许可与商业授权入口保持不变。

## 验证与已知问题

工作流、标准模式挂载隔离、文件保护与报告图表自动测试通过。咨询行为尚未全部通过：材料案例出现无依据的预期R²区间，咖啡案例在查看数据前判断样本足够；限定CSV检查仍追加未请求的建模判断。没有完成与0.3.10原版的重复配对测试，不声称回答质量稳定提升。详见 [提示词验收记录](docs/PROMPT-EVALUATION.md)。本版在保留这些问题的情况下发布。

报告及业务建议仍需人工审阅。光学20变量无向解释上游错误保留，本轮未重测。Windows、第二台电脑及本版桌面完整预测、解释和模型比较未重新验收。
