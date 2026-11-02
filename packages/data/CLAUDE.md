# packages/data/

> L2 | 父级: ../../CLAUDE.md

src/ - 工具、只读数据库访问与设置页源码。
lib/ - tsdown 产物；桌面端从这里加载插件。
tests/ - 对构建产物执行工具契约回归检查。
assets/icon.png - 插件图标。
locale/en.json - 英文插件名称与说明。
locale/zh.json - 中文插件名称与说明。
package.json - npm 公开分发元数据、最低 Harness rc.5 声明；插件入口、依赖与 build/test 命令。
cordis.patch.yml - 挂载全局设置页与路由；不注册会话工具。
tsdown.config.ts - 构建宿主 ESM 与浏览器工厂；数据库驱动保持 external。
tsconfig.json - TypeScript 编译约束。

变更工具定义后，执行 pnpm build 与 pnpm test。
测试使用临时 DSH_HOME，不读写用户数据源。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
