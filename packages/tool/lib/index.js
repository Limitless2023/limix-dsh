import { createRequire } from "node:module";
import { mkdir, open, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { homedir } from "node:os";

//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb$2, mod) => function() {
	return mod || (0, cb$2[__getOwnPropNames(cb$2)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n$3 = keys.length, key; i < n$3; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k$2) => from[k$2]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require = /* @__PURE__ */ createRequire(import.meta.url);

//#endregion
//#region src/host/python-runtime.js
/**
* [INPUT]: 包内 limix_runtime.py、runCli 进程边界与显式 Python 配置。
* [OUTPUT]: createPythonRuntime，启动预准备、状态检查、失败后重试及比较解释器。
* [POS]: preset 专属依赖生命周期；不修改系统 Python，不阻塞普通预测注册。
* [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
*/
function createPythonRuntime({ runtimePath, pythonBin, runCli: runCli$1, logger }) {
	const installer = runtimePath;
	const lifetime = new AbortController();
	let pending, ready;
	const choosePython = async (signal) => {
		for (const candidate of [...new Set([
			pythonBin,
			"python3.14",
			"python3.13",
			"python3.12",
			"python3",
			"python"
		])]) try {
			if ((await runCli$1(candidate, "-c", "import sys;sys.exit(0 if sys.version_info >= (3,12) else 1)", [], void 0, 15e3, signal)).exitCode === 0) return candidate;
		} catch (error) {
			if (signal?.aborted) throw error;
		}
		throw new Error("未找到 Python 3.12+。请安装 Python 3.12 或更新版本，或配置 LIMIX_PYTHON_BIN；模型比较依赖会自动装入独立环境。");
	};
	const prepare = () => {
		if (ready) return Promise.resolve(ready);
		if (!pending) pending = (async () => {
			const result = await runCli$1(await choosePython(lifetime.signal), installer, "prepare", [], void 0, 9e5, lifetime.signal);
			let data;
			try {
				data = JSON.parse(result.stdout);
			} catch {
				throw new Error(result.stderr || "Python 环境准备未返回结果");
			}
			if (result.exitCode !== 0 || data.status !== "ready") throw new Error(data.error || result.stderr || "Python 环境准备失败");
			ready = data;
			return data;
		})().finally(() => {
			pending = void 0;
		});
		return pending;
	};
	return {
		prepare,
		async wait(signal) {
			signal?.throwIfAborted();
			const promise = prepare();
			if (!signal) return promise;
			return new Promise((resolve$1, reject) => {
				const abort = () => reject(Object.assign(/* @__PURE__ */ new Error("等待 Python 环境已取消；后台安装继续准备"), { name: "AbortError" }));
				signal.addEventListener("abort", abort, { once: true });
				promise.then(resolve$1, reject).finally(() => signal.removeEventListener("abort", abort));
			});
		},
		status: () => ready ?? { status: pending ? "preparing" : "not_ready" },
		start() {
			prepare().catch((error) => logger?.warn?.("LimiX Python 环境准备失败，可用 runtime prepare 重试：%s", error.message));
		},
		dispose() {
			lifetime.abort();
		}
	};
}

//#endregion
//#region src/host/tool.js
/** 模型可见的命令词表；report 本地执行，其余交给 Python CLI。 */
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
	"api",
	"explain",
	"benchmark",
	"report",
	"runtime"
];
const DESCRIPTION = `调用 LimiX 开放平台 API 完成表格数据预测（免训练、零调参），覆盖 上传数据 → 分类/回归/时序预测 → 任务轮询 → 结果下载 全流程。
子命令：health / check（连通性）；upload <文件>（上传得 data_version_id）；classify / regress / forecast（上传→提交→轮询→下载一条龙，需 --train --predict --target，时序另需 --date --context --horizon；时序的 --predict 可选，不传则按 --horizon 自动外推）；task <id> / tasks（查任务）；result <id> / download <id> -o 文件（取结果）；data files|versions（查数据）；api <METHOD> <path>（逃生舱裸调任意端点）。
参数帮助：通过本工具传 command="forecast"、args=["--help"]（其它子命令同理）。CLI 由本工具封装，不在 shell 的 PATH 中，不要搜索或执行 shell limix 命令。
时序区间：--quantile --levels 0.1,0.5,0.9 返回 P10/P50/P90；--context 90 直接使用最近 90 个历史点，无需剪裁原始文件。--output 指定保存 CSV 的路径。
评估：可传 --truth 本地 CSV，含目标列，时序还须含日期列；它只用于本地对照，不会上传。
解释：explain --mode local --train 参考CSV --data 待解释CSV --target 目标 --task-type regression或classification --row 1 --output 解释.json。全局图用 --mode directed或undirected --data 含目标CSV --target 目标 --features 特征1,特征2；字段须完整数值。可选 --labels 字段字典.json、--prediction 原预测.csv。解释自动上传、轮询和保存JSON/CSV；--task-id 续查，不重复提交。参数未知、版本变化或参数校验失败时用 explain --help；已有适用说明直接复用。
模型比较：benchmark --manifest 数据集清单.json --models LIMIX_7M,LIMIX_16M,XGBoost,BASELINE --output 比较.json；自动保存可恢复回执、JSON/CSV/HTML，使用同一固定拆分。插件激活时自动预装固定版本依赖到独立 Python 环境，比较时自动等待准备完成；无需自己 pip install。runtime status 查看准备状态，runtime prepare 重试；--python 可显式指定已有独立环境。仅支持回归/分类；参数未知、版本变化或参数校验失败时查 --help。
时序解释：explain --mode local --task-type timeseries --result-version-id 已完成时序预测的结果版本ID --output 解释.json，沿用原预测参数，不传 data/train/target。
带图报告：report --manifest 报告清单.json --output 报告.html；先保存业务分析 Markdown，再用已有结果生成可离线阅读的 HTML，不重新提交预测。首次使用先查 report --help 获取清单格式；支持回归散点、分类混淆矩阵、时序曲线、贡献热力图、关系图和模型比较图。该入口在宿主本地执行，不经 Python CLI。
终态口径：预测任务成功须 status=finished 且有 result_version_id（is_ready=true 仅表示停止轮询）；扩展解释使用 task_status=succeeded，降级或部分成功须说明。凭据由现有配置读取，无需额外传参。文件路径用绝对路径，或相对调用时所在目录的相对路径。`;
/** Python CLI 入口的解析链：显式配置 > 环境变量 > 包内自带。 */
function resolveCli(config) {
	const bundled = fileURLToPath(new URL("../assets/limix.py", import.meta.url));
	const tried = [
		config?.cliPath,
		process.env.LIMIX_CLI_PATH,
		bundled
	].filter(Boolean);
	const found = tried.find((p$2) => existsSync(p$2));
	if (!found) throw new Error("limix CLI 未找到：包内 assets/limix.py 缺失。可用 LIMIX_CLI_PATH 指向 scripts/limix.py 覆盖。已尝试：" + (tried.join(" , ") || "（无候选）"));
	return found;
}
/** 一次 CLI 调用；Windows 使用 taskkill 收掉树，POSIX 委派层转发终止信号。 */
function runCli(pythonBin, cliPath, command, args, workdir, timeoutMs, signal, runtime = {}) {
	return new Promise((resolvePromise, reject) => {
		const spawnChild = runtime.spawn || spawn;
		const windows = (runtime.platform || process.platform) === "win32";
		const abortError = () => Object.assign(/* @__PURE__ */ new Error("LimiX 工具已取消"), { name: "AbortError" });
		if (signal?.aborted) {
			reject(abortError());
			return;
		}
		const child = spawnChild(pythonBin, [
			cliPath,
			command,
			...args
		], {
			cwd: workdir || process.cwd(),
			...windows ? {} : {
				signal,
				timeout: timeoutMs
			},
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		});
		let stdout = "";
		let stderr = "";
		let timer;
		let stopping = false;
		const stopWindowsTree = (error) => {
			if (stopping) return;
			stopping = true;
			if (child.pid) spawnChild("taskkill", [
				"/PID",
				String(child.pid),
				"/T",
				"/F"
			], {
				windowsHide: true,
				stdio: "ignore"
			}).on("error", (killError) => {
				stderr += `\n进程树终止失败：${killError.message}`;
			});
			reject(error);
		};
		const onAbort = () => stopWindowsTree(abortError());
		const cleanup = () => {
			clearTimeout(timer);
			if (windows) signal?.removeEventListener("abort", onAbort);
		};
		if (windows) {
			signal?.addEventListener("abort", onAbort, { once: true });
			if (timeoutMs > 0) timer = setTimeout(() => stopWindowsTree(Object.assign(/* @__PURE__ */ new Error(`LimiX 工具运行超时（${timeoutMs}ms）`), { name: "TimeoutError" })), timeoutMs);
		}
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", (error) => {
			cleanup();
			reject(error);
		});
		child.on("close", (code) => {
			cleanup();
			resolvePromise({
				exitCode: code ?? -1,
				stdout,
				stderr
			});
		});
	});
}
/**
* 注册 `limix` 工具。
* @param ctx 宿主插件上下文（需要 ctx.tools）
* @param config { cliPath?, pythonBin?, timeoutMs?, csv?, artifacts?, reports?, reportCommand }
*/
function registerLimixTool(ctx, config = {}) {
	const cliPath = resolveCli(config);
	const pythonBin = config.pythonBin || process.env.LIMIX_PYTHON_BIN || "python3";
	const timeoutMs = config.timeoutMs ?? 6e5;
	const runtime = createPythonRuntime({
		runtimePath: fileURLToPath(new URL("../assets/limix_runtime.py", import.meta.url)),
		pythonBin,
		runCli,
		logger: ctx.logger
	});
	if (config.preparePython !== false) ctx.effect(() => {
		runtime.start();
		return () => runtime.dispose();
	});
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
			if (args.command === "runtime") {
				const action = args.args?.[0] ?? "status";
				if (!["status", "prepare"].includes(action) || (args.args?.length ?? 0) > 1) return {
					command: "runtime",
					exitCode: 2,
					stdout: JSON.stringify({ error: "使用 runtime status 或 runtime prepare" }),
					stderr: ""
				};
				try {
					const data = action === "prepare" ? await runtime.wait(exec.signal) : runtime.status();
					return {
						command: "runtime",
						exitCode: 0,
						stdout: JSON.stringify(data),
						stderr: ""
					};
				} catch (error) {
					if (error.name === "AbortError") throw error;
					return {
						command: "runtime",
						exitCode: 2,
						stdout: JSON.stringify({
							error: error.message,
							stage: "environment",
							hint: "修复 Python 或网络后运行 runtime prepare 重试"
						}),
						stderr: ""
					};
				}
			}
			let selectedPython = pythonBin;
			if (args.command === "benchmark" && !(args.args ?? []).some((a) => [
				"--help",
				"-h",
				"--python"
			].includes(a))) try {
				selectedPython = (await runtime.wait(exec.signal)).python;
			} catch (error) {
				if (error.name === "AbortError") throw error;
				return {
					command: args.command,
					exitCode: 2,
					stdout: JSON.stringify({
						error: error.message,
						stage: "environment",
						hint: "环境准备失败，尚未提交比较任务。使用 runtime prepare 重试。"
					}),
					stderr: ""
				};
			}
			const { exitCode, stdout, stderr } = args.command === "report" ? await config.reportCommand(args.args ?? [], args.workdir, exec.signal) : await runCli(selectedPython, cliPath, args.command, args.args ?? [], args.workdir, timeoutMs, exec.signal);
			if (exitCode === 0 && config.csv) {
				let data;
				try {
					data = JSON.parse(stdout);
				} catch {}
				if (typeof data?.saved_to === "string") {
					const paths = [
						data.saved_to,
						data.csv_path,
						data.explanation?.detail_path
					].filter((p$2) => typeof p$2 === "string");
					if (args.command === "report" && config.reports) {
						await config.previews?.remember(data.preview_paths ?? [], args.workdir || process.cwd());
						await config.reports.remember([
							data.saved_to,
							data.report_path,
							data.markdown_path
						], args.workdir || process.cwd());
					}
					const tokens = args.args ?? [];
					if ([
						"classify",
						"regress",
						"forecast"
					].includes(args.command)) for (const flag of [
						"--train",
						"--predict",
						"--truth"
					]) {
						const index = tokens.indexOf(flag);
						if (index >= 0 && tokens[index + 1]) paths.push(tokens[index + 1]);
					}
					try {
						await config.csv.remember(paths, args.workdir || process.cwd());
					} catch (error) {
						ctx.logger?.warn?.("limix CSV registration failed: %s", error.message);
					}
					if (["explain", "benchmark"].includes(args.command) && config.artifacts) try {
						await config.artifacts.remember(paths, args.workdir || process.cwd());
					} catch (error) {
						ctx.logger?.warn?.("limix artifact registration failed: %s", error.message);
					}
				}
			}
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
//#region src/host/predict-command.js
const WORKFLOW$2 = `当用户要求预测、分类、回归、时序外推，或使用 /limix-predict，执行预测流程：
1. 识别业务目标、训练数据、待预测数据与目标列，查看列名、样本和行数。任务类型由你根据数据判断：classify（类别）、regress（连续数值）、forecast（时间序列）。用户尚未给数据时只问必要信息，不要求用户选择内部命令。
2. 核对特征在业务预测时点是否可获得，排除目标泄漏、事后信息和纯标识列。保留待预测数据的真实目标值供本地评估，不能把训练集直接当测试集。需要拆分时，分类分层，同一实体或重复样本按组，时序按时间；拆分规则不能按测试成绩调整。
3. 通过一次 limix classify/regress/forecast 调用完成上传、提交、轮询和保存。直接传本地绝对路径给 --train 和 --predict，不先 upload 换成版本 ID，以保留本地评估来源。必须传 --target、--output，workdir 传会话工作目录；输出文件采用 limix-<目标列>-<时间戳>.csv。用户指定模型时必须显式传 --model（如 LIMIX_7M），不能遗漏后使用服务默认模型；未指定才使用默认。提交后核对回执中的实际模型，未知时不把期望模型写成已使用的模型；模型不符时如实说明并纠正，不混入指定模型的报告结论。
4. forecast 还需 --date、--context、--horizon。根据频率、可用历史和主要周期选择 context；历史不足一个完整周期时说明限制，不凭空补齐。未来协变量须覆盖预测日期，并区分预先已知信息、当时可用的预测信息和事后观测；事后真值不能作为模型输入。有未来协变量时传 --predict，没有时省略 --predict，按 --horizon 外推。--context 已限制历史长度，无需剪裁文件。P10/P50/P90 用 --quantile --levels 0.1,0.5,0.9，不自行估算区间。
5. 有独立真值时传 --truth 本地 CSV；时序真值须含日期列与目标列，日期逐行对齐预测。--truth 不上传、不参与预测。没有真值也能预测，但无法评估。metrics 是本地真实值对照，不称为服务端评估。--truth 是预测流程参数，不是现成 CSV 的独立评分入口；后补真值时不能承诺传 --truth 就无需重跑预测。
6. 成功须 status=finished、result_version_id 和 saved_to；is_ready=true 仅表示停止轮询。报告交代业务目标、实际数据和预测范围，引用关键 metrics 并解释其含义：回归 MAE/RMSE 越低越好，R² 越高越好，负值表示在本测试集上不如用测试真值均值作常数预测（区别于训练均值基线）；分类准确率须结合类别分布解读。只使用已核对的单位，不凭 R² 或 MAE/RMSE 断言没有偏差或异常点。没有业务容差时不声称已达到生产要求；合成样例只说明流程可用。预测成功状态与效果评价分开；R²<0 时直接说明效果较弱，不能因任务完成就推荐使用。日频时序可引用工具返回的 baseline_evaluation：只使用预测起点前历史，超过7天递归使用基线预测，不用未来真值。基线不可用时说明原因，不强行套周周期。误差原因只列有证据的观察或待验证假设。上传或字段校验失败时指出具体问题。`;
function registerPredictCommand(ctx) {
	ctx.systemPrompt.section({
		name: "limix:predict-workflow",
		order: 500,
		text: WORKFLOW$2,
		interpolate: false
	});
	ctx.commands.register({
		name: "limix-predict",
		definitionId: "dsh-limix-tool:predict",
		description: "上传数据并预测，自动保存结果、展示图表与评估指标",
		input: {
			hint: "描述预测目标，附上数据文件或路径",
			attachments: true
		},
		handler: ({ agent, rawInput, attachments = [], signal }) => {
			signal?.throwIfAborted();
			const input = rawInput.trim();
			agent.followup(Object.freeze({
				id: randomUUID(),
				role: "user",
				source: Object.freeze({ kind: "user" }),
				content: Object.freeze([...attachments, Object.freeze({
					type: "text",
					text: input ? `请执行 /limix-predict 预测流程。\n${input}` : "请执行 /limix-predict，先帮我明确需要的数据和预测目标。"
				})])
			}));
			return {
				kind: "success",
				text: "预测助手已启动"
			};
		}
	});
}

//#endregion
//#region src/host/explain-command.js
const WORKFLOW$1 = `当用户要求解释预测、分析影响因素、探索变量关系或使用 /limix-explain，先区分预测解释与关系探索：
1. 表格局部归因用 limix explain --mode local --train 参考CSV --data 待解释CSV --target 目标 --task-type regression或classification；单行用 --row，行号从1开始、不含表头。指定多行用 --rows 1-10 或 --rows 1,3,5-8，全部用 --rows all；row 与 rows 互斥。遵守本轮样本范围，不用数据说明中的示例行数覆盖需求，不额外先提交10行任务。工具会预检有限数值并识别具有唯一值证据的常见标识列；--features 可显式覆盖，返回 excluded_identifiers 保留追踪信息。不静默删除业务分类字段；非数值业务列须使用与原预测一致的编码。用户指定前10行就按原行号执行；用户只说“看一些典型样本”且已授权抽样时，分类可用 --sample-count 10 --sample-seed 42 --prediction 原预测CSV 按预测类别抽样。不能把这种均衡抽样当全体分布，更不能当误判抽样。
2. 时序局部归因用 explain --mode local --task-type timeseries --result-version-id 已完成时序预测的结果版本ID。沿用原预测数据、目标、特征、窗口、步长和模型，不能再传 data/train/target/features/model/row/rows/prediction；行代表预测步。按任务类型补充必要参数：时序已有结果版本时不追问数据、目标或样本范围；表格缺数据、目标或样本范围时只问缺项。
3. 全局关系探索用 explain --mode directed或undirected --data 含目标的CSV --target 目标 --features 特征1,特征2。所选列须为完整有限数值。保持默认阈值，不为让图更复杂而调阈值。边权是模型关系分数，不是增益、实验效应或已验证概率；与物理机制相符只称“一致”，不能声称证明因果或个体反事实。实验记录与模型发现分开，不自动请求预留自然语言报告接口。
4. 必须 --output 唯一的绝对路径.json；工具自动保存原始JSON与贡献/边CSV，不手写或篡改结果。--labels 可传已知字段字典 JSON（fields、target_label、unit），--prediction 可传同一输入逐行对应的原预测CSV作对比。
5. 表格解释原预测时，按原预测实际模型显式传 --model；用户单独指定解释模型时遵守指定。核对解释返回的 model_type，不将不同模型的归因冒充原模型的解释；指定模型被服务拒绝时报告失败，不擅自换模型重试。表格解释会重算预测，使用 explanation.prediction 并称“解释时预测”；有 prior_prediction、prediction_delta 时说明差异，不冒充与原预测一致。时序 prediction_scale=unverified 时称“解释模型输出”：不附业务单位，不与原预测做差，不自行做 exp 等逆变换；target_unit 不是解释模型输出的单位。
6. 贡献分数无目标单位，不写成增减多少MPa；方向是模型归因，不是实际调节收益。分类接口未声明 sign_scores 对应哪一类别，只称“服务返回的贡献方向”，不解释为提升某一类别概率，也不把不同预测标签的平均方向当成同一类别效果。中性或零贡献不等于变量没有实际作用，也不能据此断定共线性。
7. 批量核对 requested_count、explained_count、missing_rows。各影响因子影响分数对比采用带正负的平均贡献：每条 abs(score)×direction 求平均，再按平均值绝对大小排序；未知方向不补零。samples 完整矩阵由界面按 detail_path 加载。missing_rows 非空不得称全部完成；mapping=input_order 只是按输入顺序对应，不是服务索引核验。报告区分 input_rows 输入总量、requested_count 请求量和 explained_count 返回量；局部范围不称全样本结论。样本不足且无索引时拒绝错配；时间与特征名称只使用返回值，整体排名不是有向因果图。
8. 解释终态用 task_status；仅 succeeded 是完整成功，degraded_succeeded 或 partially_succeeded 必须说明限制。续查用 task_id 和原参数/output；缺回执但有请求文件时先通过 api GET /v1/extensions/tasks 排查。参数或权限错误先核对帮助、公开文档与原始错误，不猜测 API 端点，不追加用户未请求的探测任务。
9. 用户问预测误差原因时，先区分模型归因与误差诊断。可描述真实值对照中的日期和偏差；缺少天气、日历信息不足或分布变化等只能列为待验证假设。没有补充数据或对照实验，不断言某因素是主要误差原因，也不声称仅凭某些特征就无法提前预测。`;
function registerExplainCommand(ctx) {
	ctx.systemPrompt.section({
		name: "limix:explain-workflow",
		order: 510,
		text: WORKFLOW$1,
		interpolate: false
	});
	ctx.commands.register({
		name: "limix-explain",
		definitionId: "dsh-limix-tool:explain",
		description: "解释单条或批量预测，探索变量关系，保存完整结果",
		input: {
			hint: "描述要解释的样本或变量，附上数据文件",
			attachments: true
		},
		handler: ({ agent, rawInput, attachments = [], signal }) => {
			signal?.throwIfAborted();
			const input = rawInput.trim();
			agent.followup(Object.freeze({
				id: randomUUID(),
				role: "user",
				source: Object.freeze({ kind: "user" }),
				content: Object.freeze([...attachments, Object.freeze({
					type: "text",
					text: input ? `请执行 /limix-explain 解释流程。\n${input}` : "请执行 /limix-explain，先帮我明确解释对象和数据。"
				})])
			}));
			return {
				kind: "success",
				text: "解释助手已启动"
			};
		}
	});
}

//#endregion
//#region src/host/benchmark-command.js
const WORKFLOW = `比较依赖由插件激活时预装到独立 Python 环境；先用 runtime status 查看状态，失败用 runtime prepare 重试。不得临时向系统 Python 安装依赖；需要自定义环境时才用 --python。
当用户要求比较 LimiX 与其他模型、比较不同 LimiX 模型，或使用 /limix-compare，执行固定拆分模型比较：
1. 当前 benchmark 仅支持 regression/classification。时序比较尚未接入；收到时序比较请求时先说明边界，不能将任务伪装成回归比较或承诺自动完成。先明确数据、目标和独立测试集；同一数据集的所有模型使用完全相同的训练/测试拆分和特征，真值只用于本地评估。分类分层，同一实体或重复样本放在同组；不按成绩挑样本或删除差结果。
2. 用 limix 工具 command=benchmark；manifest JSON 的 datasets 数组包含 id/name/task_type/target/train/predict/truth，文件相对 manifest 所在目录解析。遵守用户指定模型范围，未指定时默认 LIMIX_7M、LIMIX_16M、XGBoost 与均值/多数类 BASELINE；固定 --seed，保存唯一 --output 路径。核对特征在业务预测时点可获得，不能使用目标泄漏或事后信息。
3. 比较入口需要独立 Python 环境中的 numpy/pandas/scikit-learn；选择 XGBoost 时另需 xgboost，并在固定训练集上训练。先检查已有环境，缺依赖时指出具体缺项，通过 --python 指定解释器，不修改宿主运行时。LimiX 预测和解释自身不需要这些第三方库。
4. 命令保存每项回执、JSON、CSV 与 HTML。等待超时使用同一 manifest/参数/output 续跑读取回执。failed/pending/partial 不称全部完成，缺失指标不填0。报告按数据集比较，不跨不同单位平均原始误差。
5. 报告说明业务目标、数据来源、样本数、固定拆分、参与模型、完成数量、关键指标与报告链接。BASELINE 回归用训练目标均值、分类用训练多数类，对每个测试样本输出同一个值；它不学习特征关系。明确误差越低越好、R²和准确率越高越好，不把长误差条当成更好效果。测试集领先只适用于本次固定拆分，不称模型普遍更好。测试样本很少时说明结论稳定性有限，不把一次小样本演示当成最终选型依据。`;
function registerBenchmarkCommand(ctx) {
	ctx.systemPrompt.section({
		name: "limix:benchmark-workflow",
		order: 520,
		text: WORKFLOW,
		interpolate: false
	});
	ctx.commands.register({
		name: "limix-compare",
		definitionId: "dsh-limix-tool:compare",
		description: "在相同测试集上比较多个模型，生成指标与可视化报告",
		input: {
			hint: "描述比较目标，附上数据文件或路径",
			attachments: true
		},
		handler: ({ agent, rawInput, attachments = [], signal }) => {
			signal?.throwIfAborted();
			agent.followup(Object.freeze({
				id: randomUUID(),
				role: "user",
				source: Object.freeze({ kind: "user" }),
				content: Object.freeze([...attachments, Object.freeze({
					type: "text",
					text: rawInput.trim() ? `请执行 /limix-compare 比较流程。\n${rawInput.trim()}` : "请先帮我明确比较目标、数据和独立测试集。"
				})])
			}));
			return {
				kind: "success",
				text: "模型比较已启动"
			};
		}
	});
}

//#endregion
//#region src/host/csv-access.js
let writes = Promise.resolve();
const DEFAULT_MAX_BYTES = 5e6;
const isReportFile = (path) => /\.(?:html|md|svg)$/i.test(path);
function createCsvAccess(roots, receiptPath = join(homedir(), ".limix", "dsh-csv-files.json"), options = {}) {
	const extensions = options.extensions ?? [".csv"];
	const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
	if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error("文件大小限额须为正整数");
	const allowed = (path) => typeof path === "string" && extensions.some((ext) => path.toLowerCase().endsWith(ext));
	const readReceipts = async () => {
		try {
			const data = JSON.parse(await readFile(receiptPath, "utf8"));
			return new Set(Array.isArray(data) ? data.filter((p$2) => typeof p$2 === "string" && isAbsolute(p$2)) : []);
		} catch {
			return /* @__PURE__ */ new Set();
		}
	};
	return {
		async remember(paths, cwd) {
			const save = async () => {
				const files = await readReceipts();
				for (const path of paths) {
					if (!allowed(path)) continue;
					try {
						files.add(await realpath(resolve(cwd, path)));
					} catch {}
				}
				await mkdir(dirname(receiptPath), { recursive: true });
				const temp = `${receiptPath}.${randomUUID()}.tmp`;
				const retained = [...files].filter(isReportFile);
				const recent = [...files].filter((path) => !isReportFile(path)).slice(-1e3);
				await writeFile(temp, JSON.stringify([...retained, ...recent]), { mode: 384 });
				await rename(temp, receiptPath);
			};
			writes = writes.then(save, save);
			await writes;
		},
		async resolve(raw) {
			if (!allowed(raw)) return null;
			const files = await readReceipts();
			for (const root of roots) try {
				const real = await realpath(isAbsolute(raw) ? raw : resolve(root, raw));
				const realRoot = await realpath(root);
				if (!files.has(real) && (options.registeredOnly || real !== realRoot && !real.startsWith(realRoot + sep))) continue;
				const info = await stat(real);
				if (info.isFile() && info.size <= maxBytes) return real;
			} catch {}
			return null;
		}
	};
}

//#endregion
//#region src/report/markdown.ts
/**
* [INPUT]: Agent 保存的 Markdown 正文与已验证的图表占位符。
* [OUTPUT]: 转义后的报告正文；支持标题、列表、表格、代码和链接。
* [POS]: 离线报告的文本层；不执行原始 HTML，不加载远程图片。
* [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
*/
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
})[c]);
function inline(text$1) {
	return text$1.split(/(`[^`]+`|!?\[[^\]]*\]\([^\s)]+\))/g).map((part) => {
		if (part.startsWith("`") && part.endsWith("`")) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
		const link = part.match(/^(!?)\[([^\]]*)\]\(([^\s)]+)\)$/);
		if (link) {
			const [, image, label, url] = link;
			if (!image && /^(https?:\/\/|#)/i.test(url)) return `<a href="${escapeHtml(url)}" rel="noreferrer">${escapeHtml(label)}</a>`;
			return escapeHtml(label || url);
		}
		return escapeHtml(part).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	}).join("");
}
function renderMarkdown(markdown, figures) {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n"), blocks = [], used = /* @__PURE__ */ new Set();
	const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((s$1) => inline(s$1.trim()));
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		const figure = line.match(/^<!--\s*limix-chart:([\w-]+)\s*-->$/) ?? line.match(/^\{\{chart:([\w-]+)\}\}$/);
		if (figure) {
			if (!figures.has(figure[1])) throw new Error(`正文引用了未配置的图表：${figure[1]}`);
			if (used.has(figure[1])) throw new Error(`正文重复引用图表：${figure[1]}`);
			blocks.push(figures.get(figure[1]));
			used.add(figure[1]);
			continue;
		}
		if (line.startsWith("```")) {
			const code = [];
			while (++i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i]);
			blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
			continue;
		}
		const heading = line.match(/^(#{1,6})\s+(.+)$/);
		if (heading) {
			const n$3 = heading[1].length;
			blocks.push(`<h${n$3}>${inline(heading[2])}</h${n$3}>`);
			continue;
		}
		if (/^[-*_]{3,}$/.test(line)) {
			blocks.push("<hr>");
			continue;
		}
		if (line.includes("|") && /^\|?\s*:?-{3,}[-: |]*$/.test(lines[i + 1]?.trim() ?? "")) {
			const head = cells(line), body = [];
			i++;
			while (i + 1 < lines.length && lines[i + 1].trim().includes("|")) body.push(`<tr>${cells(lines[++i]).map((c) => `<td>${c}</td>`).join("")}</tr>`);
			blocks.push(`<div class="table-scroll"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${body.join("")}</tbody></table></div>`);
			continue;
		}
		const list = line.match(/^(?:([-*+])|\d+[.)])\s+(.+)$/);
		if (list) {
			const tag = list[1] ? "ul" : "ol", items = [`<li>${inline(list[2])}</li>`];
			while (i + 1 < lines.length) {
				const next = lines[i + 1].trim().match(tag === "ul" ? /^[-*+]\s+(.+)$/ : /^\d+[.)]\s+(.+)$/);
				if (!next) break;
				items.push(`<li>${inline(next[1])}</li>`);
				i++;
			}
			blocks.push(`<${tag}>${items.join("")}</${tag}>`);
			continue;
		}
		blocks.push(line.startsWith("> ") ? `<blockquote>${inline(line.slice(2))}</blockquote>` : `<p>${inline(line)}</p>`);
	}
	for (const [id$1, figure] of figures) if (!used.has(id$1)) blocks.push(figure);
	return blocks.join("\n");
}

