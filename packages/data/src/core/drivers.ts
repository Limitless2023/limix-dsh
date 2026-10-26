
/**
 * [INPUT]: 依赖 pg(Pool)/mysql2(纯JS, 懒加载) 驱动、./types 的统一接口
 * [OUTPUT]: 对外提供 getDriver(kind) — postgres(兼容金仓)/mysql 两驱动的统一实现
 * [POS]: lib/datasource 的驱动适配层 — 每次调用建短连接即用即弃(serverless 友好, 不留池);
 *        只读三闸之二: 会话级 read-only + 语句超时(第一闸 guard 在上游, 第三闸=客户只读账号)
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ColumnInfo, DataSourceConn, DatasourceDriver, QueryResult, TableInfo } from "./types";

const CONNECT_TIMEOUT_MS = 8_000;

// ============================================================
// PostgreSQL(兼容人大金仓) — 走 pg, 短连接 Client
// ============================================================
const postgresDriver: DatasourceDriver = {
  async testConnection(conn) {
    try {
      const version = await withPgClient(conn, 5_000, async (c) => {
        const r = await c.query("SELECT version() AS v");
        return String(r.rows[0]?.v || "");
      });
      return { ok: true, version };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async listTables(conn) {
    return withPgClient(conn, 15_000, async (c) => {
      const schema = conn.schema || "public";
      const r = await c.query(
        `SELECT t.table_name AS name, obj_description(pc.oid) AS comment
           FROM information_schema.tables t
           JOIN pg_class pc ON pc.relname = t.table_name
           JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = t.table_schema
          WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'
          ORDER BY t.table_name`,
        [schema],
      );
      return r.rows.map((row) => ({ name: String(row.name), comment: row.comment ? String(row.comment) : null }));
    });
  },

  async describeTable(conn, table, sampleN = 5) {
    assertIdent(table);
    return withPgClient(conn, 20_000, async (c) => {
      const schema = conn.schema || "public";
      const qualified = `${qIdent(schema)}.${qIdent(table)}`;
      const n = Math.min(sampleN, 20);
      // 列结构 / 表注释 / 采样行**一次往返取回** —— 三条分开发就是三个 RTT(跨区往返约 100ms/次,
      // 点一次表要等 300ms 纯属白等)。子查询各自 json 聚合, 结果一行三列。
      const r = await c.query(
        `SELECT
           (SELECT json_agg(x ORDER BY x.attnum) FROM (
              SELECT a.attnum,
                     a.attname AS name,
                     format_type(a.atttypid, a.atttypmod) AS "dataType",
                     col_description(a.attrelid, a.attnum) AS comment
                FROM pg_attribute a
               WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
            ) x) AS columns,
           obj_description($1::regclass) AS comment,
           (SELECT json_agg(s) FROM (SELECT * FROM ${qualified} LIMIT ${n}) s) AS sample`,
        [qualified],
      );
      const row = r.rows[0] || {};
      const columns: ColumnInfo[] = ((row.columns as { name: string; dataType: string; comment: string | null }[] | null) ?? []).map(
        (x) => ({ name: String(x.name), dataType: String(x.dataType), comment: x.comment ? String(x.comment) : null }),
      );
      return {
        name: table,
        comment: row.comment ? String(row.comment) : null,
        columns,
        sampleRows: ((row.sample as Record<string, unknown>[] | null) ?? []) as Record<string, unknown>[],
      } satisfies TableInfo;
    });
  },

  async runQuery(conn, sql, opts) {
    return withPgClient(conn, opts.timeoutMs, async (c) => {
      const r = await c.query({ text: sql, rowMode: "array" });
      const columns = (r.fields || []).map((f) => f.name);
      const rows = (r.rows || []) as unknown[][];
      const truncated = rows.length >= opts.maxRows;
      return { columns, rows: rows.slice(0, opts.maxRows), rowCount: Math.min(rows.length, opts.maxRows), truncated } satisfies QueryResult;
    });
  },
};

async function withPgClient<T>(conn: DataSourceConn, timeoutMs: number, fn: (c: import("pg").Client) => Promise<T>): Promise<T> {
  const { Client } = await import("pg");
  // schema 限定的源: search_path 走**启动参数**(零往返) —— 否则 listTables 列得出表、
  // 裸 SQL `FROM 该表` 却报"不存在"(演示源就在 demo_source schema 里, agent 按表清单写的 SQL 必踩)。
  // schema 名已过 assertIdent 白名单, 拼进 options 安全。
  const startupOptions = conn.schema ? `-c search_path=${assertIdentAndReturn(conn.schema)},public` : undefined;
  const client = new Client({
    host: conn.host,
    port: conn.port,
    database: conn.database,
    user: conn.username,
    password: conn.password,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    options: startupOptions,
    // 本地容器无 TLS, 云库(Supabase 等)要 TLS — prefer 语义: 先试 TLS 失败落明文由服务端决定;
    // pg 无内置 prefer, 用宽松校验 + 允许降级: 云端主机名默认开 TLS, localhost/127 不开
    ssl: isLocalHost(conn.host) ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    // 三闸之二: 会话级只读 + 语句超时(guard 之外的纵深)。
    // ⚠️ 只读**必须走显式 SET**, 不可挪进上面的启动参数 —— 实测 Supabase 连接池会过滤部分
    // 启动参数(search_path 生效、default_transaction_read_only 被丢弃, SHOW 出来是 off),
    // 而只读是最后防线, 静默失效等于裸奔。两条合并成一次往返(无参数走 simple protocol, 可多语句)。
    await client.query(
      `SET default_transaction_read_only = on; SET statement_timeout = ${Math.max(1_000, Math.floor(timeoutMs))}`,
    );
    return await fn(client);
  } finally {
    void client.end().catch(() => {});
  }
}

// ============================================================
// MySQL — 走 mysql2/promise, 短连接
// ============================================================
const mysqlDriver: DatasourceDriver = {
  async testConnection(conn) {
    try {
      const version = await withMysql(conn, 5_000, async (c) => {
        const [rows] = await c.query("SELECT VERSION() AS v");
        return String((rows as { v?: unknown }[])[0]?.v || "");
      });
      return { ok: true, version };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async listTables(conn) {
    return withMysql(conn, 15_000, async (c) => {
      const [rows] = await c.query(
        `SELECT TABLE_NAME AS name, TABLE_COMMENT AS comment
           FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
          ORDER BY TABLE_NAME`,
        [conn.database],
      );
      return (rows as { name: unknown; comment: unknown }[]).map((r) => ({
        name: String(r.name),
        comment: r.comment ? String(r.comment) : null,
      }));
    });
  },

  async describeTable(conn, table, sampleN = 5) {
    assertIdent(table);
    return withMysql(conn, 20_000, async (c) => {
      const [cols] = await c.query(
        `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS data_type, COLUMN_COMMENT AS comment
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION`,
        [conn.database, table],
      );
      const columns: ColumnInfo[] = (cols as { name: unknown; data_type: unknown; comment: unknown }[]).map((r) => ({
        name: String(r.name),
        dataType: String(r.data_type),
        comment: r.comment ? String(r.comment) : null,
      }));
      // 表级注释也带上 — 它是 agent NL2SQL 视野的一部分(审查发现 P3)
      const [tc] = await c.query(
        `SELECT TABLE_COMMENT AS comment FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [conn.database, table],
      );
      const tcRow = (tc as { comment?: unknown }[])[0];
      const [sample] = await c.query(`SELECT * FROM \`${table}\` LIMIT ${Math.min(sampleN, 20)}`);
      return {
        name: table,
        comment: tcRow?.comment ? String(tcRow.comment) : null,
        columns,
        sampleRows: sample as Record<string, unknown>[],
      } satisfies TableInfo;
    });
  },

  async runQuery(conn, sql, opts) {
    return withMysql(conn, opts.timeoutMs, async (c) => {
      const [rows, fields] = await c.query({ sql, rowsAsArray: true, timeout: opts.timeoutMs });
      const columns = (fields || []).map((f) => f.name);
      const arr = rows as unknown[][];
      const truncated = arr.length >= opts.maxRows;
      return { columns, rows: arr.slice(0, opts.maxRows), rowCount: Math.min(arr.length, opts.maxRows), truncated } satisfies QueryResult;
    });
  },
};

async function withMysql<T>(
  conn: DataSourceConn,
  timeoutMs: number,
  fn: (c: import("mysql2/promise").Connection) => Promise<T>,
): Promise<T> {
  const mysql = await import("mysql2/promise");
  const c = await mysql.createConnection({
    host: conn.host,
    port: conn.port,
    database: conn.database,
    user: conn.username,
    password: conn.password,
    connectTimeout: CONNECT_TIMEOUT_MS,
    ssl: isLocalHost(conn.host) ? undefined : { rejectUnauthorized: false },
  });
  try {
    await c.query("SET SESSION TRANSACTION READ ONLY");
    await c.query(`SET SESSION MAX_EXECUTION_TIME = ${Math.max(1_000, Math.floor(timeoutMs))}`); // 毫秒, 仅 SELECT 生效
    return await fn(c);
  } finally {
    void c.end().catch(() => {});
  }
}

// ============================================================
// 公共小件
// ============================================================
function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "host.docker.internal";
}

/** 标识符白名单(表名/schema名): 字母数字下划线中文, 防注入拼接 */
function assertIdent(name: string): void {
  if (!/^[\w一-龥]+$/.test(name)) throw new Error(`非法标识符: ${name}`);
}

/** 同上, 校验通过即回传 —— 供拼接处一行完成"校验+使用", 免漏校验 */
function assertIdentAndReturn(name: string): string {
  assertIdent(name);
  return name;
}

function qIdent(name: string): string {
  assertIdent(name);
  return `"${name}"`;
}

export function getDriver(kind: DataSourceConn["kind"]): DatasourceDriver {
  if (kind === "postgres") return postgresDriver;
  if (kind === "mysql") return mysqlDriver;
  throw new Error(`不支持的数据源类型: ${kind}`);
}
