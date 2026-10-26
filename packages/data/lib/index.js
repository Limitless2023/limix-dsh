import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

//#region src/host/define-tool.ts
function toJsonSchema(spec) {
	if (spec && spec.type === "object" && spec.properties) return {
		type: "object",
		additionalProperties: spec.additionalProperties ?? false,
		required: spec.required ?? Object.keys(spec.properties).filter((k) => spec.properties[k]?.required),
		properties: Object.fromEntries(Object.entries(spec.properties).map(([k, v]) => [k, toJsonSchema(v)]))
	};
	const out = {};
	if (spec?.type) out.type = spec.type;
	if (spec?.description) out.description = spec.description;
	if (spec?.enum) out.enum = spec.enum;
	if (spec?.items) out.items = toJsonSchema(spec.items);
	if (spec?.properties) out.properties = toJsonSchema({
		type: "object",
		properties: spec.properties
	});
	if (spec?.additionalProperties !== void 0) out.additionalProperties = spec.additionalProperties;
	return out;
}
function defineTool(spec) {
	return {
		name: spec.name,
		description: spec.description,
		parameters: toJsonSchema({
			type: "object",
			properties: spec.parameters ?? {}
		}),
		output: {
			schema: toJsonSchema(spec.output?.schema ?? {}),
			render: spec.output.render
		},
		...spec.timeoutMs !== void 0 ? { timeoutMs: spec.timeoutMs } : {},
		execute: spec.execute
	};
}

