# limix-dsh - LimiX 的可分发 DSH 插件

TypeScript + React 18 + tsdown + Node.js + Python 3

<directory>
packages/agent/ - LimiX API 工具、结果卡片与分析过程视图。
packages/data/ - 数据源工具与设置页；局部地图见 CLAUDE.md。
packages/brand/ - 会话封面与侧边栏品牌。
dist/ - 本地分发压缩包；发布前按源码重建。
</directory>

<config>
README.md - 安装步骤、构建入口和已知边界。
INSTALL.md - 同事安装说明。
NOTES.md - DSH 0.2.1 移植约束与验证记录。
TODO.md - 插件迁移进度。
release.sh - 打包三个插件；不上传产物。
</config>

桌面端 profile 以 link 引用 packages/data 与 packages/agent。
修改宿主源码后重建 lib，并重新加载宿主插件。
树外插件通过 ctx 服务注册能力，禁止打包第二份宿主服务。
参数字段表须转换成根类型为 object 的 JSON Schema。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
