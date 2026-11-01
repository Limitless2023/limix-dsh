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
解释：explain --mode local --train 参考CSV --data 待解释CSV --target 目标 --task-type regression或classification --row 1 --output 解释.json。全局图用 --mode directed或undirected --data 含目标CSV --target 目标 --features 特征1,特征2；字段须完整数值。可选 --labels 字段字典.json、--prediction 原预测.csv。解释自动上传、轮询和保存JSON/CSV；--task-id 续查，不重复提交。参数未知、版本变化或参数校验失败时用 explain --help；已有适用说明直接复用。
模型比较：benchmark --manifest 数据集清单.json --models LIMIX_7M,LIMIX_16M,XGBoost,BASELINE --output 比较.json；自动保存可恢复回执、JSON/CSV/HTML，使用同一固定拆分。比较入口需要 numpy/pandas/scikit-learn，选择 XGBoost 时另需 xgboost；--python 指定独立 Python 环境。仅支持回归/分类；参数未知、版本变化或参数校验失败时查 --help。
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
const WORKFLOW$2 = `当用户要求预测、分类、回归、时序外推，或使用 /limix-predict，执行预测流程：
1. 识别业务目标、训练数据、待预测数据与目标列，查看列名、样本和行数。任务类型由你根据数据判断：classify（类别）、regress（连续数值）、forecast（时间序列）。用户尚未给数据时只问必要信息，不要求用户选择内部命令。
2. 核对特征在业务预测时点是否可获得，排除目标泄漏、事后信息和纯标识列。保留待预测数据的真实目标值供本地评估，不能把训练集直接当测试集。需要拆分时，分类分层，同一实体或重复样本按组，时序按时间；拆分规则不能按测试成绩调整。
3. 通过一次 limix classify/regress/forecast 调用完成上传、提交、轮询和保存。直接传本地绝对路径给 --train 和 --predict，不先 upload 换成版本 ID，以保留本地评估来源。必须传 --target、--output，workdir 传会话工作目录；输出文件采用 limix-<目标列>-<时间戳>.csv。用户指定模型时必须显式传 --model（如 LIMIX_7M），不能遗漏后使用服务默认模型；未指定才使用默认。提交后核对回执中的实际模型，未知时不把期望模型写成已使用的模型；模型不符时如实说明并纠正，不混入指定模型的报告结论。
4. forecast 还需 --date、--context、--horizon。根据频率、可用历史和主要周期选择 context；历史不足一个完整周期时说明限制，不凭空补齐。未来协变量须覆盖预测日期，并区分预先已知信息、当时可用的预测信息和事后观测；事后真值不能作为模型输入。有未来协变量时传 --predict，没有时省略 --predict，按 --horizon 外推。--context 已限制历史长度，无需剪裁文件。P10/P50/P90 用 --quantile --levels 0.1,0.5,0.9，不自行估算区间。
5. 有独立真值时传 --truth 本地 CSV；时序真值须含日期列与目标列，日期逐行对齐预测。--truth 不上传、不参与预测。没有真值也能预测，但无法评估。metrics 是本地真实值对照，不称为服务端评估。--truth 是预测流程参数，不是现成 CSV 的独立评分入口；后补真值时不能承诺传 --truth 就无需重跑预测。
6. 成功须 status=finished、result_version_id 和 saved_to；is_ready=true 仅表示停止轮询。报告交代业务目标、实际数据和预测范围，引用关键 metrics 并解释其含义：回归 MAE/RMSE 越低越好，R² 越高越好，负值表示在本测试集上不如用测试真值均值作常数预测（区别于训练均值基线）；分类准确率须结合类别分布解读。只使用已核对的单位，不凭 R² 或 MAE/RMSE 断言没有偏差或异常点。没有业务容差时不声称已达到生产要求；合成样例只说明流程可用。上传或字段校验失败时指出具体问题。`;
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
1. 表格局部归因用 limix explain --mode local --train 参考CSV --data 待解释CSV --target 目标 --task-type regression或classification；单行用 --row，行号从1开始、不含表头。指定多行用 --rows 1-10 或 --rows 1,3,5-8，全部用 --rows all；row 与 rows 互斥。遵守本轮样本范围，不用数据说明中的示例行数覆盖需求，不额外先提交10行任务。不能把标识列当特征。
2. 时序局部归因用 explain --mode local --task-type timeseries --result-version-id 已完成时序预测的结果版本ID。沿用原预测数据、目标、特征、窗口、步长和模型，不能再传 data/train/target/features/model/row/rows/prediction；行代表预测步。按任务类型补充必要参数：时序已有结果版本时不追问数据、目标或样本范围；表格缺数据、目标或样本范围时只问缺项。
3. 全局关系探索用 explain --mode directed或undirected --data 含目标的CSV --target 目标 --features 特征1,特征2。所选列须为完整有限数值。保持默认阈值，不为让图更复杂而调阈值。边权是模型关系分数，不是增益、实验效应或已验证概率；与物理机制相符只称“一致”，不能声称证明因果或个体反事实。实验记录与模型发现分开，不自动请求预留自然语言报告接口。
4. 必须 --output 唯一的绝对路径.json；工具自动保存原始JSON与贡献/边CSV，不手写或篡改结果。--labels 可传已知字段字典 JSON（fields、target_label、unit），--prediction 可传同一输入逐行对应的原预测CSV作对比。
5. 表格解释原预测时，按原预测实际模型显式传 --model；用户单独指定解释模型时遵守指定。核对解释返回的 model_type，不将不同模型的归因冒充原模型的解释；指定模型被服务拒绝时报告失败，不擅自换模型重试。表格解释会重算预测，使用 explanation.prediction 并称“解释时预测”；有 prior_prediction、prediction_delta 时说明差异，不冒充与原预测一致。时序 prediction_scale=unverified 时称“解释模型输出”：不附业务单位，不与原预测做差，不自行做 exp 等逆变换；target_unit 不是解释模型输出的单位。
6. 贡献分数无目标单位，不写成增减多少MPa；方向是模型归因，不是实际调节收益。分类接口未声明 sign_scores 对应哪一类别，只称“服务返回的贡献方向”，不解释为提升某一类别概率，也不把不同预测标签的平均方向当成同一类别效果。中性或零贡献不等于变量没有实际作用，也不能据此断定共线性。
7. 批量核对 requested_count、explained_count、missing_rows。各影响因子影响分数对比采用带正负的平均贡献：每条 abs(score)×direction 求平均，再按平均值绝对大小排序；未知方向不补零。samples 完整矩阵由界面按 detail_path 加载。missing_rows 非空不得称全部完成；mapping=input_order 只是按输入顺序对应，不是服务索引核验。样本不足且无索引时拒绝错配；时间与特征名称只使用返回值，整体排名不是有向因果图。
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
const WORKFLOW = `当用户要求比较 LimiX 与其他模型、比较不同 LimiX 模型，或使用 /limix-compare，执行固定拆分模型比较：
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