//#endregion
//#region src/core/drivers.ts
const CONNECT_TIMEOUT_MS = 8e3;
const postgresDriver = {
	async testConnection(conn) {
		try {
			return {
				ok: true,
				version: await withPgClient(conn, 5e3, async (c) => {
					const r = await c.query("SELECT version() AS v");
					return String(r.rows[0]?.v || "");
				})
			};
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : String(e)
			};
		}
	},
	async listTables(conn) {
		return withPgClient(conn, 15e3, async (c) => {
			const schema = conn.schema || "public";
			return (await c.query(`SELECT t.table_name AS name, obj_description(pc.oid) AS comment
           FROM information_schema.tables t
           JOIN pg_class pc ON pc.relname = t.table_name
           JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = t.table_schema
          WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'
          ORDER BY t.table_name`, [schema])).rows.map((row) => ({
				name: String(row.name),
				comment: row.comment ? String(row.comment) : null
			}));
		});
	},
	async describeTable(conn, table, sampleN = 5) {
		assertIdent(table);
		return withPgClient(conn, 2e4, async (c) => {
			const qualified = `${qIdent(conn.schema || "public")}.${qIdent(table)}`;
			const n = Math.min(sampleN, 20);
			const row = (await c.query(`SELECT
           (SELECT json_agg(x ORDER BY x.attnum) FROM (
              SELECT a.attnum,
                     a.attname AS name,
                     format_type(a.atttypid, a.atttypmod) AS "dataType",
                     col_description(a.attrelid, a.attnum) AS comment
                FROM pg_attribute a
               WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
            ) x) AS columns,
           obj_description($1::regclass) AS comment,
           (SELECT json_agg(s) FROM (SELECT * FROM ${qualified} LIMIT ${n}) s) AS sample`, [qualified])).rows[0] || {};
			const columns = (row.columns ?? []).map((x) => ({
				name: String(x.name),
				dataType: String(x.dataType),
				comment: x.comment ? String(x.comment) : null
			}));
			return {
				name: table,
				comment: row.comment ? String(row.comment) : null,
				columns,
				sampleRows: row.sample ?? []
			};
		});
	},
	async runQuery(conn, sql, opts) {
		return withPgClient(conn, opts.timeoutMs, async (c) => {
			const r = await c.query({
				text: sql,
				rowMode: "array"
			});
			const columns = (r.fields || []).map((f) => f.name);
			const rows = r.rows || [];
			const truncated = rows.length >= opts.maxRows;
			return {
				columns,
				rows: rows.slice(0, opts.maxRows),
				rowCount: Math.min(rows.length, opts.maxRows),
				truncated
			};
		});
	}
};
async function withPgClient(conn, timeoutMs, fn) {
	const { Client } = await import("pg");
	const startupOptions = conn.schema ? `-c search_path=${assertIdentAndReturn(conn.schema)},public` : void 0;
	const client = new Client({
		host: conn.host,
		port: conn.port,
		database: conn.database,
		user: conn.username,
		password: conn.password,
		connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
		options: startupOptions,
		ssl: isLocalHost(conn.host) ? void 0 : { rejectUnauthorized: false }
	});
	await client.connect();
	try {
		await client.query(`SET default_transaction_read_only = on; SET statement_timeout = ${Math.max(1e3, Math.floor(timeoutMs))}`);
		return await fn(client);
	} finally {
		client.end().catch(() => {});
	}
}
const mysqlDriver = {
	async testConnection(conn) {
		try {
			return {
				ok: true,
				version: await withMysql(conn, 5e3, async (c) => {
					const [rows] = await c.query("SELECT VERSION() AS v");
					return String(rows[0]?.v || "");
				})
			};
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : String(e)
			};
		}
	},
	async listTables(conn) {
		return withMysql(conn, 15e3, async (c) => {
			const [rows] = await c.query(`SELECT TABLE_NAME AS name, TABLE_COMMENT AS comment
           FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
          ORDER BY TABLE_NAME`, [conn.database]);
			return rows.map((r) => ({
				name: String(r.name),
				comment: r.comment ? String(r.comment) : null
			}));
		});
	},
	async describeTable(conn, table, sampleN = 5) {
		assertIdent(table);
		return withMysql(conn, 2e4, async (c) => {
			const [cols] = await c.query(`SELECT COLUMN_NAME AS name, COLUMN_TYPE AS data_type, COLUMN_COMMENT AS comment
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION`, [conn.database, table]);
			const columns = cols.map((r) => ({
				name: String(r.name),
				dataType: String(r.data_type),
				comment: r.comment ? String(r.comment) : null
			}));
			const [tc] = await c.query(`SELECT TABLE_COMMENT AS comment FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`, [conn.database, table]);
			const tcRow = tc[0];
			const [sample] = await c.query(`SELECT * FROM \`${table}\` LIMIT ${Math.min(sampleN, 20)}`);
			return {
				name: table,
				comment: tcRow?.comment ? String(tcRow.comment) : null,
				columns,
				sampleRows: sample
			};
		});
	},
	async runQuery(conn, sql, opts) {
		return withMysql(conn, opts.timeoutMs, async (c) => {
			const [rows, fields] = await c.query({
				sql,
				rowsAsArray: true,
				timeout: opts.timeoutMs
			});
			const columns = (fields || []).map((f) => f.name);
			const arr = rows;
			const truncated = arr.length >= opts.maxRows;
			return {
				columns,
				rows: arr.slice(0, opts.maxRows),
				rowCount: Math.min(arr.length, opts.maxRows),
				truncated
			};
		});
	}
};
async function withMysql(conn, timeoutMs, fn) {
	const c = await (await import("mysql2/promise")).createConnection({
		host: conn.host,
		port: conn.port,
		database: conn.database,
		user: conn.username,
		password: conn.password,
		connectTimeout: CONNECT_TIMEOUT_MS,
		ssl: isLocalHost(conn.host) ? void 0 : { rejectUnauthorized: false }
	});
	try {
		await c.query("SET SESSION TRANSACTION READ ONLY");
		await c.query(`SET SESSION MAX_EXECUTION_TIME = ${Math.max(1e3, Math.floor(timeoutMs))}`);
		return await fn(c);
	} finally {
		c.end().catch(() => {});
	}
}
function isLocalHost(host) {
	return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "host.docker.internal";
}
/** 标识符白名单(表名/schema名): 字母数字下划线中文, 防注入拼接 */
function assertIdent(name) {
	if (!/^[\w一-龥]+$/.test(name)) throw new Error(`非法标识符: ${name}`);
}
/** 同上, 校验通过即回传 —— 供拼接处一行完成"校验+使用", 免漏校验 */
function assertIdentAndReturn(name) {
	assertIdent(name);
	return name;
}
function qIdent(name) {
	assertIdent(name);
	return `"${name}"`;
}
function getDriver(kind) {
	if (kind === "postgres") return postgresDriver;
	if (kind === "mysql") return mysqlDriver;
	throw new Error(`不支持的数据源类型: ${kind}`);
}

