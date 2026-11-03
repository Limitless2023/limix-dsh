# packages/agent/

> L2 | 父级: ../../CLAUDE.md

src/index.ts - 空宿主入口；保留客户端扫描席位。
src/client/ - 工具卡、分析过程、本轮摘要与 LimiX 专属首屏。
assets/ - 插件图标；CLI 仅由 packages/tool 分发。
lib/ - tsdown 生成的宿主占位与浏览器模块。
locale/ - 插件名称与说明。
LICENSE / LICENSING.md / THIRD-PARTY-NOTICES.md - 非商业许可、商业授权入口及历史/第三方权利。
package.json - npm 公开分发元数据、最低 Harness rc.5 声明；客户端声明与分发清单。
package-lock.json - 锁定本地与 Actions 构建依赖；不随插件分发。
cordis.patch.yml - profile 层客户端席位。
tsdown.config.ts - 构建 ESM 与 ModuleLoader 工厂。
tsconfig.json - TypeScript 编译约束。
tests/ - 任务身份、行步边界、方向与尺度、完整图表和异常渲染测试。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
