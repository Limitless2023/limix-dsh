# 开发指南

## 模块与隔离

五个插件的职责见 [项目首页](../README.md)。目录内的 CLAUDE.md 记录模块接口与依赖。

- 宿主代码使用 Node 内置模块、普通 npm 依赖和 `ctx` 服务，不内联另一份 Harness 服务。
- 同一个包只注册一个客户端来源，避免重复加载。
- tool 的全局 bundle patch 保持空数组；工具由 LimiX preset 加载。
- data 在 profile 注册设置页、路由和工具工厂；tool 在 preset 上下文使用该工厂。
- 标准模式不注入 LimiX 工具或提示词。品牌包改变全局外观。
- 任务流程从 `useTrajectory` 获取事件；`useSession` 提供会话状态，不提供事件数组。

## 本地开发与安装

使用独立 DSH_HOME 和测试 profile，避免替换日常安装。目录安装、npm 安装和 tgz 安装是不同来源；npm 安装不会自动读取工作区源码。

按 [README 的构建步骤](../README.md#构建与验证) 安装依赖。不要复制其他开发者的 node_modules 软链接。
修改后重建对应包；宿主逻辑、preset 或插件配置变更后重启测试 DSH。验证使用的实际安装来源和版本，不能用源码修改代替安装验证。

## 验证与发布

运行 `node scripts/validate.mjs --output <仓库外的新目录>`，保存构建、测试、解包载入和摘要记录。界面验收另见 [验收清单](ACCEPTANCE.md)。

`./release.sh` 生成五个同版本包与 manifest、SHA256SUMS，不执行发布。npm 预检使用 `node scripts/npm-preflight.mjs`。维护者须在干净提交构建；npm 与 GitHub Release 使用同一批产物。

公开审查摘要放在 reviews/。原始会话、请求回执、凭据、个人路径与未审阅截图保存在仓库外；不要将内部 PRD 交付记录直接提交。