//#endregion
//#region src/report/facts.ts
const metricFacts = (values) => {
	return Object.entries({
		n: ["评估样本数", "本次有效对照数量"],
		mae: ["MAE", "平均绝对误差；越低越好"],
		rmse: ["RMSE", "均方根误差；越低越好"],
		r2: ["R²", "拟合优度；越高越好，不是误差指标"],
		accuracy: ["准确率", "正确分类比例；越高越好"]
	}).filter(([key]) => values[key] !== void 0).map(([key, [name$1, meaning]]) => ({
		name: name$1,
		value: values[key] === null ? "无定义" : Number(values[key].toFixed(6)),
		meaning
	}));
};
function weekday(date) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "未解析";
	const time = /* @__PURE__ */ new Date(date + "T00:00:00Z");
	return Number.isFinite(time.getTime()) && time.toISOString().slice(0, 10) === date ? [
		"周日",
		"周一",
		"周二",
		"周三",
		"周四",
		"周五",
		"周六"
	][time.getUTCDay()] : "未解析";
}
function factsMarkdown(title, facts) {
	const cell = (s$1) => String(s$1).replace(/\|/g, "／").replace(/[\r\n]/g, " ");
	return `### ${cell(title)}\n\n| 项目 | 本次结果 | 说明 |\n| --- | --- | --- |\n` + facts.map((f$1) => `| ${cell(f$1.name)} | ${cell(f$1.value)} | ${cell(f$1.meaning ?? "")} |`).join("\n");
}
function factsHtml(facts) {
	if (!facts.length) return "";
	return "<details class=\"verified-facts\" open><summary>已核验数据 · 程序生成</summary><div class=\"table-scroll\"><table><thead><tr><th>项目</th><th>本次结果</th><th>说明</th></tr></thead><tbody>" + facts.map((f$1) => `<tr><td>${escapeHtml(f$1.name)}</td><td>${escapeHtml(f$1.value)}</td><td>${escapeHtml(f$1.meaning ?? "")}</td></tr>`).join("") + "</tbody></table></div></details>";
}
/** 确定性文案检查；只拦截明确冲突，不把自然语言审查冒充完整事实验证。 */
function validateNarrative(markdown) {
	const body = markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
	const errors = [];
	for (const line of body.split("\n")) {
		if (/(?:R²|R2|R\^2)[\s*]*(?:指标)?[\s*]*(?:为|是|应)?[\s*]*越低越好/i.test(line) && !/不能|不要|错误|并非/.test(line)) errors.push("R² 越高越好，不是越低越好");
		if (/(?:MAE|RMSE)[\s*]*(?:指标)?[\s*]*(?:为|是|应)?[\s*]*越高越好/i.test(line) && !/不能|不要|错误|并非/.test(line)) errors.push("MAE/RMSE 越低越好");
		if (/说明模型用上了.*信息|说明模型利用了.*信息/.test(line)) errors.push("基线对照不能证明模型内部机制，请只描述本次指标差异");
		if (/RMSE.*MAE.*(?:说明|证明).*集中/.test(line)) errors.push("RMSE 与 MAE 的比值不能单独证明误差集中，请引用逐样本核验或删除该推断");
		for (const match of line.matchAll(/(\d{4}-\d{2}-\d{2})[（(\s]*(?:星期|周)([一二三四五六日天])/g)) {
			const actual = weekday(match[1]), stated = "周" + (match[2] === "天" ? "日" : match[2]);
			if (actual !== "未解析" && actual !== stated) errors.push(match[1] + " 应为 " + actual);
		}
	}
	if ((body.match(/（/g) ?? []).length !== (body.match(/）/g) ?? []).length) errors.push("中文括号未配对，请检查残缺句子");
	if (errors.length) throw new Error("报告正文核验未通过：" + [...new Set(errors)].join("；"));
}

//#endregion
//#region ../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react.production.min.js
var require_react_production_min = /* @__PURE__ */ __commonJS({ "../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react.production.min.js": ((exports) => {
	var l$3 = Symbol.for("react.element"), n$2 = Symbol.for("react.portal"), p$1 = Symbol.for("react.fragment"), q$3 = Symbol.for("react.strict_mode"), r$2 = Symbol.for("react.profiler"), t$2 = Symbol.for("react.provider"), u$2 = Symbol.for("react.context"), v$1 = Symbol.for("react.forward_ref"), w$2 = Symbol.for("react.suspense"), x$2 = Symbol.for("react.memo"), y$1 = Symbol.for("react.lazy"), z$2 = Symbol.iterator;
	function A$2(a) {
		if (null === a || "object" !== typeof a) return null;
		a = z$2 && a[z$2] || a["@@iterator"];
		return "function" === typeof a ? a : null;
	}
	var B$1 = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	}, C = Object.assign, D$1 = {};
	function E$1(a, b, e) {
		this.props = a;
		this.context = b;
		this.refs = D$1;
		this.updater = e || B$1;
	}
	E$1.prototype.isReactComponent = {};
	E$1.prototype.setState = function(a, b) {
		if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, a, b, "setState");
	};
	E$1.prototype.forceUpdate = function(a) {
		this.updater.enqueueForceUpdate(this, a, "forceUpdate");
	};
	function F$2() {}
	F$2.prototype = E$1.prototype;
	function G$2(a, b, e) {
		this.props = a;
		this.context = b;
		this.refs = D$1;
		this.updater = e || B$1;
	}
	var H$4 = G$2.prototype = new F$2();
	H$4.constructor = G$2;
	C(H$4, E$1.prototype);
	H$4.isPureReactComponent = !0;
	var I$2 = Array.isArray, J$2 = Object.prototype.hasOwnProperty, K$2 = { current: null }, L$2 = {
		key: !0,
		ref: !0,
		__self: !0,
		__source: !0
	};
	function M$2(a, b, e) {
		var d, c = {}, k$2 = null, h = null;
		if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k$2 = "" + b.key), b) J$2.call(b, d) && !L$2.hasOwnProperty(d) && (c[d] = b[d]);
		var g = arguments.length - 2;
		if (1 === g) c.children = e;
		else if (1 < g) {
			for (var f$1 = Array(g), m$1 = 0; m$1 < g; m$1++) f$1[m$1] = arguments[m$1 + 2];
			c.children = f$1;
		}
		if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
		return {
			$$typeof: l$3,
			type: a,
			key: k$2,
			ref: h,
			props: c,
			_owner: K$2.current
		};
	}
	function N$2(a, b) {
		return {
			$$typeof: l$3,
			type: a.type,
			key: b,
			ref: a.ref,
			props: a.props,
			_owner: a._owner
		};
	}
	function O$2(a) {
		return "object" === typeof a && null !== a && a.$$typeof === l$3;
	}
	function escape$1(a) {
		var b = {
			"=": "=0",
			":": "=2"
		};
		return "$" + a.replace(/[=:]/g, function(a$1) {
			return b[a$1];
		});
	}
	var P$2 = /\/+/g;
	function Q$2(a, b) {
		return "object" === typeof a && null !== a && null != a.key ? escape$1("" + a.key) : b.toString(36);
	}
	function R$2(a, b, e, d, c) {
		var k$2 = typeof a;
		if ("undefined" === k$2 || "boolean" === k$2) a = null;
		var h = !1;
		if (null === a) h = !0;
		else switch (k$2) {
			case "string":
			case "number":
				h = !0;
				break;
			case "object": switch (a.$$typeof) {
				case l$3:
				case n$2: h = !0;
			}
		}
		if (h) return h = a, c = c(h), a = "" === d ? "." + Q$2(h, 0) : d, I$2(c) ? (e = "", null != a && (e = a.replace(P$2, "$&/") + "/"), R$2(c, b, e, "", function(a$1) {
			return a$1;
		})) : null != c && (O$2(c) && (c = N$2(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P$2, "$&/") + "/") + a)), b.push(c)), 1;
		h = 0;
		d = "" === d ? "." : d + ":";
		if (I$2(a)) for (var g = 0; g < a.length; g++) {
			k$2 = a[g];
			var f$1 = d + Q$2(k$2, g);
			h += R$2(k$2, b, e, f$1, c);
		}
		else if (f$1 = A$2(a), "function" === typeof f$1) for (a = f$1.call(a), g = 0; !(k$2 = a.next()).done;) k$2 = k$2.value, f$1 = d + Q$2(k$2, g++), h += R$2(k$2, b, e, f$1, c);
		else if ("object" === k$2) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
		return h;
	}
	function S$2(a, b, e) {
		if (null == a) return a;
		var d = [], c = 0;
		R$2(a, d, "", "", function(a$1) {
			return b.call(e, a$1, c++);
		});
		return d;
	}
	function T$2(a) {
		if (-1 === a._status) {
			var b = a._result;
			b = b();
			b.then(function(b$1) {
				if (0 === a._status || -1 === a._status) a._status = 1, a._result = b$1;
			}, function(b$1) {
				if (0 === a._status || -1 === a._status) a._status = 2, a._result = b$1;
			});
			-1 === a._status && (a._status = 0, a._result = b);
		}
		if (1 === a._status) return a._result.default;
		throw a._result;
	}
	var U$2 = { current: null }, V$2 = { transition: null }, W$4 = {
		ReactCurrentDispatcher: U$2,
		ReactCurrentBatchConfig: V$2,
		ReactCurrentOwner: K$2
	};
	function X$2() {
		throw Error("act(...) is not supported in production builds of React.");
	}
	exports.Children = {
		map: S$2,
		forEach: function(a, b, e) {
			S$2(a, function() {
				b.apply(this, arguments);
			}, e);
		},
		count: function(a) {
			var b = 0;
			S$2(a, function() {
				b++;
			});
			return b;
		},
		toArray: function(a) {
			return S$2(a, function(a$1) {
				return a$1;
			}) || [];
		},
		only: function(a) {
			if (!O$2(a)) throw Error("React.Children.only expected to receive a single React element child.");
			return a;
		}
	};
	exports.Component = E$1;
	exports.Fragment = p$1;
	exports.Profiler = r$2;
	exports.PureComponent = G$2;
	exports.StrictMode = q$3;
	exports.Suspense = w$2;
	exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W$4;
	exports.act = X$2;
	exports.cloneElement = function(a, b, e) {
		if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
		var d = C({}, a.props), c = a.key, k$2 = a.ref, h = a._owner;
		if (null != b) {
			void 0 !== b.ref && (k$2 = b.ref, h = K$2.current);
			void 0 !== b.key && (c = "" + b.key);
			if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
			for (f$1 in b) J$2.call(b, f$1) && !L$2.hasOwnProperty(f$1) && (d[f$1] = void 0 === b[f$1] && void 0 !== g ? g[f$1] : b[f$1]);
		}
		var f$1 = arguments.length - 2;
		if (1 === f$1) d.children = e;
		else if (1 < f$1) {
			g = Array(f$1);
			for (var m$1 = 0; m$1 < f$1; m$1++) g[m$1] = arguments[m$1 + 2];
			d.children = g;
		}
		return {
			$$typeof: l$3,
			type: a.type,
			key: c,
			ref: k$2,
			props: d,
			_owner: h
		};
	};
	exports.createContext = function(a) {
		a = {
			$$typeof: u$2,
			_currentValue: a,
			_currentValue2: a,
			_threadCount: 0,
			Provider: null,
			Consumer: null,
			_defaultValue: null,
			_globalName: null
		};
		a.Provider = {
			$$typeof: t$2,
			_context: a
		};
		return a.Consumer = a;
	};
	exports.createElement = M$2;
	exports.createFactory = function(a) {
		var b = M$2.bind(null, a);
		b.type = a;
		return b;
	};
	exports.createRef = function() {
		return { current: null };
	};
	exports.forwardRef = function(a) {
		return {
			$$typeof: v$1,
			render: a
		};
	};
	exports.isValidElement = O$2;
	exports.lazy = function(a) {
		return {
			$$typeof: y$1,
			_payload: {
				_status: -1,
				_result: a
			},
			_init: T$2
		};
	};
	exports.memo = function(a, b) {
		return {
			$$typeof: x$2,
			type: a,
			compare: void 0 === b ? null : b
		};
	};
	exports.startTransition = function(a) {
		var b = V$2.transition;
		V$2.transition = {};
		try {
			a();
		} finally {
			V$2.transition = b;
		}
	};
	exports.unstable_act = X$2;
	exports.useCallback = function(a, b) {
		return U$2.current.useCallback(a, b);
	};
	exports.useContext = function(a) {
		return U$2.current.useContext(a);
	};
	exports.useDebugValue = function() {};
	exports.useDeferredValue = function(a) {
		return U$2.current.useDeferredValue(a);
	};
	exports.useEffect = function(a, b) {
		return U$2.current.useEffect(a, b);
	};
	exports.useId = function() {
		return U$2.current.useId();
	};
	exports.useImperativeHandle = function(a, b, e) {
		return U$2.current.useImperativeHandle(a, b, e);
	};
	exports.useInsertionEffect = function(a, b) {
		return U$2.current.useInsertionEffect(a, b);
	};
	exports.useLayoutEffect = function(a, b) {
		return U$2.current.useLayoutEffect(a, b);
	};
	exports.useMemo = function(a, b) {
		return U$2.current.useMemo(a, b);
	};
	exports.useReducer = function(a, b, e) {
		return U$2.current.useReducer(a, b, e);
	};
	exports.useRef = function(a) {
		return U$2.current.useRef(a);
	};
	exports.useState = function(a) {
		return U$2.current.useState(a);
	};
	exports.useSyncExternalStore = function(a, b, e) {
		return U$2.current.useSyncExternalStore(a, b, e);
	};
	exports.useTransition = function() {
		return U$2.current.useTransition();
	};
	exports.version = "18.3.1";
}) });

//#endregion
//#region ../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react@18.3.1/node_modules/react/index.js
var require_react = /* @__PURE__ */ __commonJS({ "../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react@18.3.1/node_modules/react/index.js": ((exports, module) => {
	module.exports = require_react_production_min();
}) });

