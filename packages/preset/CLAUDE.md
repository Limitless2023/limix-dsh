# packages/preset/

> L2 | 父级: ../../CLAUDE.md

package.json - preset bundle 清单，以及插件名称、描述与图标的分发入口。
locale/ - 中英文插件名称与职责说明。
assets/ - 插件列表使用的官方 LimiX 图标。
cordis.patch.yml - 注册 LimiX 默认预设；profile 保存的用户选择优先。业务报告默认 Markdown + 带图 HTML，先获取 report inspect 程序事实，再写报告；不删除旧文件；标准模式隔离。

报告按 inspect→正文→HTML 顺序；统一脚本生成跨业务汇总数字，保留原始分位数列，失败不猜参数。
逐日分位数不充当周分位数；特征比较不充当因果增益；无库存条件只给消耗草案。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
