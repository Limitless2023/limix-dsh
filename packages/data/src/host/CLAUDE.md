# packages/data/src/host/

> L2 | 父级: ../CLAUDE.md

define-tool.ts - 将 DSH 参数字段表包成 object schema；保留执行与渲染回调。

parameters 是字段表；output.schema 已含根类型。
两者进入递归转换前采用不同入口。
字段上的 required 布尔值只进入父节点的 required 数组。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
