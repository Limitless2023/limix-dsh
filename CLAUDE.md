# limix-dsh - LimiX 的可分发 DSH 插件

TypeScript + React 18 + tsdown + Node.js + Python 3

<directory>
.github/workflows/ - 仅手动触发的 npm OIDC 发布，保留相同 tgz 供 GitHub Release 使用。
packages/agent/ - 预测、全量贡献热力图与完整关系网络，任务流程与 LimiX 专属首屏。
packages/tool/ - preset 专用 API 工具与命令；复用 Agent 图表生成离线报告，受控下载结果。
packages/preset/ - 定义业务到 LimiX 任务落地的角色和工具组合；保留用户默认选择。
packages/data/ - 数据源工具与设置页；局部地图见 CLAUDE.md。
packages/brand/ - 会话封面与侧边栏品牌。
benchmarks/ - 公开数据制备、固定拆分与多模型比较入口。
reviews/ - 独立交叉审查、离线复现和修复验证记录。
docs/ - 开发指南、提示词设计和用户验收清单；本机 PRD 不公开。
scripts/ - 发布构建与 tarball 完整性核验。
dist/ - 本地分发压缩包；发布前按源码重建。
</directory>

<config>
LICENSE / LICENSING.md / THIRD-PARTY-NOTICES.md - 非商业授权原文、联系入口与第三方/历史权利。
README.md - 安装步骤、构建入口和已知边界。
INSTALL.md - 同事安装说明。
NPM-DISTRIBUTION.md - npm 分发方案与 0.3.16 发布状态、隔离验收与安装文案。
RELEASE-NOTES.md - 0.3.16 发布说明、安装入口与已知边界。
release.sh - 构建并核验五个插件，输出版本清单与 SHA256；不上传产物。
</config>

开发使用独立 profile；源码目录安装与 npm/tgz 安装分开验证。
修改宿主源码后重建 lib，并重新加载宿主插件。
树外插件通过 ctx 服务注册能力，禁止打包第二份宿主服务。
参数字段表须转换成根类型为 object 的 JSON Schema。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

五包 0.3.15 已通过 Actions 可信发布，公共下载与独立 DSH 升级核验通过。提示词未通过项保留，见 reviews/business-acceptance-20261103.md。

0.3.16 五包已通过可信发布与本机 npm 升级；改动集中在 tool、preset。原生客户端验收与保留问题见 reviews/native-validation-0316.md。
