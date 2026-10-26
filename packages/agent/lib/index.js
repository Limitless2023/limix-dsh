import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

//#region src/host/tool.js
/** 模型可见的子命令词表（scripts/limix.py）。 */
const COMMANDS = [
	"health",
	"check",
	"upload",
	"classify",
	"regress",
	"forecast",
	"task",
	"tasks",
	"cancel",
	"result",
	"download",
	"data",
	"api"
];
const DESCRIPTION = `调用 LimiX 开放平台 API 完成表格数据预测（免训练、零调参），覆盖 上传数据 → 分类/回归/时序预测 → 任务轮询 → 结果下载 全流程。
子命令：health / check（连通性）；upload <文件>（上传得 data_version_id）；classify / regress / forecast（上传→提交→轮询→下载一条龙，需 --train --predict --target，时序另需 --date --context --horizon）；task <id> / tasks（查任务）；result <id> / download <id> -o 文件（取结果）；data files|versions（查数据）；api <METHOD> <path>（逃生舱裸调任意端点）。
终态口径：预测任务成功终态判据 is_ready=true（finished）；数据接入/治理/插补/因果任务成功终态 succeeded。凭据已配置于 ~/.limix/config.json，无需额外传参。文件路径用绝对路径，或相对调用时所在目录的相对路径。`;
/** Python CLI 入口的解析链：显式配置 > 环境变量 > 包内自带。 */
function resolveCli(config) {
	const bundled = fileURLToPath(new URL("../assets/limix.py", import.meta.url));
	const tried = [
		config?.cliPath,
		process.env.LIMIX_CLI_PATH,
		bundled
	].filter(Boolean);
	const found = tried.find((p) => existsSync(p));
	if (!found) throw new Error("limix CLI 未找到：包内 assets/limix.py 缺失。可用 LIMIX_CLI_PATH 指向 scripts/limix.py 覆盖。已尝试：" + (tried.join(" , ") || "（无候选）"));
	return found;
}
/** 一次 CLI 调用；exec.signal 中止子进程，timeoutMs 兜底整体时长。 */
function runCli(pythonBin, cliPath, command, args, workdir, timeoutMs, signal) {
	return new Promise((resolvePromise, reject) => {
		const child = spawn(pythonBin, [
			cliPath,
			command,
			...args
		], {
			cwd: workdir || process.cwd(),
			signal,
			timeout: timeoutMs,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("close", (code) => resolvePromise({
			exitCode: code ?? -1,
			stdout,
			stderr
		}));
	});
}
/**
* 注册 `limix` 工具。
* @param ctx 宿主插件上下文（需要 ctx.tools）
* @param config { cliPath?, pythonBin?, timeoutMs? }
*/
function registerLimixTool(ctx, config = {}) {
	const cliPath = resolveCli(config);
	const pythonBin = config.pythonBin || process.env.LIMIX_PYTHON_BIN || "python3";
	const timeoutMs = config.timeoutMs ?? 6e5;
	ctx.tools.register({
		name: "limix",
		description: DESCRIPTION,
		parameters: {
			type: "object",
			required: ["command"],
			additionalProperties: false,
			properties: {
				command: {
					type: "string",
					enum: COMMANDS,
					description: "limix 子命令（见 description 里的命令表）"
				},
				args: {
					type: "array",
					items: { type: "string" },
					description: "传给子命令的参数，每项一个 token，不经过 shell 解析（含空格的路径/值直接作为单个 token 传入）"
				},
				workdir: {
					type: "string",
					description: "CLI 运行目录（默认：调用方会话的工作目录）"
				}
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					command: { type: "string" },
					exitCode: { type: "number" },
					stdout: { type: "string" },
					stderr: { type: "string" }
				},
				required: [
					"command",
					"exitCode",
					"stdout",
					"stderr"
				]
			},
			render(_args, value) {
				return [{
					type: "text",
					text: value.stdout + (value.stderr ? `\n[stderr]\n${value.stderr}` : "")
				}];
			}
		},
		async execute(args, exec) {
			if (!COMMANDS.includes(args.command)) throw new Error(`未知的 limix 子命令：${args.command}`);
			const { exitCode, stdout, stderr } = await runCli(pythonBin, cliPath, args.command, args.args ?? [], args.workdir, timeoutMs, exec.signal);
			return {
				command: args.command,
				exitCode,
				stdout,
				stderr
			};
		}
	});
	ctx.logger?.info?.("limix tool ready: %s (%s)", cliPath, pythonBin);
}

//#endregion
//#region src/index.ts
const name = "limix-agent";
const inject = ["webServer", "tools"];
/** 单文件上限：演示级 CSV 远小于此；防误读大文件拖垮内存。 */
const MAX_BYTES = 5e6;
function apply(ctx, config = {}) {
	registerLimixTool(ctx, {
		cliPath: config.cliPath,
		pythonBin: config.pythonBin
	});
	const roots = [...(config.csvRoots ?? []).filter((r) => typeof r === "string" && r.length > 0), process.cwd()];
	/** 把 raw 解析到某个白名单根内的真实文件；越界/不存在/超限返回 null。 */
	async function resolveInRoots(raw) {
		for (const root of roots) {
			const candidate = isAbsolute(raw) ? raw : resolve(root, raw);
			try {
				const real = await realpath(candidate);
				const realRoot = await realpath(root);
				if (real !== realRoot && !real.startsWith(realRoot + sep)) continue;
				const st = await stat(real);
				if (st.isFile() && st.size <= MAX_BYTES) return real;
			} catch {}
		}
		return null;
	}
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/limix-ui/csv",
		handler: async (req, res) => {
			try {
				if (req.method !== "GET") {
					res.writeHead(405);
					res.end();
					return;
				}
				const raw = new URL(req.url ?? "/", "http://localhost").searchParams.get("path") ?? "";
				if (!raw || !raw.toLowerCase().endsWith(".csv")) {
					res.writeHead(403);
					res.end("csv only");
					return;
				}
				const target = await resolveInRoots(raw);
				if (!target) {
					res.writeHead(404);
					res.end("not found or outside allowed roots");
					return;
				}
				const text = await readFile(target, "utf8");
				res.writeHead(200, {
					"content-type": "text/csv; charset=utf-8",
					"cache-control": "no-store"
				});
				res.end(text);
			} catch (e) {
				res.writeHead(500);
				res.end(String(e?.message ?? e));
			}
		}
	}), "limix-agent: csv 只读路由");
}

//#endregion
export { apply, inject, name };