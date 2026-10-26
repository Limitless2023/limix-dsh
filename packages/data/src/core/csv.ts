/**
 * [INPUT]: 无依赖（自 Next.js 版 lib/limix/csv.ts 摘取 toCsv 一个函数）
 * [OUTPUT]: 对外提供 toCsv（含引号/逗号/换行转义）
 * [POS]: core 的 CSV 序列化原子，materialize 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export function toCsv(columns: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}