//#endregion
//#region ../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/cjs/react-dom-server-legacy.node.production.min.js
var require_react_dom_server_legacy_node_production_min = /* @__PURE__ */ __commonJS({ "../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/cjs/react-dom-server-legacy.node.production.min.js": ((exports) => {
	var ea$1 = require_react(), fa$1 = __require("stream"), n$1 = Object.prototype.hasOwnProperty, ha$1 = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, ia$1 = {}, ja$1 = {};
	function ka$1(a) {
		if (n$1.call(ja$1, a)) return !0;
		if (n$1.call(ia$1, a)) return !1;
		if (ha$1.test(a)) return ja$1[a] = !0;
		ia$1[a] = !0;
		return !1;
	}
	function q$2(a, b, c, d, f$1, e, g) {
		this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
		this.attributeName = d;
		this.attributeNamespace = f$1;
		this.mustUseProperty = c;
		this.propertyName = a;
		this.type = b;
		this.sanitizeURL = e;
		this.removeEmptyString = g;
	}
	var r$1 = {};
	"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a) {
		r$1[a] = new q$2(a, 0, !1, a, null, !1, !1);
	});
	[
		["acceptCharset", "accept-charset"],
		["className", "class"],
		["htmlFor", "for"],
		["httpEquiv", "http-equiv"]
	].forEach(function(a) {
		var b = a[0];
		r$1[b] = new q$2(b, 1, !1, a[1], null, !1, !1);
	});
	[
		"contentEditable",
		"draggable",
		"spellCheck",
		"value"
	].forEach(function(a) {
		r$1[a] = new q$2(a, 2, !1, a.toLowerCase(), null, !1, !1);
	});
	[
		"autoReverse",
		"externalResourcesRequired",
		"focusable",
		"preserveAlpha"
	].forEach(function(a) {
		r$1[a] = new q$2(a, 2, !1, a, null, !1, !1);
	});
	"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a) {
		r$1[a] = new q$2(a, 3, !1, a.toLowerCase(), null, !1, !1);
	});
	[
		"checked",
		"multiple",
		"muted",
		"selected"
	].forEach(function(a) {
		r$1[a] = new q$2(a, 3, !0, a, null, !1, !1);
	});
	["capture", "download"].forEach(function(a) {
		r$1[a] = new q$2(a, 4, !1, a, null, !1, !1);
	});
	[
		"cols",
		"rows",
		"size",
		"span"
	].forEach(function(a) {
		r$1[a] = new q$2(a, 6, !1, a, null, !1, !1);
	});
	["rowSpan", "start"].forEach(function(a) {
		r$1[a] = new q$2(a, 5, !1, a.toLowerCase(), null, !1, !1);
	});
	var la$1 = /[\-:]([a-z])/g;
	function ma$1(a) {
		return a[1].toUpperCase();
	}
	"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a) {
		var b = a.replace(la$1, ma$1);
		r$1[b] = new q$2(b, 1, !1, a, null, !1, !1);
	});
	"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a) {
		var b = a.replace(la$1, ma$1);
		r$1[b] = new q$2(b, 1, !1, a, "http://www.w3.org/1999/xlink", !1, !1);
	});
	[
		"xml:base",
		"xml:lang",
		"xml:space"
	].forEach(function(a) {
		var b = a.replace(la$1, ma$1);
		r$1[b] = new q$2(b, 1, !1, a, "http://www.w3.org/XML/1998/namespace", !1, !1);
	});
	["tabIndex", "crossOrigin"].forEach(function(a) {
		r$1[a] = new q$2(a, 1, !1, a.toLowerCase(), null, !1, !1);
	});
	r$1.xlinkHref = new q$2("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
	[
		"src",
		"href",
		"action",
		"formAction"
	].forEach(function(a) {
		r$1[a] = new q$2(a, 1, !1, a.toLowerCase(), null, !0, !0);
	});
	var t$1 = {
		animationIterationCount: !0,
		aspectRatio: !0,
		borderImageOutset: !0,
		borderImageSlice: !0,
		borderImageWidth: !0,
		boxFlex: !0,
		boxFlexGroup: !0,
		boxOrdinalGroup: !0,
		columnCount: !0,
		columns: !0,
		flex: !0,
		flexGrow: !0,
		flexPositive: !0,
		flexShrink: !0,
		flexNegative: !0,
		flexOrder: !0,
		gridArea: !0,
		gridRow: !0,
		gridRowEnd: !0,
		gridRowSpan: !0,
		gridRowStart: !0,
		gridColumn: !0,
		gridColumnEnd: !0,
		gridColumnSpan: !0,
		gridColumnStart: !0,
		fontWeight: !0,
		lineClamp: !0,
		lineHeight: !0,
		opacity: !0,
		order: !0,
		orphans: !0,
		tabSize: !0,
		widows: !0,
		zIndex: !0,
		zoom: !0,
		fillOpacity: !0,
		floodOpacity: !0,
		stopOpacity: !0,
		strokeDasharray: !0,
		strokeDashoffset: !0,
		strokeMiterlimit: !0,
		strokeOpacity: !0,
		strokeWidth: !0
	}, na = [
		"Webkit",
		"ms",
		"Moz",
		"O"
	];
	Object.keys(t$1).forEach(function(a) {
		na.forEach(function(b) {
			b = b + a.charAt(0).toUpperCase() + a.substring(1);
			t$1[b] = t$1[a];
		});
	});
	var oa = /["'&<>]/;
	function u$1(a) {
		if ("boolean" === typeof a || "number" === typeof a) return "" + a;
		a = "" + a;
		var b = oa.exec(a);
		if (b) {
			var c = "", d, f$1 = 0;
			for (d = b.index; d < a.length; d++) {
				switch (a.charCodeAt(d)) {
					case 34:
						b = "&quot;";
						break;
					case 38:
						b = "&amp;";
						break;
					case 39:
						b = "&#x27;";
						break;
					case 60:
						b = "&lt;";
						break;
					case 62:
						b = "&gt;";
						break;
					default: continue;
				}
				f$1 !== d && (c += a.substring(f$1, d));
				f$1 = d + 1;
				c += b;
			}
			a = f$1 !== d ? c + a.substring(f$1, d) : c;
		}
		return a;
	}
	var pa$1 = /([A-Z])/g, qa$1 = /^ms-/, ra$1 = Array.isArray;
	function v(a, b) {
		return {
			insertionMode: a,
			selectedValue: b
		};
	}
	function sa$1(a, b, c) {
		switch (b) {
			case "select": return v(1, null != c.value ? c.value : c.defaultValue);
			case "svg": return v(2, null);
			case "math": return v(3, null);
			case "foreignObject": return v(1, null);
			case "table": return v(4, null);
			case "thead":
			case "tbody":
			case "tfoot": return v(5, null);
			case "colgroup": return v(7, null);
			case "tr": return v(6, null);
		}
		return 4 <= a.insertionMode || 0 === a.insertionMode ? v(1, null) : a;
	}
	var ta$1 = /* @__PURE__ */ new Map();
	function ua$1(a, b, c) {
		if ("object" !== typeof c) throw Error("The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX.");
		b = !0;
		for (var d in c) if (n$1.call(c, d)) {
			var f$1 = c[d];
			if (null != f$1 && "boolean" !== typeof f$1 && "" !== f$1) {
				if (0 === d.indexOf("--")) {
					var e = u$1(d);
					f$1 = u$1(("" + f$1).trim());
				} else {
					e = d;
					var g = ta$1.get(e);
					void 0 !== g ? e = g : (g = u$1(e.replace(pa$1, "-$1").toLowerCase().replace(qa$1, "-ms-")), ta$1.set(e, g), e = g);
					f$1 = "number" === typeof f$1 ? 0 === f$1 || n$1.call(t$1, d) ? "" + f$1 : f$1 + "px" : u$1(("" + f$1).trim());
				}
				b ? (b = !1, a.push(" style=\"", e, ":", f$1)) : a.push(";", e, ":", f$1);
			}
		}
		b || a.push("\"");
	}
	function w$1(a, b, c, d) {
		switch (c) {
			case "style":
				ua$1(a, b, d);
				return;
			case "defaultValue":
			case "defaultChecked":
			case "innerHTML":
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning": return;
		}
		if (!(2 < c.length) || "o" !== c[0] && "O" !== c[0] || "n" !== c[1] && "N" !== c[1]) {
			if (b = r$1.hasOwnProperty(c) ? r$1[c] : null, null !== b) {
				switch (typeof d) {
					case "function":
					case "symbol": return;
					case "boolean": if (!b.acceptsBooleans) return;
				}
				c = b.attributeName;
				switch (b.type) {
					case 3:
						d && a.push(" ", c, "=\"\"");
						break;
					case 4:
						!0 === d ? a.push(" ", c, "=\"\"") : !1 !== d && a.push(" ", c, "=\"", u$1(d), "\"");
						break;
					case 5:
						isNaN(d) || a.push(" ", c, "=\"", u$1(d), "\"");
						break;
					case 6:
						!isNaN(d) && 1 <= d && a.push(" ", c, "=\"", u$1(d), "\"");
						break;
					default: b.sanitizeURL && (d = "" + d), a.push(" ", c, "=\"", u$1(d), "\"");
				}
			} else if (ka$1(c)) {
				switch (typeof d) {
					case "function":
					case "symbol": return;
					case "boolean": if (b = c.toLowerCase().slice(0, 5), "data-" !== b && "aria-" !== b) return;
				}
				a.push(" ", c, "=\"", u$1(d), "\"");
			}
		}
	}
	function x$1(a, b, c) {
		if (null != b) {
			if (null != c) throw Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
			if ("object" !== typeof b || !("__html" in b)) throw Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://reactjs.org/link/dangerously-set-inner-html for more information.");
			b = b.__html;
			null !== b && void 0 !== b && a.push("" + b);
		}
	}
	function va$1(a) {
		var b = "";
		ea$1.Children.forEach(a, function(a$1) {
			null != a$1 && (b += a$1);
		});
		return b;
	}
	function wa$1(a, b, c, d) {
		a.push(z$1(c));
		var f$1 = c = null, e;
		for (e in b) if (n$1.call(b, e)) {
			var g = b[e];
			if (null != g) switch (e) {
				case "children":
					c = g;
					break;
				case "dangerouslySetInnerHTML":
					f$1 = g;
					break;
				default: w$1(a, d, e, g);
			}
		}
		a.push(">");
		x$1(a, f$1, c);
		return "string" === typeof c ? (a.push(u$1(c)), null) : c;
	}
	var xa$1 = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/, ya$1 = /* @__PURE__ */ new Map();
	function z$1(a) {
		var b = ya$1.get(a);
		if (void 0 === b) {
			if (!xa$1.test(a)) throw Error("Invalid tag: " + a);
			b = "<" + a;
			ya$1.set(a, b);
		}
		return b;
	}
	function za$1(a, b, c, d, f$1) {
		switch (b) {
			case "select":
				a.push(z$1("select"));
				var e = null, g = null;
				for (l$4 in c) if (n$1.call(c, l$4)) {
					var h = c[l$4];
					if (null != h) switch (l$4) {
						case "children":
							e = h;
							break;
						case "dangerouslySetInnerHTML":
							g = h;
							break;
						case "defaultValue":
						case "value": break;
						default: w$1(a, d, l$4, h);
					}
				}
				a.push(">");
				x$1(a, g, e);
				return e;
			case "option":
				g = f$1.selectedValue;
				a.push(z$1("option"));
				var k$2 = h = null, m$1 = null;
				var l$4 = null;
				for (e in c) if (n$1.call(c, e)) {
					var p$2 = c[e];
					if (null != p$2) switch (e) {
						case "children":
							h = p$2;
							break;
						case "selected":
							m$1 = p$2;
							break;
						case "dangerouslySetInnerHTML":
							l$4 = p$2;
							break;
						case "value": k$2 = p$2;
						default: w$1(a, d, e, p$2);
					}
				}
				if (null != g) if (c = null !== k$2 ? "" + k$2 : va$1(h), ra$1(g)) {
					for (d = 0; d < g.length; d++) if ("" + g[d] === c) {
						a.push(" selected=\"\"");
						break;
					}
				} else "" + g === c && a.push(" selected=\"\"");
				else m$1 && a.push(" selected=\"\"");
				a.push(">");
				x$1(a, l$4, h);
				return h;
			case "textarea":
				a.push(z$1("textarea"));
				l$4 = g = e = null;
				for (h in c) if (n$1.call(c, h) && (k$2 = c[h], null != k$2)) switch (h) {
					case "children":
						l$4 = k$2;
						break;
					case "value":
						e = k$2;
						break;
					case "defaultValue":
						g = k$2;
						break;
					case "dangerouslySetInnerHTML": throw Error("`dangerouslySetInnerHTML` does not make sense on <textarea>.");
					default: w$1(a, d, h, k$2);
				}
				null === e && null !== g && (e = g);
				a.push(">");
				if (null != l$4) {
					if (null != e) throw Error("If you supply `defaultValue` on a <textarea>, do not pass children.");
					if (ra$1(l$4) && 1 < l$4.length) throw Error("<textarea> can only have at most one child.");
					e = "" + l$4;
				}
				"string" === typeof e && "\n" === e[0] && a.push("\n");
				null !== e && a.push(u$1("" + e));
				return null;
			case "input":
				a.push(z$1("input"));
				k$2 = l$4 = h = e = null;
				for (g in c) if (n$1.call(c, g) && (m$1 = c[g], null != m$1)) switch (g) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error("input is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
					case "defaultChecked":
						k$2 = m$1;
						break;
					case "defaultValue":
						h = m$1;
						break;
					case "checked":
						l$4 = m$1;
						break;
					case "value":
						e = m$1;
						break;
					default: w$1(a, d, g, m$1);
				}
				null !== l$4 ? w$1(a, d, "checked", l$4) : null !== k$2 && w$1(a, d, "checked", k$2);
				null !== e ? w$1(a, d, "value", e) : null !== h && w$1(a, d, "value", h);
				a.push("/>");
				return null;
			case "menuitem":
				a.push(z$1("menuitem"));
				for (var B$2 in c) if (n$1.call(c, B$2) && (e = c[B$2], null != e)) switch (B$2) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error("menuitems cannot have `children` nor `dangerouslySetInnerHTML`.");
					default: w$1(a, d, B$2, e);
				}
				a.push(">");
				return null;
			case "title":
				a.push(z$1("title"));
				e = null;
				for (p$2 in c) if (n$1.call(c, p$2) && (g = c[p$2], null != g)) switch (p$2) {
					case "children":
						e = g;
						break;
					case "dangerouslySetInnerHTML": throw Error("`dangerouslySetInnerHTML` does not make sense on <title>.");
					default: w$1(a, d, p$2, g);
				}
				a.push(">");
				return e;
			case "listing":
			case "pre":
				a.push(z$1(b));
				g = e = null;
				for (k$2 in c) if (n$1.call(c, k$2) && (h = c[k$2], null != h)) switch (k$2) {
					case "children":
						e = h;
						break;
					case "dangerouslySetInnerHTML":
						g = h;
						break;
					default: w$1(a, d, k$2, h);
				}
				a.push(">");
				if (null != g) {
					if (null != e) throw Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
					if ("object" !== typeof g || !("__html" in g)) throw Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://reactjs.org/link/dangerously-set-inner-html for more information.");
					c = g.__html;
					null !== c && void 0 !== c && ("string" === typeof c && 0 < c.length && "\n" === c[0] ? a.push("\n", c) : a.push("" + c));
				}
				"string" === typeof e && "\n" === e[0] && a.push("\n");
				return e;
			case "area":
			case "base":
			case "br":
			case "col":
			case "embed":
			case "hr":
			case "img":
			case "keygen":
			case "link":
			case "meta":
			case "param":
			case "source":
			case "track":
			case "wbr":
				a.push(z$1(b));
				for (var C$1 in c) if (n$1.call(c, C$1) && (e = c[C$1], null != e)) switch (C$1) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(b + " is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
					default: w$1(a, d, C$1, e);
				}
				a.push("/>");
				return null;
			case "annotation-xml":
			case "color-profile":
			case "font-face":
			case "font-face-src":
			case "font-face-uri":
			case "font-face-format":
			case "font-face-name":
			case "missing-glyph": return wa$1(a, c, b, d);
			case "html": return 0 === f$1.insertionMode && a.push("<!DOCTYPE html>"), wa$1(a, c, b, d);
			default:
				if (-1 === b.indexOf("-") && "string" !== typeof c.is) return wa$1(a, c, b, d);
				a.push(z$1(b));
				g = e = null;
				for (m$1 in c) if (n$1.call(c, m$1) && (h = c[m$1], null != h)) switch (m$1) {
					case "children":
						e = h;
						break;
					case "dangerouslySetInnerHTML":
						g = h;
						break;
					case "style":
						ua$1(a, d, h);
						break;
					case "suppressContentEditableWarning":
					case "suppressHydrationWarning": break;
					default: ka$1(m$1) && "function" !== typeof h && "symbol" !== typeof h && a.push(" ", m$1, "=\"", u$1(h), "\"");
				}
				a.push(">");
				x$1(a, g, e);
				return e;
		}
	}
	function Aa$1(a, b, c) {
		a.push("<!--$?--><template id=\"");
		if (null === c) throw Error("An ID must have been assigned before we can complete the boundary.");
		a.push(c);
		return a.push("\"></template>");
	}
	function Ba$1(a, b, c, d) {
		switch (c.insertionMode) {
			case 0:
			case 1: return a.push("<div hidden id=\""), a.push(b.segmentPrefix), b = d.toString(16), a.push(b), a.push("\">");
			case 2: return a.push("<svg aria-hidden=\"true\" style=\"display:none\" id=\""), a.push(b.segmentPrefix), b = d.toString(16), a.push(b), a.push("\">");
			case 3: return a.push("<math aria-hidden=\"true\" style=\"display:none\" id=\""), a.push(b.segmentPrefix), b = d.toString(16), a.push(b), a.push("\">");
			case 4: return a.push("<table hidden id=\""), a.push(b.segmentPrefix), b = d.toString(16), a.push(b), a.push("\">");
			case 5: return a.push("<table hidden><tbody id=\""), a.push(b.segmentPrefix), b = d.toString(16), a.push(b), a.push("\">");
			case 6: return a.push("<table hidden><tr id=\""), a.push(b.segmentPrefix), b = d.toString(16), a.push(b), a.push("\">");
			case 7: return a.push("<table hidden><colgroup id=\""), a.push(b.segmentPrefix), b = d.toString(16), a.push(b), a.push("\">");
			default: throw Error("Unknown insertion mode. This is a bug in React.");
		}
	}
	function Ca$1(a, b) {
		switch (b.insertionMode) {
			case 0:
			case 1: return a.push("</div>");
			case 2: return a.push("</svg>");
			case 3: return a.push("</math>");
			case 4: return a.push("</table>");
			case 5: return a.push("</tbody></table>");
			case 6: return a.push("</tr></table>");
			case 7: return a.push("</colgroup></table>");
			default: throw Error("Unknown insertion mode. This is a bug in React.");
		}
	}
	var Da$1 = /[<\u2028\u2029]/g;
	function Ea$1(a) {
		return JSON.stringify(a).replace(Da$1, function(a$1) {
			switch (a$1) {
				case "<": return "\\u003c";
				case "\u2028": return "\\u2028";
				case "\u2029": return "\\u2029";
				default: throw Error("escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
			}
		});
	}
	function Fa$1(a, b) {
		b = void 0 === b ? "" : b;
		return {
			bootstrapChunks: [],
			startInlineScript: "<script>",
			placeholderPrefix: b + "P:",
			segmentPrefix: b + "S:",
			boundaryPrefix: b + "B:",
			idPrefix: b,
			nextSuspenseID: 0,
			sentCompleteSegmentFunction: !1,
			sentCompleteBoundaryFunction: !1,
			sentClientRenderFunction: !1,
			generateStaticMarkup: a
		};
	}
	function Ga$1() {
		return {
			insertionMode: 1,
			selectedValue: null
		};
	}
	function Ha$1(a, b, c, d) {
		if (c.generateStaticMarkup) return a.push(u$1(b)), !1;
		"" === b ? a = d : (d && a.push("<!-- -->"), a.push(u$1(b)), a = !0);
		return a;
	}
	var A$1 = Object.assign, Ia$1 = Symbol.for("react.element"), Ja$1 = Symbol.for("react.portal"), Ka$1 = Symbol.for("react.fragment"), La$1 = Symbol.for("react.strict_mode"), Ma$1 = Symbol.for("react.profiler"), Na$1 = Symbol.for("react.provider"), Oa$1 = Symbol.for("react.context"), Pa$1 = Symbol.for("react.forward_ref"), Qa$1 = Symbol.for("react.suspense"), Ra$1 = Symbol.for("react.suspense_list"), Sa$1 = Symbol.for("react.memo"), Ta$1 = Symbol.for("react.lazy"), Ua$1 = Symbol.for("react.scope"), Va$1 = Symbol.for("react.debug_trace_mode"), Wa$1 = Symbol.for("react.legacy_hidden"), Xa$1 = Symbol.for("react.default_value"), Ya$1 = Symbol.iterator;
	function Za$1(a) {
		if (null == a) return null;
		if ("function" === typeof a) return a.displayName || a.name || null;
		if ("string" === typeof a) return a;
		switch (a) {
			case Ka$1: return "Fragment";
			case Ja$1: return "Portal";
			case Ma$1: return "Profiler";
			case La$1: return "StrictMode";
			case Qa$1: return "Suspense";
			case Ra$1: return "SuspenseList";
		}
		if ("object" === typeof a) switch (a.$$typeof) {
			case Oa$1: return (a.displayName || "Context") + ".Consumer";
			case Na$1: return (a._context.displayName || "Context") + ".Provider";
			case Pa$1:
				var b = a.render;
				a = a.displayName;
				a || (a = b.displayName || b.name || "", a = "" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
				return a;
			case Sa$1: return b = a.displayName || null, null !== b ? b : Za$1(a.type) || "Memo";
			case Ta$1:
				b = a._payload;
				a = a._init;
				try {
					return Za$1(a(b));
				} catch (c) {}
		}
		return null;
	}
	var $a$1 = {};
	function ab$1(a, b) {
		a = a.contextTypes;
		if (!a) return $a$1;
		var c = {}, d;
		for (d in a) c[d] = b[d];
		return c;
	}
	var D = null;
	function E(a, b) {
		if (a !== b) {
			a.context._currentValue2 = a.parentValue;
			a = a.parent;
			var c = b.parent;
			if (null === a) {
				if (null !== c) throw Error("The stacks must reach the root at the same time. This is a bug in React.");
			} else {
				if (null === c) throw Error("The stacks must reach the root at the same time. This is a bug in React.");
				E(a, c);
			}
			b.context._currentValue2 = b.value;
		}
	}
	function bb$1(a) {
		a.context._currentValue2 = a.parentValue;
		a = a.parent;
		null !== a && bb$1(a);
	}
	function cb$1(a) {
		var b = a.parent;
		null !== b && cb$1(b);
		a.context._currentValue2 = a.value;
	}
	function db$1(a, b) {
		a.context._currentValue2 = a.parentValue;
		a = a.parent;
		if (null === a) throw Error("The depth must equal at least at zero before reaching the root. This is a bug in React.");
		a.depth === b.depth ? E(a, b) : db$1(a, b);
	}
	function eb$1(a, b) {
		var c = b.parent;
		if (null === c) throw Error("The depth must equal at least at zero before reaching the root. This is a bug in React.");
		a.depth === c.depth ? E(a, c) : eb$1(a, c);
		b.context._currentValue2 = b.value;
	}
	function F$1(a) {
		var b = D;
		b !== a && (null === b ? cb$1(a) : null === a ? bb$1(b) : b.depth === a.depth ? E(b, a) : b.depth > a.depth ? db$1(b, a) : eb$1(b, a), D = a);
	}
	var fb$1 = {
		isMounted: function() {
			return !1;
		},
		enqueueSetState: function(a, b) {
			a = a._reactInternals;
			null !== a.queue && a.queue.push(b);
		},
		enqueueReplaceState: function(a, b) {
			a = a._reactInternals;
			a.replace = !0;
			a.queue = [b];
		},
		enqueueForceUpdate: function() {}
	};
	function gb$1(a, b, c, d) {
		var f$1 = void 0 !== a.state ? a.state : null;
		a.updater = fb$1;
		a.props = c;
		a.state = f$1;
		var e = {
			queue: [],
			replace: !1
		};
		a._reactInternals = e;
		var g = b.contextType;
		a.context = "object" === typeof g && null !== g ? g._currentValue2 : d;
		g = b.getDerivedStateFromProps;
		"function" === typeof g && (g = g(c, f$1), f$1 = null === g || void 0 === g ? f$1 : A$1({}, f$1, g), a.state = f$1);
		if ("function" !== typeof b.getDerivedStateFromProps && "function" !== typeof a.getSnapshotBeforeUpdate && ("function" === typeof a.UNSAFE_componentWillMount || "function" === typeof a.componentWillMount)) if (b = a.state, "function" === typeof a.componentWillMount && a.componentWillMount(), "function" === typeof a.UNSAFE_componentWillMount && a.UNSAFE_componentWillMount(), b !== a.state && fb$1.enqueueReplaceState(a, a.state, null), null !== e.queue && 0 < e.queue.length) if (b = e.queue, g = e.replace, e.queue = null, e.replace = !1, g && 1 === b.length) a.state = b[0];
		else {
			e = g ? b[0] : a.state;
			f$1 = !0;
			for (g = g ? 1 : 0; g < b.length; g++) {
				var h = b[g];
				h = "function" === typeof h ? h.call(a, e, c, d) : h;
				null != h && (f$1 ? (f$1 = !1, e = A$1({}, e, h)) : A$1(e, h));
			}
			a.state = e;
		}
		else e.queue = null;
	}
	var hb$1 = {
		id: 1,
		overflow: ""
	};
	function ib$1(a, b, c) {
		var d = a.id;
		a = a.overflow;
		var f$1 = 32 - G$1(d) - 1;
		d &= ~(1 << f$1);
		c += 1;
		var e = 32 - G$1(b) + f$1;
		if (30 < e) {
			var g = f$1 - f$1 % 5;
			e = (d & (1 << g) - 1).toString(32);
			d >>= g;
			f$1 -= g;
			return {
				id: 1 << 32 - G$1(b) + f$1 | c << f$1 | d,
				overflow: e + a
			};
		}
		return {
			id: 1 << e | c << f$1 | d,
			overflow: a
		};
	}
	var G$1 = Math.clz32 ? Math.clz32 : jb$1, kb$1 = Math.log, lb$1 = Math.LN2;
	function jb$1(a) {
		a >>>= 0;
		return 0 === a ? 32 : 31 - (kb$1(a) / lb$1 | 0) | 0;
	}
	function mb$1(a, b) {
		return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
	}
	var nb$1 = "function" === typeof Object.is ? Object.is : mb$1, H$3 = null, ob$1 = null, I$1 = null, J$1 = null, K$1 = !1, L$1 = !1, M$1 = 0, N$1 = null, O$1 = 0;
	function P$1() {
		if (null === H$3) throw Error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
		return H$3;
	}
	function rb$1() {
		if (0 < O$1) throw Error("Rendered more hooks than during the previous render");
		return {
			memoizedState: null,
			queue: null,
			next: null
		};
	}
	function sb$1() {
		null === J$1 ? null === I$1 ? (K$1 = !1, I$1 = J$1 = rb$1()) : (K$1 = !0, J$1 = I$1) : null === J$1.next ? (K$1 = !1, J$1 = J$1.next = rb$1()) : (K$1 = !0, J$1 = J$1.next);
		return J$1;
	}
	function tb$1() {
		ob$1 = H$3 = null;
		L$1 = !1;
		I$1 = null;
		O$1 = 0;
		J$1 = N$1 = null;
	}
	function ub$1(a, b) {
		return "function" === typeof b ? b(a) : b;
	}
	function vb$1(a, b, c) {
		H$3 = P$1();
		J$1 = sb$1();
		if (K$1) {
			var d = J$1.queue;
			b = d.dispatch;
			if (null !== N$1 && (c = N$1.get(d), void 0 !== c)) {
				N$1.delete(d);
				d = J$1.memoizedState;
				do
					d = a(d, c.action), c = c.next;
				while (null !== c);
				J$1.memoizedState = d;
				return [d, b];
			}
			return [J$1.memoizedState, b];
		}
		a = a === ub$1 ? "function" === typeof b ? b() : b : void 0 !== c ? c(b) : b;
		J$1.memoizedState = a;
		a = J$1.queue = {
			last: null,
			dispatch: null
		};
		a = a.dispatch = wb$1.bind(null, H$3, a);
		return [J$1.memoizedState, a];
	}
	function xb$1(a, b) {
		H$3 = P$1();
		J$1 = sb$1();
		b = void 0 === b ? null : b;
		if (null !== J$1) {
			var c = J$1.memoizedState;
			if (null !== c && null !== b) {
				var d = c[1];
				a: if (null === d) d = !1;
				else {
					for (var f$1 = 0; f$1 < d.length && f$1 < b.length; f$1++) if (!nb$1(b[f$1], d[f$1])) {
						d = !1;
						break a;
					}
					d = !0;
				}
				if (d) return c[0];
			}
		}
		a = a();
		J$1.memoizedState = [a, b];
		return a;
	}
	function wb$1(a, b, c) {
		if (25 <= O$1) throw Error("Too many re-renders. React limits the number of renders to prevent an infinite loop.");
		if (a === H$3) if (L$1 = !0, a = {
			action: c,
			next: null
		}, null === N$1 && (N$1 = /* @__PURE__ */ new Map()), c = N$1.get(b), void 0 === c) N$1.set(b, a);
		else {
			for (b = c; null !== b.next;) b = b.next;
			b.next = a;
		}
	}
	function yb$1() {
		throw Error("startTransition cannot be called during server rendering.");
	}
	function Q$1() {}
	var zb$1 = {
		readContext: function(a) {
			return a._currentValue2;
		},
		useContext: function(a) {
			P$1();
			return a._currentValue2;
		},
		useMemo: xb$1,
		useReducer: vb$1,
		useRef: function(a) {
			H$3 = P$1();
			J$1 = sb$1();
			var b = J$1.memoizedState;
			return null === b ? (a = { current: a }, J$1.memoizedState = a) : b;
		},
		useState: function(a) {
			return vb$1(ub$1, a);
		},
		useInsertionEffect: Q$1,
		useLayoutEffect: function() {},
		useCallback: function(a, b) {
			return xb$1(function() {
				return a;
			}, b);
		},
		useImperativeHandle: Q$1,
		useEffect: Q$1,
		useDebugValue: Q$1,
		useDeferredValue: function(a) {
			P$1();
			return a;
		},
		useTransition: function() {
			P$1();
			return [!1, yb$1];
		},
		useId: function() {
			var a = ob$1.treeContext;
			var b = a.overflow;
			a = a.id;
			a = (a & ~(1 << 32 - G$1(a) - 1)).toString(32) + b;
			var c = R$1;
			if (null === c) throw Error("Invalid hook call. Hooks can only be called inside of the body of a function component.");
			b = M$1++;
			a = ":" + c.idPrefix + "R" + a;
			0 < b && (a += "H" + b.toString(32));
			return a + ":";
		},
		useMutableSource: function(a, b) {
			P$1();
			return b(a._source);
		},
		useSyncExternalStore: function(a, b, c) {
			if (void 0 === c) throw Error("Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering.");
			return c();
		}
	}, R$1 = null, Ab$1 = ea$1.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
	function Bb$1(a) {
		console.error(a);
		return null;
	}
	function S$1() {}
	function Cb$1(a, b, c, d, f$1, e, g, h, k$2) {
		var m$1 = [], l$4 = /* @__PURE__ */ new Set();
		b = {
			destination: null,
			responseState: b,
			progressiveChunkSize: void 0 === d ? 12800 : d,
			status: 0,
			fatalError: null,
			nextSegmentId: 0,
			allPendingTasks: 0,
			pendingRootTasks: 0,
			completedRootSegment: null,
			abortableTasks: l$4,
			pingedTasks: m$1,
			clientRenderedBoundaries: [],
			completedBoundaries: [],
			partialBoundaries: [],
			onError: void 0 === f$1 ? Bb$1 : f$1,
			onAllReady: void 0 === e ? S$1 : e,
			onShellReady: void 0 === g ? S$1 : g,
			onShellError: void 0 === h ? S$1 : h,
			onFatalError: void 0 === k$2 ? S$1 : k$2
		};
		c = T$1(b, 0, null, c, !1, !1);
		c.parentFlushed = !0;
		a = Db$1(b, a, null, c, l$4, $a$1, null, hb$1);
		m$1.push(a);
		return b;
	}
	function Db$1(a, b, c, d, f$1, e, g, h) {
		a.allPendingTasks++;
		null === c ? a.pendingRootTasks++ : c.pendingTasks++;
		var k$2 = {
			node: b,
			ping: function() {
				var b$1 = a.pingedTasks;
				b$1.push(k$2);
				1 === b$1.length && Eb(a);
			},
			blockedBoundary: c,
			blockedSegment: d,
			abortSet: f$1,
			legacyContext: e,
			context: g,
			treeContext: h
		};
		f$1.add(k$2);
		return k$2;
	}
	function T$1(a, b, c, d, f$1, e) {
		return {
			status: 0,
			id: -1,
			index: b,
			parentFlushed: !1,
			chunks: [],
			children: [],
			formatContext: d,
			boundary: c,
			lastPushedText: f$1,
			textEmbedded: e
		};
	}
	function U$1(a, b) {
		a = a.onError(b);
		if (null != a && "string" !== typeof a) throw Error("onError returned something with a type other than \"string\". onError should return a string and may return null or undefined but must not return anything else. It received something of type \"" + typeof a + "\" instead");
		return a;
	}
	function V$1(a, b) {
		var c = a.onShellError;
		c(b);
		c = a.onFatalError;
		c(b);
		null !== a.destination ? (a.status = 2, a.destination.destroy(b)) : (a.status = 1, a.fatalError = b);
	}
	function Fb$1(a, b, c, d, f$1) {
		H$3 = {};
		ob$1 = b;
		M$1 = 0;
		for (a = c(d, f$1); L$1;) L$1 = !1, M$1 = 0, O$1 += 1, J$1 = null, a = c(d, f$1);
		tb$1();
		return a;
	}
	function Gb$1(a, b, c, d) {
		var f$1 = c.render(), e = d.childContextTypes;
		if (null !== e && void 0 !== e) {
			var g = b.legacyContext;
			if ("function" !== typeof c.getChildContext) d = g;
			else {
				c = c.getChildContext();
				for (var h in c) if (!(h in e)) throw Error((Za$1(d) || "Unknown") + ".getChildContext(): key \"" + h + "\" is not defined in childContextTypes.");
				d = A$1({}, g, c);
			}
			b.legacyContext = d;
			W$3(a, b, f$1);
			b.legacyContext = g;
		} else W$3(a, b, f$1);
	}
	function Hb$1(a, b) {
		if (a && a.defaultProps) {
			b = A$1({}, b);
			a = a.defaultProps;
			for (var c in a) void 0 === b[c] && (b[c] = a[c]);
			return b;
		}
		return b;
	}
	function Ib$1(a, b, c, d, f$1) {
		if ("function" === typeof c) if (c.prototype && c.prototype.isReactComponent) {
			f$1 = ab$1(c, b.legacyContext);
			var e = c.contextType;
			e = new c(d, "object" === typeof e && null !== e ? e._currentValue2 : f$1);
			gb$1(e, c, d, f$1);
			Gb$1(a, b, e, c);
		} else {
			e = ab$1(c, b.legacyContext);
			f$1 = Fb$1(a, b, c, d, e);
			var g = 0 !== M$1;
			if ("object" === typeof f$1 && null !== f$1 && "function" === typeof f$1.render && void 0 === f$1.$$typeof) gb$1(f$1, c, d, e), Gb$1(a, b, f$1, c);
			else if (g) {
				d = b.treeContext;
				b.treeContext = ib$1(d, 1, 0);
				try {
					W$3(a, b, f$1);
				} finally {
					b.treeContext = d;
				}
			} else W$3(a, b, f$1);
		}
		else if ("string" === typeof c) {
			f$1 = b.blockedSegment;
			e = za$1(f$1.chunks, c, d, a.responseState, f$1.formatContext);
			f$1.lastPushedText = !1;
			g = f$1.formatContext;
			f$1.formatContext = sa$1(g, c, d);
			Jb$1(a, b, e);
			f$1.formatContext = g;
			switch (c) {
				case "area":
				case "base":
				case "br":
				case "col":
				case "embed":
				case "hr":
				case "img":
				case "input":
				case "keygen":
				case "link":
				case "meta":
				case "param":
				case "source":
				case "track":
				case "wbr": break;
				default: f$1.chunks.push("</", c, ">");
			}
			f$1.lastPushedText = !1;
		} else {
			switch (c) {
				case Wa$1:
				case Va$1:
				case La$1:
				case Ma$1:
				case Ka$1:
					W$3(a, b, d.children);
					return;
				case Ra$1:
					W$3(a, b, d.children);
					return;
				case Ua$1: throw Error("ReactDOMServer does not yet support scope components.");
				case Qa$1:
					a: {
						c = b.blockedBoundary;
						f$1 = b.blockedSegment;
						e = d.fallback;
						d = d.children;
						g = /* @__PURE__ */ new Set();
						var h = {
							id: null,
							rootSegmentID: -1,
							parentFlushed: !1,
							pendingTasks: 0,
							forceClientRender: !1,
							completedSegments: [],
							byteSize: 0,
							fallbackAbortableTasks: g,
							errorDigest: null
						}, k$2 = T$1(a, f$1.chunks.length, h, f$1.formatContext, !1, !1);
						f$1.children.push(k$2);
						f$1.lastPushedText = !1;
						var m$1 = T$1(a, 0, null, f$1.formatContext, !1, !1);
						m$1.parentFlushed = !0;
						b.blockedBoundary = h;
						b.blockedSegment = m$1;
						try {
							if (Jb$1(a, b, d), a.responseState.generateStaticMarkup || m$1.lastPushedText && m$1.textEmbedded && m$1.chunks.push("<!-- -->"), m$1.status = 1, X$1(h, m$1), 0 === h.pendingTasks) break a;
						} catch (l$4) {
							m$1.status = 4, h.forceClientRender = !0, h.errorDigest = U$1(a, l$4);
						} finally {
							b.blockedBoundary = c, b.blockedSegment = f$1;
						}
						b = Db$1(a, e, c, k$2, g, b.legacyContext, b.context, b.treeContext);
						a.pingedTasks.push(b);
					}
					return;
			}
			if ("object" === typeof c && null !== c) switch (c.$$typeof) {
				case Pa$1:
					d = Fb$1(a, b, c.render, d, f$1);
					if (0 !== M$1) {
						c = b.treeContext;
						b.treeContext = ib$1(c, 1, 0);
						try {
							W$3(a, b, d);
						} finally {
							b.treeContext = c;
						}
					} else W$3(a, b, d);
					return;
				case Sa$1:
					c = c.type;
					d = Hb$1(c, d);
					Ib$1(a, b, c, d, f$1);
					return;
				case Na$1:
					f$1 = d.children;
					c = c._context;
					d = d.value;
					e = c._currentValue2;
					c._currentValue2 = d;
					g = D;
					D = d = {
						parent: g,
						depth: null === g ? 0 : g.depth + 1,
						context: c,
						parentValue: e,
						value: d
					};
					b.context = d;
					W$3(a, b, f$1);
					a = D;
					if (null === a) throw Error("Tried to pop a Context at the root of the app. This is a bug in React.");
					d = a.parentValue;
					a.context._currentValue2 = d === Xa$1 ? a.context._defaultValue : d;
					a = D = a.parent;
					b.context = a;
					return;
				case Oa$1:
					d = d.children;
					d = d(c._currentValue2);
					W$3(a, b, d);
					return;
				case Ta$1:
					f$1 = c._init;
					c = f$1(c._payload);
					d = Hb$1(c, d);
					Ib$1(a, b, c, d, void 0);
					return;
			}
			throw Error("Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: " + ((null == c ? c : typeof c) + "."));
		}
	}
	function W$3(a, b, c) {
		b.node = c;
		if ("object" === typeof c && null !== c) {
			switch (c.$$typeof) {
				case Ia$1:
					Ib$1(a, b, c.type, c.props, c.ref);
					return;
				case Ja$1: throw Error("Portals are not currently supported by the server renderer. Render them conditionally so that they only appear on the client render.");
				case Ta$1:
					var d = c._init;
					c = d(c._payload);
					W$3(a, b, c);
					return;
			}
			if (ra$1(c)) {
				Kb$1(a, b, c);
				return;
			}
			null === c || "object" !== typeof c ? d = null : (d = Ya$1 && c[Ya$1] || c["@@iterator"], d = "function" === typeof d ? d : null);
			if (d && (d = d.call(c))) {
				c = d.next();
				if (!c.done) {
					var f$1 = [];
					do
						f$1.push(c.value), c = d.next();
					while (!c.done);
					Kb$1(a, b, f$1);
				}
				return;
			}
			a = Object.prototype.toString.call(c);
			throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === a ? "object with keys {" + Object.keys(c).join(", ") + "}" : a) + "). If you meant to render a collection of children, use an array instead.");
		}
		"string" === typeof c ? (d = b.blockedSegment, d.lastPushedText = Ha$1(b.blockedSegment.chunks, c, a.responseState, d.lastPushedText)) : "number" === typeof c && (d = b.blockedSegment, d.lastPushedText = Ha$1(b.blockedSegment.chunks, "" + c, a.responseState, d.lastPushedText));
	}
	function Kb$1(a, b, c) {
		for (var d = c.length, f$1 = 0; f$1 < d; f$1++) {
			var e = b.treeContext;
			b.treeContext = ib$1(e, d, f$1);
			try {
				Jb$1(a, b, c[f$1]);
			} finally {
				b.treeContext = e;
			}
		}
	}
	function Jb$1(a, b, c) {
		var d = b.blockedSegment.formatContext, f$1 = b.legacyContext, e = b.context;
		try {
			return W$3(a, b, c);
		} catch (k$2) {
			if (tb$1(), "object" === typeof k$2 && null !== k$2 && "function" === typeof k$2.then) {
				c = k$2;
				var g = b.blockedSegment, h = T$1(a, g.chunks.length, null, g.formatContext, g.lastPushedText, !0);
				g.children.push(h);
				g.lastPushedText = !1;
				a = Db$1(a, b.node, b.blockedBoundary, h, b.abortSet, b.legacyContext, b.context, b.treeContext).ping;
				c.then(a, a);
				b.blockedSegment.formatContext = d;
				b.legacyContext = f$1;
				b.context = e;
				F$1(e);
			} else throw b.blockedSegment.formatContext = d, b.legacyContext = f$1, b.context = e, F$1(e), k$2;
		}
	}
	function Lb$1(a) {
		var b = a.blockedBoundary;
		a = a.blockedSegment;
		a.status = 3;
		Mb$1(this, b, a);
	}
	function Nb$1(a, b, c) {
		var d = a.blockedBoundary;
		a.blockedSegment.status = 3;
		null === d ? (b.allPendingTasks--, 2 !== b.status && (b.status = 2, null !== b.destination && b.destination.push(null))) : (d.pendingTasks--, d.forceClientRender || (d.forceClientRender = !0, d.errorDigest = b.onError(void 0 === c ? Error("The render was aborted by the server without a reason.") : c), d.parentFlushed && b.clientRenderedBoundaries.push(d)), d.fallbackAbortableTasks.forEach(function(a$1) {
			return Nb$1(a$1, b, c);
		}), d.fallbackAbortableTasks.clear(), b.allPendingTasks--, 0 === b.allPendingTasks && (a = b.onAllReady, a()));
	}
	function X$1(a, b) {
		if (0 === b.chunks.length && 1 === b.children.length && null === b.children[0].boundary) {
			var c = b.children[0];
			c.id = b.id;
			c.parentFlushed = !0;
			1 === c.status && X$1(a, c);
		} else a.completedSegments.push(b);
	}
	function Mb$1(a, b, c) {
		if (null === b) {
			if (c.parentFlushed) {
				if (null !== a.completedRootSegment) throw Error("There can only be one root segment. This is a bug in React.");
				a.completedRootSegment = c;
			}
			a.pendingRootTasks--;
			0 === a.pendingRootTasks && (a.onShellError = S$1, b = a.onShellReady, b());
		} else b.pendingTasks--, b.forceClientRender || (0 === b.pendingTasks ? (c.parentFlushed && 1 === c.status && X$1(b, c), b.parentFlushed && a.completedBoundaries.push(b), b.fallbackAbortableTasks.forEach(Lb$1, a), b.fallbackAbortableTasks.clear()) : c.parentFlushed && 1 === c.status && (X$1(b, c), 1 === b.completedSegments.length && b.parentFlushed && a.partialBoundaries.push(b)));
		a.allPendingTasks--;
		0 === a.allPendingTasks && (a = a.onAllReady, a());
	}
	function Eb(a) {
		if (2 !== a.status) {
			var b = D, c = Ab$1.current;
			Ab$1.current = zb$1;
			var d = R$1;
			R$1 = a.responseState;
			try {
				var f$1 = a.pingedTasks, e;
				for (e = 0; e < f$1.length; e++) {
					var g = f$1[e];
					var h = a, k$2 = g.blockedSegment;
					if (0 === k$2.status) {
						F$1(g.context);
						try {
							W$3(h, g, g.node), h.responseState.generateStaticMarkup || k$2.lastPushedText && k$2.textEmbedded && k$2.chunks.push("<!-- -->"), g.abortSet.delete(g), k$2.status = 1, Mb$1(h, g.blockedBoundary, k$2);
						} catch (y$2) {
							if (tb$1(), "object" === typeof y$2 && null !== y$2 && "function" === typeof y$2.then) {
								var m$1 = g.ping;
								y$2.then(m$1, m$1);
							} else {
								g.abortSet.delete(g);
								k$2.status = 4;
								var l$4 = g.blockedBoundary, p$2 = y$2, B$2 = U$1(h, p$2);
								null === l$4 ? V$1(h, p$2) : (l$4.pendingTasks--, l$4.forceClientRender || (l$4.forceClientRender = !0, l$4.errorDigest = B$2, l$4.parentFlushed && h.clientRenderedBoundaries.push(l$4)));
								h.allPendingTasks--;
								if (0 === h.allPendingTasks) {
									var C$1 = h.onAllReady;
									C$1();
								}
							}
						}
					}
				}
				f$1.splice(0, e);
				null !== a.destination && Ob$1(a, a.destination);
			} catch (y$2) {
				U$1(a, y$2), V$1(a, y$2);
			} finally {
				R$1 = d, Ab$1.current = c, c === zb$1 && F$1(b);
			}
		}
	}
	function Y$1(a, b, c) {
		c.parentFlushed = !0;
		switch (c.status) {
			case 0:
				var d = c.id = a.nextSegmentId++;
				c.lastPushedText = !1;
				c.textEmbedded = !1;
				a = a.responseState;
				b.push("<template id=\"");
				b.push(a.placeholderPrefix);
				a = d.toString(16);
				b.push(a);
				return b.push("\"></template>");
			case 1:
				c.status = 2;
				var f$1 = !0;
				d = c.chunks;
				var e = 0;
				c = c.children;
				for (var g = 0; g < c.length; g++) {
					for (f$1 = c[g]; e < f$1.index; e++) b.push(d[e]);
					f$1 = Z$1(a, b, f$1);
				}
				for (; e < d.length - 1; e++) b.push(d[e]);
				e < d.length && (f$1 = b.push(d[e]));
				return f$1;
			default: throw Error("Aborted, errored or already flushed boundaries should not be flushed again. This is a bug in React.");
		}
	}
	function Z$1(a, b, c) {
		var d = c.boundary;
		if (null === d) return Y$1(a, b, c);
		d.parentFlushed = !0;
		if (d.forceClientRender) return a.responseState.generateStaticMarkup || (d = d.errorDigest, b.push("<!--$!-->"), b.push("<template"), d && (b.push(" data-dgst=\""), d = u$1(d), b.push(d), b.push("\"")), b.push("></template>")), Y$1(a, b, c), a = a.responseState.generateStaticMarkup ? !0 : b.push("<!--/$-->"), a;
		if (0 < d.pendingTasks) {
			d.rootSegmentID = a.nextSegmentId++;
			0 < d.completedSegments.length && a.partialBoundaries.push(d);
			var f$1 = a.responseState;
			var e = f$1.nextSuspenseID++;
			f$1 = f$1.boundaryPrefix + e.toString(16);
			d = d.id = f$1;
			Aa$1(b, a.responseState, d);
			Y$1(a, b, c);
			return b.push("<!--/$-->");
		}
		if (d.byteSize > a.progressiveChunkSize) return d.rootSegmentID = a.nextSegmentId++, a.completedBoundaries.push(d), Aa$1(b, a.responseState, d.id), Y$1(a, b, c), b.push("<!--/$-->");
		a.responseState.generateStaticMarkup || b.push("<!--$-->");
		c = d.completedSegments;
		if (1 !== c.length) throw Error("A previously unvisited boundary must have exactly one root segment. This is a bug in React.");
		Z$1(a, b, c[0]);
		a = a.responseState.generateStaticMarkup ? !0 : b.push("<!--/$-->");
		return a;
	}
	function Pb$1(a, b, c) {
		Ba$1(b, a.responseState, c.formatContext, c.id);
		Z$1(a, b, c);
		return Ca$1(b, c.formatContext);
	}
	function Qb$1(a, b, c) {
		for (var d = c.completedSegments, f$1 = 0; f$1 < d.length; f$1++) Rb$1(a, b, c, d[f$1]);
		d.length = 0;
		a = a.responseState;
		d = c.id;
		c = c.rootSegmentID;
		b.push(a.startInlineScript);
		a.sentCompleteBoundaryFunction ? b.push("$RC(\"") : (a.sentCompleteBoundaryFunction = !0, b.push("function $RC(a,b){a=document.getElementById(a);b=document.getElementById(b);b.parentNode.removeChild(b);if(a){a=a.previousSibling;var f=a.parentNode,c=a.nextSibling,e=0;do{if(c&&8===c.nodeType){var d=c.data;if(\"/$\"===d)if(0===e)break;else e--;else\"$\"!==d&&\"$?\"!==d&&\"$!\"!==d||e++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;b.firstChild;)f.insertBefore(b.firstChild,c);a.data=\"$\";a._reactRetry&&a._reactRetry()}};$RC(\""));
		if (null === d) throw Error("An ID must have been assigned before we can complete the boundary.");
		c = c.toString(16);
		b.push(d);
		b.push("\",\"");
		b.push(a.segmentPrefix);
		b.push(c);
		return b.push("\")<\/script>");
	}
	function Rb$1(a, b, c, d) {
		if (2 === d.status) return !0;
		var f$1 = d.id;
		if (-1 === f$1) {
			if (-1 === (d.id = c.rootSegmentID)) throw Error("A root segment ID must have been assigned by now. This is a bug in React.");
			return Pb$1(a, b, d);
		}
		Pb$1(a, b, d);
		a = a.responseState;
		b.push(a.startInlineScript);
		a.sentCompleteSegmentFunction ? b.push("$RS(\"") : (a.sentCompleteSegmentFunction = !0, b.push("function $RS(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS(\""));
		b.push(a.segmentPrefix);
		f$1 = f$1.toString(16);
		b.push(f$1);
		b.push("\",\"");
		b.push(a.placeholderPrefix);
		b.push(f$1);
		return b.push("\")<\/script>");
	}
	function Ob$1(a, b) {
		try {
			var c = a.completedRootSegment;
			if (null !== c && 0 === a.pendingRootTasks) {
				Z$1(a, b, c);
				a.completedRootSegment = null;
				var d = a.responseState.bootstrapChunks;
				for (c = 0; c < d.length - 1; c++) b.push(d[c]);
				c < d.length && b.push(d[c]);
			}
			var f$1 = a.clientRenderedBoundaries, e;
			for (e = 0; e < f$1.length; e++) {
				var g = f$1[e];
				d = b;
				var h = a.responseState, k$2 = g.id, m$1 = g.errorDigest, l$4 = g.errorMessage, p$2 = g.errorComponentStack;
				d.push(h.startInlineScript);
				h.sentClientRenderFunction ? d.push("$RX(\"") : (h.sentClientRenderFunction = !0, d.push("function $RX(b,c,d,e){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data=\"$!\",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),b._reactRetry&&b._reactRetry())};$RX(\""));
				if (null === k$2) throw Error("An ID must have been assigned before we can complete the boundary.");
				d.push(k$2);
				d.push("\"");
				if (m$1 || l$4 || p$2) {
					d.push(",");
					var B$2 = Ea$1(m$1 || "");
					d.push(B$2);
				}
				if (l$4 || p$2) {
					d.push(",");
					var C$1 = Ea$1(l$4 || "");
					d.push(C$1);
				}
				if (p$2) {
					d.push(",");
					var y$2 = Ea$1(p$2);
					d.push(y$2);
				}
				if (!d.push(")<\/script>")) {
					a.destination = null;
					e++;
					f$1.splice(0, e);
					return;
				}
			}
			f$1.splice(0, e);
			var aa$1 = a.completedBoundaries;
			for (e = 0; e < aa$1.length; e++) if (!Qb$1(a, b, aa$1[e])) {
				a.destination = null;
				e++;
				aa$1.splice(0, e);
				return;
			}
			aa$1.splice(0, e);
			var ba$1 = a.partialBoundaries;
			for (e = 0; e < ba$1.length; e++) {
				var pb$1 = ba$1[e];
				a: {
					f$1 = a;
					g = b;
					var ca$1 = pb$1.completedSegments;
					for (h = 0; h < ca$1.length; h++) if (!Rb$1(f$1, g, pb$1, ca$1[h])) {
						h++;
						ca$1.splice(0, h);
						var qb$1 = !1;
						break a;
					}
					ca$1.splice(0, h);
					qb$1 = !0;
				}
				if (!qb$1) {
					a.destination = null;
					e++;
					ba$1.splice(0, e);
					return;
				}
			}
			ba$1.splice(0, e);
			var da$1 = a.completedBoundaries;
			for (e = 0; e < da$1.length; e++) if (!Qb$1(a, b, da$1[e])) {
				a.destination = null;
				e++;
				da$1.splice(0, e);
				return;
			}
			da$1.splice(0, e);
		} finally {
			0 === a.allPendingTasks && 0 === a.pingedTasks.length && 0 === a.clientRenderedBoundaries.length && 0 === a.completedBoundaries.length && b.push(null);
		}
	}
	function Sb$1(a, b) {
		if (1 === a.status) a.status = 2, b.destroy(a.fatalError);
		else if (2 !== a.status && null === a.destination) {
			a.destination = b;
			try {
				Ob$1(a, b);
			} catch (c) {
				U$1(a, c), V$1(a, c);
			}
		}
	}
	function Tb$1(a, b) {
		try {
			var c = a.abortableTasks;
			c.forEach(function(c$1) {
				return Nb$1(c$1, a, b);
			});
			c.clear();
			null !== a.destination && Ob$1(a, a.destination);
		} catch (d) {
			U$1(a, d), V$1(a, d);
		}
	}
	function Ub$1() {}
	function Vb$1(a, b, c, d) {
		var f$1 = !1, e = null, g = "", h = !1;
		a = Cb$1(a, Fa$1(c, b ? b.identifierPrefix : void 0), Ga$1(), Infinity, Ub$1, void 0, function() {
			h = !0;
		}, void 0, void 0);
		Eb(a);
		Tb$1(a, d);
		Sb$1(a, {
			push: function(a$1) {
				null !== a$1 && (g += a$1);
				return !0;
			},
			destroy: function(a$1) {
				f$1 = !0;
				e = a$1;
			}
		});
		if (f$1) throw e;
		if (!h) throw Error("A component suspended while responding to synchronous input. This will cause the UI to be replaced with a loading indicator. To fix, updates that suspend should be wrapped with startTransition.");
		return g;
	}
	function Wb$1(a, b) {
		a.prototype = Object.create(b.prototype);
		a.prototype.constructor = a;
		a.__proto__ = b;
	}
	var Xb$1 = function(a) {
		function b() {
			var b$1 = a.call(this, {}) || this;
			b$1.request = null;
			b$1.startedFlowing = !1;
			return b$1;
		}
		Wb$1(b, a);
		var c = b.prototype;
		c._destroy = function(a$1, b$1) {
			Tb$1(this.request);
			b$1(a$1);
		};
		c._read = function() {
			this.startedFlowing && Sb$1(this.request, this);
		};
		return b;
	}(fa$1.Readable);
	function Yb$1() {}
	function Zb$1(a, b) {
		var c = new Xb$1(), d = Cb$1(a, Fa$1(!1, b ? b.identifierPrefix : void 0), Ga$1(), Infinity, Yb$1, function() {
			c.startedFlowing = !0;
			Sb$1(d, c);
		}, void 0, void 0);
		c.request = d;
		Eb(d);
		return c;
	}
	exports.renderToNodeStream = function(a, b) {
		return Zb$1(a, b);
	};
	exports.renderToStaticMarkup = function(a, b) {
		return Vb$1(a, b, !0, "The server used \"renderToStaticMarkup\" which does not support Suspense. If you intended to have the server wait for the suspended component please switch to \"renderToPipeableStream\" which supports Suspense on the server");
	};
	exports.renderToStaticNodeStream = function(a, b) {
		return Zb$1(a, b);
	};
	exports.renderToString = function(a, b) {
		return Vb$1(a, b, !1, "The server used \"renderToString\" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to \"renderToPipeableStream\" which supports Suspense on the server");
	};
	exports.version = "18.3.1";
}) });