//#endregion
//#region src/core/csv.ts
/**
* [INPUT]: 无依赖（自 Next.js 版 lib/limix/csv.ts 摘取 toCsv 一个函数）
* [OUTPUT]: 对外提供 toCsv（含引号/逗号/换行转义）
* [POS]: core 的 CSV 序列化原子，materialize 消费
* [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
*/
function toCsv(columns, rows) {
	const esc = (v) => {
		const s = v == null ? "" : String(v);
		return /[",\n]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
	};
	return [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

//#endregion
//#region src/core/cells.ts
/**
* [INPUT]: 无运行时依赖(纯函数, client/server/test 均可 import — 刻意不带 server-only)
* [OUTPUT]: 对外提供 sanitizeColumns(列名清洗)/cellToText(单元格→CSV 值)
* [POS]: lib/datasource 的物化纯逻辑层, 被 materialize.ts 消费并再导出;
*        与 guard.ts 同属"可单测的纯函数"一档 —— 三处审查修复(时区/撞名/公式注入)的行为契约锁在 cells.test.ts
* [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
*/
/** 列名清洗: 去首尾空白、内部空白/特殊字符换下划线 — LimiX/CSV 下游友好 */
function sanitizeColumns(columns) {
	const seen = /* @__PURE__ */ new Set();
	return columns.map((c, i) => {
		let name = (c || `col_${i + 1}`).trim().replace(/[\s,;"'`]+/g, "_");
		if (!name) name = `col_${i + 1}`;
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
function p2(n) {
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
function neutralizeFormula(s) {
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
function cellToText(v) {
	if (v === null || v === void 0) return "";
	if (typeof v === "number") return v;
	if (typeof v === "bigint") return v.toString();
	if (typeof v === "boolean") return v ? "true" : "false";
	if (v instanceof Date) {
		if (Number.isNaN(v.getTime())) return "";
		return `${`${v.getFullYear()}-${p2(v.getMonth() + 1)}-${p2(v.getDate())}`} ${`${p2(v.getHours())}:${p2(v.getMinutes())}:${p2(v.getSeconds())}`}`;
	}
	if (v instanceof Uint8Array) return `0x${Buffer.from(v).toString("hex")}`;
	if (typeof v === "object") return neutralizeFormula(JSON.stringify(v));
	return neutralizeFormula(String(v));
}

//#endregion
//#region src/core/guard.ts
/**
* [INPUT]: 无运行时依赖(纯函数, client/server/test 均可 import)
* [OUTPUT]: 对外提供 guardSql(SQL 安全阀: 校验+注入 LIMIT) + GuardResult + PREVIEW_MAX_ROWS/MATERIALIZE_MAX_ROWS
* [POS]: lib/datasource 的防御第一闸(第二闸=驱动会话级 read-only[最后防线], 第三闸=客户只读账号) —
*        仅放行单条 SELECT/WITH, 拦截写操作/多语句/注释走私/方言歧义转义; 所有查询入口(工具/API)必须先过此阀
* [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
*/
const PREVIEW_MAX_ROWS = 100;
const MATERIALIZE_MAX_ROWS = 5e5;
const ALLOWED_STARTS = /^(select|with)\b/i;
const FORBIDDEN = /\b(insert|update|delete|drop|create|alter|truncate|grant|revoke|merge|call|execute|exec|copy|vacuum|analyze|lock|rename|set|use|do|load|handler|import|install|reset|purge|kill|shutdown|prepare|deallocate|declare|fetch|listen|notify|refresh|reindex|cluster|checkpoint|discard|security|into\s+outfile|into\s+dumpfile)\b/i;
const FORBIDDEN_OBJECTS = /\b(pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_sleep|mysql\.user|benchmark\s*\()/i;
/**
* 单趟扫描出两个视图。字符串按"非转义方言"(PG 默认)解析: 反斜杠是普通字符、'' 是转义引号;
* 一旦引号区内出现反斜杠即打歧义标记, 由调用方整句拒绝 — 因为同一 payload 在 MySQL(反斜杠转义)
* 与 PG 下会解析出不同的语句边界, 任何单一解析都可能被另一方言走私多语句(审查发现 F2)。
*/
function scanSql(sql) {
	let stripped = "";
	let cleaned = "";
	let backslashInLiteral = false;
	let i = 0;
	const n = sql.length;
	while (i < n) {
		const ch = sql[i];
		const two = sql.slice(i, i + 2);
		if (two === "--" || ch === "#") {
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
		if (ch === "'" || ch === "\"" || ch === "`") {
			const quote = ch;
			let literal = quote;
			i++;
			while (i < n) {
				if (sql[i] === "\\") backslashInLiteral = true;
				if (sql[i] === quote) {
					if (sql[i + 1] === quote) {
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
			stripped += quote + quote;
			cleaned += literal;
			continue;
		}
		stripped += ch;
		cleaned += ch;
		i++;
	}
	return {
		stripped,
		cleaned,
		backslashInLiteral
	};
}
/**
* SQL 安全阀。
* @param sql 原始 SQL(单条查询)
* @param maxRows 行数上限 — 语句无 LIMIT 时自动追加; 有 LIMIT 但超上限时收紧
*/
function guardSql(sql, maxRows) {
	const raw = (sql || "").trim().replace(/;+\s*$/, "");
	if (!raw) return {
		ok: false,
		reason: "SQL 为空"
	};
	if (raw.length > 2e4) return {
		ok: false,
		reason: "SQL 过长(>20000 字符)"
	};
	const { stripped, cleaned, backslashInLiteral } = scanSql(raw);
	if (backslashInLiteral) return {
		ok: false,
		reason: "字符串字面量里含反斜杠, PG/MySQL 转义语义有歧义, 请改写(如改用 || 拼接或去掉反斜杠)"
	};
	if (stripped.includes(";")) return {
		ok: false,
		reason: "只允许单条语句(检测到分号)"
	};
	if (!ALLOWED_STARTS.test(stripped.trim())) return {
		ok: false,
		reason: "只允许 SELECT / WITH 查询语句"
	};
	const forbidden = stripped.match(FORBIDDEN);
	if (forbidden) return {
		ok: false,
		reason: `检测到禁用关键字: ${forbidden[1] || forbidden[0]}`
	};
	const forbiddenObj = stripped.match(FORBIDDEN_OBJECTS);
	if (forbiddenObj) return {
		ok: false,
		reason: `检测到禁用对象/函数: ${forbiddenObj[0]}`
	};
	const base = cleaned.trim();
	const cap = Math.max(1, Math.floor(maxRows));
	const tail = /\blimit\s+(\d+)((\s+offset\s+\d+)?\s*)$/i.exec(base);
	if (tail) {
		if (parseInt(tail[1], 10) > cap) return {
			ok: true,
			sql: base.slice(0, tail.index) + `LIMIT ${cap}` + (tail[2] || "")
		};
		return {
			ok: true,
			sql: base
		};
	}
	return {
		ok: true,
		sql: `SELECT * FROM (${base}) AS _guarded LIMIT ${cap}`
	};
}

//#endregion
//#region src/core/store.ts
function configPath() {
	return join(process.env.DSH_HOME || join(process.env.HOME || "~", ".dsh"), "limix-datasource.json");
}
function readConfig() {
	try {
		const raw = readFileSync(configPath(), "utf8");
		const v = JSON.parse(raw);
		return { sources: Array.isArray(v?.sources) ? v.sources : [] };
	} catch {
		return { sources: [] };
	}
}
/** 原子写（tmp+rename）+ 0600 */
function writeConfig(cfg) {
	const p = configPath();
	mkdirSync(dirname(p), { recursive: true });
	const tmp = p + ".tmp";
	writeFileSync(tmp, JSON.stringify(cfg, null, 2), "utf8");
	chmodSync(tmp, 384);
	renameSync(tmp, p);
}
function listSources() {
	return readConfig().sources;
}
function getSource(id) {
	return readConfig().sources.find((s) => s.id === id) ?? null;
}
function upsertSource(s) {
	const cfg = readConfig();
	const row = {
		...s,
		id: s.id || randomUUID()
	};
	const i = cfg.sources.findIndex((x) => x.id === row.id);
	if (i >= 0) cfg.sources[i] = row;
	else cfg.sources.push(row);
	writeConfig(cfg);
	return row;
}
function deleteSource(id) {
	const cfg = readConfig();
	const n = cfg.sources.length;
	cfg.sources = cfg.sources.filter((x) => x.id !== id);
	if (cfg.sources.length === n) return false;
	writeConfig(cfg);
	return true;
}
/** 行 → 驱动连接参数（形状与原版一致，drivers/materialize 零改动消费） */
function toConn(row) {
	return {
		kind: row.kind,
		host: row.host,
		port: row.port,
		database: row.database,
		schema: row.schema ?? null,
		username: row.username,
		password: row.password
	};
}
function ensureConfigFile() {
	if (!existsSync(configPath())) writeConfig({ sources: [] });
}

//#endregion
//#region src/core/materialize.ts
const PREVIEW_TIMEOUT_MS = 2e4;
const MATERIALIZE_TIMEOUT_MS = 5e4;
async function previewQuery(source, sql) {
	const g = guardSql(sql, PREVIEW_MAX_ROWS);
	if (!g.ok) throw new Error(`SQL 未通过安全阀: ${g.reason}`);
	const res = await getDriver(source.kind).runQuery(toConn(source), g.sql, {
		maxRows: PREVIEW_MAX_ROWS,
		timeoutMs: PREVIEW_TIMEOUT_MS
	});
	return {
		...res,
		columns: sanitizeColumns(res.columns),
		rows: res.rows.map((r) => r.map(cellToText))
	};
}
async function materializeQuery(source, sql) {
	const g = guardSql(sql, MATERIALIZE_MAX_ROWS);
	if (!g.ok) throw new Error(`SQL 未通过安全阀: ${g.reason}`);
	const res = await getDriver(source.kind).runQuery(toConn(source), g.sql, {
		maxRows: MATERIALIZE_MAX_ROWS,
		timeoutMs: MATERIALIZE_TIMEOUT_MS
	});
	const columns = sanitizeColumns(res.columns);
	return {
		csv: toCsv(columns, res.rows.map((r) => r.map(cellToText))),
		columns,
		rowCount: res.rowCount,
		truncated: res.truncated
	};
}

//#endregion
//#region src/core/types.ts
const DATA_SOURCE_KINDS = ["postgres", "mysql"];

//#endregion
//#region src/index.ts
const inject = ["tools", "webServer"];
/** 无 Date.now 顾虑（Node 半普通运行时）；文件名时间戳与原版口径一致 */
function stamp() {
	return (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T]/g, "").slice(0, 14);
}
/** 面向 agent 的源身份信息（凭据永不出层——原版纪律） */
function publicSource(s) {
	return {
		id: s.id,
		名称: s.name,
		类型: s.kind,
		库名: s.database,
		schema: s.schema ?? null,
		演示源: !!s.isDemo
	};
}
const DESCRIPTION = `连接客户数据库取数（数据的第二个来源，另一来源是上传/样本 CSV）。全链路只读。
子命令：list（列出已配置数据源）；inspect --source <id> [--table 表名]（不传 table 回表清单，传了回列结构+中文注释+采样5行）；query --source <id> --sql <单条SELECT/WITH> [--mode preview|materialize] [--file-name 名.csv] [--workdir 目录]。
工作流（铁律）：list → 对要用的每张表 inspect 看结构与注释 → **生成的 SQL 必须先在回复里用代码块展示给用户并用一句中文解释取的是什么（可见/可确认/可纠正），不要偷偷执行** → query mode=preview 自查（≤100行）→ 确认无误再 mode=materialize 落 CSV 进文件区 → 照常用 limix 工具预测。
**多表 JOIN 拼成一张宽表是本工具的核心用法**（如电价+气象+预测按省份和时间拼宽表）。只允许单条只读查询，写操作会被安全阀拒绝。materialize 上限 50 万行。`;
function apply(ctx) {
	ensureConfigFile();
	ctx.tools.register(defineTool({
		name: "datasource",
		description: DESCRIPTION,
		parameters: {
			command: {
				type: "string",
				required: true,
				enum: [
					"list",
					"inspect",
					"query"
				],
				description: "子命令"
			},
			source: {
				type: "string",
				description: "数据源 id（来自 list）"
			},
			table: {
				type: "string",
				description: "inspect 用：表名；不传返回表清单"
			},
			sql: {
				type: "string",
				description: "query 用：单条只读 SQL（SELECT/WITH），执行前必须已在回复中展示给用户"
			},
			mode: {
				type: "string",
				enum: ["preview", "materialize"],
				description: "query 用：preview 自查（默认）/ materialize 落盘 CSV"
			},
			fileName: {
				type: "string",
				description: "materialize 落盘文件名（.csv 可省略），不传自动命名"
			},
			workdir: {
				type: "string",
				description: "materialize 落盘目录（默认：调用方会话的工作目录）"
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					command: {
						type: "string",
						required: true
					},
					ok: {
						type: "boolean",
						required: true
					},
					text: {
						type: "string",
						required: true
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.text
			}]
		},
		async execute(args) {
			const J = (v) => JSON.stringify(v, null, 2);
			const fail = (reason) => ({
				command: args.command,
				ok: false,
				text: J({ 错误: reason })
			});
			try {
				if (args.command === "list") {
					const sources = listSources();
					if (!sources.length) return {
						command: "list",
						ok: true,
						text: J({
							数据源: [],
							提示: "当前没有可用的数据源。请用户到 设置 → 数据源 里添加连接（支持 postgres/mysql），配置只读账号。"
						})
					};
					return {
						command: "list",
						ok: true,
						text: J({
							数量: sources.length,
							数据源: sources.map(publicSource)
						})
					};
				}
				const src = args.source ? getSource(args.source) : null;
				if (!src) return fail(`未找到数据源: ${args.source ?? "(未传 source)"}——先用 list 子命令看可用清单`);
				if (args.command === "inspect") {
					const driver = getDriver(src.kind);
					if (!args.table) {
						const tables = await driver.listTables(toConn(src));
						return {
							command: "inspect",
							ok: true,
							text: J({
								数据源: src.name,
								库名: src.database,
								表数量: tables.length,
								表清单: tables.map((t) => ({
									表名: t.name,
									注释: t.comment
								})),
								下一步: "对要用到的每张表分别调用 inspect(source, table=<表名>) 看列结构与采样，再写 SQL。"
							})
						};
					}
					const info = await driver.describeTable(toConn(src), args.table, 5);
					return {
						command: "inspect",
						ok: true,
						text: J({
							数据源: src.name,
							表名: info.name,
							表注释: info.comment,
							列: info.columns.map((c) => ({
								列名: c.name,
								类型: c.dataType,
								注释: c.comment
							})),
							采样5行: info.sampleRows
						})
					};
				}
				if (args.command === "query") {
					if (!args.sql) return fail("query 需要 sql 参数（单条 SELECT/WITH）");
					if ((args.mode === "materialize" ? "materialize" : "preview") === "preview") {
						const r$1 = await previewQuery(src, args.sql);
						return {
							command: "query",
							ok: true,
							text: J({
								模式: "preview",
								数据源: src.name,
								列: r$1.columns,
								行数: r$1.rowCount,
								已截断: r$1.truncated,
								数据: r$1.rows,
								下一步: "与用户确认数据无误后，用 mode=materialize 落盘成 CSV，再用 limix 工具预测。"
							})
						};
					}
					const r = await materializeQuery(src, args.sql);
					const name = args.fileName ? /\.csv$/i.test(args.fileName) ? args.fileName : `${args.fileName}.csv` : `ds_查询结果_${stamp()}.csv`;
					const full = join(args.workdir && isAbsolute(args.workdir) ? args.workdir : resolve(process.cwd(), args.workdir ?? "."), name);
					writeFileSync(full, r.csv, "utf8");
					return {
						command: "query",
						ok: true,
						text: J({
							模式: "materialize",
							数据源: src.name,
							文件: full,
							列: r.columns,
							行数: r.rowCount,
							已截断: r.truncated,
							下一步: "宽表已落文件区。用 limix 工具（forecast/classify/regress）对该文件预测，或先剖析数据。"
						})
					};
				}
				return fail(`未知子命令: ${args.command}`);
			} catch (e) {
				return fail(String(e?.message ?? e));
			}
		}
	}));
	const readBody = (req) => new Promise((res, rej) => {
		let b = "";
		req.on("data", (c) => {
			b += c;
		});
		req.on("end", () => res(b));
		req.on("error", rej);
	});
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/limix-datasource/config",
		handler: async (req, res) => {
			try {
				if (req.method === "GET") {
					res.writeHead(200, { "content-type": "application/json" });
					res.end(JSON.stringify({
						sources: listSources(),
						kinds: DATA_SOURCE_KINDS
					}));
					return;
				}
				if (req.method === "POST") {
					const body = JSON.parse(await readBody(req));
					const incoming = Array.isArray(body?.sources) ? body.sources : [];
					for (const s of incoming) {
						if (!DATA_SOURCE_KINDS.includes(s.kind)) throw new Error(`不支持的类型: ${s.kind}`);
						if (!s.name || !s.host || !s.database || !s.username) throw new Error("name/host/database/username 必填");
						const port = Number(s.port);
						if (!(port >= 1 && port <= 65535)) throw new Error(`端口非法: ${s.port}`);
					}
					const keep = /* @__PURE__ */ new Set();
					for (const s of incoming) keep.add(upsertSource(s).id);
					for (const s of listSources()) if (!keep.has(s.id)) deleteSource(s.id);
					res.writeHead(200, { "content-type": "application/json" });
					res.end(JSON.stringify({
						ok: true,
						sources: listSources()
					}));
					return;
				}
				res.writeHead(405);
				res.end();
			} catch (e) {
				res.writeHead(400, { "content-type": "application/json" });
				res.end(JSON.stringify({
					ok: false,
					error: String(e?.message ?? e)
				}));
			}
		}
	}), "limix-datasource: config 路由");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/limix-datasource/test",
		handler: async (req, res) => {
			try {
				if (req.method !== "POST") {
					res.writeHead(405);
					res.end();
					return;
				}
				const s = JSON.parse(await readBody(req))?.source;
				const r = await getDriver(s.kind).testConnection(toConn(s));
				res.writeHead(200, { "content-type": "application/json" });
				res.end(JSON.stringify(r));
			} catch (e) {
				res.writeHead(200, { "content-type": "application/json" });
				res.end(JSON.stringify({
					ok: false,
					error: String(e?.message ?? e)
				}));
			}
		}
	}), "limix-datasource: 测试连接路由");
}

//#endregion
export { apply, inject };