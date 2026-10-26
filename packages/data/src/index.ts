/**
 * [INPUT]: 依赖宿主服务 tools（工具注册表）与 webServer（HTTP 路由）；核心逻辑在 ./core/*
 *          （guard 安全阀 / drivers 双驱动 / materialize 取数出口——自 Next.js 版逐字迁移）
 * [OUTPUT]: ① 注册 `datasource` 工具（list/inspect/query 子命令，preview/materialize 两模式）
 *           ② 同源路由 /limix-datasource/config (GET/POST) 与 /limix-datasource/test (POST)——设置页后端
 * [POS]: LimiX Agent 的数据源接入插件 Node 半。安全三闸：guard 语句白名单 →
 *        驱动会话级只读+语句超时 → 用户侧只读账号约定。materialize 落 CSV 进会话工作目录，
 *        与 limix 工具 / better-sidebar 文件区 / 时序图表通道天然衔接
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { defineTool } from "./host/define-tool.ts";
import { getDriver } from "./core/drivers.ts";
import { materializeQuery, previewQuery } from "./core/materialize.ts";
import {
  deleteSource, ensureConfigFile, getSource, listSources, toConn, upsertSource,
  type StoredSource,
} from "./core/store.ts";
import { DATA_SOURCE_KINDS } from "./core/types.ts";

export const inject = ["tools", "webServer"];

/** 无 Date.now 顾虑（Node 半普通运行时）；文件名时间戳与原版口径一致 */
function stamp(): string {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

/** 面向 agent 的源身份信息（凭据永不出层——原版纪律） */
function publicSource(s: StoredSource) {
  return { id: s.id, 名称: s.name, 类型: s.kind, 库名: s.database, schema: s.schema ?? null, 演示源: !!s.isDemo };
}

const DESCRIPTION = `连接客户数据库取数（数据的第二个来源，另一来源是上传/样本 CSV）。全链路只读。
子命令：list（列出已配置数据源）；inspect --source <id> [--table 表名]（不传 table 回表清单，传了回列结构+中文注释+采样5行）；query --source <id> --sql <单条SELECT/WITH> [--mode preview|materialize] [--file-name 名.csv] [--workdir 目录]。
工作流（铁律）：list → 对要用的每张表 inspect 看结构与注释 → **生成的 SQL 必须先在回复里用代码块展示给用户并用一句中文解释取的是什么（可见/可确认/可纠正），不要偷偷执行** → query mode=preview 自查（≤100行）→ 确认无误再 mode=materialize 落 CSV 进文件区 → 照常用 limix 工具预测。
**多表 JOIN 拼成一张宽表是本工具的核心用法**（如电价+气象+预测按省份和时间拼宽表）。只允许单条只读查询，写操作会被安全阀拒绝。materialize 上限 50 万行。`;

export function apply(ctx: any): void {
  ensureConfigFile();

  // ── datasource 工具 ──────────────────────────────────────────────────────
  ctx.tools.register(defineTool({
    name: "datasource",
    description: DESCRIPTION,
    parameters: {
      command: { type: "string", required: true, enum: ["list", "inspect", "query"], description: "子命令" },
      source: { type: "string", description: "数据源 id（来自 list）" },
      table: { type: "string", description: "inspect 用：表名；不传返回表清单" },
      sql: { type: "string", description: "query 用：单条只读 SQL（SELECT/WITH），执行前必须已在回复中展示给用户" },
      mode: { type: "string", enum: ["preview", "materialize"], description: "query 用：preview 自查（默认）/ materialize 落盘 CSV" },
      fileName: { type: "string", description: "materialize 落盘文件名（.csv 可省略），不传自动命名" },
      workdir: { type: "string", description: "materialize 落盘目录（默认：调用方会话的工作目录）" },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          command: { type: "string", required: true },
          ok: { type: "boolean", required: true },
          text: { type: "string", required: true },
        },
      },
      render: (_args: unknown, value: { text: string }) => [{ type: "text", text: value.text }],
    },
    async execute(args: {
      command: string; source?: string; table?: string; sql?: string;
      mode?: string; fileName?: string; workdir?: string;
    }) {
      const J = (v: unknown) => JSON.stringify(v, null, 2);
      const fail = (reason: string) => ({ command: args.command, ok: false, text: J({ 错误: reason }) });
      try {
        if (args.command === "list") {
          const sources = listSources();
          if (!sources.length) {
            return { command: "list", ok: true, text: J({ 数据源: [], 提示: "当前没有可用的数据源。请用户到 设置 → 数据源 里添加连接（支持 postgres/mysql），配置只读账号。" }) };
          }
          return { command: "list", ok: true, text: J({ 数量: sources.length, 数据源: sources.map(publicSource) }) };
        }

        const src = args.source ? getSource(args.source) : null;
        if (!src) return fail(`未找到数据源: ${args.source ?? "(未传 source)"}——先用 list 子命令看可用清单`);

        if (args.command === "inspect") {
          const driver = getDriver(src.kind);
          if (!args.table) {
            const tables = await driver.listTables(toConn(src));
            return { command: "inspect", ok: true, text: J({
              数据源: src.name, 库名: src.database, 表数量: tables.length,
              表清单: tables.map((t) => ({ 表名: t.name, 注释: t.comment })),
              下一步: "对要用到的每张表分别调用 inspect(source, table=<表名>) 看列结构与采样，再写 SQL。",
            }) };
          }
          const info = await driver.describeTable(toConn(src), args.table, 5);
          return { command: "inspect", ok: true, text: J({
            数据源: src.name, 表名: info.name, 表注释: info.comment,
            列: info.columns.map((c) => ({ 列名: c.name, 类型: c.dataType, 注释: c.comment })),
            采样5行: info.sampleRows,
          }) };
        }

        if (args.command === "query") {
          if (!args.sql) return fail("query 需要 sql 参数（单条 SELECT/WITH）");
          const mode = args.mode === "materialize" ? "materialize" : "preview";
          if (mode === "preview") {
            const r = await previewQuery(src, args.sql);
            return { command: "query", ok: true, text: J({
              模式: "preview", 数据源: src.name, 列: r.columns, 行数: r.rowCount, 已截断: r.truncated,
              数据: r.rows,
              下一步: "与用户确认数据无误后，用 mode=materialize 落盘成 CSV，再用 limix 工具预测。",
            }) };
          }
          const r = await materializeQuery(src, args.sql);
          const name = args.fileName
            ? (/\.csv$/i.test(args.fileName) ? args.fileName : `${args.fileName}.csv`)
            : `ds_查询结果_${stamp()}.csv`;
          const dir = args.workdir && isAbsolute(args.workdir) ? args.workdir : resolve(process.cwd(), args.workdir ?? ".");
          const full = join(dir, name);
          writeFileSync(full, r.csv, "utf8");
          return { command: "query", ok: true, text: J({
            模式: "materialize", 数据源: src.name, 文件: full, 列: r.columns, 行数: r.rowCount, 已截断: r.truncated,
            下一步: "宽表已落文件区。用 limix 工具（forecast/classify/regress）对该文件预测，或先剖析数据。",
          }) };
        }
        return fail(`未知子命令: ${args.command}`);
      } catch (e: any) {
        return fail(String(e?.message ?? e));
      }
    },
  }));

  // ── 设置页后端：同源只读/写路由（与 /limix-ui/csv 同款手法） ─────────────
  const readBody = (req: any): Promise<string> => new Promise((res, rej) => {
    let b = ""; req.on("data", (c: any) => { b += c }); req.on("end", () => res(b)); req.on("error", rej);
  });

  ctx.effect(() => ctx.webServer.register({
    kind: "exact", path: "/limix-datasource/config",
    handler: async (req: any, res: any) => {
      try {
        if (req.method === "GET") {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ sources: listSources(), kinds: DATA_SOURCE_KINDS }));
          return;
        }
        if (req.method === "POST") {
          const body = JSON.parse(await readBody(req));
          // 全量替换语义：settings UI 每次提交完整清单；逐条校验后 upsert，缺席的删除
          const incoming: StoredSource[] = Array.isArray(body?.sources) ? body.sources : [];
          for (const s of incoming) {
            if (!DATA_SOURCE_KINDS.includes(s.kind)) throw new Error(`不支持的类型: ${s.kind}`);
            if (!s.name || !s.host || !s.database || !s.username) throw new Error("name/host/database/username 必填");
            const port = Number(s.port);
            if (!(port >= 1 && port <= 65535)) throw new Error(`端口非法: ${s.port}`);
          }
          const keep = new Set<string>();
          for (const s of incoming) keep.add(upsertSource(s).id);
          for (const s of listSources()) if (!keep.has(s.id)) deleteSource(s.id);
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: true, sources: listSources() }));
          return;
        }
        res.writeHead(405); res.end();
      } catch (e: any) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(e?.message ?? e) }));
      }
    },
  }), "limix-datasource: config 路由");

  ctx.effect(() => ctx.webServer.register({
    kind: "exact", path: "/limix-datasource/test",
    handler: async (req: any, res: any) => {
      try {
        if (req.method !== "POST") { res.writeHead(405); res.end(); return }
        const body = JSON.parse(await readBody(req));
        const s: StoredSource = body?.source;
        const r = await getDriver(s.kind).testConnection(toConn(s));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(r));
      } catch (e: any) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(e?.message ?? e) }));
      }
    },
  }), "limix-datasource: 测试连接路由");
}