//#endregion
//#region ../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/cjs/react-dom-server.node.production.min.js
var require_react_dom_server_node_production_min = /* @__PURE__ */ __commonJS({ "../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/cjs/react-dom-server.node.production.min.js": ((exports) => {
	var aa = __require("util"), ba = require_react(), k$1 = null, l$2 = 0, q$1 = !0;
	function r(a, b) {
		if ("string" === typeof b) {
			if (0 !== b.length) if (2048 < 3 * b.length) 0 < l$2 && (t(a, k$1.subarray(0, l$2)), k$1 = new Uint8Array(2048), l$2 = 0), t(a, u.encode(b));
			else {
				var c = k$1;
				0 < l$2 && (c = k$1.subarray(l$2));
				c = u.encodeInto(b, c);
				var d = c.read;
				l$2 += c.written;
				d < b.length && (t(a, k$1), k$1 = new Uint8Array(2048), l$2 = u.encodeInto(b.slice(d), k$1).written);
				2048 === l$2 && (t(a, k$1), k$1 = new Uint8Array(2048), l$2 = 0);
			}
		} else 0 !== b.byteLength && (2048 < b.byteLength ? (0 < l$2 && (t(a, k$1.subarray(0, l$2)), k$1 = new Uint8Array(2048), l$2 = 0), t(a, b)) : (c = k$1.length - l$2, c < b.byteLength && (0 === c ? t(a, k$1) : (k$1.set(b.subarray(0, c), l$2), l$2 += c, t(a, k$1), b = b.subarray(c)), k$1 = new Uint8Array(2048), l$2 = 0), k$1.set(b, l$2), l$2 += b.byteLength, 2048 === l$2 && (t(a, k$1), k$1 = new Uint8Array(2048), l$2 = 0)));
	}
	function t(a, b) {
		a = a.write(b);
		q$1 = q$1 && a;
	}
	function w(a, b) {
		r(a, b);
		return q$1;
	}
	function ca(a) {
		k$1 && 0 < l$2 && a.write(k$1.subarray(0, l$2));
		k$1 = null;
		l$2 = 0;
		q$1 = !0;
	}
	var u = new aa.TextEncoder();
	function x(a) {
		return u.encode(a);
	}
	var y = Object.prototype.hasOwnProperty, da = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, ea = {}, fa = {};
	function ha(a) {
		if (y.call(fa, a)) return !0;
		if (y.call(ea, a)) return !1;
		if (da.test(a)) return fa[a] = !0;
		ea[a] = !0;
		return !1;
	}
	function z(a, b, c, d, f$1, e, g) {
		this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
		this.attributeName = d;
		this.attributeNamespace = f$1;
		this.mustUseProperty = c;
		this.propertyName = a;
		this.type = b;
		this.sanitizeURL = e;
		this.removeEmptyString = g;
	}
	var A = {};
	"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a) {
		A[a] = new z(a, 0, !1, a, null, !1, !1);
	});
	[
		["acceptCharset", "accept-charset"],
		["className", "class"],
		["htmlFor", "for"],
		["httpEquiv", "http-equiv"]
	].forEach(function(a) {
		var b = a[0];
		A[b] = new z(b, 1, !1, a[1], null, !1, !1);
	});
	[
		"contentEditable",
		"draggable",
		"spellCheck",
		"value"
	].forEach(function(a) {
		A[a] = new z(a, 2, !1, a.toLowerCase(), null, !1, !1);
	});
	[
		"autoReverse",
		"externalResourcesRequired",
		"focusable",
		"preserveAlpha"
	].forEach(function(a) {
		A[a] = new z(a, 2, !1, a, null, !1, !1);
	});
	"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a) {
		A[a] = new z(a, 3, !1, a.toLowerCase(), null, !1, !1);
	});
	[
		"checked",
		"multiple",
		"muted",
		"selected"
	].forEach(function(a) {
		A[a] = new z(a, 3, !0, a, null, !1, !1);
	});
	["capture", "download"].forEach(function(a) {
		A[a] = new z(a, 4, !1, a, null, !1, !1);
	});
	[
		"cols",
		"rows",
		"size",
		"span"
	].forEach(function(a) {
		A[a] = new z(a, 6, !1, a, null, !1, !1);
	});
	["rowSpan", "start"].forEach(function(a) {
		A[a] = new z(a, 5, !1, a.toLowerCase(), null, !1, !1);
	});
	var ia = /[\-:]([a-z])/g;
	function ja(a) {
		return a[1].toUpperCase();
	}
	"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a) {
		var b = a.replace(ia, ja);
		A[b] = new z(b, 1, !1, a, null, !1, !1);
	});
	"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a) {
		var b = a.replace(ia, ja);
		A[b] = new z(b, 1, !1, a, "http://www.w3.org/1999/xlink", !1, !1);
	});
	[
		"xml:base",
		"xml:lang",
		"xml:space"
	].forEach(function(a) {
		var b = a.replace(ia, ja);
		A[b] = new z(b, 1, !1, a, "http://www.w3.org/XML/1998/namespace", !1, !1);
	});
	["tabIndex", "crossOrigin"].forEach(function(a) {
		A[a] = new z(a, 1, !1, a.toLowerCase(), null, !1, !1);
	});
	A.xlinkHref = new z("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1);
	[
		"src",
		"href",
		"action",
		"formAction"
	].forEach(function(a) {
		A[a] = new z(a, 1, !1, a.toLowerCase(), null, !0, !0);
	});
	var B = {
		animationIterationCount: !0,
		aspectRatio: !0,
		borderImageOutset: !0,
		borderImageSlice: !0,
		borderImageWidth: !0,
		boxFlex: !0,
		boxFlexGroup: !0,
		boxOrdinalGroup: !0,
		columnCount: !0,
		columns: !0,
		flex: !0,
		flexGrow: !0,
		flexPositive: !0,
		flexShrink: !0,
		flexNegative: !0,
		flexOrder: !0,
		gridArea: !0,
		gridRow: !0,
		gridRowEnd: !0,
		gridRowSpan: !0,
		gridRowStart: !0,
		gridColumn: !0,
		gridColumnEnd: !0,
		gridColumnSpan: !0,
		gridColumnStart: !0,
		fontWeight: !0,
		lineClamp: !0,
		lineHeight: !0,
		opacity: !0,
		order: !0,
		orphans: !0,
		tabSize: !0,
		widows: !0,
		zIndex: !0,
		zoom: !0,
		fillOpacity: !0,
		floodOpacity: !0,
		stopOpacity: !0,
		strokeDasharray: !0,
		strokeDashoffset: !0,
		strokeMiterlimit: !0,
		strokeOpacity: !0,
		strokeWidth: !0
	}, ka = [
		"Webkit",
		"ms",
		"Moz",
		"O"
	];
	Object.keys(B).forEach(function(a) {
		ka.forEach(function(b) {
			b = b + a.charAt(0).toUpperCase() + a.substring(1);
			B[b] = B[a];
		});
	});
	var la = /["'&<>]/;
	function F(a) {
		if ("boolean" === typeof a || "number" === typeof a) return "" + a;
		a = "" + a;
		var b = la.exec(a);
		if (b) {
			var c = "", d, f$1 = 0;
			for (d = b.index; d < a.length; d++) {
				switch (a.charCodeAt(d)) {
					case 34:
						b = "&quot;";
						break;
					case 38:
						b = "&amp;";
						break;
					case 39:
						b = "&#x27;";
						break;
					case 60:
						b = "&lt;";
						break;
					case 62:
						b = "&gt;";
						break;
					default: continue;
				}
				f$1 !== d && (c += a.substring(f$1, d));
				f$1 = d + 1;
				c += b;
			}
			a = f$1 !== d ? c + a.substring(f$1, d) : c;
		}
		return a;
	}
	var ma = /([A-Z])/g, pa = /^ms-/, qa = Array.isArray, ra = x("<script>"), sa = x("<\/script>"), ta = x("<script src=\""), ua = x("<script type=\"module\" src=\""), va = x("\" async=\"\"><\/script>"), wa = /(<\/|<)(s)(cript)/gi;
	function xa(a, b, c, d) {
		return "" + b + ("s" === c ? "\\u0073" : "\\u0053") + d;
	}
	function G(a, b) {
		return {
			insertionMode: a,
			selectedValue: b
		};
	}
	function ya(a, b, c) {
		switch (b) {
			case "select": return G(1, null != c.value ? c.value : c.defaultValue);
			case "svg": return G(2, null);
			case "math": return G(3, null);
			case "foreignObject": return G(1, null);
			case "table": return G(4, null);
			case "thead":
			case "tbody":
			case "tfoot": return G(5, null);
			case "colgroup": return G(7, null);
			case "tr": return G(6, null);
		}
		return 4 <= a.insertionMode || 0 === a.insertionMode ? G(1, null) : a;
	}
	var za = x("<!-- -->");
	function Aa(a, b, c, d) {
		if ("" === b) return d;
		d && a.push(za);
		a.push(F(b));
		return !0;
	}
	var Ba = /* @__PURE__ */ new Map(), Ca = x(" style=\""), Da = x(":"), Ea = x(";");
	function Fa(a, b, c) {
		if ("object" !== typeof c) throw Error("The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX.");
		b = !0;
		for (var d in c) if (y.call(c, d)) {
			var f$1 = c[d];
			if (null != f$1 && "boolean" !== typeof f$1 && "" !== f$1) {
				if (0 === d.indexOf("--")) {
					var e = F(d);
					f$1 = F(("" + f$1).trim());
				} else {
					e = d;
					var g = Ba.get(e);
					void 0 !== g ? e = g : (g = x(F(e.replace(ma, "-$1").toLowerCase().replace(pa, "-ms-"))), Ba.set(e, g), e = g);
					f$1 = "number" === typeof f$1 ? 0 === f$1 || y.call(B, d) ? "" + f$1 : f$1 + "px" : F(("" + f$1).trim());
				}
				b ? (b = !1, a.push(Ca, e, Da, f$1)) : a.push(Ea, e, Da, f$1);
			}
		}
		b || a.push(H$2);
	}
	var I = x(" "), J = x("=\""), H$2 = x("\""), Ga = x("=\"\"");
	function K(a, b, c, d) {
		switch (c) {
			case "style":
				Fa(a, b, d);
				return;
			case "defaultValue":
			case "defaultChecked":
			case "innerHTML":
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning": return;
		}
		if (!(2 < c.length) || "o" !== c[0] && "O" !== c[0] || "n" !== c[1] && "N" !== c[1]) {
			if (b = A.hasOwnProperty(c) ? A[c] : null, null !== b) {
				switch (typeof d) {
					case "function":
					case "symbol": return;
					case "boolean": if (!b.acceptsBooleans) return;
				}
				c = b.attributeName;
				switch (b.type) {
					case 3:
						d && a.push(I, c, Ga);
						break;
					case 4:
						!0 === d ? a.push(I, c, Ga) : !1 !== d && a.push(I, c, J, F(d), H$2);
						break;
					case 5:
						isNaN(d) || a.push(I, c, J, F(d), H$2);
						break;
					case 6:
						!isNaN(d) && 1 <= d && a.push(I, c, J, F(d), H$2);
						break;
					default: b.sanitizeURL && (d = "" + d), a.push(I, c, J, F(d), H$2);
				}
			} else if (ha(c)) {
				switch (typeof d) {
					case "function":
					case "symbol": return;
					case "boolean": if (b = c.toLowerCase().slice(0, 5), "data-" !== b && "aria-" !== b) return;
				}
				a.push(I, c, J, F(d), H$2);
			}
		}
	}
	var L = x(">"), Ha = x("/>");
	function M(a, b, c) {
		if (null != b) {
			if (null != c) throw Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
			if ("object" !== typeof b || !("__html" in b)) throw Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://reactjs.org/link/dangerously-set-inner-html for more information.");
			b = b.__html;
			null !== b && void 0 !== b && a.push("" + b);
		}
	}
	function Ia(a) {
		var b = "";
		ba.Children.forEach(a, function(a$1) {
			null != a$1 && (b += a$1);
		});
		return b;
	}
	var Ja = x(" selected=\"\"");
	function Ka(a, b, c, d) {
		a.push(N(c));
		var f$1 = c = null, e;
		for (e in b) if (y.call(b, e)) {
			var g = b[e];
			if (null != g) switch (e) {
				case "children":
					c = g;
					break;
				case "dangerouslySetInnerHTML":
					f$1 = g;
					break;
				default: K(a, d, e, g);
			}
		}
		a.push(L);
		M(a, f$1, c);
		return "string" === typeof c ? (a.push(F(c)), null) : c;
	}
	var La = x("\n"), Ma = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/, Na = /* @__PURE__ */ new Map();
	function N(a) {
		var b = Na.get(a);
		if (void 0 === b) {
			if (!Ma.test(a)) throw Error("Invalid tag: " + a);
			b = x("<" + a);
			Na.set(a, b);
		}
		return b;
	}
	var Oa = x("<!DOCTYPE html>");
	function Pa(a, b, c, d, f$1) {
		switch (b) {
			case "select":
				a.push(N("select"));
				var e = null, g = null;
				for (p$2 in c) if (y.call(c, p$2)) {
					var h = c[p$2];
					if (null != h) switch (p$2) {
						case "children":
							e = h;
							break;
						case "dangerouslySetInnerHTML":
							g = h;
							break;
						case "defaultValue":
						case "value": break;
						default: K(a, d, p$2, h);
					}
				}
				a.push(L);
				M(a, g, e);
				return e;
			case "option":
				g = f$1.selectedValue;
				a.push(N("option"));
				var m$1 = h = null, n$3 = null;
				var p$2 = null;
				for (e in c) if (y.call(c, e)) {
					var v$2 = c[e];
					if (null != v$2) switch (e) {
						case "children":
							h = v$2;
							break;
						case "selected":
							n$3 = v$2;
							break;
						case "dangerouslySetInnerHTML":
							p$2 = v$2;
							break;
						case "value": m$1 = v$2;
						default: K(a, d, e, v$2);
					}
				}
				if (null != g) if (c = null !== m$1 ? "" + m$1 : Ia(h), qa(g)) {
					for (d = 0; d < g.length; d++) if ("" + g[d] === c) {
						a.push(Ja);
						break;
					}
				} else "" + g === c && a.push(Ja);
				else n$3 && a.push(Ja);
				a.push(L);
				M(a, p$2, h);
				return h;
			case "textarea":
				a.push(N("textarea"));
				p$2 = g = e = null;
				for (h in c) if (y.call(c, h) && (m$1 = c[h], null != m$1)) switch (h) {
					case "children":
						p$2 = m$1;
						break;
					case "value":
						e = m$1;
						break;
					case "defaultValue":
						g = m$1;
						break;
					case "dangerouslySetInnerHTML": throw Error("`dangerouslySetInnerHTML` does not make sense on <textarea>.");
					default: K(a, d, h, m$1);
				}
				null === e && null !== g && (e = g);
				a.push(L);
				if (null != p$2) {
					if (null != e) throw Error("If you supply `defaultValue` on a <textarea>, do not pass children.");
					if (qa(p$2) && 1 < p$2.length) throw Error("<textarea> can only have at most one child.");
					e = "" + p$2;
				}
				"string" === typeof e && "\n" === e[0] && a.push(La);
				null !== e && a.push(F("" + e));
				return null;
			case "input":
				a.push(N("input"));
				m$1 = p$2 = h = e = null;
				for (g in c) if (y.call(c, g) && (n$3 = c[g], null != n$3)) switch (g) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error("input is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
					case "defaultChecked":
						m$1 = n$3;
						break;
					case "defaultValue":
						h = n$3;
						break;
					case "checked":
						p$2 = n$3;
						break;
					case "value":
						e = n$3;
						break;
					default: K(a, d, g, n$3);
				}
				null !== p$2 ? K(a, d, "checked", p$2) : null !== m$1 && K(a, d, "checked", m$1);
				null !== e ? K(a, d, "value", e) : null !== h && K(a, d, "value", h);
				a.push(Ha);
				return null;
			case "menuitem":
				a.push(N("menuitem"));
				for (var C$1 in c) if (y.call(c, C$1) && (e = c[C$1], null != e)) switch (C$1) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error("menuitems cannot have `children` nor `dangerouslySetInnerHTML`.");
					default: K(a, d, C$1, e);
				}
				a.push(L);
				return null;
			case "title":
				a.push(N("title"));
				e = null;
				for (v$2 in c) if (y.call(c, v$2) && (g = c[v$2], null != g)) switch (v$2) {
					case "children":
						e = g;
						break;
					case "dangerouslySetInnerHTML": throw Error("`dangerouslySetInnerHTML` does not make sense on <title>.");
					default: K(a, d, v$2, g);
				}
				a.push(L);
				return e;
			case "listing":
			case "pre":
				a.push(N(b));
				g = e = null;
				for (m$1 in c) if (y.call(c, m$1) && (h = c[m$1], null != h)) switch (m$1) {
					case "children":
						e = h;
						break;
					case "dangerouslySetInnerHTML":
						g = h;
						break;
					default: K(a, d, m$1, h);
				}
				a.push(L);
				if (null != g) {
					if (null != e) throw Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
					if ("object" !== typeof g || !("__html" in g)) throw Error("`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://reactjs.org/link/dangerously-set-inner-html for more information.");
					c = g.__html;
					null !== c && void 0 !== c && ("string" === typeof c && 0 < c.length && "\n" === c[0] ? a.push(La, c) : a.push("" + c));
				}
				"string" === typeof e && "\n" === e[0] && a.push(La);
				return e;
			case "area":
			case "base":
			case "br":
			case "col":
			case "embed":
			case "hr":
			case "img":
			case "keygen":
			case "link":
			case "meta":
			case "param":
			case "source":
			case "track":
			case "wbr":
				a.push(N(b));
				for (var D$2 in c) if (y.call(c, D$2) && (e = c[D$2], null != e)) switch (D$2) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(b + " is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`.");
					default: K(a, d, D$2, e);
				}
				a.push(Ha);
				return null;
			case "annotation-xml":
			case "color-profile":
			case "font-face":
			case "font-face-src":
			case "font-face-uri":
			case "font-face-format":
			case "font-face-name":
			case "missing-glyph": return Ka(a, c, b, d);
			case "html": return 0 === f$1.insertionMode && a.push(Oa), Ka(a, c, b, d);
			default:
				if (-1 === b.indexOf("-") && "string" !== typeof c.is) return Ka(a, c, b, d);
				a.push(N(b));
				g = e = null;
				for (n$3 in c) if (y.call(c, n$3) && (h = c[n$3], null != h)) switch (n$3) {
					case "children":
						e = h;
						break;
					case "dangerouslySetInnerHTML":
						g = h;
						break;
					case "style":
						Fa(a, d, h);
						break;
					case "suppressContentEditableWarning":
					case "suppressHydrationWarning": break;
					default: ha(n$3) && "function" !== typeof h && "symbol" !== typeof h && a.push(I, n$3, J, F(h), H$2);
				}
				a.push(L);
				M(a, g, e);
				return e;
		}
	}
	var Qa = x("</"), Ra = x(">"), Sa = x("<template id=\""), Ta = x("\"></template>"), Ua = x("<!--$-->"), Va = x("<!--$?--><template id=\""), Wa = x("\"></template>"), Xa = x("<!--$!-->"), Ya = x("<!--/$-->"), Za = x("<template"), $a = x("\""), ab = x(" data-dgst=\"");
	x(" data-msg=\"");
	x(" data-stck=\"");
	var bb = x("></template>");
	function cb(a, b, c) {
		r(a, Va);
		if (null === c) throw Error("An ID must have been assigned before we can complete the boundary.");
		r(a, c);
		return w(a, Wa);
	}
	var db = x("<div hidden id=\""), eb = x("\">"), fb = x("</div>"), gb = x("<svg aria-hidden=\"true\" style=\"display:none\" id=\""), hb = x("\">"), ib = x("</svg>"), jb = x("<math aria-hidden=\"true\" style=\"display:none\" id=\""), kb = x("\">"), lb = x("</math>"), mb = x("<table hidden id=\""), nb = x("\">"), ob = x("</table>"), pb = x("<table hidden><tbody id=\""), qb = x("\">"), rb = x("</tbody></table>"), sb = x("<table hidden><tr id=\""), tb = x("\">"), ub = x("</tr></table>"), vb = x("<table hidden><colgroup id=\""), wb = x("\">"), xb = x("</colgroup></table>");
	function yb(a, b, c, d) {
		switch (c.insertionMode) {
			case 0:
			case 1: return r(a, db), r(a, b.segmentPrefix), r(a, d.toString(16)), w(a, eb);
			case 2: return r(a, gb), r(a, b.segmentPrefix), r(a, d.toString(16)), w(a, hb);
			case 3: return r(a, jb), r(a, b.segmentPrefix), r(a, d.toString(16)), w(a, kb);
			case 4: return r(a, mb), r(a, b.segmentPrefix), r(a, d.toString(16)), w(a, nb);
			case 5: return r(a, pb), r(a, b.segmentPrefix), r(a, d.toString(16)), w(a, qb);
			case 6: return r(a, sb), r(a, b.segmentPrefix), r(a, d.toString(16)), w(a, tb);
			case 7: return r(a, vb), r(a, b.segmentPrefix), r(a, d.toString(16)), w(a, wb);
			default: throw Error("Unknown insertion mode. This is a bug in React.");
		}
	}
	function zb(a, b) {
		switch (b.insertionMode) {
			case 0:
			case 1: return w(a, fb);
			case 2: return w(a, ib);
			case 3: return w(a, lb);
			case 4: return w(a, ob);
			case 5: return w(a, rb);
			case 6: return w(a, ub);
			case 7: return w(a, xb);
			default: throw Error("Unknown insertion mode. This is a bug in React.");
		}
	}
	var Ab = x("function $RS(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS(\""), Bb = x("$RS(\""), Cb = x("\",\""), Db = x("\")<\/script>"), Fb = x("function $RC(a,b){a=document.getElementById(a);b=document.getElementById(b);b.parentNode.removeChild(b);if(a){a=a.previousSibling;var f=a.parentNode,c=a.nextSibling,e=0;do{if(c&&8===c.nodeType){var d=c.data;if(\"/$\"===d)if(0===e)break;else e--;else\"$\"!==d&&\"$?\"!==d&&\"$!\"!==d||e++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;b.firstChild;)f.insertBefore(b.firstChild,c);a.data=\"$\";a._reactRetry&&a._reactRetry()}};$RC(\""), Gb = x("$RC(\""), Hb = x("\",\""), Ib = x("\")<\/script>"), Jb = x("function $RX(b,c,d,e){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data=\"$!\",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),b._reactRetry&&b._reactRetry())};$RX(\""), Kb = x("$RX(\""), Lb = x("\""), Mb = x(")<\/script>"), Nb = x(","), Ob = /[<\u2028\u2029]/g;
	function Pb(a) {
		return JSON.stringify(a).replace(Ob, function(a$1) {
			switch (a$1) {
				case "<": return "\\u003c";
				case "\u2028": return "\\u2028";
				case "\u2029": return "\\u2029";
				default: throw Error("escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React");
			}
		});
	}
	var O = Object.assign, Qb = Symbol.for("react.element"), Rb = Symbol.for("react.portal"), Sb = Symbol.for("react.fragment"), Tb = Symbol.for("react.strict_mode"), Ub = Symbol.for("react.profiler"), Vb = Symbol.for("react.provider"), Wb = Symbol.for("react.context"), Xb = Symbol.for("react.forward_ref"), Yb = Symbol.for("react.suspense"), Zb = Symbol.for("react.suspense_list"), $b = Symbol.for("react.memo"), ac = Symbol.for("react.lazy"), bc = Symbol.for("react.scope"), cc = Symbol.for("react.debug_trace_mode"), dc = Symbol.for("react.legacy_hidden"), ec = Symbol.for("react.default_value"), fc = Symbol.iterator;
	function gc(a) {
		if (null == a) return null;
		if ("function" === typeof a) return a.displayName || a.name || null;
		if ("string" === typeof a) return a;
		switch (a) {
			case Sb: return "Fragment";
			case Rb: return "Portal";
			case Ub: return "Profiler";
			case Tb: return "StrictMode";
			case Yb: return "Suspense";
			case Zb: return "SuspenseList";
		}
		if ("object" === typeof a) switch (a.$$typeof) {
			case Wb: return (a.displayName || "Context") + ".Consumer";
			case Vb: return (a._context.displayName || "Context") + ".Provider";
			case Xb:
				var b = a.render;
				a = a.displayName;
				a || (a = b.displayName || b.name || "", a = "" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
				return a;
			case $b: return b = a.displayName || null, null !== b ? b : gc(a.type) || "Memo";
			case ac:
				b = a._payload;
				a = a._init;
				try {
					return gc(a(b));
				} catch (c) {}
		}
		return null;
	}
	var hc = {};
	function ic(a, b) {
		a = a.contextTypes;
		if (!a) return hc;
		var c = {}, d;
		for (d in a) c[d] = b[d];
		return c;
	}
	var P = null;
	function Q(a, b) {
		if (a !== b) {
			a.context._currentValue = a.parentValue;
			a = a.parent;
			var c = b.parent;
			if (null === a) {
				if (null !== c) throw Error("The stacks must reach the root at the same time. This is a bug in React.");
			} else {
				if (null === c) throw Error("The stacks must reach the root at the same time. This is a bug in React.");
				Q(a, c);
			}
			b.context._currentValue = b.value;
		}
	}
	function jc(a) {
		a.context._currentValue = a.parentValue;
		a = a.parent;
		null !== a && jc(a);
	}
	function kc(a) {
		var b = a.parent;
		null !== b && kc(b);
		a.context._currentValue = a.value;
	}
	function lc(a, b) {
		a.context._currentValue = a.parentValue;
		a = a.parent;
		if (null === a) throw Error("The depth must equal at least at zero before reaching the root. This is a bug in React.");
		a.depth === b.depth ? Q(a, b) : lc(a, b);
	}
	function mc(a, b) {
		var c = b.parent;
		if (null === c) throw Error("The depth must equal at least at zero before reaching the root. This is a bug in React.");
		a.depth === c.depth ? Q(a, c) : mc(a, c);
		b.context._currentValue = b.value;
	}
	function nc(a) {
		var b = P;
		b !== a && (null === b ? kc(a) : null === a ? jc(b) : b.depth === a.depth ? Q(b, a) : b.depth > a.depth ? lc(b, a) : mc(b, a), P = a);
	}
	var oc = {
		isMounted: function() {
			return !1;
		},
		enqueueSetState: function(a, b) {
			a = a._reactInternals;
			null !== a.queue && a.queue.push(b);
		},
		enqueueReplaceState: function(a, b) {
			a = a._reactInternals;
			a.replace = !0;
			a.queue = [b];
		},
		enqueueForceUpdate: function() {}
	};
	function pc(a, b, c, d) {
		var f$1 = void 0 !== a.state ? a.state : null;
		a.updater = oc;
		a.props = c;
		a.state = f$1;
		var e = {
			queue: [],
			replace: !1
		};
		a._reactInternals = e;
		var g = b.contextType;
		a.context = "object" === typeof g && null !== g ? g._currentValue : d;
		g = b.getDerivedStateFromProps;
		"function" === typeof g && (g = g(c, f$1), f$1 = null === g || void 0 === g ? f$1 : O({}, f$1, g), a.state = f$1);
		if ("function" !== typeof b.getDerivedStateFromProps && "function" !== typeof a.getSnapshotBeforeUpdate && ("function" === typeof a.UNSAFE_componentWillMount || "function" === typeof a.componentWillMount)) if (b = a.state, "function" === typeof a.componentWillMount && a.componentWillMount(), "function" === typeof a.UNSAFE_componentWillMount && a.UNSAFE_componentWillMount(), b !== a.state && oc.enqueueReplaceState(a, a.state, null), null !== e.queue && 0 < e.queue.length) if (b = e.queue, g = e.replace, e.queue = null, e.replace = !1, g && 1 === b.length) a.state = b[0];
		else {
			e = g ? b[0] : a.state;
			f$1 = !0;
			for (g = g ? 1 : 0; g < b.length; g++) {
				var h = b[g];
				h = "function" === typeof h ? h.call(a, e, c, d) : h;
				null != h && (f$1 ? (f$1 = !1, e = O({}, e, h)) : O(e, h));
			}
			a.state = e;
		}
		else e.queue = null;
	}
	var qc = {
		id: 1,
		overflow: ""
	};
	function rc(a, b, c) {
		var d = a.id;
		a = a.overflow;
		var f$1 = 32 - sc(d) - 1;
		d &= ~(1 << f$1);
		c += 1;
		var e = 32 - sc(b) + f$1;
		if (30 < e) {
			var g = f$1 - f$1 % 5;
			e = (d & (1 << g) - 1).toString(32);
			d >>= g;
			f$1 -= g;
			return {
				id: 1 << 32 - sc(b) + f$1 | c << f$1 | d,
				overflow: e + a
			};
		}
		return {
			id: 1 << e | c << f$1 | d,
			overflow: a
		};
	}
	var sc = Math.clz32 ? Math.clz32 : tc, uc = Math.log, vc = Math.LN2;
	function tc(a) {
		a >>>= 0;
		return 0 === a ? 32 : 31 - (uc(a) / vc | 0) | 0;
	}
	function wc(a, b) {
		return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
	}
	var xc = "function" === typeof Object.is ? Object.is : wc, R = null, yc = null, zc = null, S = null, T = !1, Ac = !1, U = 0, V = null, Bc = 0;
	function W$2() {
		if (null === R) throw Error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
		return R;
	}
	function Cc() {
		if (0 < Bc) throw Error("Rendered more hooks than during the previous render");
		return {
			memoizedState: null,
			queue: null,
			next: null
		};
	}
	function Dc() {
		null === S ? null === zc ? (T = !1, zc = S = Cc()) : (T = !0, S = zc) : null === S.next ? (T = !1, S = S.next = Cc()) : (T = !0, S = S.next);
		return S;
	}
	function Ec() {
		yc = R = null;
		Ac = !1;
		zc = null;
		Bc = 0;
		S = V = null;
	}
	function Fc(a, b) {
		return "function" === typeof b ? b(a) : b;
	}
	function Gc(a, b, c) {
		R = W$2();
		S = Dc();
		if (T) {
			var d = S.queue;
			b = d.dispatch;
			if (null !== V && (c = V.get(d), void 0 !== c)) {
				V.delete(d);
				d = S.memoizedState;
				do
					d = a(d, c.action), c = c.next;
				while (null !== c);
				S.memoizedState = d;
				return [d, b];
			}
			return [S.memoizedState, b];
		}
		a = a === Fc ? "function" === typeof b ? b() : b : void 0 !== c ? c(b) : b;
		S.memoizedState = a;
		a = S.queue = {
			last: null,
			dispatch: null
		};
		a = a.dispatch = Hc.bind(null, R, a);
		return [S.memoizedState, a];
	}
	function Ic(a, b) {
		R = W$2();
		S = Dc();
		b = void 0 === b ? null : b;
		if (null !== S) {
			var c = S.memoizedState;
			if (null !== c && null !== b) {
				var d = c[1];
				a: if (null === d) d = !1;
				else {
					for (var f$1 = 0; f$1 < d.length && f$1 < b.length; f$1++) if (!xc(b[f$1], d[f$1])) {
						d = !1;
						break a;
					}
					d = !0;
				}
				if (d) return c[0];
			}
		}
		a = a();
		S.memoizedState = [a, b];
		return a;
	}
	function Hc(a, b, c) {
		if (25 <= Bc) throw Error("Too many re-renders. React limits the number of renders to prevent an infinite loop.");
		if (a === R) if (Ac = !0, a = {
			action: c,
			next: null
		}, null === V && (V = /* @__PURE__ */ new Map()), c = V.get(b), void 0 === c) V.set(b, a);
		else {
			for (b = c; null !== b.next;) b = b.next;
			b.next = a;
		}
	}
	function Jc() {
		throw Error("startTransition cannot be called during server rendering.");
	}
	function Kc() {}
	var Mc = {
		readContext: function(a) {
			return a._currentValue;
		},
		useContext: function(a) {
			W$2();
			return a._currentValue;
		},
		useMemo: Ic,
		useReducer: Gc,
		useRef: function(a) {
			R = W$2();
			S = Dc();
			var b = S.memoizedState;
			return null === b ? (a = { current: a }, S.memoizedState = a) : b;
		},
		useState: function(a) {
			return Gc(Fc, a);
		},
		useInsertionEffect: Kc,
		useLayoutEffect: function() {},
		useCallback: function(a, b) {
			return Ic(function() {
				return a;
			}, b);
		},
		useImperativeHandle: Kc,
		useEffect: Kc,
		useDebugValue: Kc,
		useDeferredValue: function(a) {
			W$2();
			return a;
		},
		useTransition: function() {
			W$2();
			return [!1, Jc];
		},
		useId: function() {
			var a = yc.treeContext;
			var b = a.overflow;
			a = a.id;
			a = (a & ~(1 << 32 - sc(a) - 1)).toString(32) + b;
			var c = Lc;
			if (null === c) throw Error("Invalid hook call. Hooks can only be called inside of the body of a function component.");
			b = U++;
			a = ":" + c.idPrefix + "R" + a;
			0 < b && (a += "H" + b.toString(32));
			return a + ":";
		},
		useMutableSource: function(a, b) {
			W$2();
			return b(a._source);
		},
		useSyncExternalStore: function(a, b, c) {
			if (void 0 === c) throw Error("Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering.");
			return c();
		}
	}, Lc = null, Nc = ba.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
	function Oc(a) {
		console.error(a);
		return null;
	}
	function X() {}
	function Pc(a, b) {
		var c = a.pingedTasks;
		c.push(b);
		1 === c.length && setImmediate(function() {
			return Qc(a);
		});
	}
	function Rc(a, b, c, d, f$1, e, g, h) {
		a.allPendingTasks++;
		null === c ? a.pendingRootTasks++ : c.pendingTasks++;
		var m$1 = {
			node: b,
			ping: function() {
				return Pc(a, m$1);
			},
			blockedBoundary: c,
			blockedSegment: d,
			abortSet: f$1,
			legacyContext: e,
			context: g,
			treeContext: h
		};
		f$1.add(m$1);
		return m$1;
	}
	function Sc(a, b, c, d, f$1, e) {
		return {
			status: 0,
			id: -1,
			index: b,
			parentFlushed: !1,
			chunks: [],
			children: [],
			formatContext: d,
			boundary: c,
			lastPushedText: f$1,
			textEmbedded: e
		};
	}
	function Y(a, b) {
		a = a.onError(b);
		if (null != a && "string" !== typeof a) throw Error("onError returned something with a type other than \"string\". onError should return a string and may return null or undefined but must not return anything else. It received something of type \"" + typeof a + "\" instead");
		return a;
	}
	function Tc(a, b) {
		var c = a.onShellError;
		c(b);
		c = a.onFatalError;
		c(b);
		null !== a.destination ? (a.status = 2, a.destination.destroy(b)) : (a.status = 1, a.fatalError = b);
	}
	function Uc(a, b, c, d, f$1) {
		R = {};
		yc = b;
		U = 0;
		for (a = c(d, f$1); Ac;) Ac = !1, U = 0, Bc += 1, S = null, a = c(d, f$1);
		Ec();
		return a;
	}
	function Vc(a, b, c, d) {
		var f$1 = c.render(), e = d.childContextTypes;
		if (null !== e && void 0 !== e) {
			var g = b.legacyContext;
			if ("function" !== typeof c.getChildContext) d = g;
			else {
				c = c.getChildContext();
				for (var h in c) if (!(h in e)) throw Error((gc(d) || "Unknown") + ".getChildContext(): key \"" + h + "\" is not defined in childContextTypes.");
				d = O({}, g, c);
			}
			b.legacyContext = d;
			Z(a, b, f$1);
			b.legacyContext = g;
		} else Z(a, b, f$1);
	}
	function Wc(a, b) {
		if (a && a.defaultProps) {
			b = O({}, b);
			a = a.defaultProps;
			for (var c in a) void 0 === b[c] && (b[c] = a[c]);
			return b;
		}
		return b;
	}
	function Xc(a, b, c, d, f$1) {
		if ("function" === typeof c) if (c.prototype && c.prototype.isReactComponent) {
			f$1 = ic(c, b.legacyContext);
			var e = c.contextType;
			e = new c(d, "object" === typeof e && null !== e ? e._currentValue : f$1);
			pc(e, c, d, f$1);
			Vc(a, b, e, c);
		} else {
			e = ic(c, b.legacyContext);
			f$1 = Uc(a, b, c, d, e);
			var g = 0 !== U;
			if ("object" === typeof f$1 && null !== f$1 && "function" === typeof f$1.render && void 0 === f$1.$$typeof) pc(f$1, c, d, e), Vc(a, b, f$1, c);
			else if (g) {
				d = b.treeContext;
				b.treeContext = rc(d, 1, 0);
				try {
					Z(a, b, f$1);
				} finally {
					b.treeContext = d;
				}
			} else Z(a, b, f$1);
		}
		else if ("string" === typeof c) {
			f$1 = b.blockedSegment;
			e = Pa(f$1.chunks, c, d, a.responseState, f$1.formatContext);
			f$1.lastPushedText = !1;
			g = f$1.formatContext;
			f$1.formatContext = ya(g, c, d);
			Yc(a, b, e);
			f$1.formatContext = g;
			switch (c) {
				case "area":
				case "base":
				case "br":
				case "col":
				case "embed":
				case "hr":
				case "img":
				case "input":
				case "keygen":
				case "link":
				case "meta":
				case "param":
				case "source":
				case "track":
				case "wbr": break;
				default: f$1.chunks.push(Qa, c, Ra);
			}
			f$1.lastPushedText = !1;
		} else {
			switch (c) {
				case dc:
				case cc:
				case Tb:
				case Ub:
				case Sb:
					Z(a, b, d.children);
					return;
				case Zb:
					Z(a, b, d.children);
					return;
				case bc: throw Error("ReactDOMServer does not yet support scope components.");
				case Yb:
					a: {
						c = b.blockedBoundary;
						f$1 = b.blockedSegment;
						e = d.fallback;
						d = d.children;
						g = /* @__PURE__ */ new Set();
						var h = {
							id: null,
							rootSegmentID: -1,
							parentFlushed: !1,
							pendingTasks: 0,
							forceClientRender: !1,
							completedSegments: [],
							byteSize: 0,
							fallbackAbortableTasks: g,
							errorDigest: null
						}, m$1 = Sc(a, f$1.chunks.length, h, f$1.formatContext, !1, !1);
						f$1.children.push(m$1);
						f$1.lastPushedText = !1;
						var n$3 = Sc(a, 0, null, f$1.formatContext, !1, !1);
						n$3.parentFlushed = !0;
						b.blockedBoundary = h;
						b.blockedSegment = n$3;
						try {
							if (Yc(a, b, d), n$3.lastPushedText && n$3.textEmbedded && n$3.chunks.push(za), n$3.status = 1, Zc(h, n$3), 0 === h.pendingTasks) break a;
						} catch (p$2) {
							n$3.status = 4, h.forceClientRender = !0, h.errorDigest = Y(a, p$2);
						} finally {
							b.blockedBoundary = c, b.blockedSegment = f$1;
						}
						b = Rc(a, e, c, m$1, g, b.legacyContext, b.context, b.treeContext);
						a.pingedTasks.push(b);
					}
					return;
			}
			if ("object" === typeof c && null !== c) switch (c.$$typeof) {
				case Xb:
					d = Uc(a, b, c.render, d, f$1);
					if (0 !== U) {
						c = b.treeContext;
						b.treeContext = rc(c, 1, 0);
						try {
							Z(a, b, d);
						} finally {
							b.treeContext = c;
						}
					} else Z(a, b, d);
					return;
				case $b:
					c = c.type;
					d = Wc(c, d);
					Xc(a, b, c, d, f$1);
					return;
				case Vb:
					f$1 = d.children;
					c = c._context;
					d = d.value;
					e = c._currentValue;
					c._currentValue = d;
					g = P;
					P = d = {
						parent: g,
						depth: null === g ? 0 : g.depth + 1,
						context: c,
						parentValue: e,
						value: d
					};
					b.context = d;
					Z(a, b, f$1);
					a = P;
					if (null === a) throw Error("Tried to pop a Context at the root of the app. This is a bug in React.");
					d = a.parentValue;
					a.context._currentValue = d === ec ? a.context._defaultValue : d;
					a = P = a.parent;
					b.context = a;
					return;
				case Wb:
					d = d.children;
					d = d(c._currentValue);
					Z(a, b, d);
					return;
				case ac:
					f$1 = c._init;
					c = f$1(c._payload);
					d = Wc(c, d);
					Xc(a, b, c, d, void 0);
					return;
			}
			throw Error("Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: " + ((null == c ? c : typeof c) + "."));
		}
	}
	function Z(a, b, c) {
		b.node = c;
		if ("object" === typeof c && null !== c) {
			switch (c.$$typeof) {
				case Qb:
					Xc(a, b, c.type, c.props, c.ref);
					return;
				case Rb: throw Error("Portals are not currently supported by the server renderer. Render them conditionally so that they only appear on the client render.");
				case ac:
					var d = c._init;
					c = d(c._payload);
					Z(a, b, c);
					return;
			}
			if (qa(c)) {
				$c(a, b, c);
				return;
			}
			null === c || "object" !== typeof c ? d = null : (d = fc && c[fc] || c["@@iterator"], d = "function" === typeof d ? d : null);
			if (d && (d = d.call(c))) {
				c = d.next();
				if (!c.done) {
					var f$1 = [];
					do
						f$1.push(c.value), c = d.next();
					while (!c.done);
					$c(a, b, f$1);
				}
				return;
			}
			a = Object.prototype.toString.call(c);
			throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === a ? "object with keys {" + Object.keys(c).join(", ") + "}" : a) + "). If you meant to render a collection of children, use an array instead.");
		}
		"string" === typeof c ? (d = b.blockedSegment, d.lastPushedText = Aa(b.blockedSegment.chunks, c, a.responseState, d.lastPushedText)) : "number" === typeof c && (d = b.blockedSegment, d.lastPushedText = Aa(b.blockedSegment.chunks, "" + c, a.responseState, d.lastPushedText));
	}
	function $c(a, b, c) {
		for (var d = c.length, f$1 = 0; f$1 < d; f$1++) {
			var e = b.treeContext;
			b.treeContext = rc(e, d, f$1);
			try {
				Yc(a, b, c[f$1]);
			} finally {
				b.treeContext = e;
			}
		}
	}
	function Yc(a, b, c) {
		var d = b.blockedSegment.formatContext, f$1 = b.legacyContext, e = b.context;
		try {
			return Z(a, b, c);
		} catch (m$1) {
			if (Ec(), "object" === typeof m$1 && null !== m$1 && "function" === typeof m$1.then) {
				c = m$1;
				var g = b.blockedSegment, h = Sc(a, g.chunks.length, null, g.formatContext, g.lastPushedText, !0);
				g.children.push(h);
				g.lastPushedText = !1;
				a = Rc(a, b.node, b.blockedBoundary, h, b.abortSet, b.legacyContext, b.context, b.treeContext).ping;
				c.then(a, a);
				b.blockedSegment.formatContext = d;
				b.legacyContext = f$1;
				b.context = e;
				nc(e);
			} else throw b.blockedSegment.formatContext = d, b.legacyContext = f$1, b.context = e, nc(e), m$1;
		}
	}
	function ad(a) {
		var b = a.blockedBoundary;
		a = a.blockedSegment;
		a.status = 3;
		bd(this, b, a);
	}
	function cd(a, b, c) {
		var d = a.blockedBoundary;
		a.blockedSegment.status = 3;
		null === d ? (b.allPendingTasks--, 2 !== b.status && (b.status = 2, null !== b.destination && b.destination.end())) : (d.pendingTasks--, d.forceClientRender || (d.forceClientRender = !0, d.errorDigest = b.onError(void 0 === c ? Error("The render was aborted by the server without a reason.") : c), d.parentFlushed && b.clientRenderedBoundaries.push(d)), d.fallbackAbortableTasks.forEach(function(a$1) {
			return cd(a$1, b, c);
		}), d.fallbackAbortableTasks.clear(), b.allPendingTasks--, 0 === b.allPendingTasks && (a = b.onAllReady, a()));
	}
	function Zc(a, b) {
		if (0 === b.chunks.length && 1 === b.children.length && null === b.children[0].boundary) {
			var c = b.children[0];
			c.id = b.id;
			c.parentFlushed = !0;
			1 === c.status && Zc(a, c);
		} else a.completedSegments.push(b);
	}
	function bd(a, b, c) {
		if (null === b) {
			if (c.parentFlushed) {
				if (null !== a.completedRootSegment) throw Error("There can only be one root segment. This is a bug in React.");
				a.completedRootSegment = c;
			}
			a.pendingRootTasks--;
			0 === a.pendingRootTasks && (a.onShellError = X, b = a.onShellReady, b());
		} else b.pendingTasks--, b.forceClientRender || (0 === b.pendingTasks ? (c.parentFlushed && 1 === c.status && Zc(b, c), b.parentFlushed && a.completedBoundaries.push(b), b.fallbackAbortableTasks.forEach(ad, a), b.fallbackAbortableTasks.clear()) : c.parentFlushed && 1 === c.status && (Zc(b, c), 1 === b.completedSegments.length && b.parentFlushed && a.partialBoundaries.push(b)));
		a.allPendingTasks--;
		0 === a.allPendingTasks && (a = a.onAllReady, a());
	}
	function Qc(a) {
		if (2 !== a.status) {
			var b = P, c = Nc.current;
			Nc.current = Mc;
			var d = Lc;
			Lc = a.responseState;
			try {
				var f$1 = a.pingedTasks, e;
				for (e = 0; e < f$1.length; e++) {
					var g = f$1[e];
					var h = a, m$1 = g.blockedSegment;
					if (0 === m$1.status) {
						nc(g.context);
						try {
							Z(h, g, g.node), m$1.lastPushedText && m$1.textEmbedded && m$1.chunks.push(za), g.abortSet.delete(g), m$1.status = 1, bd(h, g.blockedBoundary, m$1);
						} catch (E$2) {
							if (Ec(), "object" === typeof E$2 && null !== E$2 && "function" === typeof E$2.then) {
								var n$3 = g.ping;
								E$2.then(n$3, n$3);
							} else {
								g.abortSet.delete(g);
								m$1.status = 4;
								var p$2 = g.blockedBoundary, v$2 = E$2, C$1 = Y(h, v$2);
								null === p$2 ? Tc(h, v$2) : (p$2.pendingTasks--, p$2.forceClientRender || (p$2.forceClientRender = !0, p$2.errorDigest = C$1, p$2.parentFlushed && h.clientRenderedBoundaries.push(p$2)));
								h.allPendingTasks--;
								if (0 === h.allPendingTasks) {
									var D$2 = h.onAllReady;
									D$2();
								}
							}
						}
					}
				}
				f$1.splice(0, e);
				null !== a.destination && dd(a, a.destination);
			} catch (E$2) {
				Y(a, E$2), Tc(a, E$2);
			} finally {
				Lc = d, Nc.current = c, c === Mc && nc(b);
			}
		}
	}
	function ed(a, b, c) {
		c.parentFlushed = !0;
		switch (c.status) {
			case 0:
				var d = c.id = a.nextSegmentId++;
				c.lastPushedText = !1;
				c.textEmbedded = !1;
				a = a.responseState;
				r(b, Sa);
				r(b, a.placeholderPrefix);
				a = d.toString(16);
				r(b, a);
				return w(b, Ta);
			case 1:
				c.status = 2;
				var f$1 = !0;
				d = c.chunks;
				var e = 0;
				c = c.children;
				for (var g = 0; g < c.length; g++) {
					for (f$1 = c[g]; e < f$1.index; e++) r(b, d[e]);
					f$1 = fd(a, b, f$1);
				}
				for (; e < d.length - 1; e++) r(b, d[e]);
				e < d.length && (f$1 = w(b, d[e]));
				return f$1;
			default: throw Error("Aborted, errored or already flushed boundaries should not be flushed again. This is a bug in React.");
		}
	}
	function fd(a, b, c) {
		var d = c.boundary;
		if (null === d) return ed(a, b, c);
		d.parentFlushed = !0;
		if (d.forceClientRender) d = d.errorDigest, w(b, Xa), r(b, Za), d && (r(b, ab), r(b, F(d)), r(b, $a)), w(b, bb), ed(a, b, c);
		else if (0 < d.pendingTasks) {
			d.rootSegmentID = a.nextSegmentId++;
			0 < d.completedSegments.length && a.partialBoundaries.push(d);
			var f$1 = a.responseState;
			var e = f$1.nextSuspenseID++;
			f$1 = x(f$1.boundaryPrefix + e.toString(16));
			d = d.id = f$1;
			cb(b, a.responseState, d);
			ed(a, b, c);
		} else if (d.byteSize > a.progressiveChunkSize) d.rootSegmentID = a.nextSegmentId++, a.completedBoundaries.push(d), cb(b, a.responseState, d.id), ed(a, b, c);
		else {
			w(b, Ua);
			c = d.completedSegments;
			if (1 !== c.length) throw Error("A previously unvisited boundary must have exactly one root segment. This is a bug in React.");
			fd(a, b, c[0]);
		}
		return w(b, Ya);
	}
	function gd(a, b, c) {
		yb(b, a.responseState, c.formatContext, c.id);
		fd(a, b, c);
		return zb(b, c.formatContext);
	}
	function hd(a, b, c) {
		for (var d = c.completedSegments, f$1 = 0; f$1 < d.length; f$1++) id(a, b, c, d[f$1]);
		d.length = 0;
		a = a.responseState;
		d = c.id;
		c = c.rootSegmentID;
		r(b, a.startInlineScript);
		a.sentCompleteBoundaryFunction ? r(b, Gb) : (a.sentCompleteBoundaryFunction = !0, r(b, Fb));
		if (null === d) throw Error("An ID must have been assigned before we can complete the boundary.");
		c = c.toString(16);
		r(b, d);
		r(b, Hb);
		r(b, a.segmentPrefix);
		r(b, c);
		return w(b, Ib);
	}
	function id(a, b, c, d) {
		if (2 === d.status) return !0;
		var f$1 = d.id;
		if (-1 === f$1) {
			if (-1 === (d.id = c.rootSegmentID)) throw Error("A root segment ID must have been assigned by now. This is a bug in React.");
			return gd(a, b, d);
		}
		gd(a, b, d);
		a = a.responseState;
		r(b, a.startInlineScript);
		a.sentCompleteSegmentFunction ? r(b, Bb) : (a.sentCompleteSegmentFunction = !0, r(b, Ab));
		r(b, a.segmentPrefix);
		f$1 = f$1.toString(16);
		r(b, f$1);
		r(b, Cb);
		r(b, a.placeholderPrefix);
		r(b, f$1);
		return w(b, Db);
	}
	function dd(a, b) {
		k$1 = new Uint8Array(2048);
		l$2 = 0;
		q$1 = !0;
		try {
			var c = a.completedRootSegment;
			if (null !== c && 0 === a.pendingRootTasks) {
				fd(a, b, c);
				a.completedRootSegment = null;
				var d = a.responseState.bootstrapChunks;
				for (c = 0; c < d.length - 1; c++) r(b, d[c]);
				c < d.length && w(b, d[c]);
			}
			var f$1 = a.clientRenderedBoundaries, e;
			for (e = 0; e < f$1.length; e++) {
				var g = f$1[e];
				d = b;
				var h = a.responseState, m$1 = g.id, n$3 = g.errorDigest, p$2 = g.errorMessage, v$2 = g.errorComponentStack;
				r(d, h.startInlineScript);
				h.sentClientRenderFunction ? r(d, Kb) : (h.sentClientRenderFunction = !0, r(d, Jb));
				if (null === m$1) throw Error("An ID must have been assigned before we can complete the boundary.");
				r(d, m$1);
				r(d, Lb);
				if (n$3 || p$2 || v$2) r(d, Nb), r(d, Pb(n$3 || ""));
				if (p$2 || v$2) r(d, Nb), r(d, Pb(p$2 || ""));
				v$2 && (r(d, Nb), r(d, Pb(v$2)));
				if (!w(d, Mb)) {
					a.destination = null;
					e++;
					f$1.splice(0, e);
					return;
				}
			}
			f$1.splice(0, e);
			var C$1 = a.completedBoundaries;
			for (e = 0; e < C$1.length; e++) if (!hd(a, b, C$1[e])) {
				a.destination = null;
				e++;
				C$1.splice(0, e);
				return;
			}
			C$1.splice(0, e);
			ca(b);
			k$1 = new Uint8Array(2048);
			l$2 = 0;
			q$1 = !0;
			var D$2 = a.partialBoundaries;
			for (e = 0; e < D$2.length; e++) {
				var E$2 = D$2[e];
				a: {
					f$1 = a;
					g = b;
					var na$1 = E$2.completedSegments;
					for (h = 0; h < na$1.length; h++) if (!id(f$1, g, E$2, na$1[h])) {
						h++;
						na$1.splice(0, h);
						var Eb$1 = !1;
						break a;
					}
					na$1.splice(0, h);
					Eb$1 = !0;
				}
				if (!Eb$1) {
					a.destination = null;
					e++;
					D$2.splice(0, e);
					return;
				}
			}
			D$2.splice(0, e);
			var oa$1 = a.completedBoundaries;
			for (e = 0; e < oa$1.length; e++) if (!hd(a, b, oa$1[e])) {
				a.destination = null;
				e++;
				oa$1.splice(0, e);
				return;
			}
			oa$1.splice(0, e);
		} finally {
			ca(b), "function" === typeof b.flush && b.flush(), 0 === a.allPendingTasks && 0 === a.pingedTasks.length && 0 === a.clientRenderedBoundaries.length && 0 === a.completedBoundaries.length && b.end();
		}
	}
	function jd(a) {
		setImmediate(function() {
			return Qc(a);
		});
	}
	function kd(a, b) {
		if (1 === a.status) a.status = 2, b.destroy(a.fatalError);
		else if (2 !== a.status && null === a.destination) {
			a.destination = b;
			try {
				dd(a, b);
			} catch (c) {
				Y(a, c), Tc(a, c);
			}
		}
	}
	function ld(a, b) {
		try {
			var c = a.abortableTasks;
			c.forEach(function(c$1) {
				return cd(c$1, a, b);
			});
			c.clear();
			null !== a.destination && dd(a, a.destination);
		} catch (d) {
			Y(a, d), Tc(a, d);
		}
	}
	function md(a, b) {
		return function() {
			return kd(b, a);
		};
	}
	function nd(a, b) {
		return function() {
			return ld(a, b);
		};
	}
	function od(a, b) {
		var c = b ? b.identifierPrefix : void 0, d = b ? b.nonce : void 0, f$1 = b ? b.bootstrapScriptContent : void 0, e = b ? b.bootstrapScripts : void 0;
		var g = b ? b.bootstrapModules : void 0;
		c = void 0 === c ? "" : c;
		d = void 0 === d ? ra : x("<script nonce=\"" + F(d) + "\">");
		var h = [];
		void 0 !== f$1 && h.push(d, ("" + f$1).replace(wa, xa), sa);
		if (void 0 !== e) for (f$1 = 0; f$1 < e.length; f$1++) h.push(ta, F(e[f$1]), va);
		if (void 0 !== g) for (e = 0; e < g.length; e++) h.push(ua, F(g[e]), va);
		g = {
			bootstrapChunks: h,
			startInlineScript: d,
			placeholderPrefix: x(c + "P:"),
			segmentPrefix: x(c + "S:"),
			boundaryPrefix: c + "B:",
			idPrefix: c,
			nextSuspenseID: 0,
			sentCompleteSegmentFunction: !1,
			sentCompleteBoundaryFunction: !1,
			sentClientRenderFunction: !1
		};
		e = b ? b.namespaceURI : void 0;
		e = G("http://www.w3.org/2000/svg" === e ? 2 : "http://www.w3.org/1998/Math/MathML" === e ? 3 : 0, null);
		f$1 = b ? b.progressiveChunkSize : void 0;
		d = b ? b.onError : void 0;
		h = b ? b.onAllReady : void 0;
		var m$1 = b ? b.onShellReady : void 0, n$3 = b ? b.onShellError : void 0;
		b = [];
		c = /* @__PURE__ */ new Set();
		g = {
			destination: null,
			responseState: g,
			progressiveChunkSize: void 0 === f$1 ? 12800 : f$1,
			status: 0,
			fatalError: null,
			nextSegmentId: 0,
			allPendingTasks: 0,
			pendingRootTasks: 0,
			completedRootSegment: null,
			abortableTasks: c,
			pingedTasks: b,
			clientRenderedBoundaries: [],
			completedBoundaries: [],
			partialBoundaries: [],
			onError: void 0 === d ? Oc : d,
			onAllReady: void 0 === h ? X : h,
			onShellReady: void 0 === m$1 ? X : m$1,
			onShellError: void 0 === n$3 ? X : n$3,
			onFatalError: X
		};
		e = Sc(g, 0, null, e, !1, !1);
		e.parentFlushed = !0;
		a = Rc(g, a, null, e, c, hc, null, qc);
		b.push(a);
		return g;
	}
	exports.renderToPipeableStream = function(a, b) {
		var c = od(a, b), d = !1;
		jd(c);
		return {
			pipe: function(a$1) {
				if (d) throw Error("React currently only supports piping to one writable stream.");
				d = !0;
				kd(c, a$1);
				a$1.on("drain", md(a$1, c));
				a$1.on("error", nd(c, Error("The destination stream errored while writing data.")));
				a$1.on("close", nd(c, Error("The destination stream closed early.")));
				return a$1;
			},
			abort: function(a$1) {
				ld(c, a$1);
			}
		};
	};
	exports.version = "18.3.1";
}) });

