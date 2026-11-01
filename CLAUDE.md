# limix-dsh - LimiX 的可分发 DSH 插件

TypeScript + React 18 + tsdown + Node.js + Python 3

<directory>
packages/agent/ - 预测、全量贡献热力图与完整关系网络，分析过程与 LimiX 专属首屏。
packages/tool/ - preset 专用 API 工具与命令；复用 Agent 图表生成离线报告，受控下载结果。
packages/preset/ - 声明 LimiX Agent 工具组合与新任务默认值；保留 profile 中的用户选择。
packages/data/ - 数据源工具与设置页；局部地图见 CLAUDE.md。
packages/brand/ - 会话封面与侧边栏品牌。
benchmarks/ - 公开数据制备、固定拆分与多模型比较入口。
reviews/ - 独立交叉审查、离线复现和修复验证记录。
scripts/ - 发布构建与 tarball 完整性核验。
dist/ - 本地分发压缩包；发布前按源码重建。
</directory>

<config>
README.md - 安装步骤、构建入口和已知边界。
INSTALL.md - 同事安装说明。
HANDOVER.md - 开发接手入口与历史调试记录。
USER-ACCEPTANCE.md - v0.3.1 换机安装、真实界面验收与证据交付计划。
DEMO-RECORDING.md - v0.3.6 浏览器用户演示、固定场景与全程录制交接。
NOTES.md - DSH 0.2.1 移植约束与验证记录。
TODO.md - 插件迁移进度。
DECISION-AGENT-PLAN.md - 产业决策与因果解释方案；记录接口边界、案例和验收顺序。
SYSTEM-PROMPT-REVIEW.md - LimiX 专属五段提示词原文、工具说明与调优验证记录。
GOAL-PLAN.md - 本轮因果模块、多数据集、多模型比较、审查与发版验收清单。
RELEASE-NOTES.md - 0.3.7公开发布说明、安装入口与已知边界。
release.sh - 构建并核验五个插件，输出版本清单与 SHA256；不上传产物。
</config>

桌面端 profile 以 link 引用 packages/data 与 packages/agent。
修改宿主源码后重建 lib，并重新加载宿主插件。
树外插件通过 ctx 服务注册能力，禁止打包第二份宿主服务。
参数字段表须转换成根类型为 object 的 JSON Schema。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
