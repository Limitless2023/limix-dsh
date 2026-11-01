# packages/data/src/core/

> L2 | 父级: ../CLAUDE.md

drivers.ts - PostgreSQL/MySQL 只读短连接；MySQL DATE 原样保留日历日期。
types.ts - 数据源、表结构、查询结果与驱动接口。
store.ts - 本地配置读写与连接转换；凭据文件权限 0600。
guard.ts - 只读 SQL 校验与行数限制。
materialize.ts - 预览与 CSV 物化；调用驱动和 SQL 校验。
cells.ts - 列名去重与单元格序列化。
csv.ts - CSV 引号、逗号与换行转义。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