//#endregion
//#region ../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/server.node.js
var require_server_node = /* @__PURE__ */ __commonJS({ "../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/server.node.js": ((exports) => {
	var l$1 = require_react_dom_server_legacy_node_production_min(), s = require_react_dom_server_node_production_min();
	exports.version = l$1.version;
	exports.renderToString = l$1.renderToString;
	exports.renderToStaticMarkup = l$1.renderToStaticMarkup;
	exports.renderToNodeStream = l$1.renderToNodeStream;
	exports.renderToStaticNodeStream = l$1.renderToStaticNodeStream;
	exports.renderToPipeableStream = s.renderToPipeableStream;
}) });

//#endregion
//#region ../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react-jsx-runtime.production.min.js
var require_react_jsx_runtime_production_min = /* @__PURE__ */ __commonJS({ "../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react-jsx-runtime.production.min.js": ((exports) => {
	var f = require_react(), k = Symbol.for("react.element"), l = Symbol.for("react.fragment"), m = Object.prototype.hasOwnProperty, n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p = {
		key: !0,
		ref: !0,
		__self: !0,
		__source: !0
	};
	function q(c, a, g) {
		var b, d = {}, e = null, h = null;
		void 0 !== g && (e = "" + g);
		void 0 !== a.key && (e = "" + a.key);
		void 0 !== a.ref && (h = a.ref);
		for (b in a) m.call(a, b) && !p.hasOwnProperty(b) && (d[b] = a[b]);
		if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
		return {
			$$typeof: k,
			type: c,
			key: e,
			ref: h,
			props: d,
			_owner: n.current
		};
	}
	exports.Fragment = l;
	exports.jsx = q;
	exports.jsxs = q;
}) });

