
/**
 * [INPUT]: 依赖 ./drivers 的 getDriver、./guard 的 guardSql、./store 的 toConn、lib/limix/csv 的 toCsv
 * [OUTPUT]: 对外提供 previewQuery(≤100行 JSON) + materializeQuery(全量→CSV 文本, 列名已清洗)
 * [POS]: lib/datasource 的取数出口 — DB 数据进入文件区(窄腰)前的最后一站;
 *        落文件动作留给调用方(agent 工具走 saveAgentFile, API 走 saveSessionFile), 本层不碰存储
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { toCsv } from "./csv";
import { cellToText, sanitizeColumns } from "./cells";
import { getDriver } from "./drivers";
import { guardSql, MATERIALIZE_MAX_ROWS, PREVIEW_MAX_ROWS } from "./guard";
import { toConn, type StoredSource } from "./store";
import type { QueryResult } from "./types";

// 纯逻辑在 ./cells(无 server-only, 可单测); 此处再导出保持既有引用路径不变
export { cellToText, sanitizeColumns } from "./cells";

const PREVIEW_TIMEOUT_MS = 20_000;
const MATERIALIZE_TIMEOUT_MS = 50_000; // 贴 serverless maxDuration 之下

export async function previewQuery(source: StoredSource, sql: string): Promise<QueryResult> {
  const g = guardSql(sql, PREVIEW_MAX_ROWS);
  if (!g.ok) throw new Error(`SQL 未通过安全阀: ${g.reason}`);
  const driver = getDriver(source.kind);
  const res = await driver.runQuery(toConn(source), g.sql, { maxRows: PREVIEW_MAX_ROWS, timeoutMs: PREVIEW_TIMEOUT_MS });
  // 单元格与 materialize 走同一套转换 —— 否则 Date 被 JSON 序列化成 UTC(16:00Z),
  // 与物化 CSV 里的墙钟时间(00:00)对不上, agent 拿预览核对时会误判需要"时区纠偏"
  return { ...res, columns: sanitizeColumns(res.columns), rows: res.rows.map((r) => r.map(cellToText)) };
}

export async function materializeQuery(
  source: StoredSource,
  sql: string,
): Promise<{ csv: string; columns: string[]; rowCount: number; truncated: boolean }> {
  const g = guardSql(sql, MATERIALIZE_MAX_ROWS);
  if (!g.ok) throw new Error(`SQL 未通过安全阀: ${g.reason}`);
  const driver = getDriver(source.kind);
  const res = await driver.runQuery(toConn(source), g.sql, {
    maxRows: MATERIALIZE_MAX_ROWS,
    timeoutMs: MATERIALIZE_TIMEOUT_MS,
  });
  const columns = sanitizeColumns(res.columns);
  const rows = res.rows.map((r) => r.map(cellToText));
  return { csv: toCsv(columns, rows), columns, rowCount: res.rowCount, truncated: res.truncated };
}
