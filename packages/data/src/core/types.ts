/**
 * [INPUT]: 无运行时依赖(纯类型)
 * [OUTPUT]: 对外提供 DataSourceKind/DataSourceRow/DataSourceConn/TableInfo/ColumnInfo/QueryResult/DatasourceDriver 类型
 * [POS]: lib/datasource 的类型真相源, 被 crypto/guard/drivers/store/materialize 与 mastra 工具消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/** P0 支持 postgres(兼容金仓)/mysql; P1 追加 dm/oracle/mssql — 枚举先留位 */
export type DataSourceKind = "postgres" | "mysql";

export const DATA_SOURCE_KINDS: DataSourceKind[] = ["postgres", "mysql"];

/** data_sources 表一行(凭据只存密文, 明文永不出 lib/datasource) */
export type DataSourceRow = {
  id: string;
  ownerId: string | null;
  name: string;
  kind: DataSourceKind;
  host: string;
  port: number;
  database: string;
  /** postgres 专用: 限定 schema(演示库用 demo_source), 空=默认 public */
  schema: string | null;
  username: string;
  secretEncrypted: string;
  isDemo: boolean;
  createdAt: string;
};

/** 驱动层连接参数(解密后, 仅存在于单次调用栈上) */
export type DataSourceConn = {
  kind: DataSourceKind;
  host: string;
  port: number;
  database: string;
  schema?: string | null;
  username: string;
  password: string;
};

export type ColumnInfo = {
  name: string;
  dataType: string;
  comment: string | null;
};

export type TableInfo = {
  name: string;
  comment: string | null;
  columns: ColumnInfo[];
  sampleRows: Record<string, unknown>[];
};

export type QueryResult = {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  /** 行数是否被 maxRows 截断 */
  truncated: boolean;
};

/** 统一驱动接口 — 每种数据库实现一份; 全部只读语义(会话级 read-only + guard 双闸) */
export type DatasourceDriver = {
  testConnection(conn: DataSourceConn): Promise<{ ok: boolean; version?: string; error?: string }>;
  listTables(conn: DataSourceConn): Promise<{ name: string; comment: string | null }[]>;
  describeTable(conn: DataSourceConn, table: string, sampleN?: number): Promise<TableInfo>;
  runQuery(conn: DataSourceConn, sql: string, opts: { maxRows: number; timeoutMs: number }): Promise<QueryResult>;
};