//#endregion
//#region ../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js
var require_jsx_runtime = /* @__PURE__ */ __commonJS({ "../../../../DeepSeek_Harness/packages/limix-ui/node_modules/.pnpm/react@18.3.1/node_modules/react/jsx-runtime.js": ((exports, module) => {
	module.exports = require_react_jsx_runtime_production_min();
}) });

//#endregion
//#region ../agent/src/client/ScatterChart.tsx
var import_server_node = /* @__PURE__ */ __toESM(require_server_node());
var import_jsx_runtime = /* @__PURE__ */ __toESM(require_jsx_runtime());
const ACCENT$1 = "#2563eb";
const W$1 = 400;
const H$1 = 300;
const PAD$1 = {
	top: 14,
	right: 12,
	bottom: 34,
	left: 52
};
function ScatterChart({ data }) {
	const { points, n: n$3, shown, min, max } = data;
	if (!points.length) return null;
	const span = max - min || 1;
	const lo = min - span * .05;
	const hi = max + span * .05;
	const iw = W$1 - PAD$1.left - PAD$1.right;
	const ih = H$1 - PAD$1.top - PAD$1.bottom;
	const sx = (v$2) => PAD$1.left + (v$2 - lo) / (hi - lo) * iw;
	const sy = (v$2) => PAD$1.top + (1 - (v$2 - lo) / (hi - lo)) * ih;
	const fmt = (v$2) => Math.abs(v$2) >= 1e3 ? v$2.toFixed(0) : Number(v$2.toPrecision(3)).toString();
	const r$3 = shown > 800 ? 1.6 : shown > 300 ? 2.1 : 2.8;
	const op = shown > 800 ? .35 : shown > 300 ? .5 : .62;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: { marginTop: 8 },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				fontSize: 12,
				opacity: .7,
				marginBottom: 4
			},
			children: [
				"预测 vs 真实 · 共 ",
				n$3,
				" 个样本",
				shown < n$3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					style: { opacity: .75 },
					children: [
						"（等距抽样画出 ",
						shown,
						" 点，指标仍按全量计算）"
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${W$1} ${H$1}`,
			style: {
				width: "100%",
				maxWidth: W$1,
				display: "block"
			},
			role: "img",
			"aria-label": "预测值与真实值散点图",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: PAD$1.left,
					y: PAD$1.top,
					width: iw,
					height: ih,
					fill: "none",
					stroke: "currentColor",
					opacity: "0.12"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: sx(lo),
					y1: sy(lo),
					x2: sx(hi),
					y2: sy(hi),
					stroke: "currentColor",
					opacity: "0.35",
					strokeWidth: "1",
					strokeDasharray: "4,3"
				}),
				points.map((p$2, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: sx(p$2.t),
					cy: sy(p$2.p),
					r: r$3,
					fill: ACCENT$1,
					opacity: op
				}, i)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: PAD$1.left - 6,
					y: PAD$1.top + 4,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(hi)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: PAD$1.left - 6,
					y: H$1 - PAD$1.bottom,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(lo)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: PAD$1.left,
					y: H$1 - PAD$1.bottom + 13,
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(lo)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: W$1 - PAD$1.right,
					y: H$1 - PAD$1.bottom + 13,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(hi)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: PAD$1.left + iw / 2,
					y: H$1 - 6,
					textAnchor: "middle",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.6",
					children: "真实值 →"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: 12,
					y: PAD$1.top + ih / 2,
					textAnchor: "middle",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.6",
					transform: `rotate(-90 12 ${PAD$1.top + ih / 2})`,
					children: "预测值 →"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
					fontSize: "10",
					fill: "currentColor",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: W$1 - PAD$1.right - 92,
						y1: PAD$1.top + 8,
						x2: W$1 - PAD$1.right - 76,
						y2: PAD$1.top + 8,
						stroke: "currentColor",
						opacity: "0.35",
						strokeDasharray: "4,3"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: W$1 - PAD$1.right - 72,
						y: PAD$1.top + 11,
						opacity: "0.6",
						children: "y=x 完美预测"
					})]
				})
			]
		})]
	});
}

//#endregion
//#region ../agent/src/client/ConfusionMatrix.tsx
const ACCENT = "#2563eb";
/** 单元格边长按类别数收缩，保证整图宽度稳定在卡片内 */
function cellSize(k$2) {
	return k$2 <= 3 ? 62 : k$2 <= 5 ? 52 : k$2 <= 8 ? 42 : 34;
}
/** 标签过长会撑破行首，统一截断并留 title 兜底 */
function short$1(s$1, max) {
	return s$1.length <= max ? s$1 : s$1.slice(0, max - 1) + "…";
}
function ConfusionMatrix({ data }) {
	const { classes, matrix, n: n$3, accuracy, perClass, majorityBaseline } = data;
	const k$2 = classes.length;
	if (!k$2) return null;
	const cs = cellSize(k$2);
	const LEFT = 78;
	const TOP = 40;
	const W$5 = LEFT + k$2 * cs + 14;
	const H$5 = TOP + k$2 * cs + 8;
	const rowMax = matrix.map((row) => Math.max(...row, 1));
	const pct = (v$2) => `${(v$2 * 100).toFixed(1)}%`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: { marginTop: 8 },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					fontSize: 12,
					opacity: .7,
					marginBottom: 4
				},
				children: [
					"混淆矩阵 · 共 ",
					n$3,
					" 个样本 · 准确率 ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: pct(accuracy) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [" · 多数类基线 ", pct(majorityBaseline)] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: `0 0 ${W$5} ${H$5}`,
				style: {
					width: "100%",
					maxWidth: W$5,
					display: "block"
				},
				role: "img",
				"aria-label": "混淆矩阵",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: LEFT,
						y: 12,
						fontSize: "10",
						fill: "currentColor",
						opacity: "0.55",
						children: "预测类别 →"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: 4,
						y: TOP - 8,
						fontSize: "10",
						fill: "currentColor",
						opacity: "0.55",
						children: "真实类别 ↓"
					}),
					classes.map((c, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: LEFT + j * cs + cs / 2,
						y: TOP - 8,
						textAnchor: "middle",
						fontSize: "10",
						fill: "currentColor",
						opacity: "0.7",
						children: short$1(c, 6)
					}, `h${c}`)),
					classes.map((rc$1, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: LEFT - 6,
						y: TOP + i * cs + cs / 2 + 3,
						textAnchor: "end",
						fontSize: "10",
						fill: "currentColor",
						opacity: "0.7",
						children: short$1(rc$1, 10)
					}), classes.map((cc$1, j) => {
						const v$2 = matrix[i][j];
						const f$1 = v$2 / rowMax[i];
						const diag = i === j;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
								x: LEFT + j * cs + 1,
								y: TOP + i * cs + 1,
								width: cs - 2,
								height: cs - 2,
								rx: 3,
								fill: ACCENT,
								opacity: v$2 === 0 ? .04 : .1 + .72 * f$1
							}),
							diag && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
								x: LEFT + j * cs + 1,
								y: TOP + i * cs + 1,
								width: cs - 2,
								height: cs - 2,
								rx: 3,
								fill: "none",
								stroke: ACCENT,
								strokeWidth: "1.5",
								opacity: "0.85"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
								x: LEFT + j * cs + cs / 2,
								y: TOP + i * cs + cs / 2 + 4,
								textAnchor: "middle",
								fontSize: k$2 > 8 ? 10 : 12,
								fontWeight: diag ? 700 : 400,
								fill: f$1 > .55 ? "#ffffff" : "currentColor",
								opacity: v$2 === 0 ? .35 : 1,
								children: v$2
							})
						] }, `c${rc$1}-${cc$1}`);
					})] }, `r${rc$1}`))
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
				style: {
					marginTop: 10,
					fontSize: 12
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
					style: {
						cursor: "pointer",
						color: "var(--dsw-alias-label-secondary)"
					},
					children: "各类别表现"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gridTemplateColumns: "auto repeat(4, minmax(0,1fr))",
						gap: "2px 12px",
						fontSize: 12,
						marginTop: 8
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: { opacity: .55 },
							children: "类别"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: { opacity: .55 },
							children: "样本数"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: { opacity: .55 },
							children: "精确率"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: { opacity: .55 },
							children: "召回率"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							style: { opacity: .55 },
							children: "F1"
						}),
						perClass.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							style: { display: "contents" },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { wordBreak: "break-all" },
									title: c.label,
									children: short$1(c.label, 14)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: c.support }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: pct(c.precision) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: pct(c.recall) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: pct(c.f1) })
							]
						}, c.label))
					]
				})]
			})
		]
	});
}

//#endregion
//#region ../agent/src/client/ForecastChart.tsx
const W = 560;
const H = 170;
const PAD = {
	top: 12,
	right: 10,
	bottom: 22,
	left: 44
};
/** 数值数组 → SVG polyline points 串；x 从 i0 开始编号，全序列共 n 点 */
function toPoints(ys, i0, n$3, min, max) {
	const iw = W - PAD.left - PAD.right;
	const ih = H - PAD.top - PAD.bottom;
	const span = max - min || 1;
	return ys.map((y$2, i) => {
		const x$3 = PAD.left + (i0 + i) / Math.max(1, n$3 - 1) * iw;
		const yy = PAD.top + (1 - (y$2 - min) / span) * ih;
		return `${x$3.toFixed(1)},${yy.toFixed(1)}`;
	}).join(" ");
}
function ForecastChart({ hist, pred, p10, p90, truth, startLabel, endLabel, target }) {
	if (!hist.length && !pred.length) return null;
	const n$3 = hist.length + pred.length;
	const all = [
		...hist,
		...pred,
		...p10 ?? [],
		...p90 ?? [],
		...truth ?? []
	].filter(Number.isFinite);
	if (!all.length) return null;
	const min = Math.min(...all);
	const max = Math.max(...all);
	const hasBand = !!(p10?.length && p90?.length && p10.length === pred.length && p90.length === pred.length);
	let bandPath = "";
	if (hasBand) {
		const up = toPoints(p90, hist.length, n$3, min, max).split(" ");
		const dn = toPoints(p10, hist.length, n$3, min, max).split(" ").reverse();
		bandPath = "M" + [...up, ...dn].join(" L") + " Z";
	}
	const predWithBridge = hist.length && pred.length ? [hist[hist.length - 1], ...pred] : pred;
	const predStart = hist.length ? hist.length - 1 : 0;
	const fmt = (v$2) => Math.abs(v$2) >= 1e3 ? v$2.toFixed(0) : v$2.toPrecision(3);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		style: { marginTop: 12 },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				gap: 16,
				flexWrap: "wrap",
				fontSize: 12,
				color: "var(--dsw-alias-label-secondary)"
			},
			children: [
				hist.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "━ 历史" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					style: { color: "#2563eb" },
					children: "┄ 预测"
				}),
				!!truth?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "━ 实际" }),
				hasBand && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "▰ P10–P90 区间" })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${W} ${H}`,
			style: {
				width: "100%",
				maxWidth: W,
				display: "block",
				marginTop: 8
			},
			role: "img",
			"aria-label": `${target ?? "目标"} 时序预测图`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: PAD.left - 6,
					y: PAD.top + 4,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(max)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: PAD.left - 6,
					y: H - PAD.bottom,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(min)
				}),
				startLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: PAD.left,
					y: H - 6,
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: startLabel
				}),
				endLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: W - PAD.right,
					y: H - 6,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: endLabel
				}),
				hist.length > 0 && pred.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: PAD.left + (hist.length - 1) / Math.max(1, n$3 - 1) * (W - PAD.left - PAD.right),
					y1: PAD.top,
					x2: PAD.left + (hist.length - 1) / Math.max(1, n$3 - 1) * (W - PAD.left - PAD.right),
					y2: H - PAD.bottom,
					stroke: "currentColor",
					opacity: "0.15",
					strokeDasharray: "3,3"
				}),
				hasBand && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: bandPath,
					fill: "#2563eb",
					opacity: "0.13"
				}),
				hist.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
					points: toPoints(hist, 0, n$3, min, max),
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.5",
					opacity: "0.65"
				}),
				!!truth?.length && truth.length === pred.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
					points: toPoints(hist.length ? [hist[hist.length - 1], ...truth] : truth, predStart, n$3, min, max),
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3",
					opacity: "0.45"
				}),
				predWithBridge.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
					points: toPoints(predWithBridge, predStart, n$3, min, max),
					fill: "none",
					stroke: "#2563eb",
					strokeWidth: "1.8",
					strokeDasharray: "5,3"
				})
			]
		})]
	});
}

//#endregion
//#region ../agent/src/client/BenchmarkView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
const labels = {
	rmse: "均方根误差",
	mae: "平均绝对误差",
	r2: "拟合度 R²",
	accuracy: "准确率",
	balanced_accuracy: "平衡准确率",
	f1_macro: "宏平均 F1"
};
const statuses = {
	succeeded: "已完成",
	failed: "失败",
	pending: "等待续查",
	running: "运行中",
	skipped: "未运行"
};
const colors = [
	"#4168a9",
	"#248575",
	"#bb8b47",
	"#929baa"
];
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const CSS = `.lx-bench-controls{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin:16px 0}.lx-bench-controls label{display:flex;gap:7px;align-items:center}.lx-bench-controls select{font:inherit;color:inherit;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l3,#ddd);border-radius:5px;padding:4px 8px}.lx-bench-chart{width:100%;height:auto;max-height:320px}.lx-bench-table{width:100%;border-collapse:collapse;font-size:12px}.lx-bench-table th,.lx-bench-table td{text-align:left;padding:8px;border-bottom:1px solid var(--dsw-alias-border-l3,#e3e6eb);font-variant-numeric:tabular-nums}.lx-bench-scroll{overflow:auto}.lx-bench-error{color:var(--dsw-alias-label-secondary);font-size:12px;overflow-wrap:anywhere}`;
function BenchmarkView({ data, staticView = false }) {
	const [datasetId, setDatasetId] = (0, import_react.useState)(data.datasets?.[0]?.id ?? "");
	const [metric, setMetric] = (0, import_react.useState)("");
	const root = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const el = root.current;
		if (!el) return;
		const change = (event) => {
			const target = event.target;
			if (target.dataset.bench === "dataset") {
				setDatasetId(target.value);
				setMetric("");
			}
			if (target.dataset.bench === "metric") setMetric(target.value);
		};
		el.addEventListener("change", change);
		return () => el.removeEventListener("change", change);
	}, []);
	const datasets = Array.isArray(data.datasets) ? data.datasets : [];
	const dataset = datasets.find((item) => item.id === datasetId) ?? datasets[0];
	const runs = (Array.isArray(data.runs) ? data.runs : []).filter((run) => run.dataset_id === dataset?.id);
	const keys = dataset?.task_type === "classification" ? [
		"accuracy",
		"balanced_accuracy",
		"f1_macro"
	] : [
		"rmse",
		"mae",
		"r2"
	];
	const key = keys.includes(metric) ? metric : keys[0];
	const values = runs.filter((run) => run.status === "succeeded" && finite(run.metrics?.[key])).map((run) => run.metrics[key]);
	const min = Math.min(0, ...values);
	const range = Math.max(0, ...values) - min || 1;
	const x$3 = (value) => 150 + 430 * (value - min) / range;
	const format = (value, name$1 = key) => finite(value) ? name$1.includes("accuracy") ? `${(value * 100).toFixed(2)}%` : String(Number(value.toFixed(4))) : "—";
	if (!dataset) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "lx-result-note",
		children: "比较结果未包含数据集。"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: root,
		"aria-label": "多模型效果比较",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: CSS }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "lx-bench-controls",
				children: [staticView ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: dataset.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: labels[key] })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["数据集 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					"data-bench": "dataset",
					value: dataset.id,
					onChange: () => {},
					"aria-label": "比较数据集",
					children: datasets.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: item.id,
						children: item.name
					}, item.id))
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["指标 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					"data-bench": "metric",
					value: key,
					onChange: () => {},
					"aria-label": "比较指标",
					children: keys.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: item,
						children: labels[item]
					}, item))
				})] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "lx-result-meta",
					children: key === "rmse" || key === "mae" ? "越低越好" : "越高越好"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "lx-result-meta",
				children: [
					"训练 ",
					dataset.train_rows,
					" 行 · 测试 ",
					dataset.test_rows,
					" 行 · ",
					dataset.feature_count,
					" 个特征 · 相同拆分"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				className: "lx-bench-chart",
				viewBox: `0 0 700 ${runs.length * 46 + 32}`,
				role: "img",
				"aria-label": `${dataset.name}：${labels[key]}模型对比`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: x$3(0),
					x2: x$3(0),
					y1: "12",
					y2: runs.length * 46 + 6,
					stroke: "currentColor",
					opacity: ".2"
				}), runs.map((run, index) => {
					const value = run.status === "succeeded" ? run.metrics?.[key] : null;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
						transform: `translate(0 ${index * 46 + 20})`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
								x: "0",
								y: "13",
								fill: "currentColor",
								fontSize: "12",
								children: run.model.replace("LIMIX_", "LimiX ")
							}),
							finite(value) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
								x: Math.min(x$3(0), x$3(value)),
								y: "0",
								width: Math.abs(x$3(value) - x$3(0)),
								height: "20",
								rx: "2",
								fill: colors[index % colors.length]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
								x: "600",
								y: "14",
								fill: "currentColor",
								fontSize: "12",
								children: finite(value) ? format(value) : statuses[run.status] ?? "状态待确认"
							})
						]
					}, run.model);
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lx-bench-scroll",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "lx-bench-table",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "模型" }),
						keys.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: labels[item] }, item)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "耗时" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "状态" })
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: runs.map((run) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: run.model }),
						keys.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: run.status === "succeeded" ? format(run.metrics?.[item], item) : "—" }, item)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: finite(run.elapsed_seconds) ? `${run.elapsed_seconds.toFixed(1)} 秒` : "—" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: statuses[run.status] ?? "状态待确认" })
					] }, run.model)) })]
				})
			}),
			runs.filter((run) => run.error).map((run) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "lx-bench-error",
				children: [
					run.model,
					"：",
					run.error
				]
			}, run.model))
		]
	});
}

