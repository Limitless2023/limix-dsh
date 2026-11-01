import { mkdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";

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
	"api",
	"explain",
	"benchmark"
];
const DESCRIPTION = `调用 LimiX 开放平台 API 完成表格数据预测（免训练、零调参），覆盖 上传数据 → 分类/回归/时序预测 → 任务轮询 → 结果下载 全流程。
子命令：health / check（连通性）；upload <文件>（上传得 data_version_id）；classify / regress / forecast（上传→提交→轮询→下载一条龙，需 --train --predict --target，时序另需 --date --context --horizon；时序的 --predict 可选，不传则按 --horizon 自动外推）；task <id> / tasks（查任务）；result <id> / download <id> -o 文件（取结果）；data files|versions（查数据）；api <METHOD> <path>（逃生舱裸调任意端点）。
参数帮助：通过本工具传 command="forecast"、args=["--help"]（其它子命令同理）。CLI 由本工具封装，不在 shell 的 PATH 中，不要搜索或执行 shell limix 命令。
时序区间：--quantile --levels 0.1,0.5,0.9 返回 P10/P50/P90；--context 90 直接使用最近 90 个历史点，无需剪裁原始文件。--output 指定保存 CSV 的路径。
评估：可传 --truth 本地 CSV，含目标列，时序还须含日期列；它只用于本地对照，不会上传。
解释：explain --mode local --train 参考CSV --data 待解释CSV --target 目标 --task-type regression或classification --row 1 --output 解释.json。全局图用 --mode directed或undirected --data 含目标CSV --target 目标 --features 特征1,特征2；字段须完整数值。可选 --labels 字段字典.json、--prediction 原预测.csv。解释自动上传、轮询和保存JSON/CSV；--task-id 续查，不重复提交。先用 explain --help 查看参数。
模型比较：benchmark --manifest 数据集清单.json --models LIMIX_7M,LIMIX_16M,XGBoost,BASELINE --output 比较.json；自动保存可恢复回执、JSON/CSV/HTML，使用同一固定拆分。--python 可指定具备 sklearn/xgboost 的独立 Python 环境。先查 --help。
时序解释：explain --mode local --task-type timeseries --result-version-id 已完成时序预测的结果版本ID --output 解释.json，沿用原预测参数，不传 data/train/target。
终态口径：预测任务成功须 status=finished 且有 result_version_id（is_ready=true 仅表示停止轮询）；扩展解释使用 task_status=succeeded，降级或部分成功须说明。凭据由现有配置读取，无需额外传参。文件路径用绝对路径，或相对调用时所在目录的相对路径。`;
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
* @param config { cliPath?, pythonBin?, timeoutMs?, csv? }
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
					].filter((p) => typeof p === "string");
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
const WORKFLOW$2 = `当用户使用 /limix-predict 时，执行完整预测流程，全程用用户的语言交流，默认中文：
1. 从用户描述、附件和会话中识别训练数据、待预测数据、目标列及业务问题。缺少信息时，用一条简短问题列出缺少的内容；不要猜测文件或目标列。空命令且没有已知数据时，先问用户要预测什么、训练和待预测文件在哪里，不扫描工作区寻找样例。任务类型由你根据数据判断，不要求用户选择 classify/regress 等内部命令。
2. 查看文件列名、样本与行数，用 Python 标准库 csv 即可，不需要 pandas。选择 classify（类别）、regress（连续数值）或 forecast（时间序列）。保留待预测数据中的真实目标列供评估；没有真值也能预测，但不能报告准确率。不要把训练集直接当作测试集。
3. 通过 limix 工具的一次 classify/regress/forecast 调用完成上传、提交、轮询、下载。直接传本地文件绝对路径给 --train 和 --predict，不要先调用 upload 换成版本 ID，否则会丢失本地评估来源。必须传 --target 和 --output；结果保存到会话工作目录，用唯一文件名 limix-<目标列>-<时间戳>.csv，避免覆盖已有文件。workdir 传会话工作目录。
4. forecast 还需要 --date、--context、--horizon；有未来协变量时传包含未来协变量的 --predict，没有协变量时可省略 --predict。P10/P50/P90 使用 --quantile --levels 0.1,0.5,0.9，不要猜参数或自行估算平台区间；不确定时先用 limix 工具的 args=["--help"] 查参数。--context 已限制历史长度，无需剪裁文件。不要把未来真值用作模型输入。有独立真实值文件时，通过 --truth 传给本地评估；时序真实值文件须包含日期列和目标列，并与预测日期逐行一致。--truth 不上传、不参与预测。
5. 成功后检查 saved_to、metrics 与任务终态。工具卡已自动展示图表、混淆矩阵和指标，不另写脚本重算或重画。最终回复只写两三句话：完成了多少条预测、一项主要指标、结果文件链接；不重复数据清单、矩阵、指标定义或逐类分析。metrics 来自本地真实值对照，不称为服务端评估。只使用工具实际返回的指标，不猜测价格或误差单位，不凭 R² 或 MAE/RMSE 断言没有偏差、没有异常点。合成样例只说明流程可用。无真值时明确说明无法评估。用户无需再要求下载，不要再次运行 download。
6. 上传或字段校验失败时指出具体问题。提交结果不确定或等待超时时，按返回的任务 ID 查询现有任务，禁止盲目重新提交。未完成不能称成功，任务 ID 和内部命令不放在主要说明里。`;
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
const WORKFLOW$1 = `当用户要求解释预测或使用 /limix-explain：
1. 识别局部预测归因或全局关系探索。表格局部归因用 explain --mode local --train 参考CSV --data 待解释CSV --target 目标 --task-type regression或classification --row 1。行号从1开始，不含表头。批量使用 --rows 1-10、--rows 1,3,5-8 或 --rows all，与 --row 互斥；不能把标识列当特征。时序局部归因用 explain --mode local --task-type timeseries --result-version-id 已完成时序预测的结果版本ID，沿用原预测数据、目标、特征、窗口、步长和模型，不能再传 data/train/target/features/model/row/rows/prediction。缺少数据、目标或时序结果版本时只问必要信息，不扫描工作区找案例。
2. 全局有向关系用 explain --mode directed --data 含目标的CSV --target 目标 --features 特征1,特征2；无向关系用 undirected。所选列必须是完整有限数值。保持默认阈值，不为得到更好看的图调阈值。先用 --help 查参数，不猜参数。
3. 所有解释经 limix 工具调用 command=explain，不走 shell。必须 --output 唯一的绝对路径.json。工具自动上传、等待、保存原始JSON与贡献/边CSV。不要手写或篡改解释结果。--labels 可使用已知字段字典 JSON（fields、target_label、unit）；--prediction 可传同一输入逐行对应的原预测CSV作对比。用户指定全部样本时直接使用 --rows all；数据说明中的示例行数不能覆盖本轮需求，不需要额外先提交10行任务。
4. 表格解释会重算预测，使用工具 explanation.prediction 并称“解释时预测”。有 prior_prediction 与 prediction_delta 时简要说明差异，不能冒充与原预测完全一致。时序 prediction_scale=unverified 时称“解释模型输出”：业务尺度尚未核实，不附目标单位，不与原预测做差，不根据数值形态自行做 exp 等逆变换；target_unit 只描述业务目标，不是解释模型输出的单位。贡献分数无目标单位，不得写成增减多少MPa；方向表示模型归因，不是调参的实际因果效果。分类接口未声明 sign_scores 对应哪一类别，只称“服务返回的贡献方向”，不能解释为提升类别1或某个类别的概率，也不能把不同预测标签的平均方向当成同一类别的效果。
5. 图的边权是模型关系分数，不是增益、实验效应或已验证概率。发现图与物理机制相符可表述为“一致”，不能声称证明因果或个体反事实。实验记录与模型发现分开。不要自动请求预留自然语言报告接口。
6. 终态使用 task_status；succeeded 才是完整成功。degraded_succeeded 或 partially_succeeded 必须说明限制。等待超时按 task_id 和原参数/output续查，不重复提交；缺回执但有请求文件时先通过api GET /v1/extensions/tasks排查。
7. 批量结果返回 requested_count、explained_count、missing_rows 和带正负的平均贡献（各影响因子影响分数对比）。平均贡献按每条 abs(score)×direction 求平均，按平均值绝对大小排序；未知方向不补零。samples 完整矩阵由界面按 detail_path 加载。missing_rows 非空时不得称全部完成；mapping=input_order 表示服务未返回索引、按输入顺序对应，不能声称已用服务索引核验。样本不足且没有索引时工具拒绝错配。时序行代表预测步，时间与特征名称只使用返回值；整体贡献排名不是有向因果图。
8. 贡献解释说明模型使用了哪些信号，不能证明预测误差的原因。可描述具体偏差日期和数值；缺少天气、日历信息不足、分布变化等只能作为待验证假设。没有补充数据或对照实验，不得断言某因素是误差的主要来源，或模型仅凭某些特征就无法提前预测。中性或零贡献不等于该变量没有实际作用，也不能仅凭零贡献断定其由共线性造成。
9. 结果卡已显示贡献、关系图和下载链接，最终用两三句话说明结果、重要边界和文件链接，不重复全部表格。标准模式不执行此命令。`;
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
const WORKFLOW = `当用户要求比较 LimiX 和其他模型或使用 /limix-compare：
1. 先明确数据、目标与独立测试集。同一数据集必须让所有模型使用完全相同的训练/测试拆分和特征；真值仅供本地评估。分类用分层拆分，重复样本放在同组；时序按时间拆分。不能根据成绩挑测试样本或删除差结果。
2. 用 limix 工具 command=benchmark，先用 --help 查契约。manifest JSON 的 datasets 数组包含 id/name/task_type/target/train/predict/truth，文件相对 manifest 所在目录解析。目前比较支持 regression/classification。默认比较 LIMIX_7M、LIMIX_16M、XGBoost 与均值/多数类 BASELINE；固定 --seed，保存唯一 --output 结果路径。
3. XGBoost 需要独立 Python 环境中的 numpy/pandas/scikit-learn/xgboost。先检查已有环境，缺依赖时说明具体缺项；可通过 --python 指定解释器，不修改宿主运行时。预测和解释自身不需要这些第三方库。
4. 命令保存每项回执、JSON、CSV 与 HTML 报告。等待超时使用同一 manifest/参数/output 续跑读取回执，不盲目重提。failed/pending/partial 不称全部完成，缺失指标不能填0。报告按数据集比较，不跨不同单位平均原始误差。
5. 结果卡已展示比较，回复只写完成数量、关键差异和报告链接。测试集上的领先只适用于这次固定拆分，不称模型普遍更好。`;
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
function createCsvAccess(roots, receiptPath = join(homedir(), ".limix", "dsh-csv-files.json"), options = {}) {
	const extensions = options.extensions ?? [".csv"];
	const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
	if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error("文件大小限额须为正整数");
	const allowed = (path) => typeof path === "string" && extensions.some((ext) => path.toLowerCase().endsWith(ext));
	const readReceipts = async () => {
		try {
			const data = JSON.parse(await readFile(receiptPath, "utf8"));
			return new Set(Array.isArray(data) ? data.filter((p) => typeof p === "string" && isAbsolute(p)) : []);
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
				await writeFile(temp, JSON.stringify([...files].slice(-1e3)), { mode: 384 });
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
	const roots = [...(config.csvRoots ?? []).filter((r) => typeof r === "string" && r.length > 0), process.cwd()];
	const csv = createCsvAccess(roots);
	const artifacts = createCsvAccess(roots, void 0, {
		extensions: [".json", ".csv"],
		registeredOnly: true,
		maxBytes: 5e7
	});
	registerLimixTool(ctx, {
		cliPath: config.cliPath,
		pythonBin: config.pythonBin,
		csv,
		artifacts
	});
	registerPredictCommand(ctx);
	registerExplainCommand(ctx);
	registerBenchmarkCommand(ctx);
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
				const text = await readFile(target, "utf8");
				const headers = {
					"content-type": "text/csv; charset=utf-8",
					"cache-control": "no-store"
				};
				if (url.searchParams.get("download") === "1") headers["content-disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(basename(target))}`;
				res.writeHead(200, headers);
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