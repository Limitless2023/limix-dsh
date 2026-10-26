/**
 * [INPUT]: 无运行时依赖(纯函数, client/server/test 均可 import — 刻意不带 server-only)
 * [OUTPUT]: 对外提供 sanitizeColumns(列名清洗)/cellToText(单元格→CSV 值)
 * [POS]: lib/datasource 的物化纯逻辑层, 被 materialize.ts 消费并再导出;
 *        与 guard.ts 同属"可单测的纯函数"一档 —— 三处审查修复(时区/撞名/公式注入)的行为契约锁在 cells.test.ts
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/** 列名清洗: 去首尾空白、内部空白/特殊字符换下划线 — LimiX/CSV 下游友好 */
export function sanitizeColumns(columns: string[]): string[] {
  const seen = new Set<string>();
  return columns.map((c, i) => {
    let name = (c || `col_${i + 1}`).trim().replace(/[\s,;"'`]+/g, "_");
    if (!name) name = `col_${i + 1}`;
    // 撞名逐级避让并登记生成名本身, 防 ["x","x","x_2"] 撞出两个 x_2(审查发现 F4)
    if (seen.has(name)) {
      let k = 2;
      while (seen.has(`${name}_${k}`)) k++;
      name = `${name}_${k}`;
    }
    seen.add(name);
    return name;
  });
}

/** 两位补零 */
function p2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 合法数字字面量(含负号/正号/小数/科学计数) — 这类必须原样, 否则毁掉下游数值解析 */
const NUMERIC_LITERAL = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * CSV 公式注入中和(审查发现 F6): Excel/WPS 打开 CSV 时会把 = + - @ 开头(及前导 Tab/CR)的单元格当公式执行。
 * 数据来自客户库、理论上可被上游污染 → 加前导单引号让表格软件当纯文本。
 * ⚠️ 关键例外: **负数必须放行** —— PG 的 numeric/decimal 经驱动返回的是字符串(保精度),
 * 若把 "-5.5" 变成 "'-5.5", LimiX 侧数值解析直接崩(与时区 bug 同类的静默数据污染)。
 */
function neutralizeFormula(s: string): string {
  if (!/^[=+\-@\t\r]/.test(s)) return s;
  if (NUMERIC_LITERAL.test(s)) return s;
  return `'${s}`;
}

/**
 * 单元格 → CSV 值。
 * 时间戳按**本地字段**拼串: 驱动把 DB 的 timestamp/DATETIME(无时区语义)按进程本地时区解析成 Date,
 * 若再 toISOString() 转 UTC 会平移时区差(实测东八区平移 8 小时, 时序预测的时间轴整体错位)。
 * 取本地字段即把驱动的解析原样还原成 DB 里的墙钟时间(审查发现 P0)。
 */
export function cellToText(v: unknown): string | number {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    const d = `${v.getFullYear()}-${p2(v.getMonth() + 1)}-${p2(v.getDate())}`;
    const t = `${p2(v.getHours())}:${p2(v.getMinutes())}:${p2(v.getSeconds())}`;
    return `${d} ${t}`;
  }
  // 二进制列(MySQL BLOB / PG bytea)转 hex, 免 JSON.stringify 出 {"type":"Buffer",...} 垃圾(审查发现 F5)
  if (v instanceof Uint8Array) return `0x${Buffer.from(v).toString("hex")}`;
  if (typeof v === "object") return neutralizeFormula(JSON.stringify(v));
  return neutralizeFormula(String(v));
}