//#endregion
//#region ../agent/src/client/forecast-csv.ts
/** 最小 CSV 行切分：支持双引号包裹字段（够用即可，结果文件无嵌套引号场景） */
function splitCsvLine(line) {
	if (!line.includes("\"")) return line.split(",");
	const out = [];
	let cur = "";
	let inQ = false;
	for (const ch of line) if (ch === "\"") inQ = !inQ;
	else if (ch === "," && !inQ) {
		out.push(cur);
		cur = "";
	} else cur += ch;
	out.push(cur);
	return out;
}
function toNums(rows$1, idx) {
	return rows$1.map((r$3) => r$3[idx]?.trim() ? Number(r$3[idx]) : NaN);
}
/**
* 解析 limix 时序结果 CSV。识别不出 pred_ 列时返回 null（渲染方零回归降级）。
*
* ⚠️ 必须把分类/回归结果挡在门外：三类任务共用 pred_ 前缀但语义不同——
* 时序是 `pred_{目标列}`，分类与回归都是字面 `pred_label`。若不区分，
* `limix download` 一个分类结果（标签为 0/1 等数值）会被画成一条按行序连点的
* 折线，而分类结果的行序不含时间语义，那条线纯属无中生有。
* 出现 pred_probs_ 概率列时拒绝作时序图。未指定时序目标时，
* pred_label 也按分类或回归拒绝；明确指定目标 label 的时序仍可绘制。
*/
function parseForecastCsv(text$1, target, dateColumn) {
	const lines = text$1.trim().split(/\r?\n/);
	if (lines.length < 2) return null;
	const header = splitCsvLine(lines[0].replace(/^\uFEFF/, ""));
	if (header.some((h) => h.startsWith("pred_probs_"))) return null;
	const predIdx = target ? header.indexOf(`pred_${target}`) : header.findIndex((h) => h.startsWith("pred_") && !h.startsWith("pred_q"));
	if (predIdx < 0 || !target && header[predIdx] === "pred_label") return null;
	const resolvedTarget = header[predIdx].slice(5);
	const q10Idx = header.indexOf(`pred_q10_${resolvedTarget}`);
	const q90Idx = header.indexOf(`pred_q90_${resolvedTarget}`);
	const dateIdx = dateColumn ? header.indexOf(dateColumn) : 0;
	if (dateIdx < 0) return null;
	const rows$1 = lines.slice(1).map(splitCsvLine).filter((r$3) => r$3.length === header.length);
	if (!rows$1.length) return null;
	const pred = toNums(rows$1, predIdx);
	if (pred.some((v$2) => !Number.isFinite(v$2))) return null;
	const series = {
		dates: rows$1.map((r$3) => r$3[dateIdx]),
		pred,
		target: header[predIdx].slice(5)
	};
	if (q10Idx >= 0 && q90Idx >= 0) {
		const p10 = toNums(rows$1, q10Idx);
		const p90 = toNums(rows$1, q90Idx);
		if (p10.every(Number.isFinite) && p90.every(Number.isFinite)) {
			series.p10 = p10;
			series.p90 = p90;
		}
	}
	return series;
}
/** 从训练 CSV 取目标列尾部 n 点作图表历史段；列缺失/不可数值化返回 null */
function parseTrainTail(text$1, colTarget, n$3, dateColumn) {
	const lines = text$1.trim().split(/\r?\n/);
	if (lines.length < 2) return null;
	const header = splitCsvLine(lines[0].replace(/^\uFEFF/, ""));
	const idx = header.indexOf(colTarget);
	if (idx < 0) return null;
	const rows$1 = lines.slice(Math.max(1, lines.length - n$3)).map(splitCsvLine).filter((r$3) => r$3.length === header.length);
	const values = toNums(rows$1, idx);
	if (!values.length || values.some((v$2) => !Number.isFinite(v$2))) return null;
	const dateIdx = dateColumn ? header.indexOf(dateColumn) : 0;
	return {
		dates: rows$1.map((r$3) => r$3[dateIdx] ?? ""),
		values
	};
}
/** 真值仅在日期顺序与预测完全一致时叠加，禁止错位比较。 */
function parseForecastTruth(text$1, target, date, dates) {
	const lines = text$1.trim().split(/\r?\n/);
	const header = splitCsvLine(lines[0].replace(/^\uFEFF/, ""));
	const targetIdx = header.indexOf(target), dateIdx = header.indexOf(date);
	if (targetIdx < 0 || dateIdx < 0) return void 0;
	const rows$1 = lines.slice(1).map(splitCsvLine);
	if (rows$1.length !== dates.length || rows$1.some((r$3, i) => r$3[dateIdx]?.trim() !== dates[i]?.trim())) return void 0;
	const values = toNums(rows$1, targetIdx);
	return values.every(Number.isFinite) ? values : void 0;
}

//#endregion
//#region ../agent/src/client/eval-csv.ts
/** 类别数上限：超过则不画矩阵（格子退化成噪点，读不出信息） */
const MAX_CLASSES = 12;
/** 散点上限：超过则等距抽样，避免上万点拖垮 SVG */
const MAX_POINTS = 1500;
function rows(text$1) {
	const lines = text$1.trim().split(/\r?\n/);
	if (lines.length < 2) return null;
	const header = splitCsvLine(lines[0].replace(/^\uFEFF/, ""));
	const body = lines.slice(1).map(splitCsvLine);
	if (body.some((r$3) => r$3.length !== header.length)) return null;
	return body.length ? {
		header,
		body
	} : null;
}
/** 按列名取整列原始字符串；列不存在返回 null */
function pickColumn(text$1, col) {
	const t$3 = rows(text$1);
	if (!t$3) return null;
	const i = t$3.header.indexOf(col);
	return i < 0 ? null : t$3.body.map((r$3) => r$3[i]);
}
/** 标签归一：去首尾空白与包裹引号，使 "A" 与 A 视为同类 */
function norm(s$1) {
	return s$1.trim().replace(/^"(.*)"$/, "$1");
}
/**
* 真值/预测两列 → 混淆矩阵。
* 长度不等（对齐失败）、类别数超上限、或有效配对为空时返回 null，渲染方零回归降级。
*/
function buildConfusion(truthRaw, predRaw) {
	if (truthRaw.length !== predRaw.length || !truthRaw.length) return null;
	const pairs = [];
	for (let i = 0; i < truthRaw.length; i++) {
		const t$3 = norm(truthRaw[i]);
		const p$2 = norm(predRaw[i]);
		if (!t$3 || !p$2) continue;
		pairs.push([t$3, p$2]);
	}
	if (!pairs.length) return null;
	const set = /* @__PURE__ */ new Set();
	for (const [t$3, p$2] of pairs) {
		set.add(t$3);
		set.add(p$2);
	}
	if (set.size > MAX_CLASSES) return null;
	const classes = [...set].sort((a, b) => {
		const na$1 = Number(a), nb$2 = Number(b);
		return Number.isFinite(na$1) && Number.isFinite(nb$2) ? na$1 - nb$2 : a.localeCompare(b);
	});
	const idx = new Map(classes.map((c, i) => [c, i]));
	const matrix = classes.map(() => classes.map(() => 0));
	for (const [t$3, p$2] of pairs) matrix[idx.get(t$3)][idx.get(p$2)]++;
	const n$3 = pairs.length;
	let correct = 0;
	for (let i = 0; i < classes.length; i++) correct += matrix[i][i];
	const perClass = classes.map((label, i) => {
		const support = matrix[i].reduce((s$1, v$2) => s$1 + v$2, 0);
		const predicted = matrix.reduce((s$1, row) => s$1 + row[i], 0);
		const tp = matrix[i][i];
		const precision = predicted ? tp / predicted : 0;
		const recall = support ? tp / support : 0;
		return {
			label,
			support,
			precision,
			recall,
			f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0
		};
	});
	return {
		classes,
		matrix,
		n: n$3,
		correct,
		accuracy: correct / n$3,
		perClass,
		majorityBaseline: Math.max(...perClass.map((c) => c.support)) / n$3
	};
}
/**
* 真值/预测两列 → 散点与误差指标。
* 长度不等、无有效数值对时返回 null。点数超上限按等距抽样（保留分布形状，
* 但指标仍用**全量**计算——抽样只影响画什么，不影响算什么）。
*/
function buildScatter(truthRaw, predRaw) {
	if (truthRaw.length !== predRaw.length || !truthRaw.length) return null;
	const all = [];
	for (let i = 0; i < truthRaw.length; i++) {
		if (!norm(truthRaw[i]) || !norm(predRaw[i])) continue;
		const t$3 = Number(norm(truthRaw[i]));
		const p$2 = Number(norm(predRaw[i]));
		if (Number.isFinite(t$3) && Number.isFinite(p$2)) all.push({
			t: t$3,
			p: p$2
		});
	}
	if (!all.length) return null;
	const n$3 = all.length;
	let ae = 0, se = 0, sum = 0;
	for (const { t: t$3, p: p$2 } of all) {
		ae += Math.abs(p$2 - t$3);
		se += (p$2 - t$3) ** 2;
		sum += t$3;
	}
	const mean = sum / n$3;
	let ssTot = 0;
	for (const { t: t$3 } of all) ssTot += (t$3 - mean) ** 2;
	const r2 = ssTot > 0 ? 1 - se / ssTot : null;
	const step = Math.ceil(n$3 / MAX_POINTS);
	const points = step > 1 ? all.filter((_, i) => i % step === 0) : all;
	const vals = all.flatMap(({ t: t$3, p: p$2 }) => [t$3, p$2]);
	return {
		points,
		n: n$3,
		shown: points.length,
		mae: ae / n$3,
		rmse: Math.sqrt(se / n$3),
		r2,
		min: Math.min(...vals),
		max: Math.max(...vals)
	};
}

//#endregion
//#region ../agent/src/client/explanation-data.ts
const number = (v$2) => Number(v$2.toFixed(4)).toLocaleString("zh-CN", { maximumFractionDigits: 4 });
const contributionColors = {
	negative: "#4168a9",
	positive: "#248575",
	neutral: "#697680",
	unknown: "#848991"
};
const knownDirection = (direction) => direction === -1 || direction === 0 || direction === 1;
const directionLabel = (direction) => direction === 1 ? "正向" : direction === -1 ? "负向" : direction === 0 ? "中性" : "方向未定";
const contributionColor = (direction) => direction === 1 ? contributionColors.positive : direction === -1 ? contributionColors.negative : direction === 0 ? contributionColors.neutral : contributionColors.unknown;
function validBatchDetail(value, expected) {
	const names = value?.feature_names, samples = value?.samples;
	if (!value || [
		"task_type",
		"mapping",
		"result_version_id",
		"source_task_id",
		"input_rows",
		"horizon"
	].some((key) => expected[key] !== void 0 && value[key] !== expected[key])) return false;
	if (value.task_type !== expected.task_type) return false;
	if (expected.feature_names && (!Array.isArray(names) || names.length !== expected.feature_names.length || names.some((name$1, index) => name$1 !== expected.feature_names[index]))) return false;
	for (const limit of [value.input_rows, value.horizon]) if (limit !== void 0 && (!Number.isInteger(limit) || limit < 1)) return false;
	const rowLimit = value.task_type === "timeseries" ? value.horizon ?? value.input_rows : value.input_rows;
	const requestedRows = expected.row_numbers ?? expected.samples?.map((sample) => sample.row_number);
	const expectedRows = requestedRows ? new Set(requestedRows) : void 0;
	return value.mode === "local" && value.target === expected.target && value.requested_count === expected.requested_count && value.explained_count === expected.explained_count && Array.isArray(names) && names.length > 0 && names.every((n$3) => typeof n$3 === "string") && new Set(names).size === names.length && Array.isArray(samples) && samples.length === expected.explained_count && new Set(samples.map((s$1) => s$1?.row_number)).size === samples.length && samples.every((s$1) => Number.isInteger(s$1?.row_number) && s$1.row_number > 0 && (rowLimit === void 0 || s$1.row_number <= rowLimit) && (!expectedRows || expectedRows.has(s$1.row_number)) && (typeof s$1.prediction === "string" || Number.isFinite(s$1.prediction) || value.task_type === "timeseries" && s$1.prediction === void 0) && (s$1.step === void 0 || Number.isInteger(s$1.step) && s$1.step > 0) && (value.task_type !== "timeseries" || s$1.step === void 0 || s$1.step === s$1.row_number && (rowLimit === void 0 || s$1.step <= rowLimit)) && (s$1.timestamp === void 0 || typeof s$1.timestamp === "string") && (s$1.feature_values === void 0 || Array.isArray(s$1.feature_values) && s$1.feature_values.length === names.length && s$1.feature_values.every((v$2) => v$2 === null || typeof v$2 === "string" || typeof v$2 === "boolean" || typeof v$2 === "number" && Number.isFinite(v$2))) && Array.isArray(s$1.scores) && s$1.scores.length === names.length && s$1.scores.every(Number.isFinite) && Array.isArray(s$1.directions) && s$1.directions.length === names.length && s$1.directions.every((v$2) => v$2 === null || v$2 === 0 || v$2 === 1 || v$2 === -1));
}
function sampleLabel(sample, data) {
	const label = data.task_type === "timeseries" ? `第 ${sample.step ?? sample.row_number} 步` : `第 ${sample.row_number} 行`;
	return sample.timestamp ? `${label} · ${sample.timestamp}` : label;
}
/** 单行结果优先沿用服务顺序；显示排名不能改变原值对应的特征。 */
function singleSampleMatrix(data) {
	const existing = data.samples?.find((sample) => sample.row_number === (data.row_number ?? 1));
	if (existing && data.feature_names?.length) return {
		...data,
		samples: [existing]
	};
	const features = (data.features ?? []).filter((feature) => Number.isFinite(feature.score));
	const values = data.feature_values && data.feature_names ? features.map((feature) => data.feature_values[data.feature_names.indexOf(feature.name)] ?? null) : void 0;
	return {
		...data,
		feature_names: features.map((feature) => feature.name),
		labels: {
			...data.labels,
			...Object.fromEntries(features.map((feature) => [feature.name, feature.label]))
		},
		samples: [{
			row_number: data.row_number ?? 1,
			step: data.step,
			timestamp: data.timestamp,
			prediction: data.prediction,
			scores: features.map((feature) => feature.score),
			directions: features.map((feature) => feature.direction),
			feature_values: values
		}]
	};
}

//#endregion
//#region ../agent/src/client/contribution-matrix.ts
function contributionMatrix(data) {
	const samples = data.samples ?? [], names = data.feature_names ?? [];
	const maximum = samples.reduce((m$1, s$1) => s$1.scores.reduce((n$3, v$2) => Math.max(n$3, Math.abs(v$2)), m$1), 0);
	return {
		rows: samples.map((sample, sampleIndex) => ({
			sampleIndex,
			rowNumber: sample.row_number,
			cells: names.map((name$1, featureIndex) => ({
				name: name$1,
				featureIndex,
				score: sample.scores[featureIndex],
				direction: sample.directions[featureIndex]
			}))
		})),
		ranking: [...names.map((name$1, featureIndex) => {
			let signed$1 = 0, unknownCount = 0;
			for (const sample of samples) {
				const magnitude = Math.abs(sample.scores[featureIndex]), direction = sample.directions[featureIndex];
				if (knownDirection(direction)) signed$1 += magnitude * direction;
				else if (magnitude !== 0) unknownCount++;
			}
			return {
				name: name$1,
				featureIndex,
				label: data.labels?.[name$1] ?? name$1,
				unknownCount,
				mean: samples.length && !unknownCount ? signed$1 / samples.length : null
			};
		})].sort((a, b) => Number(a.mean === null) - Number(b.mean === null) || Math.abs(b.mean ?? 0) - Math.abs(a.mean ?? 0) || a.featureIndex - b.featureIndex),
		maximum,
		cellCount: samples.length * names.length
	};
}
function contributionScales(...groups) {
	const matrices = groups.map(contributionMatrix);
	return {
		maximum: Math.max(0, ...matrices.map((m$1) => m$1.maximum)),
		meanMaximum: Math.max(0, ...matrices.flatMap((m$1) => m$1.ranking.map((f$1) => Math.abs(f$1.mean ?? 0))))
	};
}

//#endregion
//#region ../agent/src/client/graph-layout.ts
function graphLayout(nodes, edges) {
	const adjacency = new Map(nodes.map((n$3) => [n$3, edges.filter((e) => e.source === n$3).map((e) => e.target)]));
	let index = 0;
	const stack = [], onStack = /* @__PURE__ */ new Set(), indices = /* @__PURE__ */ new Map(), low = /* @__PURE__ */ new Map(), groups = [];
	const visit = (node) => {
		indices.set(node, index);
		low.set(node, index++);
		stack.push(node);
		onStack.add(node);
		for (const next of adjacency.get(node) ?? []) if (!indices.has(next)) {
			visit(next);
			low.set(node, Math.min(low.get(node), low.get(next)));
		} else if (onStack.has(next)) low.set(node, Math.min(low.get(node), indices.get(next)));
		if (low.get(node) === indices.get(node)) {
			const group = [];
			let member;
			do {
				member = stack.pop();
				onStack.delete(member);
				group.push(member);
			} while (member !== node);
			groups.push(group);
		}
	};
	nodes.forEach((n$3) => {
		if (!indices.has(n$3)) visit(n$3);
	});
	const membership = /* @__PURE__ */ new Map();
	groups.forEach((g, i) => g.forEach((n$3) => membership.set(n$3, i)));
	const levels = /* @__PURE__ */ new Map();
	const level = (g) => {
		if (levels.has(g)) return levels.get(g);
		const parents = edges.filter((e) => membership.get(e.target) === g && membership.get(e.source) !== g).map((e) => membership.get(e.source));
		const value = parents.length ? 1 + Math.max(...parents.map(level)) : 0;
		levels.set(g, value);
		return value;
	};
	const isolated = nodes.filter((n$3) => !edges.some((e) => e.source === n$3 || e.target === n$3));
	const columns = /* @__PURE__ */ new Map();
	for (const node of nodes.filter((n$3) => !isolated.includes(n$3))) {
		const l$4 = Math.min(3, level(membership.get(node)));
		columns.set(l$4, [...columns.get(l$4) ?? [], node]);
	}
	if (isolated.length) columns.set(Math.max(-1, ...columns.keys()) + 1, isolated);
	const layers = [...columns.entries()].sort(([a], [b]) => a - b).map(([, group]) => group), width = Math.max(620, layers.length * 190 + 30);
	const height = Math.max(230, Math.max(0, ...layers.map((c) => c.length)) * 50 + 48);
	const positions = /* @__PURE__ */ new Map();
	layers.forEach((col, i) => col.forEach((n$3, j) => positions.set(n$3, [layers.length === 1 ? width / 2 : 85 + i * (width - 170) / (layers.length - 1), 35 + (j + .5) * (height - 55) / col.length])));
	return {
		positions,
		width,
		height,
		isolated,
		cycles: groups.filter((g) => g.length > 1 || edges.some((e) => e.source === g[0] && e.target === g[0]))
	};
}

//#endregion
//#region ../agent/src/client/explanation-export.ts
const defaultExportTheme = {
	background: "#ffffff",
	foreground: "#202734",
	border: "#dce2eb"
};
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&apos;"
})[c]);
const text = (x$3, y$2, value, size = 13, attrs = "") => `<text x="${x$3}" y="${y$2}" font-size="${size}" ${attrs}>${escape(value)}</text>`;
const start = (width, height, theme, title) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${escape(title)}</title><rect width="100%" height="100%" fill="${theme.background}"/><g fill="${theme.foreground}" font-family="system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif">`;
const end = "</g></svg>";
const short = (s$1) => Array.from(s$1).length > 24 ? Array.from(s$1).slice(0, 12).join("") + "…" + Array.from(s$1).slice(-10).join("") : s$1;
const signed = (v$2) => v$2 === null ? "方向未定" : `${v$2 > 0 ? "+" : ""}${number(v$2)}`;
function contributionExportSvg(data, filtered, description = "", theme = defaultExportTheme) {
	const coverage = data.samples?.length ? (filtered?.samples?.length ?? 0) / data.samples.length * 100 : 0;
	const groups = filtered ? [{
		data: filtered,
		title: `当前筛选 · ${filtered.samples?.length ?? 0} 个样本 · 覆盖率 ${number(coverage)}%`
	}, {
		data,
		title: `${data.input_rows && (data.samples?.length ?? 0) < data.input_rows ? "本次已解释" : "全样本"} · ${data.samples?.length ?? 0} 个样本${data.input_rows ? ` / 输入 ${data.input_rows} 行` : ""}`
	}] : [{
		data,
		title: `${data.input_rows && (data.samples?.length ?? 0) < data.input_rows ? "本次已解释" : "全样本"} · ${data.samples?.length ?? 0} 个样本${data.input_rows ? ` / 输入 ${data.input_rows} 行` : ""}`
	}];
	const plotWidth = Math.max(700, (data.feature_names?.length ?? 1) * 32);
	const labelWidth = Math.min(250, Math.max(100, ...(data.feature_names ?? []).map((n$3) => (data.labels?.[n$3] ?? n$3).length * 10)));
	const width = 80 + plotWidth + 64 + labelWidth + 20 + 290 + 110;
	const plotHeight = Math.max(330, Math.min(600, (data.samples?.length ?? 1) * 4));
	const rankHeight = Math.max(plotHeight, (data.feature_names?.length ?? 1) * 28);
	const sectionHeight = Math.max(plotHeight + 180, rankHeight + 40) + 100, height = 110 + groups.length * sectionHeight + 50;
	const scales = contributionScales(data, ...filtered ? [filtered] : []), title = `预测解释 · ${data.target_label ?? data.target}`;
	let svg = start(width, height, theme, title) + text(36, 38, title, 23, "font-weight=\"600\"") + text(36, 67, description || "全部已解释样本", 13);
	const timed = data.samples?.filter((s$1) => s$1.timestamp);
	if (timed?.length) svg += text(36, 88, `预测时间 ${timed[0].timestamp} — ${timed[timed.length - 1].timestamp}`, 11);
	svg += `<defs><linearGradient id="contribution-scale"><stop stop-color="${contributionColors.negative}"/><stop offset=".5" stop-color="${theme.background}"/><stop offset="1" stop-color="${contributionColors.positive}"/></linearGradient></defs>`;
	groups.forEach((group, groupIndex) => {
		const matrix = contributionMatrix(group.data), samples = group.data.samples ?? [], names = group.data.feature_names ?? [];
		const top = 110 + groupIndex * sectionHeight, x$3 = 80, y$2 = top + 58, rowHeight = plotHeight / Math.max(samples.length, 1), columnWidth = plotWidth / Math.max(names.length, 1);
		const barLabel = x$3 + plotWidth + 64, barZero = barLabel + labelWidth + 20 + 145, barHalf = 145;
		svg += text(36, top + 16, group.title, 17, "font-weight=\"600\"") + text(x$3, top + 43, "影响因子热力图", 13) + text(barLabel, top + 43, "各影响因子影响分数对比", 13);
		svg += `<rect x="${x$3 + plotWidth - 220}" y="${top + 7}" width="220" height="8" fill="url(#contribution-scale)"/>` + text(x$3 + plotWidth - 220, top + 32, `−${number(scales.maximum)}`, 11) + text(x$3 + plotWidth - 110, top + 32, "0", 11, "text-anchor=\"middle\"") + text(x$3 + plotWidth, top + 32, `+${number(scales.maximum)}`, 11, "text-anchor=\"end\"");
		if (!samples.length) svg += text(x$3, y$2 + 40, "没有符合条件的样本");
		matrix.rows.forEach((row) => row.cells.forEach((cell) => {
			const color = contributionColor(cell.direction);
			const alpha = scales.maximum ? Math.min(1, Math.abs(cell.score) / scales.maximum) : 0;
			svg += `<rect x="${x$3 + cell.featureIndex * columnWidth}" y="${y$2 + row.sampleIndex * rowHeight}" width="${columnWidth}" height="${rowHeight}" fill="${color}" fill-opacity="${alpha}"><title>${escape(`${sampleLabel(samples[row.sampleIndex], data)} · ${data.labels?.[cell.name] ?? cell.name} · ${cell.score} · ${directionLabel(cell.direction)}`)}</title></rect>`;
		}));
		[...new Set([
			0,
			.25,
			.5,
			.75,
			1
		].map((t$3) => Math.round(t$3 * (samples.length - 1))))].filter((i) => i >= 0 && i < samples.length).forEach((i) => {
			svg += text(x$3 - 12, y$2 + (i + .5) * rowHeight + 4, samples[i].step ?? samples[i].row_number, 11, "text-anchor=\"end\"");
		});
		svg += text(36, y$2 - 8, data.task_type === "timeseries" ? "预测步" : "原始行", 11);
		names.forEach((name$1, i) => {
			const label = data.labels?.[name$1] ?? name$1;
			svg += `<g transform="translate(${x$3 + (i + .5) * columnWidth} ${y$2 + plotHeight + 16}) rotate(55)"><title>${escape(label + " · " + name$1)}</title>` + text(0, 0, short(label), 12) + "</g>";
		});
		svg += `<line x1="${barZero}" x2="${barZero}" y1="${y$2}" y2="${y$2 + rankHeight}" stroke="${theme.border}"/>`;
		matrix.ranking.forEach((feature, i) => {
			const cy = y$2 + (i + .5) * rankHeight / Math.max(names.length, 1), v$2 = feature.mean;
			const barWidth = v$2 === null || !scales.meanMaximum ? 0 : Math.abs(v$2) / scales.meanMaximum * barHalf;
			svg += `<g><title>${escape(feature.label + " · " + feature.name)}</title>` + text(barLabel + labelWidth, cy - 1, short(feature.label), 12, "text-anchor=\"end\"") + (feature.label !== feature.name ? text(barLabel + labelWidth, cy + 13, short(feature.name), 10, "text-anchor=\"end\" opacity=\".6\"") : "");
			if (v$2 !== null) svg += `<rect x="${v$2 < 0 ? barZero - barWidth : barZero}" y="${cy - 5}" width="${barWidth}" height="10" fill="${v$2 < 0 ? contributionColors.negative : contributionColors.positive}"/>`;
			svg += text(width - 30, cy + 4, signed(v$2), 12, "text-anchor=\"end\"") + "</g>";
		});
		svg += text(barZero - barHalf, y$2 + rankHeight + 20, `−${number(scales.meanMaximum)}`, 11, "text-anchor=\"middle\"") + text(barZero, y$2 + rankHeight + 20, "0", 11, "text-anchor=\"middle\"") + text(barZero + barHalf, y$2 + rankHeight + 20, `+${number(scales.meanMaximum)}`, 11, "text-anchor=\"middle\"");
	});
	svg += text(36, height - 36, "蓝色负向 · 绿色正向 · 灰蓝中性 · 灰色方向未定；中性按 0 计入均值，正负会抵消。", 12);
	return svg + end;
}
function graphExportSvg(data, theme = defaultExportTheme, scope = "完整网络") {
	const nodes = data.nodes ?? [], edges = data.edges ?? [], layout = graphLayout(nodes, edges), width = Math.max(800, layout.width + 72), height = layout.height + 160;
	const label = (name$1) => data.labels?.[name$1] ?? name$1;
	let svg = start(width, height, theme, `关系探索 · ${data.target_label ?? data.target}`) + text(36, 38, `关系探索 · ${data.target_label ?? data.target}`, 22, "font-weight=\"600\"") + text(36, 66, `${scope} · ${nodes.length} 个变量 · ${edges.length} 条关系`, 13);
	svg += `<defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 1 L6 3.5 L0 6" fill="none" stroke="#7793c3"/></marker></defs><g transform="translate(36 90)">`;
	edges.forEach((e) => {
		const a = layout.positions.get(e.source), b = layout.positions.get(e.target);
		if (!a || !b) return;
		const right = b[0] > a[0], same = b[0] === a[0], ax = a[0] + (right || same ? 68 : -68), bx = b[0] + (right ? -68 : 68);
		const d = same ? `M${ax} ${a[1]} C${ax + 30} ${a[1]},${bx + 30} ${b[1]},${bx} ${b[1]}` : `M${ax} ${a[1]} C${(ax + bx) / 2} ${a[1]},${(ax + bx) / 2} ${b[1]},${bx} ${b[1]}`;
		svg += `<path d="${d}" fill="none" stroke="#7793c3" stroke-width="1.5"${data.mode === "directed" ? " marker-end=\"url(#arrow)\"" : ""}><title>${escape(`${label(e.source)} ${data.mode === "directed" ? "→" : "—"} ${label(e.target)}：${e.weight}`)}</title></path>`;
		if (edges.length <= 5) svg += text((ax + bx) / 2, (a[1] + b[1]) / 2 - 7, number(e.weight), 11, "text-anchor=\"middle\"");
	});
	nodes.forEach((name$1) => {
		const [x$3, y$2] = layout.positions.get(name$1);
		svg += `<rect x="${x$3 - 68}" y="${y$2 - 22}" width="136" height="44" rx="5" fill="${theme.background}" stroke="${name$1 === data.target ? "#7793c3" : theme.border}"/>` + text(x$3, y$2 - 2, label(name$1), 12, "text-anchor=\"middle\"") + text(x$3, y$2 + 14, name$1, 10, "text-anchor=\"middle\" opacity=\".65\"");
	});
	return svg + "</g>" + text(36, height - 22, "连线表示模型发现的关系，数值为关系分数。", 12) + end;
}

