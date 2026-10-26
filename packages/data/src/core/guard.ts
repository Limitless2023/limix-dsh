/**
 * [INPUT]: 无运行时依赖(纯函数, client/server/test 均可 import)
 * [OUTPUT]: 对外提供 guardSql(SQL 安全阀: 校验+注入 LIMIT) + GuardResult + PREVIEW_MAX_ROWS/MATERIALIZE_MAX_ROWS
 * [POS]: lib/datasource 的防御第一闸(第二闸=驱动会话级 read-only[最后防线], 第三闸=客户只读账号) —
 *        仅放行单条 SELECT/WITH, 拦截写操作/多语句/注释走私/方言歧义转义; 所有查询入口(工具/API)必须先过此阀
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const PREVIEW_MAX_ROWS = 100;
export const MATERIALIZE_MAX_ROWS = 500_000;

export type GuardResult =
  | { ok: true; sql: string }
  | { ok: false; reason: string };

// 词首关键字白名单 — 只允许查询形态
const ALLOWED_STARTS = /^(select|with)\b/i;

// 危险关键字黑名单(词边界) — 出现在任何位置一律拒绝。
// 宁可误杀也不放行; 但"仅语句起手位才危险、SELECT 里是常用函数/列名"的词不在此列:
//   replace(字符串函数, REPLACE INTO 起手已被白名单拦)、comment(常见列名, COMMENT ON 起手已被拦)
const FORBIDDEN =
  /\b(insert|update|delete|drop|create|alter|truncate|grant|revoke|merge|call|execute|exec|copy|vacuum|analyze|lock|rename|set|use|do|load|handler|import|install|reset|purge|kill|shutdown|prepare|deallocate|declare|fetch|listen|notify|refresh|reindex|cluster|checkpoint|discard|security|into\s+outfile|into\s+dumpfile)\b/i;

// 敏感对象/函数 — information_schema 对 NL2SQL 有用不拦, 但拒绝系统管控函数与凭据表
const FORBIDDEN_OBJECTS = /\b(pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_sleep|mysql\.user|benchmark\s*\()/i;

type ScanOut = {
  /** 字面量→''占位、注释→单个空格: 用于关键字/分号判定(防注释粘连骗过词边界) */
  stripped: string;
  /** 字面量原样保留、注释→单个空格: 用于 LIMIT 定位与最终下发(注释移除后语义不变) */
  cleaned: string;
  /** 引号区域内出现反斜杠 — PG(standard_conforming_strings)与 MySQL 转义语义相反, 存在解析歧义 */
  backslashInLiteral: boolean;
};

/**
 * 单趟扫描出两个视图。字符串按"非转义方言"(PG 默认)解析: 反斜杠是普通字符、'' 是转义引号;
 * 一旦引号区内出现反斜杠即打歧义标记, 由调用方整句拒绝 — 因为同一 payload 在 MySQL(反斜杠转义)
 * 与 PG 下会解析出不同的语句边界, 任何单一解析都可能被另一方言走私多语句(审查发现 F2)。
 */
function scanSql(sql: string): ScanOut {
  let stripped = "";
  let cleaned = "";
  let backslashInLiteral = false;
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    const two = sql.slice(i, i + 2);
    if (two === "--" || ch === "#") {
      // 行注释(-- 标准, # MySQL) → 换成单个空格保词边界(审查发现 F1: 换空串会让 DELETE/**/FROM 粘成 DELETEFROM 逃过 \b 判定)
      while (i < n && sql[i] !== "\n") i++;
      stripped += " ";
      cleaned += " ";
      continue;
    }
    if (two === "/*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      stripped += " ";
      cleaned += " ";
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      let literal = quote;
      i++;
      while (i < n) {
        if (sql[i] === "\\") backslashInLiteral = true; // 不当转义处理, 只标记歧义
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            // '' 双写转义(SQL 标准) — 属于字面量内部
            literal += quote + quote;
            i += 2;
            continue;
          }
          literal += quote;
          i++;
          break;
        }
        literal += sql[i];
        i++;
      }
      stripped += quote + quote; // 判定视图: 字面量清空只留引号壳, 保词边界
      cleaned += literal;        // 下发视图: 字面量原样
      continue;
    }
    stripped += ch;
    cleaned += ch;
    i++;
  }
  return { stripped, cleaned, backslashInLiteral };
}

/**
 * SQL 安全阀。
 * @param sql 原始 SQL(单条查询)
 * @param maxRows 行数上限 — 语句无 LIMIT 时自动追加; 有 LIMIT 但超上限时收紧
 */
export function guardSql(sql: string, maxRows: number): GuardResult {
  const raw = (sql || "").trim().replace(/;+\s*$/, ""); // 去尾部分号
  if (!raw) return { ok: false, reason: "SQL 为空" };
  if (raw.length > 20_000) return { ok: false, reason: "SQL 过长(>20000 字符)" };

  const { stripped, cleaned, backslashInLiteral } = scanSql(raw);

  if (backslashInLiteral) {
    return { ok: false, reason: "字符串字面量里含反斜杠, PG/MySQL 转义语义有歧义, 请改写(如改用 || 拼接或去掉反斜杠)" };
  }

  // 多语句: 剥掉字面量/注释后仍出现分号 = 拒绝
  if (stripped.includes(";")) return { ok: false, reason: "只允许单条语句(检测到分号)" };

  if (!ALLOWED_STARTS.test(stripped.trim())) {
    return { ok: false, reason: "只允许 SELECT / WITH 查询语句" };
  }
  const forbidden = stripped.match(FORBIDDEN);
  if (forbidden) return { ok: false, reason: `检测到禁用关键字: ${forbidden[1] || forbidden[0]}` };
  const forbiddenObj = stripped.match(FORBIDDEN_OBJECTS);
  if (forbiddenObj) return { ok: false, reason: `检测到禁用对象/函数: ${forbiddenObj[0]}` };

  // LIMIT 处理 — 一律在 cleaned(注释已除, 字面量完整, 可直接执行)上定位与改写,
  // 避免"stripped 里匹配到、raw 里因注释匹配不到"的假失败(审查发现 P2)
  const base = cleaned.trim();
  const cap = Math.max(1, Math.floor(maxRows));
  const tail = /\blimit\s+(\d+)((\s+offset\s+\d+)?\s*)$/i.exec(base);
  if (tail) {
    const nLimit = parseInt(tail[1], 10);
    if (nLimit > cap) {
      const sqlOut = base.slice(0, tail.index) + `LIMIT ${cap}` + (tail[2] || "");
      return { ok: true, sql: sqlOut };
    }
    return { ok: true, sql: base };
  }
  // 子查询内可能有 LIMIT 但外层没有 → 统一包一层再截断, 语义安全
  return { ok: true, sql: `SELECT * FROM (${base}) AS _guarded LIMIT ${cap}` };
}
