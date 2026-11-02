# packages/brand/

> L2 | 父级: ../../CLAUDE.md

src/client.js - 注册封面、侧栏图标与官方字标；撑开宿主字标容器以免裁切。
src/index.js - 宿主占位入口，支持客户端扫描。
assets/limix-mark.png - LimiX 官网原始图标；逐字节保留。
assets/limix-logo.png - LimiX 官网导航原始 Logo；逐字节保留。
assets/limix-icon.png - 与原始图标相同，供插件列表使用。
assets/SOURCES.md - 品牌素材来源与核对记录。
build.mjs - 将两份品牌 PNG 内联进浏览器模块。
lib/ - 构建产物；客户端刷新后加载。
locale/ - 插件列表名称与说明。
cordis.patch.yml - 全局品牌插件席位。
LICENSE / LICENSING.md / THIRD-PARTY-NOTICES.md - 非商业许可、商业授权入口及历史/第三方权利。
package.json - npm 公开分发元数据、最低 Harness rc.5 声明；资源清单与构建命令。
README.md - 品牌槽位、构建和安装约束。
smoke.mjs - 静态渲染检查。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

品牌素材只使用官方文件。禁止 AI 重绘、去纹理或改字形。