//#endregion
//#region src/report/charts.tsx
/** 无时区的 ISO 日期时间按 UTC 比较；不允许 Date.parse 自动纠正无效日期。 */
function orderedDates(dates, source) {
	const times = dates.map((value) => {
		if (!/^\d{4}-\d{2}-\d{2}(?:[T ](?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value) || weekday(value.slice(0, 10)) === "未解析") throw new Error(`${source}日期须为有效 ISO 日期或日期时间`);
		const iso = value.length === 10 ? value + "T00:00:00Z" : value.replace(" ", "T") + (/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? "" : "Z");
		const time = Date.parse(iso);
		if (!Number.isFinite(time)) throw new Error(`${source}日期无效`);
		return time;
	});
	if (!times.length || times.some((time, i) => i > 0 && time <= times[i - 1])) throw new Error(`${source}日期须严格递增，不能重复或乱序`);
	return times;
}
async function renderChart(chart, read) {
	if (chart.type === "explanation") {
		const envelope = JSON.parse(await read(chart.source, ".json")), data = envelope.explanation ?? envelope;
		if (envelope.task_status && ![
			"succeeded",
			"degraded_succeeded",
			"partially_succeeded"
		].includes(envelope.task_status)) throw new Error("解释未成功，不能生成结果图");
		const statusWarnings = envelope.task_status && envelope.task_status !== "succeeded" ? ["解释返回部分成功或降级结果；请结合原任务说明解读。"] : [];
		if (data.mode === "local") {
			const matrix = data.samples ? data : singleSampleMatrix(data);
			if (!validBatchDetail(matrix, matrix)) throw new Error("解释视图缺少完整矩阵；请使用 explanation.detail_path 指向的 .view.json");
			const count = matrix.samples.length, requested = matrix.requested_count ?? count;
			const scope = `已解释 ${count} / ${requested} 个${matrix.task_type === "timeseries" ? "预测步" : "样本"}`;
			const warnings = [...statusWarnings, ...count < requested ? [scope + "，仅展示已返回部分。"] : []];
			if (matrix.task_type === "timeseries") warnings.push("贡献分数沿用解释模型尺度，不换算为业务单位。");
			return {
				html: contributionExportSvg(matrix, void 0, scope),
				warnings,
				count,
				facts: [
					{
						name: "本次解释",
						value: count
					},
					{
						name: "请求解释",
						value: requested
					},
					{
						name: "输入总行数",
						value: matrix.input_rows ?? "未返回"
					},
					{
						name: "特征数量",
						value: matrix.feature_names?.length ?? 0
					},
					{
						name: "适用范围",
						value: count === matrix.input_rows ? "全部输入样本" : "仅本次已解释样本，不能代表全部输入"
					},
					...contributionMatrix(matrix).ranking.slice(0, 5).map((f$1) => ({
						name: f$1.label + "（" + f$1.name + "）",
						value: f$1.mean === null ? "方向未定" : Number(f$1.mean.toFixed(6)),
						meaning: "本次已解释样本的带正负平均贡献；" + [
							1,
							-1,
							0,
							null
						].map((direction) => `${direction === 1 ? "正向" : direction === -1 ? "负向" : direction === 0 ? "中性" : "方向未知"} ${matrix.samples.filter((sample) => sample.directions[f$1.featureIndex] === direction).length} 个`).join("，") + "；不表示干预收益"
					}))
				]
			};
		}
		if (!["directed", "undirected"].includes(data.mode) || !Array.isArray(data.nodes) || !data.nodes.length || !Array.isArray(data.edges)) throw new Error("关系图须使用完整的 .view.json");
		if (data.nodes.some((n$3) => typeof n$3 !== "string") || new Set(data.nodes).size !== data.nodes.length || data.edges.some((e) => !data.nodes.includes(e.source) || !data.nodes.includes(e.target) || !Number.isFinite(e.weight))) throw new Error("关系图节点或连线无效");
		return {
			html: graphExportSvg(data),
			warnings: [...statusWarnings, "连线表示模型探索的关系，不能据此认定干预收益。"],
			count: data.nodes.length,
			facts: [
				{
					name: "变量数",
					value: data.nodes.length
				},
				{
					name: "关系数",
					value: data.edges.length
				},
				{
					name: "含义",
					value: "模型探索关系，不是已验证干预效应"
				}
			]
		};
	}
	if (chart.type === "benchmark") {
		const data = JSON.parse(await read(chart.source, ".json"));
		if (data.kind !== "benchmark" || !Array.isArray(data.datasets) || !data.datasets.length || !Array.isArray(data.runs)) throw new Error("模型比较文件结构无效");
		return {
			html: data.datasets.map((dataset) => (0, import_server_node.renderToStaticMarkup)(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BenchmarkView, {
				data: {
					...data,
					datasets: [dataset]
				},
				staticView: true
			}))).join(""),
			warnings: [],
			count: data.runs.length,
			facts: data.runs.flatMap((r$3) => [{
				name: `${r$3.dataset_id} / ${r$3.model}`,
				value: r$3.status
			}, ...metricFacts(r$3.metrics ?? {})])
		};
	}
	if (!chart.target) throw new Error("预测图需要 target 目标列名");
	const source = await read(chart.source, ".csv");
	if (chart.type === "forecast") {
		if (!chart.date) throw new Error("时序图需要 date 日期列名");
		const series = parseForecastCsv(source, chart.target, chart.date);
		if (!series || pickColumn(source, chart.date)?.length !== series.pred.length || new Set(series.dates).size !== series.dates.length) throw new Error("时序结果无效或日期重复");
		const predictionTimes = orderedDates(series.dates, "预测");
		const historyPoints = chart.history_points ?? 90;
		if (!Number.isInteger(historyPoints) || historyPoints < 1 || historyPoints > 1e3) throw new Error("history_points 须为 1–1000");
		const train = chart.train ? await read(chart.train, ".csv") : void 0;
		const hist = train ? parseTrainTail(train, chart.target, historyPoints, chart.date) : null;
		if (train && (!hist || !pickColumn(train, chart.date))) throw new Error("历史数据缺少有效日期或目标值");
		if (train) {
			if (orderedDates(pickColumn(train, chart.date), "历史").at(-1) >= predictionTimes[0]) throw new Error("历史日期必须早于预测首日，不能包含重叠或未来数据");
		}
		const truth$1 = chart.truth ? parseForecastTruth(await read(chart.truth, ".csv"), chart.target, chart.date, series.dates) : void 0;
		if (chart.truth && !truth$1) throw new Error("真值与预测日期未逐行对齐");
		const metrics = truth$1 ? buildScatter(truth$1.map(String), series.pred.map(String)) : null;
		const facts = [{
			name: "预测步数",
			value: series.pred.length
		}, ...metricFacts(metrics ? {
			n: metrics.n,
			mae: metrics.mae,
			rmse: metrics.rmse,
			r2: metrics.r2
		} : {})];
		series.dates.forEach((date, i) => facts.push({
			name: date,
			value: series.pred[i],
			meaning: `${weekday(date)}${truth$1 ? `；真实值 ${truth$1[i]}；差值 ${Number((series.pred[i] - truth$1[i]).toFixed(4))}` : "；无真值，不能评估误差"}`
		}));
		return {
			html: (0, import_server_node.renderToStaticMarkup)(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ForecastChart, {
				hist: hist?.values ?? [],
				...series,
				truth: truth$1,
				startLabel: hist?.dates[0] ?? series.dates[0],
				endLabel: series.dates.at(-1)
			})),
			warnings: chart.truth ? [] : ["未提供独立真值，此图展示预测趋势，不能评估误差。"],
			count: series.pred.length,
			facts
		};
	}
	if (!["regression", "classification"].includes(chart.type)) throw new Error(`不支持的图表类型：${chart.type}`);
	if (!chart.truth) throw new Error("效果对照图需要独立 truth 真值文件；没有真值时请省略该图");
	const truthText = await read(chart.truth, ".csv"), pred = pickColumn(source, "pred_label") ?? pickColumn(source, `pred_${chart.target}`), truth = pickColumn(truthText, chart.target);
	if (!pred?.length || !truth || pred.length !== truth.length) throw new Error("预测与真值数量不一致或缺少目标列");
	if (chart.id_column) {
		const ids = pickColumn(source, chart.id_column), truthIds = pickColumn(truthText, chart.id_column);
		if (!ids || !truthIds || ids.some((id$1, i) => !id$1 || id$1 !== truthIds[i]) || new Set(ids).size !== ids.length) throw new Error("预测与真值样本 ID 未逐行对齐或有重复");
	} else if (chart.alignment !== "input_order") throw new Error("请指定 id_column，或核对后声明 alignment=input_order");
	const values = chart.type === "regression" ? buildScatter(truth, pred) : buildConfusion(truth, pred);
	if (!values || values.n !== pred.length) throw new Error("图表存在缺失/无效数值，或分类数超过 12；不能静默丢弃样本");
	return {
		html: chart.type === "regression" ? (0, import_server_node.renderToStaticMarkup)(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScatterChart, { data: values })) : (0, import_server_node.renderToStaticMarkup)(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfusionMatrix, { data: values })),
		warnings: [],
		count: values.n,
		facts: metricFacts(chart.type === "regression" ? {
			n: values.n,
			mae: values.mae,
			rmse: values.rmse,
			r2: values.r2
		} : {
			n: values.n,
			accuracy: values.accuracy
		})
	};
}

//#endregion
//#region src/report/styles.ts
/**
* [INPUT]: 离线报告的正文与共用图表结构。
* [OUTPUT]: REPORT_CSS，响应式阅读、原始尺寸切换与打印样式。
* [POS]: 报告的独立样式；不依赖宿主主题或远程字体。
* [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
*/
const REPORT_CSS = `
:root{color-scheme:light;--dsw-alias-label-secondary:#687586;--dsw-alias-label-primary:#202734}
*{box-sizing:border-box}
body{margin:0;background:#f3f5f8;color:#202734;font:16px/1.85 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
main{max-width:1340px;margin:32px auto;padding:40px 48px;background:#fff;border:1px solid #e2e7ee;border-radius:14px}
header{border-bottom:1px solid #e2e7ee;padding-bottom:22px;margin-bottom:30px}
header small{color:#4168a9;font-weight:600;letter-spacing:.12em}
header h1{font-size:30px;margin:10px 0 4px;line-height:1.4}
header p,footer{font-size:13px;color:#687586}
article>h1{font-size:25px}
h2{font-size:21px;margin:34px 0 14px}
h3{font-size:18px;margin:26px 0 10px}
p{margin:12px 0}
a{color:#4168a9}
code{font-size:.9em;background:#f3f5f8;padding:2px 5px;overflow-wrap:anywhere}
pre{padding:16px;background:#f3f5f8;overflow:auto}
blockquote{border-left:3px solid #aebfdb;padding-left:16px;color:#566575}
table{border-collapse:collapse;width:100%;font-size:14px}
td,th{text-align:left;padding:10px 12px;border-bottom:1px solid #e2e7ee}
th{background:#f7f9fb}
figure{margin:28px 0 34px;padding:24px;border:1px solid #dfe6ef;border-radius:10px;break-inside:avoid}
figcaption{font-size:17px;font-weight:600;margin-bottom:18px}
.chart{overflow:auto}
.chart>svg{display:block;max-width:100%;height:auto}
.chart svg{margin-left:auto;margin-right:auto}
.chart-wide>svg{min-width:800px}
.chart-readout{position:sticky;top:8px;z-index:1;background:#fff;padding:6px 0;min-height:24px;color:#4168a9;font-size:13px;overflow-wrap:anywhere}
.verified-facts summary{font-size:13px;color:#687586}
.chart rect:focus{outline:1px solid #4168a9}
.zoom-label{float:right;font-size:12px;font-weight:400;color:#687586;cursor:pointer}
.chart-zoom{accent-color:#4168a9}
figure:has(.chart-zoom:checked) .chart>svg{max-width:none;min-width:0;width:auto}
.chart:not(.chart-wide)>div>svg{max-width:640px!important}
.chart p,.chart-note{font-size:13px;color:#687586}
.chart-caption{font-size:14px;margin-top:18px}
.source{font-size:12px;color:#687586;overflow-wrap:anywhere;margin-top:14px}
details{margin:16px 0}
summary{cursor:pointer}
.table-scroll{overflow:auto}
footer{margin-top:38px;border-top:1px solid #e2e7ee;padding-top:20px}
@media(max-width:700px){main{margin:0;padding:24px 18px;border:0;border-radius:0}
header h1{font-size:25px}
figure{padding:16px 12px}
}
@media print{body{background:#fff}
main{margin:0;max-width:none;border:0;padding:0}
.chart-wide>svg{min-width:0}
.chart{overflow:visible}
details[open]{break-inside:avoid}
a{color:inherit}
}

@media print { figure:has(.chart-zoom:checked) .chart>svg { max-width:100%; min-width:0; width:100% } .zoom-label { display:none } }
`;
/** 固定脚本只读 SVG title 并写入 textContent；不执行正文内容，不访问网络。 */
const REPORT_JS = `document.querySelectorAll('.chart').forEach(chart=>{
 const readout=chart.parentElement.querySelector('.chart-readout');
 const show=event=>{const node=event.target.closest('rect,g,path');const title=node?.querySelector('title');if(title&&readout)readout.textContent=title.textContent};
 chart.addEventListener('pointerover',show);chart.addEventListener('click',show);chart.addEventListener('focusin',show);
 chart.querySelectorAll('rect:has(title)').forEach(node=>{node.setAttribute('tabindex','0');node.setAttribute('aria-label',node.querySelector('title').textContent)});
});`;

//#endregion
//#region src/report/index.ts
const HELP = `limix report --manifest /绝对路径/报告清单.json --output /绝对路径/报告.html
本地生成带图 HTML，不调用预测 API、不修改 Markdown，不覆盖已有文件。
可先用 report --manifest 清单.json --inspect 获取程序核验的指标、方向、日期和覆盖范围，再写正文。inspect 不需要 markdown，不写文件。
清单：{"title":"业务分析报告","markdown":"报告.md","charts":[...]}
所有文件路径相对清单目录解析；charts 可为空。正文单独一行 <!-- limix-chart:图表id --> 可指定插图位置，未指定的图追加在正文后；标记在 Markdown 阅读器中隐藏。
每张图须有 id（字母数字下划线短横线）、title、type、source，可选 caption（图的业务解读）。
type=regression 或 classification：source=预测CSV、truth=独立真值CSV、target=目标列；优先 id_column=共同样本ID列，否则核对行序后 alignment="input_order"。无真值时不要配置效果对照图。
type=forecast：source=预测CSV、target=目标列、date=日期列，可选 train=历史CSV、truth=真值CSV、history_points=90；真值须与预测日期逐行对齐。
type=explanation：source=explain 返回 explanation.detail_path 指向的完整 .view.json（单行/批量/时序贡献、有向/无向关系）；不使用原始 API JSON。
type=benchmark：source=benchmark 保存的比较JSON，包含所有数据集和运行状态。
HTML 内嵌图表和样式，可离线阅读；长图可横向滚动。正文支持标题、段落、粗体、列表、表格、代码、网页链接；原始 HTML 转义，远程图片不加载。`;
async function runReportCommand(args, workdir = process.cwd(), signal, settings = {}) {
	if (args.length === 1 && ["--help", "-h"].includes(args[0])) return {
		exitCode: 0,
		stdout: HELP,
		stderr: ""
	};
	try {
		signal?.throwIfAborted();
		const options = {};
		const inspect = args.includes("--inspect");
		args = args.filter((a) => a !== "--inspect");
		for (let i = 0; i < args.length; i += 2) {
			if (!["--manifest", "--output"].includes(args[i]) || !args[i + 1] || options[args[i]]) throw new Error("参数无效；请查看 report --help");
			options[args[i]] = args[i + 1];
		}
		if (!options["--manifest"] || !inspect && !options["--output"]) throw new Error("需要 --manifest 和 --output");
		const manifestPath = resolve(workdir, options["--manifest"]), base = dirname(manifestPath);
		const sources = /* @__PURE__ */ new Map();
		let bytes = 0;
		const read = async (path, extension) => {
			if (typeof path !== "string" || extname(path).toLowerCase() !== extension) throw new Error(`输入必须为 ${extension} 文件`);
			signal?.throwIfAborted();
			const actual = await realpath(resolve(base, path)), handle$1 = await open(actual, "r");
			try {
				const stat$1 = await handle$1.stat();
				if (!stat$1.isFile() || stat$1.size > 5e7 || bytes + stat$1.size > 1e8) throw new Error("输入文件过大，或不是普通文件");
				const text$1 = await handle$1.readFile("utf8");
				bytes += Buffer.byteLength(text$1);
				if (bytes > 1e8) throw new Error("报告输入总大小超过 100MB");
				sources.set(actual, {
					file: basename(path),
					sha256: createHash("sha256").update(text$1).digest("hex")
				});
				return text$1;
			} finally {
				await handle$1.close();
			}
		};
		const manifest = JSON.parse(await read(manifestPath, ".json"));
		if (typeof manifest.title !== "string" || !manifest.title.trim() || !inspect && typeof manifest.markdown !== "string" || !Array.isArray(manifest.charts) || manifest.charts.length > 20) throw new Error("报告清单须包含 title、markdown、charts（最多 20 张图）");
		const markdownPath = inspect ? "" : await realpath(resolve(base, manifest.markdown));
		const markdown = inspect ? "" : await read(manifest.markdown, ".md"), figures = /* @__PURE__ */ new Map(), charts = [], previews = [];
		for (const chart of manifest.charts) {
			if (!chart || !/^[\w-]{1,64}$/.test(chart.id) || figures.has(chart.id) || typeof chart.title !== "string" || !chart.title.trim()) throw new Error("图表 id 须唯一，且必须有 title");
			const rendered = await renderChart(chart, read);
			const warnings = rendered.warnings.map((w$3) => `<p class="chart-note">${escapeHtml(w$3)}</p>`).join("");
			const wide = chart.type === "explanation" ? " chart-wide" : "";
			const zoom = wide ? "<label class=\"zoom-label\"><input class=\"chart-zoom\" type=\"checkbox\"> 清晰细看（横向滚动）</label>" : "";
			const graphic = rendered.html.replace(/id="(contribution-scale|arrow)"/g, `id="${chart.id}-$1"`).replace(/url\(#(contribution-scale|arrow)\)/g, `url(#${chart.id}-$1)`);
			const firstSvg = graphic.match(/<svg[\s\S]*?<\/svg>/)?.[0];
			if (firstSvg) previews.push({
				id: chart.id,
				svg: firstSvg.includes("xmlns=") ? firstSvg : firstSvg.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"")
			});
			figures.set(chart.id, `<figure id="chart-${chart.id}"><figcaption>${escapeHtml(chart.title)}${zoom}</figcaption><p class="chart-readout" role="status">悬停或点击图形查看数值；密集图可切换清晰细看。</p><div class="chart${wide}">${graphic}</div>${chart.caption ? `<p class="chart-caption">${escapeHtml(chart.caption)}</p>` : ""}${warnings}${factsHtml(rendered.facts ?? [])}<div class="source">图表来源：${escapeHtml(basename(chart.source))}</div></figure>`);
			charts.push({
				id: chart.id,
				type: chart.type,
				title: chart.title,
				count: rendered.count,
				warnings: rendered.warnings,
				facts: rendered.facts ?? []
			});
		}
		if (inspect) return {
			exitCode: 0,
			stdout: JSON.stringify({
				kind: "report_facts",
				charts,
				sources: [...sources.values()]
			}),
			stderr: ""
		};
		validateNarrative(markdown);
		validateNarrative(manifest.title);
		for (const chart of manifest.charts) {
			validateNarrative(chart.title);
			if (chart.caption !== void 0) {
				if (typeof chart.caption !== "string") throw new Error("图注必须是文本");
				validateNarrative(chart.caption);
			}
		}
		const content = renderMarkdown(markdown.replace(/^(\s*)# [^\n]+\n/, "$1"), figures), date = (/* @__PURE__ */ new Date()).toISOString();
		const provenance = [...sources.values()].map((s$1) => `<li>${escapeHtml(s$1.file)}<br><code>${s$1.sha256}</code></li>`).join("");
		const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${createHash("sha256").update(REPORT_JS).digest("base64")}'; img-src data:; base-uri 'none'; form-action 'none'"><title>${escapeHtml(manifest.title)}</title><style>${REPORT_CSS}</style></head><body><main><header><small>LimiX · 分析报告</small><h1>${escapeHtml(manifest.title)}</h1><p>${charts.length} 张结果图 · 可离线阅读</p></header><article>${content}</article><footer><details><summary>数据来源与文件校验</summary><p>生成时间：${date}。图表复用结果卡的绘制逻辑；报告正文来自 ${escapeHtml(basename(markdownPath))}。</p><ul>${provenance}</ul></details></footer></main><script>${REPORT_JS}<\/script></body></html>`;
		if (Buffer.byteLength(html) > 5e7) throw new Error("生成的报告超过 50MB，请减少图表数量");
		const output = resolve(workdir, options["--output"]);
		if (extname(output).toLowerCase() !== ".html") throw new Error("输出必须是 .html 文件");
		signal?.throwIfAborted();
		const handle = await open(output, "wx", 384);
		try {
			await handle.writeFile(html, "utf8");
		} finally {
			await handle.close();
		}
		const archive = join(settings.archiveRoot ?? join(homedir(), ".limix", "reports"), randomUUID());
		await mkdir(archive, {
			recursive: true,
			mode: 448
		});
		const stableHtml = join(archive, basename(output)), stableMarkdown = join(archive, basename(output, ".html") + ".md");
		await writeFile(stableHtml, html, {
			flag: "wx",
			mode: 384
		});
		await writeFile(stableMarkdown, markdown + "\n\n## 已核验数据（程序生成）\n\n" + charts.map((c) => factsMarkdown(c.title, c.facts)).join("\n\n"), {
			flag: "wx",
			mode: 384
		});
		const previewPaths = [];
		for (const preview of previews) {
			const path = join(archive, preview.id + ".svg");
			await writeFile(path, preview.svg, {
				flag: "wx",
				mode: 384
			});
			previewPaths.push(path);
		}
		return {
			exitCode: 0,
			stdout: JSON.stringify({
				kind: "report",
				status: "succeeded",
				saved_to: output,
				report_path: stableHtml,
				markdown_path: stableMarkdown,
				source_markdown_path: markdownPath,
				preview_paths: previewPaths,
				chart_count: charts.length,
				charts,
				sources: [...sources.values()]
			}),
			stderr: ""
		};
	} catch (error) {
		if (error?.name === "AbortError") throw error;
		return {
			exitCode: 2,
			stdout: JSON.stringify({ error: error?.code === "EEXIST" ? "输出文件已存在，请使用新文件名" : String(error.message ?? error) }),
			stderr: ""
		};
	}
}

//#endregion
//#region src/index.ts
const name = "limix-agent";
const inject = [
	"webServer",
	"tools",
	"limixDatasource",
	"commands",
	"systemPrompt"
];
function apply(ctx, config = {}) {
	ctx.limixDatasource.register(ctx);
	const roots = [...(config.csvRoots ?? []).filter((r$3) => typeof r$3 === "string" && r$3.length > 0), process.cwd()];
	const csv = createCsvAccess(roots);
	const artifacts = createCsvAccess(roots, void 0, {
		extensions: [".json", ".csv"],
		registeredOnly: true,
		maxBytes: 5e7
	});
	const previews = createCsvAccess(roots, void 0, {
		extensions: [".svg"],
		registeredOnly: true,
		maxBytes: 5e7
	});
	const reports = createCsvAccess(roots, void 0, {
		extensions: [".html", ".md"],
		registeredOnly: true,
		maxBytes: 5e7
	});
	registerLimixTool(ctx, {
		cliPath: config.cliPath,
		pythonBin: config.pythonBin,
		preparePython: config.preparePython,
		csv,
		artifacts,
		reports,
		previews,
		reportCommand: runReportCommand
	});
	registerPredictCommand(ctx);
	registerExplainCommand(ctx);
	registerBenchmarkCommand(ctx);
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/limix-ui/report-status",
		handler: async (req, res) => {
			if (req.method !== "GET") {
				res.writeHead(405);
				res.end();
				return;
			}
			try {
				const url = new URL(req.url ?? "/", "http://localhost");
				const primary = await reports.resolve(url.searchParams.get("path") ?? "");
				const fallback = primary ? null : await reports.resolve(url.searchParams.get("fallback") ?? "");
				res.writeHead(200, {
					"content-type": "application/json",
					"cache-control": "no-store"
				});
				res.end(JSON.stringify({
					status: primary ? "available" : fallback ? "fallback" : "missing",
					path: primary ?? fallback
				}));
			} catch {
				res.writeHead(500);
				res.end();
			}
		}
	}), "limix-agent: 已登记报告可用性检查");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/limix-ui/report-preview",
		handler: async (req, res) => {
			if (req.method !== "GET") {
				res.writeHead(405);
				res.end();
				return;
			}
			try {
				const target = await previews.resolve(new URL(req.url ?? "/", "http://localhost").searchParams.get("path") ?? "");
				if (!target) {
					res.writeHead(404);
					res.end("not found");
					return;
				}
				res.writeHead(200, {
					"content-type": "image/svg+xml",
					"content-security-policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'",
					"x-content-type-options": "nosniff",
					"cache-control": "no-store"
				});
				res.end(await readFile(target));
			} catch {
				res.writeHead(500);
				res.end("图表预览不可用，请打开 HTML 报告");
			}
		}
	}), "limix-agent: 已登记图表预览");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/limix-ui/report",
		handler: async (req, res) => {
			if (req.method !== "GET") {
				res.writeHead(405);
				res.end();
				return;
			}
			try {
				const url = new URL(req.url ?? "/", "http://localhost");
				const target = await reports.resolve(url.searchParams.get("path") ?? "");
				if (!target) {
					res.writeHead(404);
					res.end("not found");
					return;
				}
				const content = await readFile(target);
				res.writeHead(200, {
					"content-type": target.endsWith(".html") ? "text/html; charset=utf-8" : "text/markdown; charset=utf-8",
					"content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(basename(target))}`,
					"content-security-policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
					"cache-control": "no-store",
					"x-content-type-options": "nosniff"
				});
				res.end(content);
			} catch {
				res.writeHead(500);
				res.end("无法读取报告文件");
			}
		}
	}), "limix-agent: 已登记报告下载");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/limix-ui/artifact",
		handler: async (req, res) => {
			if (req.method !== "GET") {
				res.writeHead(405);
				res.end();
				return;
			}
			try {
				const url = new URL(req.url ?? "/", "http://localhost");
				const target = await artifacts.resolve(url.searchParams.get("path") ?? "");
				if (!target) {
					res.writeHead(404);
					res.end("not found");
					return;
				}
				const content = await readFile(target);
				res.writeHead(200, {
					"content-type": target.endsWith(".json") ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
					"content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(basename(target))}`,
					"cache-control": "no-store",
					"x-content-type-options": "nosniff"
				});
				res.end(content);
			} catch {
				res.writeHead(500);
				res.end("无法读取解释文件");
			}
		}
	}), "limix-agent: 已登记解释文件下载");
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
				const url = new URL(req.url ?? "/", "http://localhost");
				const raw = url.searchParams.get("path") ?? "";
				if (!raw || !raw.toLowerCase().endsWith(".csv")) {
					res.writeHead(403);
					res.end("csv only");
					return;
				}
				const target = await csv.resolve(raw);
				if (!target) {
					res.writeHead(404);
					res.end("not found or outside allowed roots");
					return;
				}
				const text$1 = await readFile(target, "utf8");
				const headers = {
					"content-type": "text/csv; charset=utf-8",
					"cache-control": "no-store"
				};
				if (url.searchParams.get("download") === "1") headers["content-disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(basename(target))}`;
				res.writeHead(200, headers);
				res.end(text$1);
			} catch (e) {
				res.writeHead(500);
				res.end(String(e?.message ?? e));
			}
		}
	}), "limix-agent: csv 只读路由");
}

//#endregion
export { apply, inject, name, runReportCommand };