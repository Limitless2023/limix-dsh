window.__ModuleLoader__.load({ id: "dsh-limix-agent", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react);
let react_jsx_runtime = require("react/jsx-runtime");
react_jsx_runtime = __toESM(react_jsx_runtime);
let react_dom = require("react-dom");
react_dom = __toESM(react_dom);

//#region src/client/prediction-summary.ts
/**
* [INPUT]: 结果 CSV 的预测日期、结果行数与实际评估数量。
* [OUTPUT]: forecastSummary，紧凑预测范围与评估文案；不将未知频率称为天。
* [POS]: 工具卡时序展示口径；只读已返回的数据，不计算评估指标。
* [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
*/
function forecastSummary(dates, rows$1, evaluated) {
	const count = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
	const total = dates?.length || (count(rows$1) ? rows$1 : void 0);
	const unit = !!dates && dates.length > 1 && dates.every((date, i) => {
		const timestamp = Date.parse(date);
		return Number.isFinite(timestamp) && (!i || timestamp - Date.parse(dates[i - 1]) === 864e5);
	}) ? "天" : "步";
	return {
		range: dates?.length ? `${dates[0]} — ${dates[dates.length - 1]}` : total !== void 0 ? `预测 ${total} 步` : "",
		evaluation: count(evaluated) ? total !== void 0 && evaluated < total ? `已评估 ${evaluated}/${total} ${unit}` : `评估 ${evaluated} ${unit}` : ""
	};
}

//#endregion
//#region src/client/ActionMenu.tsx
function ActionMenu({ label, children, up = false }) {
	const ref = (0, react.useRef)(null);
	const panelRef = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		const el = ref.current, panel = panelRef.current;
		if (!el || !panel) return;
		const floating = typeof panel.showPopover === "function";
		if (floating) panel.setAttribute("popover", "manual");
		const place = () => {
			if (!floating || !el.open) return;
			const anchor = el.querySelector("summary").getBoundingClientRect();
			const rect = panel.getBoundingClientRect();
			const x = up ? anchor.left : anchor.right - rect.width;
			const above = up || window.innerHeight - anchor.bottom < rect.height + 8;
			panel.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
			panel.style.top = `${Math.max(8, Math.min(above ? anchor.top - rect.height - 5 : anchor.bottom + 5, window.innerHeight - rect.height - 8))}px`;
		};
		const toggle = () => {
			if (!floating) return;
			if (el.open) {
				panel.showPopover();
				place();
			} else if (panel.matches(":popover-open")) panel.hidePopover();
		};
		const close = (event) => {
			if (!el.contains(event.target)) el.open = false;
		};
		const key = (event) => {
			if (el.open && event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				el.open = false;
				el.querySelector("summary")?.focus();
			}
		};
		const choose = (event) => {
			if (event.target.closest("a,button")) {
				el.open = false;
				el.querySelector("summary")?.focus();
			}
		};
		document.addEventListener("pointerdown", close, true);
		document.addEventListener("keydown", key, true);
		el.addEventListener("click", choose);
		el.addEventListener("toggle", toggle);
		window.addEventListener("resize", place);
		document.addEventListener("scroll", place, true);
		return () => {
			document.removeEventListener("pointerdown", close, true);
			document.removeEventListener("keydown", key, true);
			el.removeEventListener("click", choose);
			el.removeEventListener("toggle", toggle);
			window.removeEventListener("resize", place);
			document.removeEventListener("scroll", place, true);
			if (floating && panel.matches(":popover-open")) panel.hidePopover();
		};
	}, []);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
		className: "lx-action-menu",
		ref,
		"data-up": up,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `.lx-action-menu{position:relative;font-size:12px}.lx-action-menu>summary{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;cursor:pointer;list-style:none;color:var(--dsw-alias-state-business-primary,#3465ce);padding:3px 0}.lx-action-menu>summary::-webkit-details-marker{display:none}.lx-action-menu>summary:focus-visible{outline:2px solid #466eb9;outline-offset:3px}.lx-action-chevron{display:block;flex:none;width:12px;height:12px;transition:transform .15s ease}.lx-action-menu[open]>summary .lx-action-chevron{transform:rotate(180deg)}@media(prefers-reduced-motion:reduce){.lx-action-chevron{transition:none}}.lx-action-menu-panel{position:absolute;z-index:20;top:100%;right:0;min-width:160px;padding:6px;background:var(--dsw-alias-background-primary,#fff);border:1px solid var(--dsw-alias-border-l3,#e3e6eb);border-radius:8px;box-shadow:0 6px 22px #152b4914}.lx-action-menu[data-up=true]>.lx-action-menu-panel{top:auto;bottom:100%;left:0;right:auto}.lx-result .lx-action-menu-panel>a,.lx-result .lx-action-menu-panel>button{display:block;width:100%;padding:7px 10px;text-align:left;white-space:nowrap}.lx-action-menu-panel>a:hover,.lx-action-menu-panel>button:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f5f8)}` }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `.lx-action-menu>.lx-action-menu-panel[popover]{position:fixed;inset:auto;margin:0;box-sizing:border-box;max-height:calc(100dvh - 16px);max-width:calc(100vw - 16px);overflow:auto;color:inherit;font:inherit}.lx-action-menu[data-up=true]>.lx-action-menu-panel[popover]{bottom:auto;right:auto}` }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "lx-action-chevron",
				width: "12",
				height: "12",
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m4 6 4 4 4-4" })
			})] }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-action-menu-panel",
				ref: panelRef,
				children
			})
		]
	});
}

//#endregion
//#region src/client/TaskFiles.tsx
function TaskFiles({ files }) {
	if (!files.length) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "lx-task-files",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `.lx-task-files{border-top:1px solid var(--dsw-alias-border-l3,#e3e6eb);margin-top:5px;padding-top:5px;max-height:260px;overflow:auto}.lx-task-files-label{padding:3px 10px;font-size:11px;color:var(--dsw-alias-label-tertiary,#858d99)}.lx-result .lx-task-files button{display:flex;flex-direction:column;width:100%;max-width:min(310px,65vw);padding:6px 10px;gap:1px;border-radius:4px}.lx-task-files button:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f5f8)}.lx-task-files button span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lx-task-files-name{font-size:11px;color:var(--dsw-alias-label-secondary,#767d89)}` }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-task-files-label",
				children: "任务文件"
			}),
			files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				"data-lx": "file",
				"data-path": file.path,
				title: file.path,
				"aria-label": `打开${file.label}：${file.name}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: file.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "lx-task-files-name",
					children: file.name
				})]
			}, file.path))
		]
	});
}

//#endregion
//#region src/client/task-files.ts
function localPath(value, cwd) {
	if (typeof value !== "string" || !value.trim() || /[\0\r\n]/.test(value)) return null;
	const path = value.replace(/\\/g, "/");
	if (/^[a-z][a-z\d+.-]*:/i.test(path) && !/^[a-z]:\//i.test(path)) return null;
	if (path.startsWith("//") || path.startsWith("~")) return null;
	const absolute = path.startsWith("/") || /^[a-z]:\//i.test(path);
	if (!absolute && !/\.(csv|xlsx?|parquet|json|tsv)$/i.test(path)) return null;
	if (absolute) return path;
	return cwd ? `${cwd.replace(/\\/g, "/").replace(/\/$/, "")}/${path.replace(/^\.\//, "")}` : path;
}
function taskFiles(command, args, result, cwd) {
	if (![
		"regress",
		"classify",
		"forecast",
		"explain"
	].includes(command)) return [];
	const files = [];
	const flag$1 = (name) => {
		for (let i = args.length - 1; i >= 0; i--) {
			if (args[i].startsWith(name + "=")) return args[i].slice(name.length + 1);
			if (args[i] === name && args[i + 1] && !args[i + 1].startsWith("-")) return args[i + 1];
		}
	};
	const add = (label, value) => {
		const path = localPath(value, cwd);
		if (!path) return;
		const found = files.find((file) => file.path === path);
		if (found) {
			found.label += ` / ${label}`;
			return;
		}
		files.push({
			label,
			path,
			name: path.split("/").pop() || path
		});
	};
	add("训练集", flag$1("--train"));
	add("预测集", flag$1("--predict"));
	if (command === "explain") {
		add("待解释数据", flag$1("--data"));
		add("原预测结果", flag$1("--prediction"));
		add("场景 A 解释", flag$1("--compare-left"));
		add("场景 B 解释", flag$1("--compare-right"));
	}
	add("评估真值", flag$1("--truth"));
	add(command === "explain" ? "解释结果" : "预测结果", result?.saved_to);
	if (command === "explain") add("解释数据 CSV", result?.csv_path);
	return files;
}

//#endregion
//#region src/client/ConfusionMatrix.tsx
const ACCENT$1 = "#2563eb";
/** 单元格边长按类别数收缩，保证整图宽度稳定在卡片内 */
function cellSize(k) {
	return k <= 3 ? 62 : k <= 5 ? 52 : k <= 8 ? 42 : 34;
}
/** 标签过长会撑破行首，统一截断并留 title 兜底 */
function short$1(s, max) {
	return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
function ConfusionMatrix({ data }) {
	const { classes, matrix, n, accuracy, perClass, majorityBaseline } = data;
	const k = classes.length;
	if (!k) return null;
	const cs = cellSize(k);
	const LEFT = 78;
	const TOP = 40;
	const W$2 = LEFT + k * cs + 14;
	const H$2 = TOP + k * cs + 8;
	const rowMax = matrix.map((row) => Math.max(...row, 1));
	const pct = (v) => `${(v * 100).toFixed(1)}%`;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: { marginTop: 8 },
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					fontSize: 12,
					opacity: .7,
					marginBottom: 4
				},
				children: [
					"混淆矩阵 · 共 ",
					n,
					" 个样本 · 准确率 ",
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: pct(accuracy) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [" · 多数类基线 ", pct(majorityBaseline)] })
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: `0 0 ${W$2} ${H$2}`,
				style: {
					width: "100%",
					maxWidth: W$2,
					display: "block"
				},
				role: "img",
				"aria-label": "混淆矩阵",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: LEFT,
						y: 12,
						fontSize: "10",
						fill: "currentColor",
						opacity: "0.55",
						children: "预测类别 →"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: 4,
						y: TOP - 8,
						fontSize: "10",
						fill: "currentColor",
						opacity: "0.55",
						children: "真实类别 ↓"
					}),
					classes.map((c, j) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: LEFT + j * cs + cs / 2,
						y: TOP - 8,
						textAnchor: "middle",
						fontSize: "10",
						fill: "currentColor",
						opacity: "0.7",
						children: short$1(c, 6)
					}, `h${c}`)),
					classes.map((rc, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: LEFT - 6,
						y: TOP + i * cs + cs / 2 + 3,
						textAnchor: "end",
						fontSize: "10",
						fill: "currentColor",
						opacity: "0.7",
						children: short$1(rc, 10)
					}), classes.map((cc, j) => {
						const v = matrix[i][j];
						const f = v / rowMax[i];
						const diag = i === j;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								x: LEFT + j * cs + 1,
								y: TOP + i * cs + 1,
								width: cs - 2,
								height: cs - 2,
								rx: 3,
								fill: ACCENT$1,
								opacity: v === 0 ? .04 : .1 + .72 * f
							}),
							diag && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								x: LEFT + j * cs + 1,
								y: TOP + i * cs + 1,
								width: cs - 2,
								height: cs - 2,
								rx: 3,
								fill: "none",
								stroke: ACCENT$1,
								strokeWidth: "1.5",
								opacity: "0.85"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								x: LEFT + j * cs + cs / 2,
								y: TOP + i * cs + cs / 2 + 4,
								textAnchor: "middle",
								fontSize: k > 8 ? 10 : 12,
								fontWeight: diag ? 700 : 400,
								fill: f > .55 ? "#ffffff" : "currentColor",
								opacity: v === 0 ? .35 : 1,
								children: v
							})
						] }, `c${rc}-${cc}`);
					})] }, `r${rc}`))
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
				style: {
					marginTop: 10,
					fontSize: 12
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
					style: {
						cursor: "pointer",
						color: "var(--dsw-alias-label-secondary)"
					},
					children: "各类别表现"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gridTemplateColumns: "auto repeat(4, minmax(0,1fr))",
						gap: "2px 12px",
						fontSize: 12,
						marginTop: 8
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { opacity: .55 },
							children: "类别"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { opacity: .55 },
							children: "样本数"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { opacity: .55 },
							children: "精确率"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { opacity: .55 },
							children: "召回率"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { opacity: .55 },
							children: "F1"
						}),
						perClass.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: { display: "contents" },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { wordBreak: "break-all" },
									title: c.label,
									children: short$1(c.label, 14)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: c.support }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: pct(c.precision) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: pct(c.recall) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: pct(c.f1) })
							]
						}, c.label))
					]
				})]
			})
		]
	});
}

//#endregion
//#region src/client/ForecastChart.tsx
const W$1 = 560;
const H$1 = 170;
const PAD$1 = {
	top: 12,
	right: 10,
	bottom: 22,
	left: 44
};
/** 数值数组 → SVG polyline points 串；x 从 i0 开始编号，全序列共 n 点 */
function toPoints(ys, i0, n, min, max) {
	const iw = W$1 - PAD$1.left - PAD$1.right;
	const ih = H$1 - PAD$1.top - PAD$1.bottom;
	const span = max - min || 1;
	return ys.map((y, i) => {
		const x = PAD$1.left + (i0 + i) / Math.max(1, n - 1) * iw;
		const yy = PAD$1.top + (1 - (y - min) / span) * ih;
		return `${x.toFixed(1)},${yy.toFixed(1)}`;
	}).join(" ");
}
function ForecastChart({ hist, pred, p10, p90, truth, startLabel, endLabel, target }) {
	if (!hist.length && !pred.length) return null;
	const n = hist.length + pred.length;
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
		const up = toPoints(p90, hist.length, n, min, max).split(" ");
		const dn = toPoints(p10, hist.length, n, min, max).split(" ").reverse();
		bandPath = "M" + [...up, ...dn].join(" L") + " Z";
	}
	const predWithBridge = hist.length && pred.length ? [hist[hist.length - 1], ...pred] : pred;
	const predStart = hist.length ? hist.length - 1 : 0;
	const fmt = (v) => Math.abs(v) >= 1e3 ? v.toFixed(0) : v.toPrecision(3);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: { marginTop: 12 },
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				gap: 16,
				flexWrap: "wrap",
				fontSize: 12,
				color: "var(--dsw-alias-label-secondary)"
			},
			children: [
				hist.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "━ 历史" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: { color: "#2563eb" },
					children: "┄ 预测"
				}),
				!!truth?.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "━ 实际" }),
				hasBand && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "▰ P10–P90 区间" })
			]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${W$1} ${H$1}`,
			style: {
				width: "100%",
				maxWidth: W$1,
				display: "block",
				marginTop: 8
			},
			role: "img",
			"aria-label": `${target ?? "目标"} 时序预测图`,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: PAD$1.left - 6,
					y: PAD$1.top + 4,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(max)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: PAD$1.left - 6,
					y: H$1 - PAD$1.bottom,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(min)
				}),
				startLabel && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: PAD$1.left,
					y: H$1 - 6,
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: startLabel
				}),
				endLabel && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: W$1 - PAD$1.right,
					y: H$1 - 6,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: endLabel
				}),
				hist.length > 0 && pred.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
					x1: PAD$1.left + (hist.length - 1) / Math.max(1, n - 1) * (W$1 - PAD$1.left - PAD$1.right),
					y1: PAD$1.top,
					x2: PAD$1.left + (hist.length - 1) / Math.max(1, n - 1) * (W$1 - PAD$1.left - PAD$1.right),
					y2: H$1 - PAD$1.bottom,
					stroke: "currentColor",
					opacity: "0.15",
					strokeDasharray: "3,3"
				}),
				hasBand && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: bandPath,
					fill: "#2563eb",
					opacity: "0.13"
				}),
				hist.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polyline", {
					points: toPoints(hist, 0, n, min, max),
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.5",
					opacity: "0.65"
				}),
				!!truth?.length && truth.length === pred.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polyline", {
					points: toPoints(hist.length ? [hist[hist.length - 1], ...truth] : truth, predStart, n, min, max),
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.3",
					opacity: "0.45"
				}),
				predWithBridge.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polyline", {
					points: toPoints(predWithBridge, predStart, n, min, max),
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
//#region src/client/ScatterChart.tsx
const ACCENT = "#2563eb";
const W = 400;
const H = 300;
const PAD = {
	top: 14,
	right: 12,
	bottom: 34,
	left: 52
};
function ScatterChart({ data }) {
	const { points, n, shown, min, max } = data;
	if (!points.length) return null;
	const span = max - min || 1;
	const lo = min - span * .05;
	const hi = max + span * .05;
	const iw = W - PAD.left - PAD.right;
	const ih = H - PAD.top - PAD.bottom;
	const sx = (v) => PAD.left + (v - lo) / (hi - lo) * iw;
	const sy = (v) => PAD.top + (1 - (v - lo) / (hi - lo)) * ih;
	const fmt = (v) => Math.abs(v) >= 1e3 ? v.toFixed(0) : Number(v.toPrecision(3)).toString();
	const r = shown > 800 ? 1.6 : shown > 300 ? 2.1 : 2.8;
	const op = shown > 800 ? .35 : shown > 300 ? .5 : .62;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: { marginTop: 8 },
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				fontSize: 12,
				opacity: .7,
				marginBottom: 4
			},
			children: [
				"预测 vs 真实 · 共 ",
				n,
				" 个样本",
				shown < n && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: { opacity: .75 },
					children: [
						"（等距抽样画出 ",
						shown,
						" 点，指标仍按全量计算）"
					]
				})
			]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${W} ${H}`,
			style: {
				width: "100%",
				maxWidth: W,
				display: "block"
			},
			role: "img",
			"aria-label": "预测值与真实值散点图",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: PAD.left,
					y: PAD.top,
					width: iw,
					height: ih,
					fill: "none",
					stroke: "currentColor",
					opacity: "0.12"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
					x1: sx(lo),
					y1: sy(lo),
					x2: sx(hi),
					y2: sy(hi),
					stroke: "currentColor",
					opacity: "0.35",
					strokeWidth: "1",
					strokeDasharray: "4,3"
				}),
				points.map((p, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: sx(p.t),
					cy: sy(p.p),
					r,
					fill: ACCENT,
					opacity: op
				}, i)),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: PAD.left - 6,
					y: PAD.top + 4,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(hi)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: PAD.left - 6,
					y: H - PAD.bottom,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(lo)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: PAD.left,
					y: H - PAD.bottom + 13,
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(lo)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: W - PAD.right,
					y: H - PAD.bottom + 13,
					textAnchor: "end",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.55",
					children: fmt(hi)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: PAD.left + iw / 2,
					y: H - 6,
					textAnchor: "middle",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.6",
					children: "真实值 →"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					x: 12,
					y: PAD.top + ih / 2,
					textAnchor: "middle",
					fontSize: "10",
					fill: "currentColor",
					opacity: "0.6",
					transform: `rotate(-90 12 ${PAD.top + ih / 2})`,
					children: "预测值 →"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
					fontSize: "10",
					fill: "currentColor",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: W - PAD.right - 92,
						y1: PAD.top + 8,
						x2: W - PAD.right - 76,
						y2: PAD.top + 8,
						stroke: "currentColor",
						opacity: "0.35",
						strokeDasharray: "4,3"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: W - PAD.right - 72,
						y: PAD.top + 11,
						opacity: "0.6",
						children: "y=x 完美预测"
					})]
				})
			]
		})]
	});
}

//#endregion
//#region src/client/forecast-csv.ts
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
	return rows$1.map((r) => r[idx]?.trim() ? Number(r[idx]) : NaN);
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
	const rows$1 = lines.slice(1).map(splitCsvLine).filter((r) => r.length === header.length);
	if (!rows$1.length) return null;
	const pred = toNums(rows$1, predIdx);
	if (pred.some((v) => !Number.isFinite(v))) return null;
	const series = {
		dates: rows$1.map((r) => r[dateIdx]),
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
function parseTrainTail(text$1, colTarget, n, dateColumn) {
	const lines = text$1.trim().split(/\r?\n/);
	if (lines.length < 2) return null;
	const header = splitCsvLine(lines[0].replace(/^\uFEFF/, ""));
	const idx = header.indexOf(colTarget);
	if (idx < 0) return null;
	const rows$1 = lines.slice(Math.max(1, lines.length - n)).map(splitCsvLine).filter((r) => r.length === header.length);
	const values = toNums(rows$1, idx);
	if (!values.length || values.some((v) => !Number.isFinite(v))) return null;
	const dateIdx = dateColumn ? header.indexOf(dateColumn) : 0;
	return {
		dates: rows$1.map((r) => r[dateIdx] ?? ""),
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
	if (rows$1.length !== dates.length || rows$1.some((r, i) => r[dateIdx]?.trim() !== dates[i]?.trim())) return void 0;
	const values = toNums(rows$1, targetIdx);
	return values.every(Number.isFinite) ? values : void 0;
}

//#endregion
//#region src/client/eval-csv.ts
/** 类别数上限：超过则不画矩阵（格子退化成噪点，读不出信息） */
const MAX_CLASSES = 12;
/** 散点上限：超过则等距抽样，避免上万点拖垮 SVG */
const MAX_POINTS = 1500;
function rows(text$1) {
	const lines = text$1.trim().split(/\r?\n/);
	if (lines.length < 2) return null;
	const header = splitCsvLine(lines[0].replace(/^\uFEFF/, ""));
	const body = lines.slice(1).map(splitCsvLine);
	if (body.some((r) => r.length !== header.length)) return null;
	return body.length ? {
		header,
		body
	} : null;
}
/** 按列名取整列原始字符串；列不存在返回 null */
function pickColumn(text$1, col) {
	const t = rows(text$1);
	if (!t) return null;
	const i = t.header.indexOf(col);
	return i < 0 ? null : t.body.map((r) => r[i]);
}
/**
* 取分类/回归结果的预测列。优先字面 pred_label（平台契约），
* 退而求其次取首个非分位的 pred_ 列（防平台日后改名导致整块失效）
*/
function pickPredLabel(text$1) {
	const t = rows(text$1);
	if (!t) return null;
	let i = t.header.indexOf("pred_label");
	if (i < 0) i = t.header.findIndex((h) => h.startsWith("pred_") && !h.startsWith("pred_q") && !h.startsWith("pred_probs_"));
	return i < 0 ? null : t.body.map((r) => r[i]);
}
/** 标签归一：去首尾空白与包裹引号，使 "A" 与 A 视为同类 */
function norm(s) {
	return s.trim().replace(/^"(.*)"$/, "$1");
}
/**
* 真值/预测两列 → 混淆矩阵。
* 长度不等（对齐失败）、类别数超上限、或有效配对为空时返回 null，渲染方零回归降级。
*/
function buildConfusion(truthRaw, predRaw) {
	if (truthRaw.length !== predRaw.length || !truthRaw.length) return null;
	const pairs = [];
	for (let i = 0; i < truthRaw.length; i++) {
		const t = norm(truthRaw[i]);
		const p = norm(predRaw[i]);
		if (!t || !p) continue;
		pairs.push([t, p]);
	}
	if (!pairs.length) return null;
	const set = /* @__PURE__ */ new Set();
	for (const [t, p] of pairs) {
		set.add(t);
		set.add(p);
	}
	if (set.size > MAX_CLASSES) return null;
	const classes = [...set].sort((a, b) => {
		const na = Number(a), nb = Number(b);
		return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.localeCompare(b);
	});
	const idx = new Map(classes.map((c, i) => [c, i]));
	const matrix = classes.map(() => classes.map(() => 0));
	for (const [t, p] of pairs) matrix[idx.get(t)][idx.get(p)]++;
	const n = pairs.length;
	let correct = 0;
	for (let i = 0; i < classes.length; i++) correct += matrix[i][i];
	const perClass = classes.map((label, i) => {
		const support = matrix[i].reduce((s, v) => s + v, 0);
		const predicted = matrix.reduce((s, row) => s + row[i], 0);
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
		n,
		correct,
		accuracy: correct / n,
		perClass,
		majorityBaseline: Math.max(...perClass.map((c) => c.support)) / n
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
		const t = Number(norm(truthRaw[i]));
		const p = Number(norm(predRaw[i]));
		if (Number.isFinite(t) && Number.isFinite(p)) all.push({
			t,
			p
		});
	}
	if (!all.length) return null;
	const n = all.length;
	let ae = 0, se = 0, sum = 0;
	for (const { t, p } of all) {
		ae += Math.abs(p - t);
		se += (p - t) ** 2;
		sum += t;
	}
	const mean = sum / n;
	let ssTot = 0;
	for (const { t } of all) ssTot += (t - mean) ** 2;
	const r2 = ssTot > 0 ? 1 - se / ssTot : null;
	const step = Math.ceil(n / MAX_POINTS);
	const points = step > 1 ? all.filter((_, i) => i % step === 0) : all;
	const vals = all.flatMap(({ t, p }) => [t, p]);
	return {
		points,
		n,
		shown: points.length,
		mae: ae / n,
		rmse: Math.sqrt(se / n),
		r2,
		min: Math.min(...vals),
		max: Math.max(...vals)
	};
}

//#endregion
//#region src/client/tool-result.ts
function objectJson(text$1) {
	try {
		const v = JSON.parse(text$1);
		return v && typeof v === "object" && !Array.isArray(v) ? v : null;
	} catch {
		return null;
	}
}
/** CLI 先写进度日志，失败时最后写错误 JSON：整段解析失败后取末尾 JSON 块 */
function errorJson(stderr) {
	const text$1 = stderr.trim();
	const start$1 = text$1.lastIndexOf("\n{");
	return objectJson(text$1) ?? (start$1 >= 0 ? objectJson(text$1.slice(start$1 + 1)) : null);
}
function parseToolResult(text$1) {
	const [stdout, stderr = ""] = text$1.split("\n[stderr]\n");
	const envelope = objectJson(stdout.trim());
	const data = typeof envelope?.stdout === "string" ? objectJson(envelope.stdout) : envelope;
	const errorData = errorJson(stderr);
	return {
		data,
		failed: typeof envelope?.exitCode === "number" && envelope.exitCode !== 0 || data?.ok === false || data?.success === false || ["failed", "timeout"].includes(data?.task_status ?? data?.status) || !data?.status && !data?.task_status && typeof data?.error === "string" && !!data.error.trim() || !stdout.trim() && !!stderr.trim(),
		error: errorData ?? data
	};
}
function resultState(settled, failed, data) {
	if (!settled) return {
		kind: "running",
		label: "正在运行"
	};
	if (failed) return {
		kind: "error",
		label: "未完成"
	};
	const status = data?.task_status ?? data?.status;
	if (status === "cancelled" || status === "canceled") return {
		kind: "idle",
		label: "已取消"
	};
	if (status === "degraded_succeeded" || status === "partially_succeeded" || status === "partial") return {
		kind: "warning",
		label: status === "degraded_succeeded" ? "降级完成" : "部分完成"
	};
	if (data?.is_ready === false || [
		"accepted",
		"pending",
		"queued",
		"running",
		"processing",
		"cancelling"
	].includes(status)) return {
		kind: "running",
		label: status === "queued" ? "排队中" : status === "cancelling" ? "正在取消" : "处理中"
	};
	if (data?.task_status && status !== "succeeded" && status !== "reused") return {
		kind: "idle",
		label: "状态待确认"
	};
	return {
		kind: "done",
		label: data ? "已完成" : "已返回"
	};
}
function metricEntries(data) {
	const labels$1 = {
		r2: "拟合度 R²",
		accuracy: "准确率",
		mape: "平均误差 MAPE",
		mae: "平均绝对误差",
		rmse: "均方根误差"
	};
	const descriptions = {
		r2: "相对直接猜平均值的改善程度。越接近 1 越好，也可能为负。",
		accuracy: "预测正确的样本占比。",
		mape: "平均相对误差，越低越好；真实值为 0 的样本不计入。",
		mae: "预测平均差多少，单位与目标值相同。",
		rmse: "对较大的误差更敏感，单位与目标值相同。"
	};
	return Object.entries(labels$1).flatMap(([key, label]) => {
		const value = data?.metrics?.[key];
		if (typeof value !== "number" || !Number.isFinite(value)) return [];
		return [{
			key,
			label,
			value: `${key === "accuracy" ? Number((value * 100).toFixed(2)) : Number(value.toFixed(4))}${key === "accuracy" || key === "mape" ? "%" : ""}`,
			description: descriptions[key]
		}];
	});
}

//#endregion
//#region src/client/explanation-data.ts
const number = (v) => Number(v.toFixed(4)).toLocaleString("zh-CN", { maximumFractionDigits: 4 });
const contributionColors = {
	negative: "#4168a9",
	positive: "#248575",
	neutral: "#697680",
	unknown: "#848991"
};
const contributionBase = "var(--dsw-alias-background-primary, #fff)";
const knownDirection = (direction) => direction === -1 || direction === 0 || direction === 1;
const directionLabel = (direction) => direction === 1 ? "正向" : direction === -1 ? "负向" : direction === 0 ? "中性" : "方向未定";
const contributionColor = (direction) => direction === 1 ? contributionColors.positive : direction === -1 ? contributionColors.negative : direction === 0 ? contributionColors.neutral : contributionColors.unknown;
function contributionFill(score, direction, maximum) {
	const strength = maximum > 0 ? Math.min(1, Math.abs(score) / maximum) : 0;
	return `color-mix(in srgb, ${contributionColor(direction)} ${100 * strength}%, ${contributionBase})`;
}
/** 当前时序解释没有可核验的业务尺度契约，旧文件同样保守展示。 */
function explanationPrediction(data) {
	const unverified = data.task_type === "timeseries" || data.prediction_scale === "unverified";
	return {
		label: unverified ? "解释模型输出" : "解释时预测",
		unit: unverified ? "" : data.unit,
		comparable: !unverified
	};
}
/** 仅跟踪会改变文件归属的字段；新对象引用和展示文案不触发重读。 */
function batchDetailKey(data) {
	return JSON.stringify([
		data.detail_path,
		data.detail_sha256,
		data.mode,
		data.target,
		data.task_type,
		data.mapping,
		data.result_version_id,
		data.source_task_id,
		data.input_rows,
		data.horizon,
		data.requested_count,
		data.explained_count,
		data.feature_names,
		data.row_numbers ?? data.samples?.map((sample) => sample.row_number),
		data.comparison && [
			data.comparison.left.source_task_id,
			data.comparison.left.source_sha256,
			data.comparison.right.source_task_id,
			data.comparison.right.source_sha256,
			data.comparison.threshold
		]
	]);
}
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
	if (expected.feature_names && (!Array.isArray(names) || names.length !== expected.feature_names.length || names.some((name, index) => name !== expected.feature_names[index]))) return false;
	for (const limit of [value.input_rows, value.horizon]) if (limit !== void 0 && (!Number.isInteger(limit) || limit < 1)) return false;
	const rowLimit = value.task_type === "timeseries" ? value.horizon ?? value.input_rows : value.input_rows;
	const requestedRows = expected.row_numbers ?? expected.samples?.map((sample) => sample.row_number);
	const expectedRows = requestedRows ? new Set(requestedRows) : void 0;
	return value.mode === "local" && value.target === expected.target && value.requested_count === expected.requested_count && value.explained_count === expected.explained_count && Array.isArray(names) && names.length > 0 && names.every((n) => typeof n === "string") && new Set(names).size === names.length && Array.isArray(samples) && samples.length === expected.explained_count && new Set(samples.map((s) => s?.row_number)).size === samples.length && samples.every((s) => Number.isInteger(s?.row_number) && s.row_number > 0 && (rowLimit === void 0 || s.row_number <= rowLimit) && (!expectedRows || expectedRows.has(s.row_number)) && (typeof s.prediction === "string" || Number.isFinite(s.prediction) || value.task_type === "timeseries" && s.prediction === void 0) && (s.step === void 0 || Number.isInteger(s.step) && s.step > 0) && (value.task_type !== "timeseries" || s.step === void 0 || s.step === s.row_number && (rowLimit === void 0 || s.step <= rowLimit)) && (s.timestamp === void 0 || typeof s.timestamp === "string") && (s.feature_values === void 0 || Array.isArray(s.feature_values) && s.feature_values.length === names.length && s.feature_values.every((v) => v === null || typeof v === "string" || typeof v === "boolean" || typeof v === "number" && Number.isFinite(v))) && Array.isArray(s.scores) && s.scores.length === names.length && s.scores.every(Number.isFinite) && Array.isArray(s.directions) && s.directions.length === names.length && s.directions.every((v) => v === null || v === 0 || v === 1 || v === -1));
}
function sampleLabel(sample, data) {
	const label = data.task_type === "timeseries" ? `第 ${sample.step ?? sample.row_number} 步` : `第 ${sample.row_number} 行`;
	return sample.timestamp ? `${label} · ${sample.timestamp}` : label;
}
function sampleView(data, sample) {
	return {
		...data,
		...sample,
		features: (data.feature_names ?? []).map((name, i) => ({
			name,
			label: data.labels?.[name] ?? name,
			score: sample.scores[i],
			direction: sample.directions[i]
		})).sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
	};
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
/** 图详情只补原值，不接受其他任务或变量顺序。 */
function validGraphDetail(value, expected) {
	const names = value?.nodes;
	return value?.mode === expected.mode && value.target === expected.target && value.source_task_id === expected.source_task_id && JSON.stringify(names) === JSON.stringify(expected.nodes) && value.input_rows === expected.input_rows && value.source_sha256 === expected.source_sha256 && value.model_type === expected.model_type && value.graph_backend === expected.graph_backend && value.graph_standardize === expected.graph_standardize && Array.isArray(value.graph_sample_names) && JSON.stringify(value.graph_sample_names) === JSON.stringify(names) && Array.isArray(value.graph_samples) && value.graph_samples.length === expected.graph_sample_count && value.graph_samples.length <= 2e3 && value.graph_samples.every((r) => Array.isArray(r) && r.length === names.length && r.every(Number.isFinite)) && JSON.stringify(value.graph_weights) === JSON.stringify(expected.graph_weights);
}
/** 对比详情须同时匹配两组身份和全部分数；只允许补入原值样本。 */
function validComparisonDetail(value, expected) {
	const c = expected.comparison, v = value?.comparison;
	if (!c || !v || value.mode !== expected.mode || value.target !== expected.target || JSON.stringify(value.nodes) !== JSON.stringify(expected.nodes)) return false;
	if (v.threshold !== c.threshold || v.description !== c.description || JSON.stringify(v.records) !== JSON.stringify(c.records)) return false;
	return ["left", "right"].every((side) => v[side]?.label === c[side].label && validGraphDetail(v[side], c[side]));
}
/** 场景对比回执只传 SHA256；完整内容验证通过后再进入图表。 */
async function parseComparisonDetail(text$1, expected) {
	if (Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text$1))), (b) => b.toString(16).padStart(2, "0")).join("") !== expected.detail_sha256) throw new Error("场景对比文件已变化，请重新生成比较结果");
	const value = JSON.parse(text$1);
	if (value.mode !== expected.mode || value.target !== expected.target || !validComparisonDetail(value, value)) throw new Error("场景对比文件格式不匹配");
	return value;
}

//#endregion
//#region src/client/ExplanationDataTable.tsx
function explanationRecords(data) {
	if (data.comparison) return data.comparison.records.map((r, i) => ({
		key: `${i}:${r.source}:${r.target}`,
		row: void 0,
		values: [
			data.labels?.[r.source] ?? r.source,
			r.source,
			data.labels?.[r.target] ?? r.target,
			r.target,
			String(r.left_weight),
			String(r.right_weight),
			r.left_present && r.right_present ? "两组均达到显示阈值" : `仅${r.left_present ? data.comparison.left.label : data.comparison.right.label}达到显示阈值`
		]
	}));
	if (data.mode !== "local") return (data.edges ?? []).map((e, i) => ({
		key: `${i}:${e.source}:${e.target}`,
		row: void 0,
		values: [
			data.labels?.[e.source] ?? e.source,
			e.source,
			data.labels?.[e.target] ?? e.target,
			e.target,
			String(e.weight)
		]
	}));
	return (data.samples ?? []).flatMap((s) => (data.feature_names ?? []).map((name, index) => ({
		key: `${s.row_number}:${name}`,
		row: s.row_number,
		values: [
			sampleLabel(s, data),
			s.prediction === void 0 ? "—" : String(s.prediction),
			data.labels?.[name] ?? name,
			name,
			s.feature_values?.[index] === void 0 || s.feature_values[index] === null ? "—" : String(s.feature_values[index]),
			String(s.scores[index]),
			directionLabel(s.directions[index])
		]
	})));
}
function ExplanationDataTable({ data }) {
	const root = (0, react.useRef)(null), [query, setQuery] = (0, react.useState)(""), [page, setPage] = (0, react.useState)(0);
	const records = (0, react.useMemo)(() => explanationRecords(data), [data]);
	const filtered = (0, react.useMemo)(() => {
		const term = query.trim().toLocaleLowerCase();
		return term ? records.filter((r) => r.values.some((v) => v.toLocaleLowerCase().includes(term))) : records;
	}, [records, query]);
	const size = 25, pages = Math.max(1, Math.ceil(filtered.length / size)), current = Math.min(page, pages - 1);
	(0, react.useEffect)(() => {
		const element = root.current;
		const input = (event) => {
			if (event.target.matches("[data-lx-raw-search]")) {
				setQuery(event.target.value);
				setPage(0);
			}
		};
		const click = (event) => {
			const action = event.target.closest("[data-lx-raw-page]")?.dataset.lxRawPage;
			if (action) setPage((p) => Math.min(pages - 1, Math.max(0, p + (action === "next" ? 1 : -1))));
		};
		element?.addEventListener("input", input);
		element?.addEventListener("click", click);
		return () => {
			element?.removeEventListener("input", input);
			element?.removeEventListener("click", click);
		};
	}, [pages]);
	const headings = data.comparison ? [
		"起点",
		"起点字段",
		"终点",
		"终点字段",
		data.comparison.left.label,
		data.comparison.right.label,
		"显示情况"
	] : data.mode === "local" ? [
		data.task_type === "timeseries" ? "预测步 / 时间" : "原始行",
		explanationPrediction(data).label,
		"影响因子",
		"字段名",
		"特征原值",
		"贡献分数",
		"方向"
	] : [
		"起点",
		"起点字段",
		"终点",
		"终点字段",
		"关系分数"
	];
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: root,
		className: "lx-raw",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-raw-toolbar",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					"data-lx-raw-search": true,
					value: query,
					onChange: () => {},
					"aria-label": "检索解释数据",
					placeholder: "检索行号、字段或数值"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
					filtered.length,
					" / ",
					records.length,
					" 条记录"
				] })]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-raw-scroll",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: "lx-raw-table",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: headings.map((h) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: h }, h)) }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: filtered.slice(current * size, (current + 1) * size).map((record) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: record.values.map((v, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: i === 0 && record.row !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						"data-lx-batch": "row",
						"data-row": record.row,
						children: [v, " ↗"]
					}) : v }, i)) }, record.key)) })]
				})
			}),
			!filtered.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "lx-explain-foot",
				children: "没有符合条件的数据。"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-heatmap-footer",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
					"展示 ",
					filtered.length ? current * size + 1 : 0,
					"–",
					Math.min((current + 1) * size, filtered.length),
					" 条"
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-lx-raw-page": "previous",
						"aria-label": "上一页原始数据",
						disabled: current === 0,
						children: "←"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						current + 1,
						" / ",
						pages
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-lx-raw-page": "next",
						"aria-label": "下一页原始数据",
						disabled: current === pages - 1,
						children: "→"
					})
				] })]
			})
		]
	});
}

//#endregion
//#region src/client/PredictionCheck.tsx
function PredictionCheck({ data }) {
	const prediction = explanationPrediction(data);
	const samples = data.samples ?? [{
		row_number: data.row_number ?? 1,
		step: data.step,
		timestamp: data.timestamp,
		prediction: data.prediction,
		prior_prediction: data.prior_prediction,
		prediction_delta: data.prediction_delta
	}];
	const format = (v) => typeof v === "number" ? number(v) : v === void 0 || v === null ? "未返回" : String(v);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		"aria-label": "预测值核对",
		style: { marginTop: 16 },
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
				style: { fontSize: 12 },
				children: "预测值核对"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "lx-explain-foot",
				style: { margin: "6px 0" },
				children: prediction.comparable ? "贡献图对应解释接口本次计算的结果；原预测用于核对。" : "解释模型输出的尺度尚未核实，不与业务预测值比较。"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-raw-scroll",
				style: { maxHeight: 240 },
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: "lx-raw-table",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "样本" }),
						prediction.comparable && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("th", { children: ["原预测", prediction.unit && `（${prediction.unit}）`] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("th", { children: [prediction.label, prediction.unit && `（${prediction.unit}）`] }),
						prediction.comparable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: data.task_type === "classification" ? "类别核对" : "与原预测相差" })
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: samples.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: sampleLabel(s, data) }),
						prediction.comparable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: format(s.prior_prediction) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: format(s.prediction) }),
						prediction.comparable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: data.task_type === "classification" ? s.prior_prediction === void 0 || s.prediction === void 0 ? "无法核对" : String(s.prior_prediction) === String(s.prediction) ? "一致" : `重算类别 ${s.prior_prediction} → ${s.prediction}` : typeof s.prediction_delta === "number" ? `${s.prediction_delta > 0 ? "+" : ""}${number(s.prediction_delta)} ${prediction.unit}` : "未返回" })
					] }, s.row_number)) })]
				})
			})
		]
	});
}

//#endregion
//#region src/client/contribution-matrix.ts
function contributionMatrix(data) {
	const samples = data.samples ?? [], names = data.feature_names ?? [];
	const maximum = samples.reduce((m, s) => s.scores.reduce((n, v) => Math.max(n, Math.abs(v)), m), 0);
	return {
		rows: samples.map((sample, sampleIndex) => ({
			sampleIndex,
			rowNumber: sample.row_number,
			cells: names.map((name, featureIndex) => ({
				name,
				featureIndex,
				score: sample.scores[featureIndex],
				direction: sample.directions[featureIndex]
			}))
		})),
		ranking: [...names.map((name, featureIndex) => {
			let signed$1 = 0, unknownCount = 0;
			for (const sample of samples) {
				const magnitude = Math.abs(sample.scores[featureIndex]), direction = sample.directions[featureIndex];
				if (knownDirection(direction)) signed$1 += magnitude * direction;
				else if (magnitude !== 0) unknownCount++;
			}
			return {
				name,
				featureIndex,
				label: data.labels?.[name] ?? name,
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
		maximum: Math.max(0, ...matrices.map((m) => m.maximum)),
		meanMaximum: Math.max(0, ...matrices.flatMap((m) => m.ranking.map((f) => Math.abs(f.mean ?? 0))))
	};
}

//#endregion
//#region src/client/ExplanationInsight.tsx
function ExplanationInsight({ data }) {
	const value = data.samples ? data : singleSampleMatrix(data), count = value.samples?.length ?? 0;
	const top = contributionMatrix(value).ranking.filter((f) => f.mean !== null && f.mean !== 0).slice(0, 3);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
		className: "lx-insight",
		children: [!count ? "当前筛选没有样本，请调整条件。" : top.length ? `在当前 ${count} 个样本中，${count === 1 ? "贡献" : "平均贡献"}较突出的因素是${top.map((f) => f.label).join("、")}。${count > 1 ? "先看整体分布，再点击样本查看差异。" : "下方展示各因素在本次预测中的贡献。"}` : "当前贡献没有可汇总的非零已知方向，请查看原始数据与方向说明。", data.task_type === "classification" ? " 分类方向未绑定具体类别，不代表某一类别概率变化。" : ""]
	});
}
function predictionGroups(data) {
	if (data.task_type === "classification" || data.task_type === "timeseries") return null;
	const samples = data.samples ?? [], prior = samples.length > 0 && samples.every((s) => typeof s.prior_prediction === "number" && Number.isFinite(s.prior_prediction));
	const values = samples.map((s) => prior ? s.prior_prediction : s.prediction);
	if (values.length < 2 || !values.every((v) => typeof v === "number" && Number.isFinite(v))) return null;
	const sorted = values.slice().sort((a, b) => a - b), mid = Math.floor(sorted.length / 2), median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
	return {
		median,
		label: prior ? "原预测" : "解释时预测",
		low: {
			...data,
			samples: samples.filter((_, i) => values[i] < median)
		},
		high: {
			...data,
			samples: samples.filter((_, i) => values[i] >= median)
		}
	};
}
function GroupInsight({ low, high }) {
	const left = contributionMatrix(low).ranking, right = contributionMatrix(high).ranking;
	const changes = left.flatMap((a) => {
		const b = right.find((b$1) => b$1.name === a.name);
		return a.mean !== null && b?.mean != null ? [{
			label: a.label,
			delta: b.mean - a.mean
		}] : [];
	}).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).filter((x) => x.delta !== 0).slice(0, 3);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
		className: "lx-insight",
		children: [
			"低预测组 ",
			low.samples?.length ?? 0,
			" 条，高预测组 ",
			high.samples?.length ?? 0,
			" 条。",
			changes.length ? `高组减低组的平均贡献差异较大的是${changes.map((x) => `${x.label}（${x.delta > 0 ? "+" : ""}${number(x.delta)}）`).join("、")}。` : "当前两组没有可比较的非零平均贡献差异。",
			"下方共用色阶和数值轴。"
		]
	});
}

//#endregion
//#region src/client/LocalExplanation.tsx
function LocalExplanation({ data, controls }) {
	const root = (0, react.useRef)(null), [expanded, setExpanded] = (0, react.useState)(false);
	(0, react.useEffect)(() => {
		const element = root.current;
		const click = (event) => {
			if (event.target.closest("[data-lx-local-toggle]")) setExpanded((v) => !v);
		};
		element?.addEventListener("click", click);
		return () => element?.removeEventListener("click", click);
	}, []);
	const factors = (data.features ?? []).filter((f) => Number.isFinite(f.score)).sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
	const maximum = Math.max(...factors.map((f) => Math.abs(f.score)), 1e-5);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: root,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-explain-head lx-local-head",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "lx-local-heading",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "主要影响因素" })
				}), controls ?? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "lx-explain-label",
					children: sampleLabel({
						row_number: data.row_number ?? 1,
						step: data.step,
						timestamp: data.timestamp
					}, data)
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `
.lx-local-head{align-items:center;margin-top:16px;margin-bottom:12px}.lx-local-heading{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}.lx-local-summary-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px}.lx-local-summary-right .lx-explain-diff{max-width:none}.lx-local-summary-right:empty{display:none}@container(max-width:420px){.lx-local-summary-right{align-items:flex-start;margin-top:12px}}
.lx-tornado{width:100%;max-width:1050px;margin:0 auto}.lx-tornado-row,.lx-tornado-axis-row{display:grid;grid-template-columns:minmax(95px,150px) minmax(100px,1fr) 85px;gap:18px;align-items:center;min-height:34px}.lx-tornado-name{font-size:12px;overflow-wrap:anywhere}.lx-tornado-name small{color:var(--dsw-alias-label-secondary);margin-left:6px;font-size:10px}.lx-tornado-track{height:34px;position:relative}.lx-tornado-track:before{content:'';position:absolute;left:50%;height:100%;border-left:1px solid var(--dsw-alias-border-primary,#ddd)}.lx-tornado-bar{position:absolute;top:12px;height:10px;border-radius:2px}.lx-tornado-score{text-align:right;font-size:12px;font-variant-numeric:tabular-nums}.lx-tornado-axis{display:flex;justify-content:space-between;color:var(--dsw-alias-label-secondary);font-size:11px}.lx-tornado:not([data-expanded=true]) .lx-tornado-row:nth-child(n+7){display:none}.lx-fullscreen-dialog[open] .lx-tornado .lx-tornado-row:nth-child(n){display:grid}.lx-fullscreen-dialog[open] .lx-local-expand{display:none}.lx-tornado-toggle{max-width:1050px;margin:8px auto}.lx-tornado-row:last-child{margin-bottom:0}@container(max-width:520px){.lx-tornado-row{grid-template-columns:85px minmax(80px,1fr) 65px;gap:8px}}
` }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-tornado",
				"data-expanded": expanded,
				"aria-label": "单条样本正负贡献图",
				children: [factors.map((f) => {
					const known = f.direction === 1 || f.direction === -1 || f.direction === 0;
					const value = f.direction === 0 ? 0 : Math.abs(f.score) * (f.direction === -1 ? -1 : 1);
					const width = known ? Math.abs(value) / maximum * 50 : 0;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "lx-tornado-row",
						title: `${f.label} · ${f.name}：${number(f.score)} · ${directionLabel(f.direction)}`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "lx-tornado-name",
								children: [f.label, f.label !== f.name && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: f.name })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "lx-tornado-track",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "lx-tornado-bar",
									"data-direction": f.direction,
									style: {
										left: `${value < 0 ? 50 - width : 50}%`,
										width: `${width}%`,
										background: value < 0 ? "#4168a9" : "#248575"
									}
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "lx-tornado-score",
								children: known ? `${value > 0 ? "+" : ""}${number(value)}` : `${number(f.score)} · 方向未定`
							})
						]
					}, f.name);
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-tornado-axis-row",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "lx-tornado-axis",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "负向" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "0" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "正向" })
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
					]
				})]
			}),
			factors.length > 6 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "lx-explain-toggle lx-local-expand",
				"data-lx-local-toggle": true,
				"aria-expanded": expanded,
				children: expanded ? "收起因素 ↑" : `查看全部 ${factors.length} 个因素 ↓`
			})
		]
	});
}

//#endregion
//#region src/client/graph-layout.ts
function graphLayout(nodes, edges, aspect = 2) {
	const adjacency = new Map(nodes.map((n) => [n, edges.filter((e) => e.source === n).map((e) => e.target)]));
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
	nodes.forEach((n) => {
		if (!indices.has(n)) visit(n);
	});
	const membership = /* @__PURE__ */ new Map();
	groups.forEach((g, i) => g.forEach((n) => membership.set(n, i)));
	const levels = /* @__PURE__ */ new Map();
	const level = (g) => {
		if (levels.has(g)) return levels.get(g);
		const parents = edges.filter((e) => membership.get(e.target) === g && membership.get(e.source) !== g).map((e) => membership.get(e.source));
		const value = parents.length ? 1 + Math.max(...parents.map(level)) : 0;
		levels.set(g, value);
		return value;
	};
	const isolated = nodes.filter((n) => !edges.some((e) => e.source === n || e.target === n));
	const columns = /* @__PURE__ */ new Map();
	for (const node of nodes.filter((n) => !isolated.includes(n))) {
		const l = Math.min(3, level(membership.get(node)));
		columns.set(l, [...columns.get(l) ?? [], node]);
	}
	const layers = [...columns.entries()].sort(([a], [b]) => a - b).map(([, group]) => group);
	for (let pass = 0; pass < 4; pass++) {
		const forward = pass % 2 === 0;
		const order = forward ? layers.map((_, i) => i) : layers.map((_, i) => layers.length - 1 - i);
		for (const i of order) {
			const neighbor = layers[i + (forward ? -1 : 1)];
			if (!neighbor) continue;
			const score = (n) => {
				const linked = neighbor.map((m, j) => edges.some((e) => e.source === n && e.target === m || e.source === m && e.target === n) ? j : -1).filter((j) => j >= 0);
				return linked.length ? linked.reduce((a, b) => a + b, 0) / linked.length : layers[i].indexOf(n);
			};
			const scores = new Map(layers[i].map((n) => [n, score(n)]));
			layers[i].sort((a, b) => scores.get(a) - scores.get(b));
		}
	}
	const isolateColumns = isolated.length > 4 ? 2 : isolated.length ? 1 : 0;
	const height = Math.max(230, Math.max(0, ...layers.map((c) => c.length), Math.ceil(isolated.length / Math.max(1, isolateColumns))) * 62 + 40);
	const isolateWidth = isolateColumns ? isolateColumns * 154 + 36 : 0;
	const width = Math.max(620, layers.length * 260 + isolateWidth, height * Math.max(1.2, Math.min(1.9, aspect)));
	const mainWidth = width - isolateWidth;
	const positions = /* @__PURE__ */ new Map();
	layers.forEach((col, i) => col.forEach((n, j) => positions.set(n, [layers.length === 1 ? mainWidth / 2 : 85 + i * (mainWidth - 170) / (layers.length - 1), 20 + (j + .5) * (height - 40) / col.length])));
	isolated.forEach((n, i) => positions.set(n, [mainWidth + 100 + i % isolateColumns * 154, 55 + Math.floor(i / isolateColumns) * 70]));
	return {
		positions,
		width,
		height,
		isolated,
		cycles: groups.filter((g) => g.length > 1 || edges.some((e) => e.source === g[0] && e.target === g[0]))
	};
}

//#endregion
//#region src/client/explanation-export.ts
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
const text = (x, y, value, size = 13, attrs = "") => `<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${escape(value)}</text>`;
const start = (width, height, theme, title) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${escape(title)}</title><rect width="100%" height="100%" fill="${theme.background}"/><g fill="${theme.foreground}" font-family="system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif">`;
const end = "</g></svg>";
const short = (s) => Array.from(s).length > 24 ? Array.from(s).slice(0, 12).join("") + "…" + Array.from(s).slice(-10).join("") : s;
const signed = (v) => v === null ? "方向未定" : `${v > 0 ? "+" : ""}${number(v)}`;
function contributionExportSvg(data, filtered, description = "", theme = defaultExportTheme, groupTitles) {
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
	if (groupTitles && filtered) groups.forEach((group, i) => {
		group.title = `${groupTitles[i]} · ${group.data.samples?.length ?? 0} 个样本`;
	});
	const plotWidth = Math.max(700, (data.feature_names?.length ?? 1) * 32);
	const labelWidth = Math.min(250, Math.max(100, ...(data.feature_names ?? []).map((n) => (data.labels?.[n] ?? n).length * 10)));
	const width = 80 + plotWidth + 64 + labelWidth + 20 + 290 + 110;
	const plotHeight = Math.max(330, Math.min(600, (data.samples?.length ?? 1) * 4));
	const rankHeight = Math.max(plotHeight, (data.feature_names?.length ?? 1) * 28);
	const sectionHeight = Math.max(plotHeight + 180, rankHeight + 40) + 100, height = 110 + groups.length * sectionHeight + 50;
	const scales = contributionScales(data, ...filtered ? [filtered] : []), title = `预测解释 · ${data.target_label ?? data.target}`;
	let svg = start(width, height, theme, title) + text(36, 38, title, 23, "font-weight=\"600\"") + text(36, 67, description || "全部已解释样本", 13);
	const timed = data.samples?.filter((s) => s.timestamp);
	if (timed?.length) svg += text(36, 88, `预测时间 ${timed[0].timestamp} — ${timed[timed.length - 1].timestamp}`, 11);
	svg += `<defs><linearGradient id="contribution-scale"><stop stop-color="${contributionColors.negative}"/><stop offset=".5" stop-color="${theme.background}"/><stop offset="1" stop-color="${contributionColors.positive}"/></linearGradient></defs>`;
	groups.forEach((group, groupIndex) => {
		const matrix = contributionMatrix(group.data), samples = group.data.samples ?? [], names = group.data.feature_names ?? [];
		const top = 110 + groupIndex * sectionHeight, x = 80, y = top + 58, rowHeight = plotHeight / Math.max(samples.length, 1), columnWidth = plotWidth / Math.max(names.length, 1);
		const barLabel = x + plotWidth + 64, barZero = barLabel + labelWidth + 20 + 145, barHalf = 145;
		svg += text(36, top + 16, group.title, 17, "font-weight=\"600\"") + text(x, top + 43, "影响因子热力图", 13) + text(barLabel, top + 43, "各影响因子影响分数对比", 13);
		svg += `<rect x="${x + plotWidth - 220}" y="${top + 7}" width="220" height="8" fill="url(#contribution-scale)"/>` + text(x + plotWidth - 220, top + 32, `−${number(scales.maximum)}`, 11) + text(x + plotWidth - 110, top + 32, "0", 11, "text-anchor=\"middle\"") + text(x + plotWidth, top + 32, `+${number(scales.maximum)}`, 11, "text-anchor=\"end\"");
		if (!samples.length) svg += text(x, y + 40, "没有符合条件的样本");
		matrix.rows.forEach((row) => row.cells.forEach((cell) => {
			const color = contributionColor(cell.direction);
			const alpha = scales.maximum ? Math.min(1, Math.abs(cell.score) / scales.maximum) : 0;
			svg += `<rect x="${x + cell.featureIndex * columnWidth}" y="${y + row.sampleIndex * rowHeight}" width="${columnWidth}" height="${rowHeight}" fill="${color}" fill-opacity="${alpha}"><title>${escape(`${sampleLabel(samples[row.sampleIndex], data)} · ${data.labels?.[cell.name] ?? cell.name} · ${cell.score} · ${directionLabel(cell.direction)}`)}</title></rect>`;
		}));
		[...new Set([
			0,
			.25,
			.5,
			.75,
			1
		].map((t) => Math.round(t * (samples.length - 1))))].filter((i) => i >= 0 && i < samples.length).forEach((i) => {
			svg += text(x - 12, y + (i + .5) * rowHeight + 4, samples[i].step ?? samples[i].row_number, 11, "text-anchor=\"end\"");
		});
		svg += text(36, y - 8, data.task_type === "timeseries" ? "预测步" : "原始行", 11);
		names.forEach((name, i) => {
			const label = data.labels?.[name] ?? name;
			svg += `<g transform="translate(${x + (i + .5) * columnWidth} ${y + plotHeight + 16}) rotate(55)"><title>${escape(label + " · " + name)}</title>` + text(0, 0, short(label), 12) + "</g>";
		});
		svg += `<line x1="${barZero}" x2="${barZero}" y1="${y}" y2="${y + rankHeight}" stroke="${theme.border}"/>`;
		matrix.ranking.forEach((feature, i) => {
			const cy = y + (i + .5) * rankHeight / Math.max(names.length, 1), v = feature.mean;
			const barWidth = v === null || !scales.meanMaximum ? 0 : Math.abs(v) / scales.meanMaximum * barHalf;
			svg += `<g><title>${escape(feature.label + " · " + feature.name)}</title>` + text(barLabel + labelWidth, cy - 1, short(feature.label), 12, "text-anchor=\"end\"") + (feature.label !== feature.name ? text(barLabel + labelWidth, cy + 13, short(feature.name), 10, "text-anchor=\"end\" opacity=\".6\"") : "");
			if (v !== null) svg += `<rect x="${v < 0 ? barZero - barWidth : barZero}" y="${cy - 5}" width="${barWidth}" height="10" fill="${v < 0 ? contributionColors.negative : contributionColors.positive}"/>`;
			svg += text(width - 30, cy + 4, signed(v), 12, "text-anchor=\"end\"") + "</g>";
		});
		svg += text(barZero - barHalf, y + rankHeight + 20, `−${number(scales.meanMaximum)}`, 11, "text-anchor=\"middle\"") + text(barZero, y + rankHeight + 20, "0", 11, "text-anchor=\"middle\"") + text(barZero + barHalf, y + rankHeight + 20, `+${number(scales.meanMaximum)}`, 11, "text-anchor=\"middle\"");
	});
	svg += text(36, height - 36, "蓝色负向 · 绿色正向 · 灰蓝中性 · 灰色方向未定；中性按 0 计入均值，正负会抵消。", 12);
	return svg + end;
}
function singleContributionExportSvg(data, theme = defaultExportTheme) {
	const factors = (data.features ?? []).filter((f) => Number.isFinite(f.score)).sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
	const maximum = Math.max(...factors.map((f) => Math.abs(f.score)), 1e-5);
	const width = 1e3, height = 160 + factors.length * 34, zero = 570, half = 270;
	const title = `单条解释 · ${data.target_label ?? data.target}`;
	let svg = start(width, height, theme, title) + text(36, 38, title, 22, "font-weight=\"600\"");
	svg += text(36, 68, sampleLabel({
		row_number: data.row_number ?? 1,
		step: data.step,
		timestamp: data.timestamp
	}, data));
	svg += `<line x1="${zero}" x2="${zero}" y1="90" y2="${90 + factors.length * 34}" stroke="${theme.border}"/>`;
	factors.forEach((factor, i) => {
		const y = 110 + i * 34, known = [
			-1,
			0,
			1
		].includes(factor.direction);
		const value = factor.direction === 0 ? 0 : Math.abs(factor.score) * (factor.direction === -1 ? -1 : 1);
		const w = known ? Math.abs(value) / maximum * half : 0;
		svg += `<g><title>${escape(`${factor.label} · ${factor.name}`)}</title>` + text(36, y, short(factor.label || factor.name));
		svg += `<rect x="${value < 0 ? zero - w : zero}" y="${y - 9}" width="${w}" height="10" fill="${value < 0 ? contributionColors.negative : contributionColors.positive}"/>`;
		svg += text(964, y, known ? signed(value) : `${number(factor.score)} · 方向未定`, 12, "text-anchor=\"end\"") + "</g>";
	});
	return svg + text(zero - half, height - 32, "负向", 12) + text(zero, height - 32, "0", 12, "text-anchor=\"middle\"") + text(zero + half, height - 32, "正向", 12, "text-anchor=\"end\"") + end;
}
function graphExportSvg(data, theme = defaultExportTheme, scope = "完整网络") {
	const nodes = data.nodes ?? [], edges = data.edges ?? [], layout = graphLayout(nodes, edges), width = Math.max(800, layout.width + 72), height = layout.height + 160;
	const label = (name) => data.labels?.[name] ?? name;
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
	nodes.forEach((name) => {
		const [x, y] = layout.positions.get(name);
		svg += `<rect x="${x - 68}" y="${y - 22}" width="136" height="44" rx="5" fill="${theme.background}" stroke="${name === data.target ? "#7793c3" : theme.border}"/>` + text(x, y - 2, label(name), 12, "text-anchor=\"middle\"") + text(x, y + 14, name, 10, "text-anchor=\"middle\" opacity=\".65\"");
	});
	return svg + "</g>" + text(36, height - 22, "连线表示模型发现的关系，数值为关系分数。", 12) + end;
}

//#endregion
//#region src/client/ExplanationExport.tsx
function themeAt(element) {
	const probe = document.createElement("span");
	probe.style.cssText = "position:absolute;visibility:hidden;color:var(--dsw-alias-label-primary,#202734);background:var(--dsw-alias-background-primary,#fff);border-color:var(--dsw-alias-border-l3,#dce2eb)";
	element.append(probe);
	const style = getComputedStyle(probe), colors$1 = [
		style.backgroundColor,
		style.color,
		style.borderTopColor
	];
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = 1;
	const context = canvas.getContext("2d");
	const resolve = (color, fallback) => {
		if (!context) return fallback;
		context.clearRect(0, 0, 1, 1);
		context.fillStyle = color;
		context.fillRect(0, 0, 1, 1);
		const rgba = context.getImageData(0, 0, 1, 1).data;
		return rgba[3] ? `#${[...rgba].slice(0, 3).map((v) => v.toString(16).padStart(2, "0")).join("")}` : fallback;
	};
	const theme = {
		background: resolve(colors$1[0], defaultExportTheme.background),
		foreground: resolve(colors$1[1], defaultExportTheme.foreground),
		border: resolve(colors$1[2], defaultExportTheme.border)
	};
	probe.remove();
	return theme;
}
async function png(svg) {
	const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
	try {
		const image = new Image();
		await new Promise((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(/* @__PURE__ */ new Error("图片转换失败，可下载 SVG"));
			image.src = url;
		});
		const scale = Math.min(2, Math.sqrt(16e6 / (image.width * image.height))), canvas = document.createElement("canvas");
		canvas.width = Math.ceil(image.width * scale);
		canvas.height = Math.ceil(image.height * scale);
		const context = canvas.getContext("2d");
		if (!context) throw new Error("浏览器无法导出 PNG，可下载 SVG");
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(/* @__PURE__ */ new Error("PNG 导出失败")), "image/png"));
	} finally {
		URL.revokeObjectURL(url);
	}
}
function ExplanationExport({ build, filename, menuLabel = "导出图表", children }) {
	const root = (0, react.useRef)(null), busyRef = (0, react.useRef)(false), [status, setStatus] = (0, react.useState)("");
	(0, react.useEffect)(() => {
		const element = root.current;
		const click = async (event) => {
			const format = event.target.closest("[data-lx-export]")?.dataset.lxExport;
			if (!format || !element || busyRef.current) return;
			busyRef.current = true;
			setStatus("正在导出…");
			try {
				const svg = build(themeAt(element)), blob = format === "png" ? await png(svg) : new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
				const url = URL.createObjectURL(blob), anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = `${filename.replace(/[^\p{L}\p{N}_-]/gu, "-").slice(0, 100)}.${format}`;
				document.body.append(anchor);
				anchor.click();
				anchor.remove();
				setTimeout(() => URL.revokeObjectURL(url), 1e4);
				setStatus("已导出");
			} catch (error) {
				setStatus(error instanceof Error ? error.message : "导出失败，请重试");
			} finally {
				busyRef.current = false;
			}
		};
		element?.addEventListener("click", click);
		return () => element?.removeEventListener("click", click);
	}, [build, filename]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "lx-export",
		ref: root,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ActionMenu, {
			label: menuLabel,
			children: [
				children,
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-export": "svg",
					"aria-label": "导出 SVG 图表",
					children: "SVG"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-export": "png",
					"aria-label": "导出 PNG 图表",
					children: "PNG"
				})
			]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			role: "status",
			className: "lx-export-status",
			children: status
		})]
	});
}

//#endregion
//#region src/client/ExplanationSingle.tsx
function ExplanationSingle({ data, showPredictionCheck = false }) {
	const root = (0, react.useRef)(null), [view, setView] = (0, react.useState)("visual");
	const matrix = (0, react.useMemo)(() => singleSampleMatrix(data), [data]);
	(0, react.useEffect)(() => {
		const element = root.current;
		const click = (event) => {
			const target = event.target, tab = target.closest("[data-lx-single-view]")?.dataset.lxSingleView;
			if (tab) setView(tab);
			if (target.closest("[data-lx-batch=\"row\"]")) setView("visual");
		};
		element?.addEventListener("click", click);
		return () => element?.removeEventListener("click", click);
	}, []);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: root,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationInsight, { data: matrix }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-analysis-toolbar",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-plot-tabs",
					"aria-label": "解释数据视图",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-lx-single-view": "visual",
						"aria-pressed": view === "visual",
						children: "可视化"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-lx-single-view": "raw",
						"aria-pressed": view === "raw",
						children: "原始数据"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationExport, {
					filename: `${data.target}-单样本解释`,
					build: (theme) => singleContributionExportSvg(data, theme)
				})]
			}),
			showPredictionCheck && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PredictionCheck, { data }),
			view === "visual" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LocalExplanation, { data }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationDataTable, { data: matrix })
		]
	});
}

//#endregion
//#region src/client/ContributionLegend.tsx
function ContributionLegend({ maximum, unknown, neutral = false, vertical = false }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "lx-contribution-legend",
		"aria-label": "贡献色阶：蓝色负向，绿色正向，深色贡献大",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `
      .lx-contribution-legend{width:218px;max-width:100%;flex-shrink:0;font-size:10px;color:var(--dsw-alias-label-secondary)}
      .lx-contribution-scale-labels{display:flex;justify-content:space-between;gap:8px;font-variant-numeric:tabular-nums;margin-bottom:5px}
      .lx-contribution-scale{height:7px;border-radius:2px}
      .lx-contribution-unknown{display:flex;align-items:center;justify-content:flex-end;gap:5px;margin-top:5px}.lx-contribution-unknown i{width:7px;height:7px;border-radius:50%}
    ` }),
			maximum > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-contribution-scale-labels",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"aria-label": `负向 −${number(maximum)}`,
						children: vertical ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							"负向",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
							"−",
							number(maximum)
						] }) : `负向 −${number(maximum)}`
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "0" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: vertical ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						"正向",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						"+",
						number(maximum)
					] }) : `+${number(maximum)} 正向` })
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-contribution-scale",
				role: "img",
				"aria-label": `负向 ${number(maximum)} 到正向 ${number(maximum)}；深浅表示贡献绝对值`,
				style: { background: `linear-gradient(to right, ${contributionFill(maximum, -1, maximum)}, ${contributionBase} 50%, ${contributionFill(maximum, 1, maximum)})` }
			})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "贡献均为 0" }),
			neutral && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "lx-contribution-unknown",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: contributionColors.neutral } }), "灰蓝：中性"]
			}),
			unknown && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "lx-contribution-unknown",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: contributionColors.unknown } }), "灰色：方向未定"]
			})
		]
	});
}

//#endregion
//#region src/client/ExplanationHelp.tsx
function useExplanationHelp(enabled = true) {
	const helpRef = (0, react.useRef)(null), helpId = (0, react.useId)(), [helpOpen, setHelpOpen] = (0, react.useState)(false);
	(0, react.useEffect)(() => {
		const group = helpRef.current, trigger = group?.querySelector("[data-lx-help-trigger]");
		if (!enabled || !group || !trigger) return;
		const doc = group.ownerDocument;
		let pinned = false, visible = false;
		const show = (next) => {
			visible = next;
			setHelpOpen(next);
		};
		const close = () => {
			pinned = false;
			show(false);
		};
		const enter = () => show(true);
		const leave = () => {
			if (!pinned && !group.contains(doc.activeElement)) show(false);
		};
		const blur = (event) => {
			if (!pinned && !group.contains(event.relatedTarget)) show(false);
		};
		const click = (event) => {
			event.stopPropagation();
			pinned = !pinned;
			show(pinned);
		};
		const activate = (event) => {
			const key = event.key;
			if (key === "Enter" || key === " ") {
				event.preventDefault();
				click(event);
			}
		};
		const outside = (event) => {
			if (!group.contains(event.target)) close();
		};
		const escape$1 = (event) => {
			if (visible && event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				close();
			}
		};
		group.addEventListener("pointerenter", enter);
		group.addEventListener("pointerleave", leave);
		group.addEventListener("focusin", enter);
		group.addEventListener("focusout", blur);
		trigger.addEventListener("click", click);
		trigger.addEventListener("keydown", activate);
		doc.addEventListener("pointerdown", outside, true);
		doc.addEventListener("keydown", escape$1, true);
		return () => {
			group.removeEventListener("pointerenter", enter);
			group.removeEventListener("pointerleave", leave);
			group.removeEventListener("focusin", enter);
			group.removeEventListener("focusout", blur);
			trigger.removeEventListener("click", click);
			trigger.removeEventListener("keydown", activate);
			doc.removeEventListener("pointerdown", outside, true);
			doc.removeEventListener("keydown", escape$1, true);
		};
	}, [enabled]);
	return {
		helpRef,
		helpId,
		helpOpen
	};
}
function ExplanationHelp({ label, children }) {
	const { helpRef, helpId, helpOpen } = useExplanationHelp();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: helpRef,
		className: "lx-explain-help",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
			type: "button",
			className: "lx-explain-help-trigger",
			"data-lx-help-trigger": true,
			"aria-label": label,
			"aria-expanded": helpOpen,
			"aria-controls": helpId,
			"aria-describedby": helpOpen ? helpId : void 0,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: "14",
				height: "14",
				viewBox: "0 0 20 20",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.3",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "10",
						cy: "10",
						r: "8"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10 9v5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "10",
						cy: "6",
						r: ".65",
						fill: "currentColor",
						stroke: "none"
					})
				]
			})
		}), helpOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "lx-explain-info-body",
			id: helpId,
			role: "tooltip",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: label }), children]
		})]
	});
}

//#endregion
//#region src/client/ContributionHeatmap.tsx
const CSS$4 = `
.lx-middle-legend .lx-contribution-legend{width:90px;position:relative;padding-top:26px}.lx-middle-legend .lx-contribution-scale{width:10px;height:175px;margin-left:4px;background:linear-gradient(to top,#4168a9,#fff 50%,#248575)!important}.lx-middle-legend .lx-contribution-scale-labels{display:flex;position:absolute;left:20px;top:26px;height:175px;flex-direction:column-reverse;font-size:8px;gap:0}.lx-middle-legend .lx-contribution-scale-labels>span{white-space:nowrap;display:block;line-height:1.5}.lx-middle-legend .lx-contribution-unknown{justify-content:flex-start;font-size:8px}.lx-cell-popover{position:absolute;z-index:8;width:250px;padding:14px;border:1px solid var(--dsw-alias-border-primary,#dce1e8);border-radius:8px;background:var(--dsw-alias-background-primary,#fff);box-shadow:0 4px 20px #0002;font-size:12px;line-height:1.7}.lx-cell-popover p{margin:7px 0}.lx-cell-popover dl{display:grid;grid-template-columns:auto 1fr;gap:5px 14px;margin:10px 0}.lx-cell-popover dt{color:var(--dsw-alias-label-secondary)}.lx-cell-popover dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}.lx-cell-actions{display:flex;justify-content:flex-end;margin-top:10px}.lx-cell-popover button{color:var(--dsw-alias-state-business-primary,#3465ce)}.lx-cell-close{float:right}.lx-matrix-display{position:relative;font-size:11px;color:var(--dsw-alias-label-secondary);margin:0}.lx-matrix-display>.lx-plot-tabs{position:absolute;right:0;top:24px;z-index:4;white-space:nowrap;background:var(--dsw-alias-background-primary,#fff);padding:10px;border:1px solid var(--dsw-alias-border-primary,#ddd);border-radius:6px}.lx-matrix-display summary{cursor:pointer}
.lx-matrix-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:11px;color:var(--dsw-alias-label-secondary);margin:2px 0 14px}
.lx-matrix-scroll{overflow-x:auto}.lx-matrix-scroll>.lx-matrix-svg{display:block;width:100%;height:auto;min-width:650px;max-height:430px;color:var(--dsw-alias-label-primary)}
.lx-matrix-svg text{fill:currentColor;font-family:inherit;pointer-events:none}.lx-matrix-cell{cursor:pointer}.lx-matrix-cell:hover,.lx-matrix-cell:focus{outline:none;stroke:var(--dsw-alias-label-primary,#26364a);stroke-width:1;paint-order:fill stroke}
.lx-matrix-readout{font-size:11px;min-height:20px;margin:6px 0 0;color:var(--dsw-alias-label-secondary);line-height:1.6;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.lx-matrix-feature{cursor:help}.lx-matrix-feature:hover,.lx-matrix-feature:focus-visible{color:var(--dsw-alias-state-business-primary,#3465ce);outline:none}.lx-matrix-feature:focus-visible rect{stroke:currentColor;stroke-width:.7}
.lx-matrix-help-trigger{cursor:pointer;color:var(--dsw-alias-label-secondary)}.lx-matrix-help-trigger:hover,.lx-matrix-help-trigger:focus-visible,.lx-matrix-help-trigger[aria-expanded=true]{color:var(--dsw-alias-state-business-primary,#3465ce)}
.lx-matrix-help-trigger:focus-visible{outline:1px solid currentColor;outline-offset:1px;border-radius:3px}
.lx-matrix-help-body{box-sizing:border-box;margin:2px;padding:11px 13px;border:1px solid var(--dsw-alias-border-primary,#dfe3e8);border-radius:7px;background:var(--dsw-alias-background-primary,#fff);color:var(--dsw-alias-label-primary,#1c2330);box-shadow:0 3px 12px #00000012;font-family:inherit;font-size:11px;line-height:1.65}
.lx-matrix-help-body strong{display:block;margin-bottom:4px;font-size:11px}.lx-matrix-help-body p{margin:0;font-size:11px;line-height:1.65}
.lx-fullscreen-dialog[open] .lx-explain .lx-matrix-svg{max-height:max(260px,calc(100dvh - 470px))}
.lx-fullscreen-dialog[open] .lx-explain .lx-matrix-comparison .lx-matrix-svg{max-height:320px}
.lx-matrix-expanded .lx-matrix-svg,.lx-fullscreen-dialog[open] .lx-explain .lx-matrix-expanded .lx-matrix-svg{max-height:none}
.lx-matrix-expand{display:flex;justify-content:flex-end;margin-top:4px;font-size:11px}.lx-matrix-expand button{font-size:11px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important}
@container(max-width:520px){.lx-matrix-heading{align-items:flex-start;flex-direction:column}}
`;
const textWidth = (label) => Array.from(label).reduce((width, c) => width + (/[^\x00-\xff]/.test(c) ? 1 : .6), 0);
function shortLabel(label, limit) {
	if (textWidth(label) <= limit) return label;
	const characters = Array.from(label);
	let start$1 = "", end$1 = "", left = 0, right = characters.length - 1;
	while (left <= right) {
		const takeStart = textWidth(start$1) <= textWidth(end$1);
		const next = takeStart ? characters[left] : characters[right];
		if (textWidth(start$1 + end$1 + next) + 1 > limit) break;
		if (takeStart) {
			start$1 += next;
			left++;
		} else {
			end$1 = next + end$1;
			right--;
		}
	}
	return start$1 + "…" + end$1;
}
function ContributionHeatmap({ data, scope = "全部", scales }) {
	const root = (0, react.useRef)(null), [hint, setHint] = (0, react.useState)(""), [picked, setPicked] = (0, react.useState)(null), [expanded, setExpanded] = (0, react.useState)(false), [readable, setReadable] = (0, react.useState)(false);
	const matrix = (0, react.useMemo)(() => contributionMatrix(data), [data]);
	const samples = data.samples ?? [], names = data.feature_names ?? [];
	const { helpRef, helpId, helpOpen } = useExplanationHelp(!!samples.length && !!names.length);
	const plotHeight = expanded ? Math.max(312, names.length * 22) : 312, plotWidth = readable ? Math.max(548, names.length * 32) : 548, rowHeight = plotHeight / (samples.length || 1), columnWidth = plotWidth / (names.length || 1);
	const angledLabels = names.some((name) => textWidth(data.labels?.[name] ?? name) * 11 > columnWidth - 6);
	const axisFont = readable ? 11 : angledLabels ? Math.min(11, Math.max(7, columnWidth * .7)) : 11;
	const axisWidth = angledLabels ? 94 : Math.min(120, columnWidth - 6);
	const featureHint = (index) => {
		const name = names[index], label = data.labels?.[name];
		return `特征 ${index + 1} · ${label && label !== name ? `${label} · 字段：` : ""}${name}`;
	};
	const unknown = samples.some((s) => s.directions.some((d) => !knownDirection(d)));
	const neutral = samples.some((s) => s.directions.includes(0));
	const ranking = expanded ? matrix.ranking : matrix.ranking.slice(0, 16), maxMean = (scales?.meanMaximum ?? Math.abs(ranking[0]?.mean ?? 0)) || 1, maximum = scales?.maximum ?? matrix.maximum;
	const barStart = 720, barEnd = 838, barZero = (barStart + barEnd) / 2;
	const summaryHelp = "展示当前样本范围的平均贡献。每个样本的贡献按方向带上正负号，再求平均；正负会抵消。按平均值的绝对大小排序。" + (data.task_type === "classification" ? "分类任务的正负仅表示服务返回方向，不对应指定类别概率。" : "");
	const rowTicks = [...new Set([
		0,
		.25,
		.5,
		.75,
		1
	].map((t) => Math.round(t * (samples.length - 1))))];
	(0, react.useEffect)(() => {
		setHint("");
		setPicked(null);
	}, [data]);
	(0, react.useEffect)(() => {
		const element = root.current;
		const click = (event) => {
			if (event.target.closest("[data-lx-cell-close]")) setPicked(null);
			if (event.target.closest("[data-lx-matrix-expand]")) setExpanded((v) => !v);
			const mode = event.target.closest("[data-lx-matrix-size]")?.getAttribute("data-lx-matrix-size");
			if (mode) setReadable(mode === "readable");
		};
		element?.addEventListener("click", click);
		return () => element?.removeEventListener("click", click);
	}, [!!samples.length, !!names.length]);
	(0, react.useEffect)(() => {
		const element = root.current;
		const describe = (event) => {
			const target = event.target.closest("[data-lx-matrix-cell], [data-lx-feature-label]");
			if (target) {
				const text$1 = target.getAttribute("aria-label") ?? "";
				setHint(text$1);
				if (event.type === "click" && target.hasAttribute("data-lx-matrix-cell")) {
					const bounds = target.getBoundingClientRect(), container = element.getBoundingClientRect();
					setPicked({
						row: Number(target.getAttribute("data-row")),
						feature: Number(target.getAttribute("data-feature")),
						hint: text$1,
						x: Math.max(0, Math.min(container.width - 260, bounds.right - container.left + 10)),
						y: Math.max(0, bounds.top - container.top - 80)
					});
				}
			}
		};
		const keydown = (event) => {
			if (event.key === "Escape" && element?.querySelector(".lx-cell-popover")) {
				setPicked(null);
				event.stopPropagation();
				return;
			}
			const cell = event.target.closest("[data-lx-matrix-cell]");
			if (!cell) {
				if (["Enter", " "].includes(event.key) && event.target.closest("[data-lx-feature-label]")) {
					event.preventDefault();
					describe(event);
				}
				return;
			}
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
				return;
			}
			if (![
				"ArrowLeft",
				"ArrowRight",
				"ArrowUp",
				"ArrowDown",
				"Home",
				"End"
			].includes(event.key)) return;
			event.preventDefault();
			let row = Number(cell.dataset.index), column = Number(cell.dataset.feature);
			if (event.key === "ArrowLeft") column--;
			if (event.key === "ArrowRight") column++;
			if (event.key === "ArrowUp") row--;
			if (event.key === "ArrowDown") row++;
			if (event.key === "Home") column = 0;
			if (event.key === "End") column = names.length - 1;
			row = Math.max(0, Math.min(samples.length - 1, row));
			column = Math.max(0, Math.min(names.length - 1, column));
			const next = element?.querySelector(`[data-lx-matrix-cell][data-index="${row}"][data-feature="${column}"]`);
			cell.setAttribute("tabindex", "-1");
			next?.setAttribute("tabindex", "0");
			next?.focus();
		};
		element?.addEventListener("pointerover", describe);
		element?.addEventListener("focusin", describe);
		element?.addEventListener("click", describe);
		element?.addEventListener("keydown", keydown);
		return () => {
			element?.removeEventListener("pointerover", describe);
			element?.removeEventListener("focusin", describe);
			element?.removeEventListener("click", describe);
			element?.removeEventListener("keydown", keydown);
		};
	}, [samples.length, names.length]);
	const pickedSample = picked ? samples.find((s) => s.row_number === picked.row) : void 0;
	if (!samples.length || !names.length) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: root,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "lx-matrix-heading",
			children: [scope, " · 0 个样本"]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
			className: "lx-explain-foot",
			children: "没有可展示的样本贡献。"
		})]
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: root,
		style: { position: "relative" },
		className: expanded ? "lx-matrix-expanded" : void 0,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: CSS$4 }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-matrix-heading",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
					scope,
					" ",
					samples.length,
					" 个样本 · ",
					names.length,
					" 个特征"
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
					className: "lx-matrix-display",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "显示设置" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "lx-plot-tabs",
						"aria-label": "热力图显示尺寸",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-lx-matrix-size": "overview",
							"aria-pressed": !readable,
							children: "全部概览"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-lx-matrix-size": "readable",
							"aria-pressed": readable,
							children: "清晰细看"
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-matrix-scroll",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					className: "lx-matrix-svg",
					style: readable ? {
						minWidth: plotWidth + 452,
						maxHeight: "none"
					} : void 0,
					viewBox: `0 0 ${plotWidth + 452} ${plotHeight + (angledLabels ? 138 : 60)}`,
					role: "group",
					"aria-label": `${scope} ${samples.length} 个样本、${names.length} 个特征的贡献热力图，共 ${matrix.cellCount} 个色块`,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("foreignObject", {
							x: plotWidth + 65,
							y: 65,
							width: "95",
							height: "260",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "lx-middle-legend",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContributionLegend, {
									maximum,
									unknown,
									neutral,
									vertical: true
								})
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
							x: "36",
							y: "12",
							fontSize: "11",
							fontWeight: "500",
							children: "整体贡献分布"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
							x: "0",
							y: "25",
							fontSize: "10",
							opacity: ".6",
							children: data.task_type === "timeseries" ? "预测步" : "原始行"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
							transform: `translate(${plotWidth - 448} 0)`,
							role: "group",
							"aria-label": "各影响因子影响分数对比",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								x: "626",
								y: "12",
								fontSize: "11",
								fontWeight: "500",
								children: "各影响因子影响分数对比"
							})
						}),
						rowTicks.map((i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
							x: "25",
							y: 30 + (i + .5) * rowHeight + 3,
							textAnchor: "end",
							fontSize: "10",
							opacity: ".6",
							children: samples[i].row_number
						}, i)),
						matrix.rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: row.cells.map((cell) => {
							const sample = samples[row.sampleIndex], label = data.labels?.[cell.name] ?? cell.name;
							const hint$1 = `${sampleLabel(sample, data)} · ${label} ${cell.name} · 贡献 ${number(cell.score)} · ${directionLabel(cell.direction)}`;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								className: "lx-matrix-cell",
								x: 36 + cell.featureIndex * columnWidth,
								y: 30 + row.sampleIndex * rowHeight,
								width: Math.max(columnWidth - .7, columnWidth * .92),
								height: Math.max(rowHeight - Math.min(.45, rowHeight * .08), rowHeight * .92),
								fill: contributionFill(cell.score, cell.direction, maximum),
								role: "button",
								tabIndex: row.sampleIndex === 0 && cell.featureIndex === 0 ? 0 : -1,
								"data-lx-matrix-cell": true,
								"aria-pressed": picked?.row === row.rowNumber && picked?.feature === cell.featureIndex,
								stroke: picked?.row === row.rowNumber && picked?.feature === cell.featureIndex ? "currentColor" : void 0,
								strokeWidth: 1,
								"data-row": row.rowNumber,
								"data-index": row.sampleIndex,
								"data-feature": cell.featureIndex,
								"aria-label": hint$1,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: `${hint$1}；点击固定读数，方向键选择色块` })
							}, cell.name);
						}) }, row.rowNumber)),
						picked && samples.some((s) => s.row_number === picked.row) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "35.5",
							y: 30 + samples.findIndex((s) => s.row_number === picked.row) * rowHeight,
							width: plotWidth + 1,
							height: rowHeight,
							fill: "none",
							stroke: "var(--dsw-alias-state-business-primary,#3465ce)",
							strokeWidth: "1.5",
							pointerEvents: "none"
						}),
						names.map((name, i) => {
							const label = data.labels?.[name] ?? name;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
								className: "lx-matrix-feature",
								"data-lx-feature-label": true,
								role: "button",
								tabIndex: 0,
								"aria-label": featureHint(i),
								transform: `translate(${36 + (i + .5) * columnWidth} ${plotHeight + 44})${angledLabels ? " rotate(60)" : ""}`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									x: angledLabels ? -2 : -axisWidth / 2,
									y: -axisFont,
									width: axisWidth + 4,
									height: axisFont + 5,
									rx: "2",
									fill: "transparent"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									textAnchor: angledLabels ? "start" : "middle",
									fontSize: axisFont,
									children: shortLabel(label, axisWidth / axisFont)
								})]
							}, name);
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
							transform: `translate(${plotWidth - 448} 0)`,
							role: "group",
							"aria-label": "带正负的平均贡献，按绝对大小排序",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
									x1: barZero,
									x2: barZero,
									y1: "29",
									y2: plotHeight + 32,
									stroke: "currentColor",
									opacity: ".18"
								}),
								ranking.map((feature, i) => {
									const value = feature.mean;
									const width = value === null ? 0 : Math.abs(value) / maxMean * (barEnd - barStart) / 2;
									const rounded = value === null ? null : Number(value.toFixed(4));
									const label = value === null ? "方向未定" : rounded === 0 ? "0" : (rounded > 0 ? "+" : "") + number(value);
									const color = value === null || value === 0 ? contributionColors.unknown : value < 0 ? contributionColors.negative : contributionColors.positive;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										transform: `translate(0 ${30 + (i + .5) * plotHeight / ranking.length})`,
										role: "group",
										"aria-label": `${feature.label} ${feature.name}：平均贡献 ${label}`,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: `${feature.label} · ${feature.name}：${value === null ? `${feature.unknownCount} 个样本缺少方向，无法计算平均贡献` : label}` }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
												className: "lx-matrix-feature",
												"data-lx-feature-label": true,
												role: "button",
												tabIndex: 0,
												"aria-label": `${featureHint(feature.featureIndex)} · 平均贡献 ${label}`,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
													x: "624",
													y: "-10",
													width: "88",
													height: "17",
													rx: "2",
													fill: "transparent"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
													x: "626",
													y: "4",
													fontSize: "11",
													children: shortLabel(feature.label, 7.5)
												})]
											}),
											value !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: "lx-contribution-mean",
												"data-value": value,
												x: value < 0 ? barZero - width : barZero,
												y: "-4",
												width,
												height: "8",
												rx: "1",
												fill: color
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
												x: "898",
												y: "4",
												textAnchor: "end",
												fontSize: value === null ? 9 : 10,
												style: { fontVariantNumeric: "tabular-nums" },
												children: label
											})
										]
									}, feature.name);
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: barZero,
									y: plotHeight + 46,
									textAnchor: "middle",
									fontSize: "10",
									opacity: ".5",
									children: "0"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: barStart,
									y: plotHeight + 46,
									textAnchor: "middle",
									fontSize: "10",
									opacity: ".6",
									children: scales ? `−${number(scales.meanMaximum)}` : "负向"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: barEnd,
									y: plotHeight + 46,
									textAnchor: "middle",
									fontSize: "10",
									opacity: ".6",
									children: scales ? `+${number(scales.meanMaximum)}` : "正向"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
							ref: helpRef,
							transform: `translate(${plotWidth - 448} 0)`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
								className: "lx-matrix-help-trigger",
								"data-lx-help-trigger": true,
								role: "button",
								tabIndex: 0,
								"aria-label": "平均贡献说明",
								"aria-expanded": helpOpen,
								"aria-controls": helpId,
								"aria-describedby": helpOpen ? helpId : void 0,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									x: "751",
									y: "0",
									width: "22",
									height: "22",
									rx: "3",
									fill: "transparent"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: "762",
									y: "12",
									textAnchor: "middle",
									fontSize: "11",
									children: "ⓘ"
								})]
							}), helpOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("foreignObject", {
								x: "626",
								y: "20",
								width: "274",
								height: data.task_type === "classification" ? 160 : 118,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "lx-matrix-help-body",
									id: helpId,
									role: "tooltip",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "平均贡献如何计算" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: summaryHelp })]
								})
							})]
						})
					]
				})
			}),
			names.length > 16 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-matrix-expand",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-matrix-expand": true,
					"aria-expanded": expanded,
					children: expanded ? "收起影响因子" : `影响分数显示前 16 项 · 查看全部 ${names.length} 项`
				})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "lx-matrix-readout",
				role: "status",
				children: hint || "点击色块查看详情；整体平均贡献不随选中样本改变。"
			}),
			picked && pickedSample && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-cell-popover",
				role: "dialog",
				"aria-label": "样本贡献详情",
				style: {
					left: picked.x,
					top: picked.y
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: "lx-cell-close",
						type: "button",
						"data-lx-cell-close": true,
						"aria-label": "关闭样本详情",
						children: "×"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
						sampleLabel(pickedSample, data),
						" · ",
						data.labels?.[names[picked.feature]] ?? names[picked.feature]
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "贡献分数" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: [
							number(pickedSample.scores[picked.feature]),
							" · ",
							directionLabel(pickedSample.directions[picked.feature])
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "特征原值" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: String(pickedSample.feature_values?.[picked.feature] ?? "—") })
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "lx-cell-actions",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-lx-batch": "row",
							"data-row": picked.row,
							children: "查看单条解释 →"
						})
					})
				]
			}),
			samples.length > plotHeight && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "lx-explain-foot",
				children: "全量视图的行高不足 1 像素，可切换逐样本核对明细。"
			})
		]
	});
}

//#endregion
//#region src/client/explanation-filter.ts
const emptyFilter = {
	rowFrom: "",
	rowTo: "",
	field: "",
	min: "",
	max: "",
	equals: ""
};
function numericValue(value) {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
	const number$1 = Number(value);
	return Number.isFinite(number$1) ? number$1 : null;
}
const present = (value) => value !== void 0 && value !== null && !(typeof value === "string" && !value.trim());
function filterFields(data) {
	const samples = data.samples ?? [];
	return [{
		key: "prediction",
		label: explanationPrediction(data).label,
		values: samples.map((s) => s.prediction)
	}, ...(data.feature_names ?? []).map((name, i) => ({
		key: `feature:${i}`,
		label: data.labels?.[name] ?? name,
		values: samples.map((s) => s.feature_values?.[i])
	}))].filter((f) => f.values.some(present)).map((f) => ({
		...f,
		numeric: !(f.key === "prediction" && data.task_type === "classification") && f.values.filter(present).every((v) => numericValue(v) !== null)
	}));
}
function filterActive(filter) {
	return !!(filter.rowFrom || filter.rowTo || filter.field && (filter.min || filter.max || filter.equals));
}
function filterError(filter, data) {
	const bounds = [
		[
			"起始行",
			filter.rowFrom,
			true
		],
		[
			"结束行",
			filter.rowTo,
			true
		],
		[
			"最小值",
			filter.min,
			false
		],
		[
			"最大值",
			filter.max,
			false
		]
	];
	for (const [label, value, integer] of bounds) if (value.trim() && (!Number.isFinite(Number(value)) || integer && (!Number.isInteger(Number(value)) || Number(value) < 1))) return `${label}请输入${integer ? "大于 0 的整数" : "有限数值"}`;
	if (filter.rowFrom && filter.rowTo && Number(filter.rowFrom) > Number(filter.rowTo)) return "起始行不能大于结束行";
	if (filter.min && filter.max && Number(filter.min) > Number(filter.max)) return "最小值不能大于最大值";
	if (filter.field && !filterFields(data).some((f) => f.key === filter.field)) return "当前结果未提供此字段的原值";
	return "";
}
function filterSamples(data, filter) {
	if (filterError(filter, data)) return [];
	const field = filterFields(data).find((f) => f.key === filter.field);
	return (data.samples ?? []).filter((s) => {
		if (filter.rowFrom && s.row_number < Number(filter.rowFrom)) return false;
		if (filter.rowTo && s.row_number > Number(filter.rowTo)) return false;
		if (!field || !filter.min && !filter.max && !filter.equals) return true;
		const value = filter.field === "prediction" ? s.prediction : s.feature_values?.[Number(filter.field.split(":")[1])];
		if (!present(value)) return false;
		if (field.numeric) {
			const number$1 = numericValue(value);
			return number$1 !== null && (!filter.min || number$1 >= Number(filter.min)) && (!filter.max || number$1 <= Number(filter.max));
		}
		return String(value) === filter.equals;
	});
}
function filterDescription(filter, data) {
	const parts = [];
	if (filter.rowFrom || filter.rowTo) parts.push(`${data.task_type === "timeseries" ? "预测步" : "原始行"} ${filter.rowFrom || "1"}–${filter.rowTo || "末尾"}`);
	const field = filterFields(data).find((f) => f.key === filter.field);
	if (field && (filter.min || filter.max || filter.equals)) parts.push(field.numeric ? `${field.label} ${filter.min || "−∞"} 至 ${filter.max || "+∞"}` : `${field.label} = ${filter.equals}`);
	return parts.join(" · ");
}

//#endregion
//#region src/client/ExplanationFilter.tsx
function ExplanationFilter({ data, value, onApply, embedded = false }) {
	const root = (0, react.useRef)(null), [open, setOpen] = (0, react.useState)(false), [draft, setDraft] = (0, react.useState)(value), [error, setError] = (0, react.useState)("");
	const fields = filterFields(data), field = fields.find((f) => f.key === draft.field);
	(0, react.useEffect)(() => {
		const element = root.current;
		const apply$1 = () => {
			const value$1 = {
				...draft,
				rowFrom: draft.rowFrom.trim(),
				rowTo: draft.rowTo.trim(),
				min: draft.min.trim(),
				max: draft.max.trim()
			};
			const message = filterError(value$1, data);
			setError(message);
			if (!message) onApply(value$1);
		};
		const update = (event) => {
			const input$1 = event.target;
			if (!input$1.matches("[data-lx-filter-field]")) return;
			const key = input$1.dataset.lxFilterField;
			setDraft((v) => key === "field" ? {
				...v,
				field: input$1.value,
				min: "",
				max: "",
				equals: ""
			} : {
				...v,
				[key]: input$1.value
			});
			setError("");
		};
		const click = (event) => {
			const action = event.target.closest("[data-lx-filter-action]")?.dataset.lxFilterAction;
			if (action === "toggle") setOpen((v) => !v);
			if (action === "reset") {
				setDraft(emptyFilter);
				onApply(emptyFilter);
				setError("");
			}
			if (action === "apply") apply$1();
		};
		const keydown = (event) => {
			if (event.key === "Enter" && event.target.matches("input")) {
				event.preventDefault();
				apply$1();
			}
		};
		element?.addEventListener("input", update);
		element?.addEventListener("change", update);
		element?.addEventListener("click", click);
		element?.addEventListener("keydown", keydown);
		return () => {
			element?.removeEventListener("input", update);
			element?.removeEventListener("change", update);
			element?.removeEventListener("click", click);
			element?.removeEventListener("keydown", keydown);
		};
	}, [
		draft,
		data,
		onApply
	]);
	const input = (key, label, placeholder) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
		"data-lx-filter-field": key,
		value: draft[key],
		onChange: () => {},
		"aria-label": label,
		placeholder,
		inputMode: "decimal"
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "lx-filter",
		ref: root,
		children: [!embedded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
			type: "button",
			"data-lx-filter-action": "toggle",
			"aria-expanded": open,
			className: "lx-small-button",
			children: [
				"筛选样本",
				filterActive(value) ? " · 已应用" : "",
				" ",
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					"aria-hidden": "true",
					children: open ? "⌃" : "⌄"
				})
			]
		}), (embedded || open) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "lx-filter-panel",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: data.task_type === "timeseries" ? "预测步范围" : "原始行范围" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-filter-range",
					children: [
						input("rowFrom", "起始行", "起始"),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "—" }),
						input("rowTo", "结束行", "结束")
					]
				})] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "按值筛选" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					"data-lx-filter-field": "field",
					value: draft.field,
					onChange: () => {},
					"aria-label": "筛选字段",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: "不限"
					}), fields.map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: f.key,
						children: f.label
					}, f.key))]
				})] }),
				field && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: field.numeric ? "数值范围" : "类别" }), field.numeric ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-filter-range",
					children: [
						input("min", "最小值", "最小"),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "—" }),
						input("max", "最大值", "最大")
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					"data-lx-filter-field": "equals",
					value: draft.equals,
					onChange: () => {},
					"aria-label": "筛选类别",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: "不限"
					}), [...new Set(field.values.filter((v) => v !== void 0 && v !== null).map(String))].sort().map((v) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: v,
						children: v
					}, v))]
				})] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-filter-actions",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-lx-filter-action": "apply",
						className: "lx-small-button",
						children: "应用"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-lx-filter-action": "reset",
						children: "清除"
					})]
				}),
				error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "lx-filter-error",
					role: "alert",
					children: error
				})
			]
		})]
	});
}

//#endregion
//#region src/client/ExplanationBatch.tsx
function ExplanationBatch({ data, showRaw = false, showPredictionCheck = false, onVisual }) {
	const root = (0, react.useRef)(null);
	const [tab, setTab] = (0, react.useState)("distribution"), [view, setView] = (0, react.useState)("visual");
	const [group, setGroup] = (0, react.useState)("all");
	const groups = (0, react.useMemo)(() => predictionGroups(data), [data]);
	const [filter, setFilter] = (0, react.useState)(emptyFilter);
	const applyFilter = (0, react.useCallback)((value) => {
		setFilter(value);
		setGroup("all");
		setPage(0);
		setSelected(null);
		setTab("distribution");
	}, []);
	const active = filterActive(filter), description = filterDescription(filter, data);
	const visible = (0, react.useMemo)(() => groups && group === "low" ? groups.low : groups && group === "high" ? groups.high : active ? {
		...data,
		samples: filterSamples(data, filter)
	} : data, [
		data,
		filter,
		active,
		groups,
		group
	]);
	const scales = (0, react.useMemo)(() => contributionScales(data, visible, ...groups ? [groups.low, groups.high] : []), [
		data,
		visible,
		groups
	]);
	const [selected, setSelected] = (0, react.useState)(null);
	const [page, setPage] = (0, react.useState)(0);
	const samples = visible.samples ?? [], allSamples = data.samples ?? [], names = data.feature_names ?? [];
	const pageSize = 10, pages = Math.ceil(samples.length / pageSize);
	(0, react.useEffect)(() => {
		const element = root.current;
		const click = (event) => {
			const button = event.target.closest("[data-lx-batch]");
			if (!button || !element?.contains(button)) return;
			const action = button.dataset.lxBatch;
			if ([
				"row",
				"distribution",
				"sample"
			].includes(action)) onVisual?.();
			if (action === "visual" || action === "raw") setView(action);
			if (action === "distribution" || action === "sample") {
				setTab(action);
				setView("visual");
				if (action === "sample" && selected === null) setSelected(samples[0]?.row_number ?? null);
			}
			if (action === "row") {
				setSelected(Number(button.dataset.row));
				setTab("sample");
				setView("visual");
			}
			if (action === "previous") setPage((p) => Math.max(0, p - 1));
			if (action === "next") setPage((p) => Math.min(pages - 1, p + 1));
			if (action === "table") setTab("distribution");
			if (action === "sample-prev" || action === "sample-next") {
				const i = allSamples.findIndex((s) => s.row_number === selected);
				setSelected(allSamples[Math.max(0, Math.min(allSamples.length - 1, i + (action === "sample-prev" ? -1 : 1)))].row_number);
			}
		};
		const change = (event) => {
			if (event.target.matches("[data-lx-prediction-group]")) {
				setGroup(event.target.value);
				setFilter(emptyFilter);
				setSelected(null);
				setPage(0);
				setTab("distribution");
			}
			if (event.target.matches("[data-lx-sample-select]")) setSelected(Number(event.target.value));
		};
		element?.addEventListener("click", click);
		element?.addEventListener("change", change);
		return () => {
			element?.removeEventListener("click", click);
			element?.removeEventListener("change", change);
		};
	}, [
		pages,
		selected,
		samples,
		allSamples,
		onVisual
	]);
	const cellMax = scales.maximum;
	const unknown = samples.some((s) => s.directions.some((d) => !knownDirection(d)));
	const neutral = samples.some((s) => s.directions.includes(0));
	const selectedSample = selected === null ? void 0 : allSamples.find((s) => s.row_number === selected);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: root,
		className: "lx-batch-view",
		children: [
			tab === "sample" && selectedSample ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationInsight, { data: singleSampleMatrix(sampleView(data, selectedSample)) }) : group === "compare" && groups ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupInsight, {
				low: groups.low,
				high: groups.high
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationInsight, { data: visible }),
			data.input_rows && allSamples.length < data.input_rows && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: "lx-explain-foot",
				children: [
					"当前解释 ",
					allSamples.length,
					" / ",
					data.input_rows,
					" 行",
					data.selection_method === "predicted_class_stratified" ? ` · 按预测类别抽样（种子 ${data.selection_seed}）` : "",
					"；图中排名仅代表这些样本。"
				]
			}),
			!!data.missing_rows?.length && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: "lx-explain-warning",
				children: [
					"仅解释了部分样本；未返回原始行：",
					data.missing_rows.join("、"),
					"。整体排序只统计已返回样本。"
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `.lx-batch-toolbar button,.lx-batch-toolbar summary{font-family:inherit!important;font-size:12px!important;font-weight:400!important;line-height:20px!important}.lx-batch-toolbar .lx-plot-tabs button[aria-pressed=true]{font-weight:400!important;text-decoration:none}.lx-batch-view .lx-sample-control{justify-content:flex-end;gap:6px;margin:0}.lx-batch-view .lx-sample-control button{display:flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0}.lx-batch-view .lx-sample-control label{display:flex;align-items:center;gap:8px}.lx-batch-view .lx-sample-control select{margin:0;font:inherit;min-height:30px}.lx-batch-config-body .lx-analysis-toolbar{display:block;margin-top:14px}.lx-batch-config-body select{font:inherit;color:inherit;background:var(--dsw-alias-background-primary,#fff);border:1px solid var(--dsw-alias-border-primary,#ddd);border-radius:5px;padding:6px 8px;max-width:100%}.lx-batch-config-body .lx-analysis-toolbar label{display:flex;align-items:center;gap:8px}.lx-batch-config-body .lx-analysis-toolbar select{margin-left:auto;max-width:210px}.lx-batch-config-body .lx-explain-foot{display:block;margin-top:8px;font-size:11px}.lx-batch-config-body .lx-filter-panel{margin:0;border:0;padding:0;background:transparent;display:grid;grid-template-columns:1fr 1fr;gap:12px}.lx-batch-config-body .lx-filter-panel label{min-width:0}.lx-batch-config-body .lx-filter-panel select{width:100%;margin:0}.lx-batch-config-body .lx-filter-range input{width:100%;min-width:0}.lx-batch-config-body .lx-filter-range{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)}.lx-batch-config-body .lx-filter-actions{grid-column:1/-1;justify-content:flex-end}.lx-batch-config-body .lx-filter-error{grid-column:1/-1}.lx-batch-config-body .lx-analysis-toolbar{border-top:1px solid var(--dsw-alias-border-primary,#ddd);padding-top:12px}.lx-batch-toolbar{display:flex;min-height:32px;align-items:center;gap:12px;margin:12px 0;border-bottom:1px solid var(--dsw-alias-border-primary,#ddd);padding-bottom:0}.lx-batch-toolbar>.lx-export{margin:0;padding:0;display:flex;align-items:center}.lx-batch-toolbar>.lx-export>.lx-export-status:empty{display:none}.lx-batch-toolbar>.lx-plot-tabs{margin:0;align-items:stretch}.lx-batch-toolbar .lx-plot-tabs button{position:relative;height:40px;text-decoration:none!important}.lx-batch-toolbar .lx-plot-tabs button[aria-pressed=true]:after{content:"";position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--dsw-alias-state-business-primary,#3465ce)}.lx-batch-toolbar button,.lx-batch-toolbar summary{display:inline-flex;align-items:center;min-height:28px;line-height:20px!important;padding-top:0!important;padding-bottom:0!important}.lx-batch-config{margin-left:auto;position:relative;font-size:12px}.lx-batch-config>summary{cursor:pointer;list-style:none}.lx-batch-config-body{position:absolute;right:0;top:30px;width:min(400px,75vw);z-index:12;padding:16px;background:var(--dsw-alias-background-primary,#fff);border:1px solid var(--dsw-alias-border-primary,#ddd);border-radius:8px;box-shadow:0 6px 20px #0002}.lx-batch-footer{display:flex;gap:12px;border-top:1px solid var(--dsw-alias-border-primary,#ddd);padding-top:8px;margin-top:10px;font-size:12px}.lx-batch-overview .lx-matrix-svg{max-height:min(560px,60vh)}.lx-fullscreen-dialog[open] .lx-explain .lx-batch-overview .lx-matrix-svg{max-height:max(260px,calc(100dvh - 330px))}` }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-batch-toolbar",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "lx-plot-tabs",
						"aria-label": "解释图表",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-lx-batch": "distribution",
							"aria-pressed": tab === "distribution" && view === "visual",
							children: "影响因子热力图"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-lx-batch": "sample",
							"aria-pressed": tab === "sample" && view === "visual",
							children: "单条解释"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: "lx-batch-config",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "筛选与分组" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "lx-batch-config-body",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationFilter, {
								embedded: true,
								data,
								value: filter,
								onApply: applyFilter
							}), groups && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "lx-analysis-toolbar",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
									"快捷分组 ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ExplanationHelp, {
										label: "快捷分组说明",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "将本次已解释的全部样本按预测值从小到大排列，取中间值作为分界；样本数为偶数时，取中间两个值的平均数。" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
												"本次采用",
												groups.label,
												"，分界为 ",
												number(groups.median),
												data.unit ? ` ${data.unit}` : "",
												"。低于分界的 ",
												groups.low.samples?.length ?? 0,
												" 条归低预测组，等于或高于分界的 ",
												groups.high.samples?.length ?? 0,
												" 条归高预测组；两组数量不一定相等。"
											] }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "选择“高低预测组对比”，可比较两组的影响因子热力图和平均贡献。高低只表示预测值大小，不代表质量等级或预测准确程度。" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "优先使用原预测；原预测不完整时，统一使用解释时预测。切换快捷分组会清除手动筛选，不会重新调用模型。" })
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										"aria-label": "预测分组",
										"data-lx-prediction-group": true,
										value: group,
										onChange: () => {},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "all",
												children: "全部样本"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
												value: "low",
												children: [
													"低于",
													groups.label,
													"中位数"
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
												value: "high",
												children: [
													"不低于",
													groups.label,
													"中位数"
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "compare",
												children: "高低预测组对比"
											})
										]
									})
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "lx-explain-foot",
									children: [
										"按",
										groups.label,
										" ",
										number(groups.median),
										" 分组；不是质量等级"
									]
								})]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationExport, {
						filename: `${data.target}-解释${active ? "-筛选对比" : ""}`,
						build: (theme) => tab === "sample" && selectedSample ? singleContributionExportSvg(sampleView(data, selectedSample), theme) : group === "compare" && groups ? contributionExportSvg(groups.high, groups.low, `低预测组 / 高预测组；分界 ${groups.median}`, theme, ["低预测组", "高预测组"]) : contributionExportSvg(data, active || group !== "all" ? visible : void 0, group === "all" ? description : `${group === "low" ? "低" : "高"}预测组`, theme)
					})
				]
			}),
			active && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-filter-summary",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
					"命中 ",
					samples.length,
					" 个样本 · 覆盖率 ",
					allSamples.length ? number(samples.length / allSamples.length * 100) : 0,
					"%"
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: description })]
			}),
			showPredictionCheck && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PredictionCheck, { data: tab === "sample" && selectedSample ? {
				...data,
				samples: [selectedSample]
			} : visible }),
			showRaw ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationDataTable, { data: visible }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-batch-overview",
				style: { display: tab === "distribution" ? "block" : "none" },
				children: group === "compare" && groups ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-matrix-comparison lx-prediction-comparison",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "lx-explain-foot",
							children: [
								"两组共用贡献色阶与均值轴；低组 ",
								groups.low.samples.length,
								" 行，高组 ",
								groups.high.samples.length,
								" 行。"
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContributionHeatmap, {
							data: groups.low,
							scope: "低预测组",
							scales
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContributionHeatmap, {
							data: groups.high,
							scope: "高预测组",
							scales
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: active ? "lx-matrix-comparison" : "",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContributionHeatmap, {
						data: visible,
						scope: group === "low" ? "低预测组" : group === "high" ? "高预测组" : active ? "当前筛选" : "全部",
						scales
					}), active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContributionHeatmap, {
						data,
						scope: "全样本",
						scales
					})]
				})
			}), tab === "sample" && (selectedSample ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LocalExplanation, {
				data: sampleView(data, selectedSample),
				controls: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-sample-control",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["选择样本 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							"data-lx-sample-select": true,
							value: selected ?? 0,
							onChange: () => {},
							"aria-label": "选择原始样本行",
							children: allSamples.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: s.row_number,
								children: sampleLabel(s, data)
							}, s.row_number))
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-lx-batch": "sample-prev",
							disabled: selected === allSamples[0]?.row_number,
							"aria-label": "上一个样本",
							children: "←"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-lx-batch": "sample-next",
							disabled: selected === allSamples[allSamples.length - 1]?.row_number,
							"aria-label": "下一个样本",
							children: "→"
						})
					]
				})
			}, selectedSample.row_number) }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-heatmap-heading",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "样本贡献明细" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContributionLegend, {
						maximum: cellMax,
						unknown,
						neutral
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "lx-heatmap-scroll",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: "lx-heatmap",
						"aria-label": "样本特征贡献热力图",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: data.task_type === "timeseries" ? "预测步" : "原始行" }),
							names.map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								title: data.labels?.[n],
								children: n
							}, n)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: explanationPrediction(data).label })
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: samples.slice(page * pageSize, (page + 1) * pageSize).map((s, r) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								"data-lx-batch": "row",
								"data-row": s.row_number,
								"aria-label": `查看${sampleLabel(s, data)}解释`,
								children: [s.step ?? s.row_number, " ↗"]
							}) }),
							s.scores.map((score, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "lx-heat-cell",
								style: { background: contributionFill(score, s.directions[i], cellMax) },
								title: `${data.labels?.[names[i]] ?? names[i]}：${number(score)}；${directionLabel(s.directions[i])}`
							}) }, names[i])),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								className: "lx-heat-pred",
								children: typeof s.prediction === "number" ? number(s.prediction) : s.prediction ?? "—"
							})
						] }, s.row_number)) })]
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-heatmap-footer",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						"第 ",
						samples.length ? page * pageSize + 1 : 0,
						"–",
						Math.min((page + 1) * pageSize, samples.length),
						" 个 · 点击行号查看解释"
					] }), pages > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-lx-batch": "previous",
							disabled: page === 0,
							"aria-label": "上一页样本",
							children: "←"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							page + 1,
							" / ",
							pages
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-lx-batch": "next",
							disabled: page === pages - 1,
							"aria-label": "下一页样本",
							children: "→"
						})
					] })]
				})
			] }))] })
		]
	});
}

//#endregion
//#region src/client/ExplanationGraph.tsx
function ExplanationGraph({ data, onPair, detail, selectedPair = [], onClearPair, toolbar }) {
	const root = (0, react.useRef)(null), id = (0, react.useId)().replace(/:/g, "");
	const [focus, setFocus] = (0, react.useState)(null), [selected, setSelected] = (0, react.useState)(null);
	const canvas = (0, react.useRef)(null), [aspect, setAspect] = (0, react.useState)(2);
	(0, react.useEffect)(() => {
		const element = canvas.current;
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => {
			const { width: width$1, height: height$1 } = entry.contentRect;
			if (width$1 > 0 && height$1 > 0) setAspect((previous) => Math.abs(previous - width$1 / height$1) > .05 ? width$1 / height$1 : previous);
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, []);
	const allNodes = data.nodes ?? [], allEdges = data.edges ?? [];
	const label = (n) => data.labels?.[n] ?? n;
	const edges = focus ? allEdges.filter((e) => e.source === focus || e.target === focus) : allEdges;
	const neighbors = new Set([focus ?? data.target, ...edges.flatMap((e) => [e.source, e.target])]);
	const nodes = focus ? allNodes.filter((n) => neighbors.has(n)) : allNodes;
	const { positions, width, height, isolated, cycles } = graphLayout(nodes, edges, aspect);
	(0, react.useEffect)(() => {
		const element = root.current;
		const click = (event) => {
			const button = event.target.closest("[data-lx-graph]");
			if (!button || !element?.contains(button)) return;
			if (button.dataset.lxGraph === "edge") {
				setSelected(null);
				onPair?.(button.dataset.source, button.dataset.target);
			} else onClearPair?.();
			if (button.dataset.lxGraph === "focus") {
				setFocus((v) => v ? null : selected);
				setSelected(null);
			}
			if (button.dataset.lxGraph === "node") setSelected((v) => v === button.dataset.node ? null : button.dataset.node);
			if (button.dataset.lxGraph === "clear") setSelected(null);
		};
		const keydown = (e) => {
			if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-lx-graph=\"node\"],[data-lx-graph=\"edge\"]")) {
				e.preventDefault();
				click(e);
			}
		};
		element?.addEventListener("click", click);
		element?.addEventListener("keydown", keydown);
		return () => {
			element?.removeEventListener("click", click);
			element?.removeEventListener("keydown", keydown);
		};
	}, [
		onPair,
		onClearPair,
		selected
	]);
	const active = new Set(selected ? [selected, ...edges.filter((e) => e.source === selected || e.target === selected).flatMap((e) => [e.source, e.target])] : selectedPair.length ? selectedPair : nodes);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "lx-network-view",
		ref: root,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "lx-network-toolbar",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "因果关系网络" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "lx-graph-mode",
					children: [data.mode === "directed" ? "有向" : "无向", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ExplanationHelp, {
						label: "关系图说明",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "连线表示模型发现的关系，数值为关系分数。点击变量看分数，点击连线看原始数据。" }),
							!!isolated.length && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [isolated.length, " 个变量暂无关联连线（当前模型结果）。"] }),
							data.mode === "directed" && cycles.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "图中含双向或循环关系，不代表确定的因果顺序。" })
						]
					})]
				}),
				(selected || focus) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-graph": "focus",
					"aria-pressed": !!focus,
					children: focus ? "显示全部" : "聚焦此变量"
				}),
				(selected || selectedPair.length > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-graph": "clear",
					children: "清除高亮"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-network-actions",
					children: [toolbar, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationExport, {
						menuLabel: "更多",
						filename: `${data.target}-关系图`,
						build: (theme) => graphExportSvg({
							...data,
							nodes,
							edges
						}, theme, focus ? "目标关系" : "完整网络")
					})]
				})
			]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `lx-network-stage${detail ? " has-detail" : ""}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "lx-graph-scroll",
					ref: canvas,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
						className: "lx-causal-graph lx-network-svg",
						viewBox: `0 0 ${width} ${height}`,
						style: { minWidth: 520 },
						role: "group",
						"aria-label": `${nodes.length} 个变量、${edges.length} 条真实${data.mode === "directed" ? "有向" : "无向"}关系`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("marker", {
								id: `lx-arrow-${id}`,
								markerWidth: "7",
								markerHeight: "7",
								refX: "6",
								refY: "3.5",
								orient: "auto",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
									d: "M 0 1 L 6 3.5 L 0 6",
									fill: "none",
									stroke: "#6f8ebd"
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("marker", {
								id: `lx-orange-arrow-${id}`,
								markerWidth: "7",
								markerHeight: "7",
								refX: "6",
								refY: "3.5",
								orient: "auto",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
									d: "M 0 1 L 6 3.5 L 0 6",
									fill: "none",
									stroke: "#ff5b2a"
								})
							})] }),
							edges.map((e, i) => {
								const a = positions.get(e.source), b = positions.get(e.target);
								if (!a || !b) return null;
								const right = b[0] > a[0], same = b[0] === a[0];
								const ax = a[0] + (right || same ? 68 : -68), bx = b[0] + (right ? -68 : 68);
								const port = (node, other, outgoing) => {
									const peers = edges.filter((edge) => outgoing ? edge.source === node : edge.target === node).map((edge) => outgoing ? edge.target : edge.source).sort((x, y) => (positions.get(x)?.[1] ?? 0) - (positions.get(y)?.[1] ?? 0));
									return peers.length > 1 ? -14 + 28 * peers.indexOf(other) / (peers.length - 1) : 0;
								};
								const ay = a[1] + port(e.source, e.target, true), by = b[1] + port(e.target, e.source, false);
								const path = same ? `M ${ax} ${ay} C ${ax + 30} ${ay}, ${bx + 30} ${by}, ${bx} ${by}` : `M ${ax} ${ay} C ${(ax + bx) / 2} ${ay}, ${(ax + bx) / 2} ${by}, ${bx} ${by}`;
								const chosen = selectedPair[0] === e.source && selectedPair[1] === e.target;
								const emphasized = selectedPair.length ? chosen : !selected || e.source === selected || e.target === selected;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
									"data-lx-graph": "edge",
									"data-source": e.source,
									"data-target": e.target,
									className: "lx-graph-edge-button",
									"aria-pressed": chosen,
									role: "button",
									tabIndex: 0,
									"aria-label": `查看${label(e.source)}到${label(e.target)}的关系`,
									opacity: emphasized ? 1 : .12,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											d: path,
											fill: "none",
											stroke: "transparent",
											strokeWidth: "12",
											style: { cursor: "pointer" }
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: "lx-causal-edge",
											d: path,
											style: {
												stroke: chosen ? "#ff5b2a" : void 0,
												strokeWidth: chosen ? 2.6 : selected && emphasized ? 2.1 : 1.25
											},
											markerEnd: data.mode === "directed" ? `url(#${chosen ? "lx-orange-arrow" : "lx-arrow"}-${id})` : void 0,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: `${label(e.source)} ${data.mode === "directed" ? "→" : "—"} ${label(e.target)}：${number(e.weight)}` })
										}),
										(chosen || (selected ? emphasized : focus)) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
											transform: `translate(${same ? ax + 22.5 : (ax + bx) / 2},${(ay + by) / 2})`,
											className: "lx-edge-score",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: `模型关系分数 ${e.weight}；来源 result.edges[].weight` }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
													x: "-23",
													y: "-9",
													width: "46",
													height: "18",
													rx: "4",
													fill: "var(--dsw-alias-background-primary,#fff)",
													stroke: chosen ? "#ff5b2a" : "#cbd7e8"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
													y: "4",
													textAnchor: "middle",
													fontSize: "10",
													style: { fill: chosen ? "#ff5b2a" : void 0 },
													children: e.weight.toFixed(3)
												})
											]
										})
									]
								}, i);
							}),
							nodes.map((n) => {
								const [x, y] = positions.get(n);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
									"data-lx-graph": "node",
									"data-node": n,
									role: "button",
									tabIndex: 0,
									"aria-label": `高亮${label(n)}的关系`,
									"aria-pressed": selected === n,
									opacity: active.has(n) ? 1 : .35,
									className: "lx-graph-node-button",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: "lx-causal-node",
											"data-target": n === data.target,
											"data-selected": selected === n,
											x: x - 68,
											y: y - 22,
											width: "136",
											height: "44",
											rx: "5"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
											x,
											y: y - 2,
											textAnchor: "middle",
											fontSize: "12",
											fontWeight: "500",
											children: label(n)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
											x,
											y: y + 13,
											textAnchor: "middle",
											fontSize: "10",
											opacity: ".58",
											children: n
										})
									]
								}, n);
							})
						]
					})
				}), detail && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("aside", {
					className: "lx-network-detail",
					"aria-label": "关系原值预览",
					children: detail
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-network-count",
				children: [
					nodes.length,
					" 个变量 · ",
					edges.length,
					" 条关系"
				]
			}),
			!edges.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "lx-explain-foot",
				children: "当前返回结果未发现与目标直接相连的关系。"
			})
		] })]
	});
}

//#endregion
//#region src/client/relationship-data.ts
function graphEdges(data, t) {
	const names = data.nodes ?? [];
	return names.flatMap((source, i) => names.flatMap((target, j) => {
		const weight = data.graph_weights?.[i]?.[j];
		return i !== j && typeof weight === "number" && Number.isFinite(weight) && weight > 0 && weight >= t ? [{
			source,
			target,
			weight
		}] : [];
	}));
}
function graphConclusion(data) {
	const edges = data.edges ?? [], target = data.target_label ?? data.target, label = (n) => data.labels?.[n] ?? n;
	const connected = edges.filter((e) => data.mode === "directed" ? e.target === data.target : e.target === data.target || e.source === data.target).sort((a, b) => b.weight - a.weight);
	if (!edges.length) return "当前结果未检出关系。可以检查数据范围与分析条件，不能据此认定变量之间没有实际联系。";
	if (!connected.length) return `当前显示 ${edges.length} 条变量关系，但未检出${target}的${data.mode === "directed" ? "入向" : "直接"}关系。`;
	return `模型发现 ${connected.length} 条与${target}${data.mode === "directed" ? "相连的入向" : "直接相连的"}关系，分数较高的包括${connected.slice(0, 3).map((e) => label(e.source === data.target ? e.target : e.source)).join("、")}。点击关系可查看对应分数与原始数据。`;
}
function rankedRelations(data) {
	return (data.comparison?.records ?? []).filter((r) => r.left_present || r.right_present).slice().sort((a, b) => Math.abs(b.right_weight - b.left_weight) - Math.abs(a.right_weight - a.left_weight) || a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
}

//#endregion
//#region src/client/RelationshipView.tsx
function Matrix({ data, threshold, onPair, selectedPair = [] }) {
	const root = (0, react.useRef)(null), names = data.nodes ?? [], weights = data.graph_weights;
	(0, react.useEffect)(() => {
		const node = root.current;
		const click = (e) => {
			const hit = e.target.closest("[data-pair]");
			if (hit && node?.contains(hit)) {
				const [i, j] = hit.dataset.pair.split(",").map(Number);
				onPair?.(names[i], names[j]);
			}
		};
		const key = (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				click(e);
			}
		};
		node?.addEventListener("click", click);
		node?.addEventListener("keydown", key);
		return () => {
			node?.removeEventListener("click", click);
			node?.removeEventListener("keydown", key);
		};
	}, [names, onPair]);
	if (!weights) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
		className: "lx-explain-foot",
		children: "此历史结果未保存完整关系矩阵；仍可查看网络与关系明细。"
	});
	const size = 24, left = 120, top = 95, w = left + names.length * size + 20, h = top + names.length * size + 30;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "lx-graph-scroll lx-relationship-matrix",
		ref: root,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			className: "lx-causal-graph lx-matrix-svg",
			viewBox: `0 0 ${w} ${h}`,
			style: {
				minWidth: Math.min(w, 420),
				maxHeight: 400
			},
			role: "group",
			"aria-label": "关系矩阵，行来源、列去向",
			children: [names.map((a, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("text", {
					x: left - 8,
					y: top + i * size + 16,
					textAnchor: "end",
					fontSize: "10",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: data.labels?.[a] ?? a }), (data.labels?.[a] ?? a).length > 12 ? (data.labels?.[a] ?? a).slice(0, 10) + "…" : data.labels?.[a] ?? a]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("text", {
					transform: `translate(${left + i * size + 13},${top - 10}) rotate(-45)`,
					fontSize: "10",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: data.labels?.[a] ?? a }), (data.labels?.[a] ?? a).length > 12 ? (data.labels?.[a] ?? a).slice(0, 10) + "…" : data.labels?.[a] ?? a]
				}),
				names.map((b, j) => {
					const v = weights[i][j], shown = i !== j && v > 0 && (threshold === void 0 || v >= threshold);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						"data-pair": `${i},${j}`,
						stroke: selectedPair[0] === a && selectedPair[1] === b ? "#ff5b2a" : void 0,
						strokeWidth: "2",
						role: onPair ? "button" : void 0,
						tabIndex: onPair ? 0 : void 0,
						"aria-label": `${data.labels?.[a] ?? a} 到 ${data.labels?.[b] ?? b}，分数 ${number(v)}`,
						x: left + j * size,
						y: top + i * size,
						width: size - 1,
						height: size - 1,
						fill: shown ? `color-mix(in srgb,#4168a9 ${Math.max(0, Math.min(1, v)) * 100}%,var(--dsw-alias-background-primary,#fff))` : "var(--dsw-alias-interactive-bg-hover,#f0f2f5)",
						style: { cursor: onPair ? "pointer" : void 0 },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: `${a} → ${b}：${number(v)}${shown ? "" : "，当前未显示连线"}` })
					}, b);
				})
			] }, a)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
				x: left,
				y: h - 5,
				fontSize: "11",
				children: "行：来源变量 → 列：去向变量"
			})]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "lx-explain-foot",
			children: [
				"分数 0 ",
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
					display: "inline-block",
					width: 100,
					height: 8,
					background: "linear-gradient(90deg,var(--dsw-alias-background-primary,#fff),#4168a9)"
				} }),
				" 1 · 浅灰：未达到显示阈值或对角项"
			]
		})]
	});
}
function Scatter({ data, a, b, bounds, color = "#4168a9" }) {
	const names = data.graph_sample_names ?? [], i = names.indexOf(a), j = names.indexOf(b), rows$1 = data.graph_samples ?? [];
	if (i < 0 || j < 0 || !rows$1.length) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
		className: "lx-explain-foot",
		children: "此结果没有可用的原始数据预览。"
	});
	const xs = rows$1.map((r) => r[i]), ys = rows$1.map((r) => r[j]), minX = bounds?.[0] ?? Math.min(...xs), maxX = bounds?.[1] ?? Math.max(...xs), minY = bounds?.[2] ?? Math.min(...ys), maxY = bounds?.[3] ?? Math.max(...ys);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		className: "lx-causal-graph",
		viewBox: "0 0 300 225",
		"aria-label": "原始数据散点图",
		role: "img",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M45 20V175H285",
				fill: "none",
				stroke: "#bdc8d6"
			}),
			rows$1.map((r, k) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: 45 + (r[i] - minX) / (maxX - minX || 1) * 235,
				cy: 175 - (r[j] - minY) / (maxY - minY || 1) * 145,
				r: "1.7",
				fill: color,
				opacity: ".3"
			}, k)),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
				x: "45",
				y: "194",
				fontSize: "10",
				children: number(minX)
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
				x: "280",
				y: "194",
				textAnchor: "end",
				fontSize: "10",
				children: number(maxX)
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
				x: "40",
				y: "32",
				textAnchor: "end",
				fontSize: "10",
				children: number(maxY)
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
				x: "40",
				y: "175",
				textAnchor: "end",
				fontSize: "10",
				children: number(minY)
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
				x: "160",
				y: "216",
				textAnchor: "middle",
				fontSize: "11",
				children: data.labels?.[a] ?? a
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
				x: "45",
				y: "12",
				fontSize: "11",
				children: data.labels?.[b] ?? b
			})
		]
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
		className: "lx-explain-foot",
		children: [rows$1.length === (data.input_rows ?? rows$1.length) ? `${rows$1.length} 条样本` : `展示 ${rows$1.length} / ${data.input_rows} 条样本`, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationHelp, {
			label: "散点图说明",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: ["散点展示两个变量的原始观测值及数据关联。", rows$1.length !== (data.input_rows ?? rows$1.length) ? "预览采用等距抽样。" : ""] })
		})]
	})] });
}
function RelationshipView({ data }) {
	const root = (0, react.useRef)(null), [view, setView] = (0, react.useState)("network"), [threshold, setThreshold] = (0, react.useState)(void 0), [pair, setPair] = (0, react.useState)([]);
	const clearPair = (0, react.useCallback)(() => setPair([]), []);
	const select = (0, react.useCallback)((a$1, b$1) => setPair([a$1, b$1]), []), t = threshold ?? data.graph_threshold ?? void 0;
	(0, react.useEffect)(() => {
		const node = root.current;
		const click = (e) => {
			const b$1 = e.target.closest("[data-relationship]");
			if (b$1 && node?.contains(b$1)) if (b$1.dataset.relationship === "close") setPair([]);
			else if (b$1.dataset.relationship === "default") {
				setThreshold(void 0);
				setPair([]);
			} else {
				setView(b$1.dataset.relationship);
				setPair([]);
			}
		};
		const change = (e) => {
			const x = e.target;
			if (x.matches("[data-relationship-threshold]")) {
				setThreshold(Number(x.value));
				setPair([]);
			}
			if (x.matches("[data-relationship-pair]")) {
				const [a$1, b$1] = x.value.split(",").map(Number);
				select(data.nodes[a$1], data.nodes[b$1]);
			}
		};
		node?.addEventListener("click", click);
		node?.addEventListener("change", change);
		node?.addEventListener("input", change);
		return () => {
			node?.removeEventListener("click", click);
			node?.removeEventListener("change", change);
			node?.removeEventListener("input", change);
		};
	}, [data, select]);
	if (data.comparison) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Comparison, { data });
	const edges = threshold === void 0 ? data.edges ?? [] : graphEdges(data, threshold), shown = {
		...data,
		edges
	}, names = data.nodes ?? [], a = pair[0], b = pair[1], score = a && b ? data.graph_weights?.[names.indexOf(a)]?.[names.indexOf(b)] : void 0;
	const detail = a && b ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "lx-network-detail-head",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
				data.labels?.[a] ?? a,
				" ",
				data.mode === "directed" ? "→" : "—",
				" ",
				data.labels?.[b] ?? b
			] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				"data-relationship": "close",
				"aria-label": "关闭原值预览",
				children: "×"
			})]
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "lx-explain-foot",
			title: "接口字段：result.edges[].weight；完整矩阵 result.edge_weights",
			children: [
				"模型关系分数 ",
				number(score ?? edges.find((e) => e.source === a && e.target === b)?.weight ?? 0),
				a === b ? " · 对角项" : ""
			]
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Scatter, {
			data,
			a,
			b
		})
	] }) : null;
	const settings = data.mode === "directed" && data.graph_weights && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
		className: "lx-relationship-settings",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
			"aria-label": "图表显示设置",
			title: "图表显示设置",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: "18",
				height: "18",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 7h6m4 0h6M4 17h10m4 0h2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "7",
						r: "2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "16",
						cy: "17",
						r: "2"
					})
				]
			})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "lx-analysis-toolbar",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
					"显示阈值 ",
					t === void 0 ? "服务端默认" : number(t),
					" ",
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						"aria-label": "关系显示阈值",
						"data-relationship-threshold": true,
						type: "range",
						min: "0",
						max: "1",
						step: "0.01",
						value: t ?? 0,
						onChange: () => {}
					})
				] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					"data-relationship": "default",
					children: "恢复服务端结果"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "lx-explain-foot",
					children: "仅调整显示，不重新计算"
				})
			]
		})]
	});
	const auxiliary = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
		title: "以矩阵查看同一份关系分数",
		"data-relationship": "matrix",
		children: "关系矩阵"
	}), settings] });
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "lx-relationship-view",
		ref: root,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
			className: "lx-insight",
			role: "status",
			children: graphConclusion(shown)
		}), view === "matrix" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "lx-network-toolbar",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					"data-relationship": "network",
					children: "← 返回关系网络"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "关系矩阵" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "lx-network-actions",
					children: settings
				})
			]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: `lx-network-stage lx-matrix-stage${detail ? " has-detail" : ""}`,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Matrix, {
				data,
				threshold: t,
				onPair: select,
				selectedPair: pair
			}), detail && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("aside", {
				className: "lx-network-detail",
				children: detail
			})]
		})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationGraph, {
			data: shown,
			toolbar: auxiliary,
			onPair: select,
			detail,
			selectedPair: pair,
			onClearPair: clearPair
		})]
	});
}
function Comparison({ data }) {
	const root = (0, react.useRef)(null), [selected, setSelected] = (0, react.useState)(null), [expanded, setExpanded] = (0, react.useState)(false), [panel, setPanel] = (0, react.useState)(null);
	const c = data.comparison, records = rankedRelations(data), key = (r) => JSON.stringify([r.source, r.target]);
	const common = records.filter((r) => r.left_present && r.right_present).length, left = records.filter((r) => r.left_present && !r.right_present).length, right = records.filter((r) => !r.left_present && r.right_present).length;
	const label = (n) => data.labels?.[n] ?? n, top = records[0], chosen = records.find((r) => key(r) === selected);
	(0, react.useEffect)(() => {
		const el = root.current;
		const click = (e) => {
			const b = e.target.closest("[data-compare-pair],[data-compare-expand],[data-compare-panel]");
			if (!b || !el?.contains(b)) return;
			if (b.hasAttribute("data-compare-panel")) {
				const next = b.dataset.comparePanel;
				setPanel((v) => next === "close" || v === next ? null : next);
			} else if (b.hasAttribute("data-compare-expand")) setExpanded((v) => !v);
			else {
				const k = b.dataset.comparePair;
				setSelected((v) => v === k ? null : k);
			}
		};
		el?.addEventListener("click", click);
		return () => el?.removeEventListener("click", click);
	}, []);
	const points = chosen ? [c.left, c.right].flatMap((g) => {
		const i = g.graph_sample_names?.indexOf(chosen.source) ?? -1, j = g.graph_sample_names?.indexOf(chosen.target) ?? -1;
		return i < 0 || j < 0 ? [] : (g.graph_samples ?? []).filter((r) => Number.isFinite(r[i]) && Number.isFinite(r[j])).map((r) => [r[i], r[j]]);
	}) : [];
	const bounds = points.length ? [
		Math.min(...points.map((p) => p[0])),
		Math.max(...points.map((p) => p[0])),
		Math.min(...points.map((p) => p[1])),
		Math.max(...points.map((p) => p[1]))
	] : void 0;
	const colors$1 = ["#4168a9", "#248575"], groups = [c.left, c.right];
	const hasRaw = groups.some((g) => g.graph_samples?.length);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: root,
		className: "lx-scenario",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `.lx-scenario{font-size:12px;width:100%}.lx-fullscreen-dialog[open] .lx-scenario-matrices .lx-matrix-svg{height:400px;flex:none;max-height:400px!important}.lx-scenario-summary{margin-bottom:16px}.lx-scenario-summary strong{font-weight:600}.lx-scenario-legend{display:flex;flex-wrap:wrap;gap:10px 24px;margin:12px 0;color:var(--dsw-alias-label-secondary)}.lx-scenario-legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px}.lx-scenario-context{color:var(--dsw-alias-label-secondary);margin:10px 0 18px}.lx-scenario-context summary{cursor:pointer}.lx-scenario-context p{line-height:1.65;max-width:900px}.lx-scenario-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0}.lx-scenario-meta{font-size:11px;color:var(--dsw-alias-label-secondary)}.lx-scenario-actions{display:flex;align-items:center;gap:16px}.lx-scenario-actions .lx-action-menu>summary{color:var(--dsw-alias-label-secondary)}.lx-scenario-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.lx-scenario-panel{padding:12px 16px;margin:0 0 16px;background:var(--dsw-alias-interactive-bg-hover,#f5f6f8);border-radius:6px}.lx-scenario-panel-head button{font:inherit;color:var(--dsw-alias-label-secondary)}.lx-scenario-list{display:grid;gap:0}.lx-scenario-item{border-top:1px solid var(--dsw-alias-border-primary,#ddd)}.lx-scenario-pair{display:grid;grid-template-columns:minmax(160px,1fr) minmax(170px,1.4fr) minmax(110px,.75fr);gap:22px;align-items:center;width:100%;padding:14px 10px!important;text-align:left!important;color:inherit!important;font:inherit!important;background:transparent;border:0;cursor:pointer}.lx-scenario-pair:disabled{opacity:1!important;cursor:default}.lx-scenario-pair[aria-expanded=true]{background:color-mix(in srgb,#4168a9 5%,transparent)}.lx-scenario-name{font-weight:500;overflow-wrap:anywhere}.lx-scenario-name small{display:block;margin-top:5px;font-weight:400;font-size:11px;color:var(--dsw-alias-label-secondary)}.lx-scenario-bars{display:grid;gap:7px}.lx-scenario-bar{display:grid;grid-template-columns:minmax(0,1fr) 52px;gap:10px;align-items:center}.lx-scenario-track{position:relative;background:var(--dsw-alias-interactive-bg-hover,#f0f2f5);height:9px;border-radius:2px}.lx-scenario-fill{height:100%;border-radius:2px}.lx-scenario-threshold{position:absolute;top:-2px;bottom:-2px;border-left:1px dashed var(--dsw-alias-label-secondary,#888)}.lx-scenario-value{font-variant-numeric:tabular-nums;text-align:right}.lx-scenario-status{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.6}.lx-scenario-scatter{padding:14px 18px;background:color-mix(in srgb,#4168a9 3%,transparent)}.lx-scenario-scatter .lx-relationship-columns{max-width:760px;margin:0 auto;gap:32px}.lx-scenario-scatter .lx-causal-graph{max-height:220px;width:100%}.lx-scenario-expand{margin:12px 0}.lx-scenario-matrices .lx-relationship-columns{margin-top:16px}@container(max-width:650px){.lx-scenario-pair{grid-template-columns:minmax(100px,1fr) minmax(130px,1.3fr);gap:12px}.lx-scenario-status{grid-column:1/-1}.lx-scenario-heading{align-items:flex-start;flex-direction:column}}` }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-insight lx-scenario-summary",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: top && Math.abs(top.right_weight - top.left_weight) > 0 ? `分数差异最大的是“${label(top.source)} → ${label(top.target)}”，两组相差 ${number(Math.abs(top.right_weight - top.left_weight))}。` : records.length ? "两组已显示关系的分数相同。" : "共同阈值下，两组均无显示关系。" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					"两组共同显示 ",
					common,
					" 条关系；仅",
					c.left.label,
					"达到阈值的有 ",
					left,
					" 条，仅",
					c.right.label,
					"达到阈值的有 ",
					right,
					" 条。"
				] })]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-scenario-legend",
				children: groups.map((g, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: colors$1[i] } }),
					g.label,
					" · ",
					g.input_rows ?? "未知",
					" 条样本"
				] }, i))
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-scenario-heading",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "重点关系对比" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-scenario-actions",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "lx-scenario-meta",
						children: ["按分数差异排序 · 共用 0—1 刻度 · 虚线为阈值 ", number(c.threshold)]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ActionMenu, {
						label: "更多",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-compare-panel": "context",
							"aria-pressed": panel === "context",
							children: "分组依据与比较口径"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-compare-panel": "matrix",
							"aria-pressed": panel === "matrix",
							children: "关系矩阵"
						})]
					})]
				})]
			}),
			panel && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "lx-scenario-panel",
				"aria-label": panel === "context" ? "分组依据与比较口径" : "关系矩阵",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-scenario-panel-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: panel === "context" ? "分组依据与比较口径" : "关系矩阵" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-compare-panel": "close",
						"aria-label": "收起辅助内容",
						children: "收起 ↑"
					})]
				}), panel === "context" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-scenario-context",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: c.description }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: c.left.model_type && c.left.model_type === c.right.model_type ? `两组服务返回模型：${c.left.model_type}。` : "此历史结果未保存一致的模型标识，模型口径尚未核验。" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "关系分数来自两组独立的模型探索，不是影响幅度或因果概率。样本与取值范围的差异也会影响分数，适合作为进一步核查的线索。" }),
						!hasRaw && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "此历史对比未保存原始样本，暂不提供散点预览。" })
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "lx-scenario-matrices",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "lx-relationship-columns",
						children: groups.map((g, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: g.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Matrix, {
							data: {
								...g,
								nodes: data.nodes,
								graph_weights: data.nodes.map((a) => data.nodes.map((b) => g.graph_weights[g.nodes.indexOf(a)][g.nodes.indexOf(b)]))
							},
							threshold: c.threshold
						})] }, i))
					})
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-scenario-list",
				children: (expanded ? records : records.slice(0, 5)).map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-scenario-item",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "lx-scenario-pair",
						"data-compare-pair": key(r),
						"aria-expanded": selected === key(r),
						disabled: !hasRaw,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "lx-scenario-name",
								children: [
									label(r.source),
									" → ",
									label(r.target),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: ["分数相差 ", number(Math.abs(r.right_weight - r.left_weight))] })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "lx-scenario-bars",
								children: [r.left_weight, r.right_weight].map((v, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "lx-scenario-bar",
									"aria-label": `${groups[i].label}：${number(v)}`,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "lx-scenario-track",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "lx-scenario-fill",
											style: {
												display: "block",
												width: `${Math.max(0, Math.min(1, v)) * 100}%`,
												background: colors$1[i]
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "lx-scenario-threshold",
											style: { left: `${c.threshold * 100}%` }
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "lx-scenario-value",
										children: number(v)
									})]
								}, i))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "lx-scenario-status",
								children: [r.left_present && r.right_present ? "两组均达到显示阈值" : `仅${r.left_present ? c.left.label : c.right.label}达到显示阈值`, hasRaw && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}), selected === key(r) ? "收起原始数据 ↑" : "查看原始数据 ↓"] })]
							})
						]
					}), selected === key(r) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "lx-scenario-scatter",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "lx-relationship-columns",
							children: groups.map((g, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: { color: colors$1[i] },
								children: g.label
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Scatter, {
								data: {
									...g,
									labels: data.labels
								},
								a: r.source,
								b: r.target,
								bounds,
								color: colors$1[i]
							})] }, i))
						}), bounds && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "lx-explain-foot",
							children: "两组共用坐标范围，散点展示原始观测值。"
						})]
					})]
				}, key(r)))
			}),
			records.length > 5 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "lx-scenario-expand",
				"data-compare-expand": true,
				children: expanded ? "收起重点关系 ↑" : `查看全部 ${records.length} 条关系 ↓`
			})
		]
	});
}

//#endregion
//#region src/client/ExplanationView.tsx
const CSS$3 = `
.lx-fullscreen-dialog[open]>.lx-relationship-card{height:100dvh;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.lx-fullscreen-dialog[open]>.lx-relationship-card>.lx-result-meta:empty{display:none}
.lx-fullscreen-dialog[open]>.lx-relationship-card>.lx-explain{flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto}
.lx-fullscreen-dialog[open] .lx-relationship-view,.lx-fullscreen-dialog[open] .lx-network-view{flex:1;min-height:0;display:flex;flex-direction:column}
.lx-fullscreen-dialog[open] .lx-relationship-view>.lx-insight,.lx-fullscreen-dialog[open] .lx-network-toolbar,.lx-fullscreen-dialog[open] .lx-network-count{flex-shrink:0}
.lx-fullscreen-dialog[open] .lx-relationship-card>.lx-result-actions{flex-shrink:0}
.lx-fullscreen-dialog[open] .lx-network-stage{flex:1;min-height:0;overflow:auto;align-items:stretch}
.lx-fullscreen-dialog[open] .lx-network-stage>.lx-graph-scroll{min-height:0;min-width:0;display:flex;flex-direction:column}
.lx-fullscreen-dialog[open] .lx-network-stage .lx-network-svg{height:100%;max-height:none!important;min-height:0;flex:1;min-width:0!important}
.lx-fullscreen-dialog[open] .lx-network-detail{align-self:end}
.lx-fullscreen-dialog[open] .lx-relationship-matrix{max-width:none}
.lx-fullscreen-dialog[open] .lx-relationship-matrix>.lx-matrix-svg{height:0;flex:1;min-height:0;min-width:0!important;max-height:none!important}
.lx-fullscreen-dialog[open] .lx-relationship-matrix>.lx-explain-foot{flex-shrink:0}

.lx-network-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:12px;margin:12px 0 16px}.lx-network-toolbar strong{font-size:13px}.lx-network-toolbar>button{font-size:11px!important}.lx-network-count,.lx-network-toolbar .lx-graph-mode{color:var(--dsw-alias-label-secondary)}.lx-network-actions{display:flex;align-items:center;gap:16px;margin-left:auto}.lx-network-toolbar .lx-export{margin:0;padding:0}.lx-network-toolbar button,.lx-network-toolbar summary,.lx-network-toolbar strong,.lx-network-toolbar .lx-graph-mode{line-height:22px!important}.lx-network-toolbar .lx-network-actions>button{padding:0!important;font-size:12px!important}.lx-network-toolbar .lx-action-menu>summary{padding:0}.lx-network-count{text-align:right;font-size:11px;margin-top:8px}.lx-network-stage{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:end}.lx-network-stage.has-detail{grid-template-columns:minmax(0,1fr) 220px}.lx-network-detail{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3,#dce2eb);border-radius:8px;padding:10px;background:var(--dsw-alias-background-primary,#fff);font-size:12px;min-width:0}.lx-network-detail-head{display:flex;gap:8px;justify-content:space-between;align-items:start}.lx-network-detail-head button{font-size:18px!important;line-height:1!important}.lx-network-detail .lx-explain-foot{margin-top:6px;font-size:10px}.lx-network-detail .lx-causal-graph{height:145px!important;max-height:145px!important;min-width:0!important}.lx-network-stage .lx-network-svg{height:360px;max-height:360px!important}.lx-edge-score{cursor:pointer}.lx-graph-edge-button:focus{outline:none!important}.lx-graph-edge-button:focus-visible .lx-causal-edge{stroke-width:3;stroke-dasharray:4 2}.lx-relationship-nav [data-relationship="matrix"]{margin-left:auto}.lx-relationship-nav{align-items:center}.lx-relationship-settings{position:relative}.lx-relationship-settings summary{list-style:none;cursor:pointer;padding:6px;display:flex}.lx-relationship-settings summary::-webkit-details-marker{display:none}.lx-relationship-settings[open] .lx-analysis-toolbar{position:absolute;z-index:5;right:0;top:32px;width:300px;padding:12px;border:1px solid var(--dsw-alias-border-l3,#dce2eb);border-radius:8px;background:var(--dsw-alias-background-primary,#fff);box-shadow:0 4px 16px #0001;display:flex;flex-wrap:wrap;gap:12px}.lx-matrix-stage{margin-top:16px}.lx-relationship-matrix>.lx-matrix-svg{height:400px;max-height:400px!important}.lx-matrix-stage>.lx-graph-scroll{min-width:0}.lx-network-detail .lx-explain-foot{display:flex;gap:4px;align-items:center}.lx-relationship-matrix{width:100%;max-width:620px;justify-self:center}.lx-relationship-matrix>.lx-explain-foot{text-align:center}.lx-relationship-matrix [data-pair]:focus{outline:none}.lx-relationship-matrix [data-pair]:focus-visible{stroke:#ff5b2a;stroke-width:2}@container(max-width:760px){.lx-network-stage.has-detail{grid-template-columns:1fr}.lx-network-detail{width:min(100%,220px);justify-self:end}}

@container(min-width:1000px){.lx-prediction-comparison{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.lx-prediction-comparison>p{grid-column:1/-1}.lx-prediction-comparison>div+div{border-top:0!important;margin-top:0!important;padding-top:0!important}.lx-prediction-comparison .lx-matrix-svg{min-width:0}.lx-prediction-comparison .lx-matrix-expanded .lx-matrix-svg{min-width:650px}}
.lx-insight{padding:12px 15px;border-left:3px solid #4168a9;background:color-mix(in srgb,#4168a9 5%,transparent);font-size:13px;line-height:1.7;margin:0 0 18px}.lx-relationship-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.lx-relationship-detail{margin-top:16px}.lx-relationship-detail select{max-width:100%}.lx-relationship-columns .lx-causal-graph{max-height:380px}@container(max-width:650px){.lx-relationship-columns{grid-template-columns:1fr}}
.lx-fullscreen-dialog[open]>.lx-contribution-card{height:100dvh;min-height:0;display:flex;flex-direction:column}
.lx-fullscreen-dialog[open]>.lx-contribution-card>.lx-explain{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column}
.lx-fullscreen-dialog[open] .lx-batch-view{flex:1;display:flex;flex-direction:column;min-height:0}
.lx-fullscreen-dialog[open] .lx-batch-overview{flex:1;min-height:0}
.lx-fullscreen-dialog[open] .lx-batch-overview:not(:has(.lx-matrix-comparison))>div,.lx-fullscreen-dialog[open] .lx-batch-overview:not(:has(.lx-matrix-comparison))>div>div{height:100%;display:flex;flex-direction:column;min-height:0}
.lx-fullscreen-dialog[open] .lx-batch-overview .lx-matrix-scroll{flex:1;min-height:0;display:flex}
.lx-fullscreen-dialog[open] .lx-batch-overview .lx-matrix-svg{height:100%;max-height:none!important;min-height:0}
.lx-fullscreen-dialog[open] .lx-contribution-card>.lx-result-actions{flex-shrink:0;margin-top:12px}
.lx-explain{margin:16px 0 8px;container-type:inline-size}
.lx-explain-head{display:flex;justify-content:space-between;gap:16px;align-items:baseline;margin:0 0 20px}
.lx-explain-label{font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:4px}
.lx-explain-value{font-size:25px;font-weight:500;font-variant-numeric:tabular-nums;line-height:1.35}
.lx-explain-unit{font-size:12px;margin-left:6px;color:var(--dsw-alias-label-secondary)}
.lx-explain-diff{font-size:12px;text-align:right;color:var(--dsw-alias-label-secondary);max-width:48%}
.lx-explain-subtitle{display:flex;justify-content:space-between;font-size:12px;color:var(--dsw-alias-label-secondary);margin:12px 0}
.lx-factor{display:grid;grid-template-columns:minmax(72px,1fr) minmax(70px,2fr) 66px 64px;align-items:center;gap:12px;padding:8px 0}
.lx-factor-name{font-size:13px;font-weight:500}.lx-factor-key{font-size:11px;color:var(--dsw-alias-label-tertiary);margin-left:6px}
.lx-factor-track{height:7px;background:color-mix(in srgb,var(--dsw-alias-label-secondary) 9%,transparent);border-radius:2px;overflow:hidden}
.lx-factor-bar{height:100%;background:#848991;border-radius:2px}.lx-factor-bar[data-direction="-1"]{background:#4168a9}.lx-factor-bar[data-direction="1"]{background:#248575}.lx-factor-bar[data-direction="0"]{background:#697680}
.lx-factor-score{font-variant-numeric:tabular-nums;text-align:right;font-size:12px}
.lx-factor-direction{font-size:11px;color:var(--dsw-alias-label-secondary);text-align:right}
.lx-explain-foot{font-size:11px;color:var(--dsw-alias-label-secondary);margin:14px 0 0;line-height:1.6}
.lx-explain-toggle{margin-top:10px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important}
.lx-causal-graph{width:100%;display:block;margin:8px 0;color:var(--dsw-alias-label-primary)}
.lx-causal-graph text{fill:currentColor;font-family:inherit;pointer-events:none}
.lx-causal-edge{stroke:#7793c3;stroke-width:1.7;fill:none}
.lx-causal-node{fill:var(--dsw-alias-background-primary,#fafbfd);stroke:var(--dsw-alias-border-l3,#dce2eb);stroke-width:1}
.lx-causal-node[data-target=true]{fill:color-mix(in srgb,#4676c8 8%,var(--dsw-alias-background-primary,#fafbfd));stroke:#a4bce2}
.lx-edge-list{font-size:12px;margin:12px 0;padding:0;list-style:none;max-height:280px;overflow:auto}.lx-edge-list li{display:flex;justify-content:space-between;gap:10px;padding:5px 0}
.lx-explain-warning{font-size:12px;color:#986b23;margin:10px 0}
@container(max-width:420px){.lx-factor{grid-template-columns:90px minmax(40px,1fr) 50px;gap:8px}.lx-factor-direction{grid-column:1/-1;text-align:left;margin-top:-6px}.lx-explain-head{display:block}.lx-explain-diff{max-width:none;text-align:left;margin-top:8px}}

.lx-causal-node[data-selected=true]{stroke:#4168a9;stroke-width:2}
.lx-graph-node-button{cursor:pointer}.lx-graph-node-button:focus{outline:none}.lx-graph-node-button:focus-visible rect{stroke:#4168a9;stroke-width:2}
.lx-batch-summary{display:flex;justify-content:space-between;gap:12px;font-size:12px;margin-bottom:16px}.lx-batch-summary strong{font-weight:500;font-size:14px}.lx-batch-summary span{color:var(--dsw-alias-label-secondary)}
.lx-batch-meta{display:flex;align-items:center;gap:6px}.lx-explain-info{position:relative;color:var(--dsw-alias-label-secondary)}
.lx-explain-info summary{display:flex;align-items:center;justify-content:center;width:22px;height:22px;list-style:none;cursor:pointer;border-radius:4px}.lx-explain-info summary::-webkit-details-marker{display:none}.lx-explain-info summary:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover,#f3f5f8)}
.lx-explain-info-body{position:absolute;top:calc(100% + 6px);right:0;z-index:3;width:280px;max-width:70vw;box-sizing:border-box;padding:12px 14px;background:var(--dsw-alias-background-primary,#fff);border:1px solid var(--dsw-alias-border-l3,#dce2eb);border-radius:8px;box-shadow:0 4px 18px #00000010;font-size:12px;line-height:1.6}.lx-explain-info-body strong{font-size:12px;color:var(--dsw-alias-label-primary)}.lx-explain-info-body p{margin:6px 0 0}
.lx-graph-mode{display:flex;align-items:center;gap:5px}.lx-explain-help{position:relative;display:inline-flex}
.lx-result button.lx-explain-help-trigger{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;color:var(--dsw-alias-label-secondary);border-radius:4px}
.lx-result button.lx-explain-help-trigger:hover,.lx-result button.lx-explain-help-trigger[aria-expanded=true]{color:var(--dsw-alias-state-business-primary,#3465ce);background:var(--dsw-alias-interactive-bg-hover,#f3f5f8)}
.lx-explain-subtitle .lx-explain-help .lx-explain-info-body{left:auto;right:0}
.lx-explain-help .lx-explain-info-body{top:100%;left:0;right:auto;max-width:min(280px,60cqw)}
.lx-explain-tabs{display:flex;gap:22px;border-bottom:1px solid var(--dsw-alias-border-l3,#e7e9ed);margin-bottom:18px}
.lx-explain-tabs button{font-size:13px!important;padding:8px 0 11px!important;color:var(--dsw-alias-label-secondary)!important;border-bottom:2px solid transparent!important;border-radius:0!important}
.lx-explain-tabs button[aria-pressed=true]{color:var(--dsw-alias-label-primary)!important;border-color:#466fbc!important;font-weight:500}
.lx-heatmap-heading{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:24px 0 8px;font-size:12px}
.lx-heatmap-scroll,.lx-graph-scroll{overflow:auto}
.lx-heatmap{width:100%;border-collapse:separate;border-spacing:3px;font-size:10px;font-variant-numeric:tabular-nums}
.lx-heatmap th{font-weight:400;color:var(--dsw-alias-label-secondary);text-align:center;white-space:nowrap;padding:3px 0!important}.lx-heatmap td{padding:0!important;min-width:22px}
.lx-heat-cell{display:block;height:17px;min-width:20px;border-radius:2px}
.lx-heatmap tbody button{font-size:10px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important;padding:0 4px!important;white-space:nowrap}
.lx-heat-pred{text-align:right;white-space:nowrap;font-size:10px;padding-left:6px!important}
.lx-heatmap-footer{display:flex;justify-content:space-between;gap:12px;font-size:10px;color:var(--dsw-alias-label-secondary);margin-top:8px}
.lx-heatmap-footer>div{display:flex;gap:12px;align-items:center}.lx-heatmap-footer button{padding:2px 6px!important}.lx-heatmap-footer button:disabled{opacity:.3;cursor:default}
.lx-sample-control,.lx-graph-toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;font-size:11px;color:var(--dsw-alias-label-secondary);margin-bottom:18px}
.lx-sample-control select{background:var(--dsw-alias-background-primary,#fff);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l3,#dce2eb);border-radius:5px;padding:4px 8px;margin-left:8px}
.lx-graph-toolbar{justify-content:flex-start;margin:4px 0 0}.lx-graph-toolbar button{font-size:11px!important;padding:5px 9px!important;border:1px solid var(--dsw-alias-border-l3,#dce2eb)!important;border-radius:5px!important}
.lx-analysis-toolbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.lx-small-button{border:1px solid var(--dsw-alias-border-l3,#dce2eb)!important;border-radius:5px!important;padding:5px 9px!important;font-size:11px!important;white-space:nowrap}
.lx-filter{flex:1}.lx-filter-panel{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-top:12px;padding:10px;background:var(--dsw-alias-background-secondary,#f7f8fa);border-radius:6px}.lx-filter-panel label{display:grid;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.lx-filter input,.lx-filter select,.lx-raw input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3,#dce2eb);border-radius:4px;padding:5px 7px;min-height:29px;background:var(--dsw-alias-background-primary,#fff);color:var(--dsw-alias-label-primary,#202734);font:inherit;max-width:220px}.lx-filter-range{display:flex;align-items:center;gap:6px}.lx-filter-range input{width:74px}.lx-filter-actions{display:flex;align-items:center;gap:10px;font-size:11px}.lx-filter-error{width:100%;font-size:11px;color:#986b23;margin:0}
.lx-filter-summary{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:11px;margin:8px 0 16px;color:var(--dsw-alias-label-secondary)}.lx-filter-summary strong{font-weight:500;color:var(--dsw-alias-label-primary)}
.lx-export{display:flex;gap:9px;align-items:center;flex-wrap:wrap;font-size:10px;color:var(--dsw-alias-label-secondary);padding-top:5px}.lx-export button{font-size:10px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important}.lx-export-status:empty{display:none}
.lx-plot-tabs{display:flex;gap:14px;margin:0 0 16px}.lx-plot-tabs button{font-size:11px!important;color:var(--dsw-alias-label-secondary)!important;padding:3px 0!important}.lx-plot-tabs button[aria-pressed=true]{color:var(--dsw-alias-state-business-primary,#3465ce)!important;font-weight:500}
.lx-matrix-comparison>div+div{border-top:1px solid var(--dsw-alias-border-l3,#dce2eb);margin-top:20px;padding-top:20px}.lx-matrix-comparison .lx-matrix-svg{max-height:290px}.lx-matrix-comparison .lx-matrix-readout{min-height:0}
.lx-raw-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 0;font-size:11px;color:var(--dsw-alias-label-secondary)}.lx-raw-toolbar input{width:250px;max-width:70%;font-size:11px}.lx-raw-scroll{overflow:auto;max-height:490px}.lx-raw-table{border-collapse:collapse;width:100%;font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}.lx-raw-table th,.lx-raw-table td{text-align:left;padding:7px 10px!important;border-bottom:1px solid var(--dsw-alias-border-l3,#e7e9ed)}.lx-raw-table th{position:sticky;top:0;background:var(--dsw-alias-background-primary,#fff);font-weight:500;color:var(--dsw-alias-label-secondary)}.lx-raw-table button{font-size:11px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important}
@container(max-width:520px){.lx-heatmap-heading{display:block}.lx-batch-summary{flex-wrap:wrap}.lx-graph-toolbar{flex-wrap:wrap}}
`;
function ExplanationView({ data, showRelationData = false, showPredictionCheck = false, onVisual }) {
	const [detail, setDetail] = (0, react.useState)(null);
	const [failure, setFailure] = (0, react.useState)(null), [attempt, setAttempt] = (0, react.useState)(0);
	const detailKey = batchDetailKey(data), error = failure?.key === detailKey ? failure.message : "";
	const root = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		const element = root.current;
		const click = (event) => {
			if (event.target.closest("[data-lx-explain-retry]")) setAttempt((n) => n + 1);
		};
		element?.addEventListener("click", click);
		return () => element?.removeEventListener("click", click);
	}, []);
	(0, react.useEffect)(() => {
		if (!data.detail_path || !data.detail_sha256 && data.mode !== "local" && !data.graph_sample_count && !data.comparison?.left.graph_sample_count) return;
		const controller = new AbortController();
		setFailure(null);
		setDetail(null);
		fetch("/limix-ui/artifact?path=" + encodeURIComponent(data.detail_path), { signal: controller.signal }).then(async (response) => {
			if (!response.ok) throw new Error(`读取失败（${response.status}）`);
			const value = data.detail_sha256 ? await parseComparisonDetail(await response.text(), data) : await response.json();
			if (!data.detail_sha256 && !(data.mode === "local" ? validBatchDetail(value, data) : data.comparison ? validComparisonDetail(value, data) : validGraphDetail(value, data))) throw new Error("样本文件与本次结果不一致");
			if (!controller.signal.aborted) setDetail({
				key: detailKey,
				data: value
			});
		}).catch((reason) => {
			if (!controller.signal.aborted) setFailure({
				key: detailKey,
				message: reason.message
			});
		});
		return () => controller.abort();
	}, [detailKey, attempt]);
	const loaded = detail?.key === detailKey ? detail.data : data, batch = (data.requested_count ?? 1) > 1 || data.task_type === "timeseries";
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "lx-explain",
		ref: root,
		"aria-label": data.mode === "local" ? "样本贡献解释" : "变量关系图",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: CSS$3 }),
			data.detail_sha256 && detail?.key !== detailKey ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: "lx-explain-foot",
				role: "status",
				children: [
					error || "正在加载场景关系对比…",
					" ",
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						"data-lx-explain-retry": true,
						children: "重试"
					})
				]
			}) : data.mode !== "local" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [showRelationData ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationDataTable, { data: loaded }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelationshipView, { data: loaded }, detailKey), error && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				role: "alert",
				className: "lx-explain-foot",
				children: [
					"原始数据预览：",
					error,
					" ",
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						"data-lx-explain-retry": true,
						children: "重试"
					})
				]
			})] }) : batch ? loaded.samples ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationBatch, {
				showPredictionCheck,
				data: loaded,
				showRaw: showRelationData,
				onVisual
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: "lx-explain-foot",
				role: "status",
				children: [
					error || `正在加载 ${data.explained_count} 个样本的解释…`,
					" ",
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-lx-explain-retry": true,
						children: "重试"
					})
				]
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationSingle, {
				showPredictionCheck,
				data
			}),
			!!data.risks?.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "lx-explain-warning",
				role: "note",
				children: data.risks.map((r) => typeof r === "string" ? r : JSON.stringify(r)).join("；")
			})
		]
	});
}

//#endregion
//#region src/client/BenchmarkView.tsx
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
const CSS$2 = `.lx-bench-controls{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin:16px 0}.lx-bench-controls label{display:flex;gap:7px;align-items:center}.lx-bench-controls select{font:inherit;color:inherit;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l3,#ddd);border-radius:5px;padding:4px 8px}.lx-bench-chart{width:100%;height:auto;max-height:320px}.lx-bench-table{width:100%;border-collapse:collapse;font-size:12px}.lx-bench-table th,.lx-bench-table td{text-align:left;padding:8px;border-bottom:1px solid var(--dsw-alias-border-l3,#e3e6eb);font-variant-numeric:tabular-nums}.lx-bench-scroll{overflow:auto}.lx-bench-error{color:var(--dsw-alias-label-secondary);font-size:12px;overflow-wrap:anywhere}`;
function BenchmarkView({ data, staticView = false }) {
	const [datasetId, setDatasetId] = (0, react.useState)(data.datasets?.[0]?.id ?? "");
	const [metric, setMetric] = (0, react.useState)("");
	const root = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
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
	const x = (value) => 150 + 430 * (value - min) / range;
	const format = (value, name = key) => finite(value) ? name.includes("accuracy") ? `${(value * 100).toFixed(2)}%` : String(Number(value.toFixed(4))) : "—";
	if (!dataset) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
		className: "lx-result-note",
		children: "比较结果未包含数据集。"
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: root,
		"aria-label": "多模型效果比较",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: CSS$2 }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-bench-controls",
				children: [staticView ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: dataset.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labels[key] })] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["数据集 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
					"data-bench": "dataset",
					value: dataset.id,
					onChange: () => {},
					"aria-label": "比较数据集",
					children: datasets.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: item.id,
						children: item.name
					}, item.id))
				})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["指标 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
					"data-bench": "metric",
					value: key,
					onChange: () => {},
					"aria-label": "比较指标",
					children: keys.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: item,
						children: labels[item]
					}, item))
				})] })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "lx-result-meta",
					children: key === "rmse" || key === "mae" ? "越低越好" : "越高越好"
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
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
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: "lx-bench-chart",
				viewBox: `0 0 700 ${runs.length * 46 + 32}`,
				role: "img",
				"aria-label": `${dataset.name}：${labels[key]}模型对比`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
					x1: x(0),
					x2: x(0),
					y1: "12",
					y2: runs.length * 46 + 6,
					stroke: "currentColor",
					opacity: ".2"
				}), runs.map((run, index) => {
					const value = run.status === "succeeded" ? run.metrics?.[key] : null;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
						transform: `translate(0 ${index * 46 + 20})`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								x: "0",
								y: "13",
								fill: "currentColor",
								fontSize: "12",
								children: run.model.replace("LIMIX_", "LimiX ")
							}),
							finite(value) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								x: Math.min(x(0), x(value)),
								y: "0",
								width: Math.abs(x(value) - x(0)),
								height: "20",
								rx: "2",
								fill: colors[index % colors.length]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
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
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-bench-scroll",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: "lx-bench-table",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "模型" }),
						keys.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: labels[item] }, item)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "耗时" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "状态" })
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: runs.map((run) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: run.model }),
						keys.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: run.status === "succeeded" ? format(run.metrics?.[item], item) : "—" }, item)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: finite(run.elapsed_seconds) ? `${run.elapsed_seconds.toFixed(1)} 秒` : "—" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: statuses[run.status] ?? "状态待确认" })
					] }, run.model)) })]
				})
			}),
			runs.filter((run) => run.error).map((run) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
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
//#region src/client/use-card-fullscreen.ts
const CARD_FULLSCREEN_CSS = `
.lx-card-host{display:flow-root;min-width:0}
.lx-fullscreen-dialog:not([open]){display:contents}
.lx-fullscreen-dialog[open]{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;box-sizing:border-box;margin:0;padding:0;border:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;background:var(--dsw-alias-background-primary,#fff);color:var(--dsw-alias-label-primary);font:inherit}
.lx-fullscreen-dialog::backdrop{background:var(--dsw-alias-background-primary,#fff)}
.lx-fullscreen-dialog[open]>.lx-result{box-sizing:border-box;min-height:100%;max-width:1600px;margin:0 auto;border:0;border-radius:0;padding:24px clamp(18px,3vw,52px)}
.lx-result button.lx-fullscreen-button{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:28px;height:28px;padding:0;border-radius:5px;color:var(--dsw-alias-label-secondary)}
.lx-result button.lx-fullscreen-button:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f5f8);color:var(--dsw-alias-state-business-primary,#3465ce)}
.lx-fullscreen-dialog[open] .lx-result-head{position:sticky;top:-1px;z-index:2;background:var(--dsw-alias-background-primary,#fff);padding:7px 0}
.lx-fullscreen-dialog[open] .lx-matrix-svg{max-height:max(340px,calc(100dvh - 350px))}
.lx-fullscreen-dialog[open] .lx-causal-graph{max-height:max(340px,calc(100dvh - 350px))!important}
`;
function useCardFullscreen() {
	const hostRef = (0, react.useRef)(null), dialogRef = (0, react.useRef)(null);
	const [expanded, setExpanded] = (0, react.useState)(false), [error, setError] = (0, react.useState)("");
	const triggerRef = (0, react.useRef)(null), restoreFocus = (0, react.useRef)(false);
	(0, react.useEffect)(() => {
		if (expanded || !restoreFocus.current) return;
		const frame = requestAnimationFrame(() => {
			if (!restoreFocus.current || dialogRef.current?.open) return;
			restoreFocus.current = false;
			if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true });
		});
		return () => cancelAnimationFrame(frame);
	}, [expanded]);
	(0, react.useEffect)(() => {
		const host = hostRef.current, dialog = dialogRef.current;
		if (!host || !dialog) return;
		let scrolls = [];
		const clearModal = () => {
			dialog.setAttribute("aria-modal", "false");
			dialog.setAttribute("role", "presentation");
		};
		const closeDialog = () => {
			clearModal();
			dialog.close();
		};
		const close = () => {
			if (dialog.open) return;
			clearModal();
			restoreFocus.current = true;
			host.style.height = "";
			setExpanded(false);
			for (const s of scrolls) {
				s.element.scrollTop = s.top;
				s.element.scrollLeft = s.left;
			}
		};
		const click = (event) => {
			const button = event.target.closest("[data-lx-fullscreen]");
			if (!button || !dialog.contains(button)) return;
			event.stopPropagation();
			if (dialog.open) {
				closeDialog();
				return;
			}
			triggerRef.current = button;
			restoreFocus.current = false;
			scrolls = [];
			setError("");
			for (let parent = host.parentElement; parent; parent = parent.parentElement) if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) scrolls.push({
				element: parent,
				top: parent.scrollTop,
				left: parent.scrollLeft
			});
			host.style.height = `${host.getBoundingClientRect().height}px`;
			dialog.setAttribute("aria-modal", "true");
			dialog.setAttribute("role", "dialog");
			try {
				dialog.showModal();
				dialog.scrollTop = 0;
				setExpanded(true);
				button.focus({ preventScroll: true });
			} catch {
				clearModal();
				host.style.height = "";
				setError("暂时无法打开全屏，请重试。");
			}
		};
		const keydown = (event) => {
			if (dialog.open && event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				closeDialog();
			}
		};
		const cancel = (event) => {
			event.preventDefault();
			closeDialog();
		};
		dialog.addEventListener("click", click);
		dialog.addEventListener("close", close);
		dialog.addEventListener("cancel", cancel);
		dialog.addEventListener("keydown", keydown, true);
		return () => {
			dialog.removeEventListener("click", click);
			dialog.removeEventListener("close", close);
			dialog.removeEventListener("cancel", cancel);
			dialog.removeEventListener("keydown", keydown, true);
			restoreFocus.current = false;
			if (dialog.open) closeDialog();
			host.style.height = "";
		};
	}, []);
	return {
		hostRef,
		dialogRef,
		expanded,
		error
	};
}

//#endregion
//#region src/client/LimixToolCard.tsx
/** 经 Node 半自建的只读同源路由取 CSV；三处图表共用此一条通道 */
async function fetchCsv(p) {
	const r = await fetch("/limix-ui/csv?path=" + encodeURIComponent(p));
	if (!r.ok) throw new Error(`csv route ${r.status}`);
	return r.text();
}
const COMMAND_LABELS = {
	regress: "回归预测",
	classify: "分类预测",
	forecast: "时序预测",
	health: "服务连接",
	check: "访问权限",
	upload: "上传数据",
	download: "保存结果",
	task: "任务进度",
	tasks: "任务列表",
	result: "预测结果",
	data: "数据查询",
	cancel: "取消任务",
	explain: "因果解释",
	benchmark: "多模型效果比较",
	report: "业务分析报告",
	runtime: "分析环境"
};
const RUNNING_LABELS = {
	regress: "LimiX 正在预测…",
	classify: "LimiX 正在预测类别…",
	forecast: "LimiX 正在预测未来趋势…",
	benchmark: "正在比较模型表现…",
	report: "正在生成分析报告…",
	upload: "正在上传数据…",
	download: "正在保存结果…",
	data: "正在读取数据…",
	health: "正在连接 LimiX…",
	runtime: "正在检查分析环境…",
	task: "正在查询任务进度…",
	tasks: "正在读取任务列表…",
	result: "正在读取预测结果…",
	check: "正在检查访问权限…",
	cancel: "正在取消任务…"
};
const CSS$1 = `
.lx-running{display:flex;align-items:center;gap:16px!important;padding:22px 24px!important}
.lx-running-copy{flex:1;min-width:0}
.lx-running-spinner{box-sizing:border-box;corner-shape:round;flex:0 0 19px;width:19px;height:19px;border:2px solid var(--dsw-alias-border-l3,#e3eaf5);border-top-color:#466eb9;border-radius:50%;animation:lx-running-spin 1.15s linear infinite}
.lx-running-time{font-size:12px;color:var(--dsw-alias-label-tertiary,#858d99);font-variant-numeric:tabular-nums;white-space:nowrap}
@keyframes lx-running-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.lx-running-spinner{animation:none}}
@media(max-width:520px){.lx-running{flex-wrap:wrap}.lx-running-time{margin-left:35px}}

.lx-result{border:1px solid var(--dsw-alias-border-l3,#e3e6eb);border-radius:12px;padding:16px 18px;margin:4px 0;font:inherit;font-size:13px;line-height:1.6;min-width:0;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary)}
.lx-result-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.lx-result-brand{font-size:11px;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary);margin-bottom:5px}
.lx-result-topline{display:flex;align-items:center;justify-content:space-between;min-height:24px}
.lx-result button.lx-collapse{display:inline-flex;align-items:center;justify-content:center;width:28px;height:24px;padding:0;border-radius:4px;flex:none}
.lx-result button.lx-collapse:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f5f8)}
.lx-result[data-collapsed=true]>:not(style):not(.lx-result-brand):not(.lx-result-head){display:none!important}
.lx-result[data-collapsed=true] .lx-running-copy>.lx-result-meta{display:none}
.lx-result.lx-running[data-collapsed=true]>.lx-running-spinner,.lx-result.lx-running[data-collapsed=true]>.lx-running-copy,.lx-result.lx-running[data-collapsed=true]>.lx-collapse{display:flex!important}
.lx-result h3{margin:0;font:inherit;font-weight:600;font-size:15px}
.lx-result-status{display:inline-flex;align-items:center;gap:5px;font-size:12px;margin-left:auto;color:var(--dsw-alias-label-secondary)}
.lx-result-status::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.lx-result-status[data-state=done]{color:#21835c}
.lx-result-status[data-state=error]{color:#cf4545}
.lx-result-status[data-state=running]{color:#a56b16}
.lx-result-status[data-state=warning]{color:#a56b16}
.lx-result-meta{margin:5px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px}
.lx-forecast-meta{display:flex;align-items:baseline;justify-content:space-between;gap:8px 20px;flex-wrap:wrap;margin-top:8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.lx-forecast-footer{margin-left:auto;display:flex;align-items:center;gap:14px;color:var(--dsw-alias-label-secondary);font-size:12px}
.lx-forecast-baseline{max-width:360px;padding:6px 10px}
.lx-forecast-baseline p{margin:6px 0}
.lx-result-metrics{display:flex;flex-wrap:wrap;gap:14px 28px;margin:17px 0 12px;padding:0}
.lx-result-metrics div{min-width:90px}
.lx-result-metrics dt{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.lx-result-metrics dd{margin:3px 0 0;font-size:21px;line-height:1.25;font-weight:500;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.lx-result-note{margin:12px 0;color:var(--dsw-alias-label-secondary);font-size:12px}
.lx-result-actions{display:flex;align-items:center;flex-wrap:wrap;gap:14px;margin-top:14px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l3,#e3e6eb)}
.lx-result button,.lx-result a{border:0;background:transparent;padding:2px 0;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;text-align:left;text-decoration:none}
.lx-result button:hover{color:var(--dsw-alias-state-business-primary,#3465ce)}
.lx-result button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#3465ce);outline-offset:3px;border-radius:3px}
.lx-result button[data-lx=file]{color:var(--dsw-alias-state-business-primary,#3465ce)}
.lx-result a{color:var(--dsw-alias-state-business-primary,#3465ce)}
.lx-result a:hover{text-decoration:underline}
.lx-result-raw{margin:10px 0 0;padding:12px;max-height:250px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--dsw-alias-interactive-bg-hover,#f5f6f8);border-radius:6px;font-size:11px;line-height:1.7}
.lx-result-command{font-size:11px;white-space:pre-wrap;margin:10px 0 0;color:var(--dsw-alias-label-secondary)}
.lx-result-compact{padding:9px 12px;border-radius:9px}
.lx-result-compact .lx-result-head{gap:8px 12px}
.lx-result-compact .lx-result-brand{margin:0;flex-shrink:0}
.lx-result-compact h3{font-size:13px}
.lx-result-compact .lx-result-status{white-space:nowrap}
.lx-result button.lx-result-details-toggle{display:inline-flex;align-items:center;gap:4px;min-height:28px;white-space:nowrap}
.lx-result-compact .lx-result-note{margin:7px 0 0}
.lx-result-details-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
`;
function LimixToolCard({ callId, block, inspect, cwd, openFile }) {
	const settled = !!block && "kind" in block;
	const [showRaw, setShowRaw] = (0, react.useState)(false);
	const [showPredictionCheck, setShowPredictionCheck] = (0, react.useState)(false);
	const [showRelationData, setShowRelationData] = (0, react.useState)(false);
	const [showMetrics, setShowMetrics] = (0, react.useState)(false);
	const [collapsed, setCollapsed] = (0, react.useState)(false);
	const fullscreen = useCardFullscreen();
	const rootRef = (0, react.useRef)(null);
	const inspectRef = (0, react.useRef)(inspect);
	inspectRef.current = inspect;
	const openFileRef = (0, react.useRef)(openFile);
	openFileRef.current = openFile;
	(0, react.useEffect)(() => {
		const el = rootRef.current;
		if (!el) return;
		const onNativeClick = (e) => {
			const hit = e.target.closest?.("[data-lx]");
			if (!hit || !el.contains(hit)) return;
			if (hit.dataset.lx === "collapse") {
				el.querySelectorAll("details.lx-action-menu[open]").forEach((menu) => {
					menu.open = false;
				});
				setCollapsed((s) => !s);
			} else if (hit.dataset.lx === "expand-card") setCollapsed(false);
			else if (hit.dataset.lx === "raw") setShowRaw((s) => !s);
			else if (hit.dataset.lx === "prediction-check") setShowPredictionCheck((s) => !s);
			else if (hit.dataset.lx === "relation-data") setShowRelationData((s) => !s);
			else if (hit.dataset.lx === "metrics") setShowMetrics((s) => !s);
			else if (hit.dataset.lx === "inspect") inspectRef.current?.();
			else if (hit.dataset.lx === "file" && hit.dataset.path) {
				const dialog = fullscreen.dialogRef.current;
				if (dialog?.open) {
					dialog.setAttribute("aria-modal", "false");
					dialog.setAttribute("role", "presentation");
					dialog.close();
				}
				openFileRef.current?.(hit.dataset.path);
			}
		};
		el.addEventListener("click", onNativeClick);
		return () => el.removeEventListener("click", onNativeClick);
	}, []);
	const args = (0, react.useMemo)(() => {
		const raw = (block && "kind" in block ? block.call?.argsRaw : block?.argsRaw) ?? "{}";
		try {
			const v = JSON.parse(raw);
			return typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
		} catch {
			return {};
		}
	}, [block]);
	const text$1 = (0, react.useMemo)(() => (block?.content ?? []).filter((c) => c.type === "text" && c.text).map((c) => c.text).join("\n"), [block]);
	const result = (0, react.useMemo)(() => parseToolResult(text$1), [text$1]);
	const parsed = result.data;
	const cliFailed = settled && (block?.isError === true || result.failed);
	const status = resultState(settled, cliFailed, parsed);
	const metrics = metricEntries(parsed);
	const argList$1 = (0, react.useMemo)(() => {
		const raw = Array.isArray(args.args) ? args.args.filter((a) => typeof a === "string") : [];
		return raw[0] === args.command ? raw.slice(1) : raw;
	}, [args]);
	const shorten = (v) => typeof v === "string" && cwd && v.startsWith(cwd + "/") ? v.slice(cwd.length + 1) : v;
	const cmdLine = [
		"limix",
		typeof args.command === "string" ? args.command : "",
		...argList$1.map(shorten)
	].filter(Boolean).join(" ");
	/** 取命令行某个 flag 的值；时序与分类/回归两条支路共用 */
	const flagValue = (0, react.useMemo)(() => (flag$1) => {
		const i = argList$1.indexOf(flag$1);
		return i >= 0 && i + 1 < argList$1.length ? argList$1[i + 1] : void 0;
	}, [argList$1]);
	/** 结果文件路径：三类任务的 -o 产物统一经 saved_to 回报 */
	const savedCsv = (0, react.useMemo)(() => {
		const s = parsed && typeof parsed["saved_to"] === "string" ? parsed["saved_to"] : null;
		return s && s.toLowerCase().endsWith(".csv") ? s : null;
	}, [parsed]);
	const chartInfo = (0, react.useMemo)(() => {
		if (!settled || block?.isError) return null;
		if (args.command !== "forecast" && args.command !== "download") return null;
		if (!savedCsv) return null;
		return {
			saved: savedCsv,
			train: flagValue("--train"),
			target: flagValue("--target"),
			truth: flagValue("--truth"),
			date: flagValue("--date")
		};
	}, [
		settled,
		block,
		args,
		savedCsv,
		flagValue
	]);
	const evalInfo = (0, react.useMemo)(() => {
		if (!settled || block?.isError || cliFailed) return null;
		if (args.command !== "classify" && args.command !== "regress") return null;
		if (!savedCsv) return null;
		const target$1 = flagValue("--target");
		if (!target$1) return null;
		return {
			kind: args.command,
			saved: savedCsv,
			target: target$1,
			truth: flagValue("--truth"),
			predict: flagValue("--predict")
		};
	}, [
		settled,
		block,
		cliFailed,
		args,
		savedCsv,
		flagValue
	]);
	const [evalView, setEvalView] = (0, react.useState)(null);
	(0, react.useEffect)(() => {
		if (!evalInfo) {
			setEvalView(null);
			return;
		}
		let alive = true;
		(async () => {
			try {
				const resultText = await fetchCsv(evalInfo.saved);
				const pred = pickPredLabel(resultText);
				if (!pred) return;
				let truth = evalInfo.truth ? pickColumn(await fetchCsv(evalInfo.truth), evalInfo.target) : pickColumn(resultText, evalInfo.target);
				if (!evalInfo.truth && !truth && evalInfo.predict) truth = pickColumn(await fetchCsv(evalInfo.predict), evalInfo.target);
				if (!truth || !alive) return;
				const view = evalInfo.kind === "classify" ? ((d) => d && {
					kind: "cls",
					data: d
				})(buildConfusion(truth, pred)) : ((d) => d && {
					kind: "reg",
					data: d
				})(buildScatter(truth, pred));
				if (alive && view) setEvalView(view);
			} catch {}
		})();
		return () => {
			alive = false;
		};
	}, [evalInfo]);
	const [chart, setChart] = (0, react.useState)(null);
	(0, react.useEffect)(() => {
		if (!chartInfo) {
			setChart(null);
			return;
		}
		let alive = true;
		(async () => {
			try {
				const series = parseForecastCsv(await fetchCsv(chartInfo.saved), chartInfo.target, chartInfo.date);
				if (!series) return;
				let hist = [];
				let startLabel;
				const colTarget = series.target ?? chartInfo.target;
				if (chartInfo.train && colTarget) try {
					const tail = parseTrainTail(await fetchCsv(chartInfo.train), colTarget, Math.min(3 * series.pred.length, 120), chartInfo.date);
					if (tail) {
						hist = tail.values;
						startLabel = tail.dates[0];
					}
				} catch {}
				let truth;
				if (chartInfo.truth && colTarget && chartInfo.date) try {
					truth = parseForecastTruth(await fetchCsv(chartInfo.truth), colTarget, chartInfo.date, series.dates);
				} catch {}
				if (!alive) return;
				setChart({
					hist,
					pred: series.pred,
					p10: series.p10,
					p90: series.p90,
					truth,
					target: series.target,
					forecastDates: series.dates,
					startLabel: startLabel ?? series.dates[0],
					endLabel: series.dates[series.dates.length - 1]
				});
			} catch {}
		})();
		return () => {
			alive = false;
		};
	}, [chartInfo]);
	const command = typeof args.command === "string" ? args.command : "";
	const benchmark = command === "benchmark" && parsed?.kind === "benchmark" && Array.isArray(parsed.datasets) && Array.isArray(parsed.runs) ? parsed : null;
	const report = command === "report" && !cliFailed && parsed?.kind === "report" ? parsed : null;
	const explanation = command === "explain" && !cliFailed ? parsed?.explanation : null;
	const rawTarget = flagValue("--target");
	const target = explanation?.target_label ?? (typeof parsed?.target_label === "string" ? parsed.target_label : typeof parsed?.labels?.fields?.[rawTarget ?? ""] === "string" ? parsed.labels.fields[rawTarget] : rawTarget);
	const rows$1 = parsed?.result_content?.rows ?? parsed?.rows;
	const sampleCount = parsed?.metrics?.n;
	const help = argList$1.some((arg) => arg === "--help" || arg === "-h");
	const prediction = !help && [
		"regress",
		"classify",
		"forecast"
	].includes(command);
	const forecast = prediction && command === "forecast";
	const forecastMeta = forecastSummary(chart?.forecastDates, rows$1, sampleCount);
	const title = help ? "参数说明" : parsed?.kind === "report_facts" ? "报告数据核验" : COMMAND_LABELS[command] ?? "工具结果";
	const originalFile = report && typeof report.report_path === "string" ? report.report_path : typeof parsed?.saved_to === "string" ? parsed.saved_to : null;
	const [reportAvailability, setReportAvailability] = (0, react.useState)(null);
	(0, react.useEffect)(() => {
		setReportAvailability(null);
		if (!report || !originalFile) return;
		const abort = new AbortController();
		fetch("/limix-ui/report-status?path=" + encodeURIComponent(originalFile) + "&fallback=" + encodeURIComponent(report.saved_to ?? ""), { signal: abort.signal }).then((r) => {
			if (!r.ok) throw new Error("status");
			return r.json();
		}).then((data) => setReportAvailability({
			...data,
			source: originalFile
		})).catch(() => {});
		return () => abort.abort();
	}, [originalFile, report?.saved_to]);
	const availability = reportAvailability?.source === originalFile ? reportAvailability : null;
	const file = availability?.status === "missing" ? null : availability?.path ?? originalFile;
	const errorMessage = typeof result.error?.error === "string" ? result.error.error : typeof result.error?.error_message === "string" ? result.error.error_message : "请展开调用详情，查看失败原因。";
	const hint = typeof result.error?.hint === "string" ? result.error.hint : "";
	const detailsId = `lx-result-details-${String(callId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
	const metricsId = `${detailsId}-metrics`;
	const compact = help || command === "health" || command === "runtime" || parsed?.kind === "report_facts";
	const files = help ? [] : taskFiles(command, argList$1, parsed, cwd);
	const fileLinks = openFile && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskFiles, { files });
	const collapseButton = !fullscreen.expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
		type: "button",
		className: "lx-collapse",
		"data-lx": "collapse",
		"aria-label": collapsed ? "展开卡片" : "收起卡片",
		title: collapsed ? "展开卡片" : "收起卡片",
		"aria-expanded": !collapsed,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 20 20",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.5",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: collapsed ? "m5 7 5 5 5-5" : "m5 12 5-5 5 5" })
		})
	});
	const rawToggle = text$1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
		type: "button",
		"data-lx": "raw",
		className: compact ? "lx-result-details-toggle" : void 0,
		"aria-label": compact ? `${showRaw ? "收起" : "展开"}${title}详情` : void 0,
		"aria-expanded": showRaw,
		"aria-controls": detailsId,
		children: compact ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [showRaw ? "收起" : "详情", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: "12",
			height: "12",
			viewBox: "0 0 16 16",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.5",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: showRaw ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4" })
		})] }) : showRaw ? "收起详情 ↑" : "调用详情 ↓"
	});
	const [waitingSeconds, setWaitingSeconds] = (0, react.useState)(0);
	(0, react.useEffect)(() => {
		setWaitingSeconds(0);
		if (settled) return;
		const start$1 = Date.now();
		const timer = setInterval(() => setWaitingSeconds(Math.floor((Date.now() - start$1) / 1e3)), 1e3);
		return () => clearInterval(timer);
	}, [callId, settled]);
	if (!settled) {
		const runningTitle = help ? "正在读取参数说明…" : command === "explain" ? ["directed", "undirected"].includes(flagValue("--mode") ?? "") ? "LimiX 正在探索变量关系…" : "LimiX 正在分析影响因素…" : RUNNING_LABELS[command] ?? "LimiX 正在执行任务…";
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "lx-card-host",
			ref: fullscreen.hostRef,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dialog", {
				className: "lx-fullscreen-dialog",
				ref: fullscreen.dialogRef,
				role: "presentation",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					ref: rootRef,
					className: "lx-result lx-running",
					"data-collapsed": collapsed,
					"aria-label": runningTitle,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: CSS$1 + CARD_FULLSCREEN_CSS }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "lx-running-spinner",
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "lx-running-copy",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								role: "status",
								children: runningTitle
							}), target && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "lx-result-meta",
								children: target
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "lx-running-time",
							title: "本次界面等待时长；重新打开页面会重新计时",
							children: ["已等待 ", waitingSeconds < 60 ? `${waitingSeconds} 秒` : `${Math.floor(waitingSeconds / 60)} 分 ${waitingSeconds % 60} 秒`]
						}),
						collapseButton
					]
				})
			})
		});
	}
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: "lx-card-host",
		ref: fullscreen.hostRef,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dialog", {
			className: "lx-fullscreen-dialog",
			ref: fullscreen.dialogRef,
			role: fullscreen.expanded ? "dialog" : "presentation",
			"aria-modal": fullscreen.expanded,
			"aria-label": fullscreen.expanded ? `${title}${target ? ` · ${target}` : ""}` : void 0,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: `lx-result${compact ? " lx-result-compact" : ""}${explanation?.mode === "local" && ((explanation.requested_count ?? 1) > 1 || explanation.task_type === "timeseries") ? " lx-contribution-card" : ""}${explanation && explanation.mode !== "local" && !explanation.comparison ? " lx-relationship-card" : ""}`,
				ref: rootRef,
				"data-collapsed": collapsed,
				"aria-label": `LimiX ${title}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: CSS$1 + CARD_FULLSCREEN_CSS }),
					!compact && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "lx-result-brand lx-result-topline",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "LimiX" }), collapseButton]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "lx-result-head",
						children: [
							compact && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "lx-result-brand",
								children: "LimiX"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", { children: [title, target ? ` · ${target}` : ""] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "lx-result-status",
								"data-state": status.kind,
								role: "status",
								children: !help && command === "health" && status.kind === "done" ? "连接正常" : status.label
							}),
							compact && !collapsed && rawToggle,
							compact && collapseButton,
							(explanation || benchmark) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "lx-fullscreen-button",
								"data-lx": "expand-card",
								"data-lx-fullscreen": true,
								"aria-label": fullscreen.expanded ? "退出全屏查看" : benchmark ? "全屏查看模型比较" : "全屏查看解释",
								title: fullscreen.expanded ? "退出全屏（Esc）" : benchmark ? "全屏查看模型比较" : "全屏查看解释",
								"aria-expanded": fullscreen.expanded,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
									width: "16",
									height: "16",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "1.6",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: fullscreen.expanded ? "M9 3v6H3M15 3v6h6M3 15h6v6M21 15h-6v6" : "M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" })
								})
							})
						]
					}),
					fullscreen.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "lx-result-note",
						role: "alert",
						children: fullscreen.error
					}),
					!compact && !forecast && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "lx-result-meta",
						children: [typeof rows$1 === "number" && Number.isFinite(rows$1) ? `${rows$1} 行预测结果` : "", typeof sampleCount === "number" && Number.isFinite(sampleCount) ? `${typeof rows$1 === "number" ? " · " : ""}${sampleCount} 个样本参与评估` : ""]
					}),
					forecast && status.kind === "done" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "lx-forecast-meta",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: forecastMeta.range }), metrics.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: forecastMeta.evaluation })]
					}),
					benchmark && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BenchmarkView, { data: benchmark }),
					report && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "lx-result-meta",
							children: [
								"Markdown + HTML · ",
								report.chart_count,
								" 张结果图",
								report.report_path ? " · 历史版本已保留" : ""
							]
						}),
						availability?.status === "missing" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							className: "lx-result-note",
							children: "此版报告文件已被移动或删除，请让 Agent 重新生成；原分析结果不受影响。"
						}),
						availability?.status === "fallback" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "lx-result-note",
							children: "历史副本不可用，已切换到本版工作区报告。"
						}),
						Array.isArray(report.preview_paths) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
							className: "lx-report-previews",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "查看报告图表预览" }), report.preview_paths.map((path, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/limix-ui/report-preview?path=" + encodeURIComponent(path),
								target: "_blank",
								rel: "noreferrer",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									loading: "lazy",
									style: {
										width: "100%",
										maxHeight: 280,
										objectFit: "contain",
										margin: "12px 0"
									},
									src: "/limix-ui/report-preview?path=" + encodeURIComponent(path),
									alt: `报告图表 ${i + 1}；如未显示，请打开下方 HTML 报告`
								})
							}, path))]
						})
					] }),
					prediction && status.kind === "done" && typeof parsed?.metrics?.r2 === "number" && parsed.metrics.r2 < 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "lx-result-note",
						role: "status",
						children: "任务已完成；本次评估 R² 小于 0，效果弱于测试真值均值对照，需进一步验证后再用于业务。"
					}),
					cliFailed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "lx-result-note",
						role: "alert",
						children: [errorMessage, hint && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}), hint] })]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						status.kind === "warning" && !benchmark && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "lx-result-note",
							role: "alert",
							children: "本次解释存在限制，请结合返回说明使用结果。"
						}),
						explanation && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationView, {
							showPredictionCheck,
							data: explanation,
							showRelationData,
							onVisual: () => setShowRelationData(false)
						}),
						!help && command === "explain" && !settled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "lx-result-note",
							children: "正在分析变量贡献与关系…"
						}),
						metrics.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
							className: "lx-result-metrics",
							children: metrics.map((metric) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: metric.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: metric.value })] }, metric.key))
						}),
						prediction && !settled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "lx-result-note",
							children: "正在提交数据并等待预测结果…"
						}),
						prediction && !forecast && settled && status.kind === "done" && metrics.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "lx-result-note",
							children: "本次未返回评估指标。"
						}),
						chart && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ForecastChart, { ...chart }),
						evalView?.kind === "cls" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfusionMatrix, { data: evalView.data }),
						evalView?.kind === "reg" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScatterChart, { data: evalView.data })
					] }),
					!compact && (text$1 || file || inspect) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "lx-result-actions",
						children: [
							report && file && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/limix-ui/report?path=" + encodeURIComponent(file),
								download: true,
								children: "下载 HTML 报告 ↓"
							}),
							report && typeof report.markdown_path === "string" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/limix-ui/report?path=" + encodeURIComponent(report.markdown_path),
								download: true,
								children: "下载 Markdown ↓"
							}),
							benchmark && typeof parsed?.csv_path === "string" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/limix-ui/artifact?path=" + encodeURIComponent(parsed.csv_path),
								download: true,
								children: "下载比较 CSV ↓"
							}),
							benchmark && file && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/limix-ui/artifact?path=" + encodeURIComponent(file),
								download: true,
								children: "下载比较 JSON ↓"
							}),
							benchmark && typeof parsed?.report_path === "string" && openFile && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"data-lx": "file",
								"data-path": parsed.report_path,
								children: "打开完整报告 ↗"
							}),
							explanation && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								!explanation.comparison && (explanation.mode !== "local" || (explanation.requested_count ?? 1) > 1 || explanation.task_type === "timeseries") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"data-lx": "relation-data",
									"aria-pressed": showRelationData,
									children: showRelationData ? "返回图表" : "原始数据"
								}),
								(typeof parsed?.csv_path === "string" || file) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ActionMenu, {
									label: "下载数据",
									up: true,
									children: [typeof parsed?.csv_path === "string" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										href: "/limix-ui/artifact?path=" + encodeURIComponent(parsed.csv_path),
										download: true,
										children: explanation.mode === "local" ? "贡献数据 CSV" : "关系数据 CSV"
									}), file && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										href: "/limix-ui/artifact?path=" + encodeURIComponent(file),
										download: true,
										children: "原始结果 JSON"
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ActionMenu, {
									label: "更多",
									up: true,
									children: [
										explanation.mode === "local" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											"data-lx": "prediction-check",
											"aria-pressed": showPredictionCheck,
											children: showPredictionCheck ? "收起预测值核对" : "预测值核对"
										}),
										rawToggle,
										inspect && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											"data-lx": "inspect",
											children: "检视调用 ↗"
										}),
										fileLinks
									]
								})
							] }),
							savedCsv && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/limix-ui/csv?path=" + encodeURIComponent(savedCsv) + "&download=1",
								download: savedCsv.split("/").pop(),
								children: "下载 CSV ↓"
							}),
							!explanation && !prediction && file && (openFile ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								"data-lx": "file",
								"data-path": file,
								children: [
									"打开结果 · ",
									file.split("/").pop(),
									" ↗"
								]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "lx-result-meta",
								children: ["已保存 · ", file.split("/").pop()]
							})),
							prediction && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ActionMenu, {
								label: "更多",
								up: true,
								children: [
									rawToggle,
									metrics.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"data-lx": "metrics",
										"aria-expanded": showMetrics,
										"aria-controls": metricsId,
										children: showMetrics ? "收起指标说明" : "指标说明"
									}),
									inspect && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"data-lx": "inspect",
										children: "检视调用 ↗"
									}),
									fileLinks
								]
							}),
							forecast && status.kind === "done" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "lx-forecast-footer",
								children: [metrics.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "本次未返回评估指标" }), parsed?.baseline_evaluation?.metrics && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionMenu, {
									label: "基线对比",
									up: true,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "lx-forecast-baseline",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: parsed.baseline_evaluation.description }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
											"MAE ",
											parsed.baseline_evaluation.metrics.mae,
											" · RMSE ",
											parsed.baseline_evaluation.metrics.rmse,
											" · R² ",
											parsed.baseline_evaluation.metrics.r2 ?? "无定义"
										] })]
									})
								})]
							}),
							!explanation && !prediction && rawToggle,
							!prediction && metrics.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"data-lx": "metrics",
								"aria-expanded": showMetrics,
								"aria-controls": metricsId,
								children: showMetrics ? "收起指标说明 ↑" : "指标说明 ↓"
							}),
							!explanation && !prediction && showRaw && inspect && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"data-lx": "inspect",
								children: "检视调用 ↗"
							})
						]
					}),
					showMetrics && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
						id: metricsId,
						className: "lx-result-note",
						children: metrics.map((metric) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { marginTop: 8 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: metric.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
								style: { margin: 0 },
								children: metric.description
							})]
						}, metric.key))
					}),
					showRaw && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						id: detailsId,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "lx-result-details-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "lx-result-command",
								children: cmdLine
							}), compact && inspect && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"data-lx": "inspect",
								children: "检视调用 ↗"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: "lx-result-raw",
							children: text$1
						})]
					})
				]
			})
		})
	});
}

//#endregion
//#region src/client/flow-navigation.ts
/**
* [INPUT]: 当前会话标识、目标工具节点和宿主页签。
* [OUTPUT]: 跨视图一次性定位请求；按会话隔离。
* [POS]: 对话尾部不具备宿主 openView，沿当前 DOM 祖先定位本会话注册页签。
* [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
*/
const pending = /* @__PURE__ */ new Map();
function openTurnFlow(root, sessionId, stageKey) {
	const panel = root.closest("[data-slot=\"main.conversation\"]");
	const identity = root.closest("[data-conversation-session]");
	if (!panel || identity?.dataset.conversationSession !== sessionId) return false;
	const tab = [...panel.querySelectorAll("[role=\"tab\"]")].find((el) => ["任务流程", "Task flow"].includes(el.textContent?.trim() ?? ""));
	if (tab) {
		pending.set(sessionId, stageKey);
		tab.click();
		return true;
	}
	return false;
}
function pendingTurnFlow(sessionId) {
	return pending.get(sessionId);
}
function clearTurnFlow(sessionId) {
	pending.delete(sessionId);
}

//#endregion
//#region src/client/pipeline-stage.ts
const baseName = (p) => p.split("/").pop() ?? p;
const argList = (args) => Array.isArray(args.args) ? args.args.map(String) : [];
const clip = (text$1, size) => text$1.length > size ? `${text$1.slice(0, size)}…（已截断）` : text$1;
function flag(list, ...names) {
	const i = list.findIndex((tok) => names.includes(tok));
	return i >= 0 && i + 1 < list.length ? list[i + 1] : "";
}
/** limix CLI 旗标 → 中文键 */
const FLAG_ZH = {
	"--train": "训练文件",
	"--predict": "预测文件",
	"--target": "目标列",
	"--date": "时间列",
	"--context": "历史窗口",
	"--horizon": "预测步数",
	"--covariates": "协变量",
	"--model": "模型",
	"--models": "模型",
	"-o": "输出文件",
	"--output": "输出文件",
	"--levels": "分位档",
	"--quantile": "带分位区间",
	"--sync": "同步模式",
	"--timeout": "超时(s)",
	"--data": "数据文件",
	"--date-format": "时间格式",
	"--truth": "真值文件",
	"--mode": "解释方式",
	"--task-type": "任务类型",
	"--rows": "解释范围",
	"--row": "解释行",
	"--labels": "字段说明文件",
	"--prediction": "原预测文件",
	"--features": "特征列",
	"--threshold": "关系阈值",
	"--task-id": "续查任务",
	"--result-version-id": "结果版本",
	"--manifest": "比较清单文件",
	"--datasets": "数据集",
	"--seed": "随机种子",
	"--python": "比较环境"
};
/** limix 参数 → 中文键值行 */
function limixKv(args) {
	const rows$1 = [["子命令", String(args.command ?? "")]];
	const list = argList(args);
	for (let i = 0; i < list.length; i++) {
		const tok = list[i];
		if (tok.startsWith("-")) {
			const zh = FLAG_ZH[tok] ?? tok;
			const next = list[i + 1];
			if (next !== void 0 && !next.startsWith("--")) {
				rows$1.push([zh, /文件|环境/.test(zh) ? baseName(next) : next]);
				i++;
			} else rows$1.push([zh, "开"]);
		} else rows$1.push(["参数", baseName(tok)]);
	}
	return rows$1.filter(([, v]) => v !== "");
}
/** 能力名称与 API 文档一致：因果解释；模式在流程摘要中区分全局因果与局部归因。 */
function classifyLimix(args) {
	const cmd = String(args.command ?? "");
	const list = argList(args);
	const joined = list.join(" ");
	if (list.includes("--help") || list.includes("-h")) return {
		title: "查看命令说明",
		limix: false
	};
	const titles = {
		upload: "上传数据",
		classify: "分类预测",
		regress: "回归预测",
		forecast: "时序预测",
		task: "查询任务",
		tasks: "查看任务历史",
		result: "查询结果版本",
		download: "下载结果",
		health: "检查服务连接",
		check: "检查接口权限",
		data: "查询数据版本",
		cancel: "取消任务"
	};
	if (cmd === "explain") return {
		title: "因果解释",
		limix: true
	};
	if (cmd === "report") return {
		title: list.includes("--inspect") ? "结果分析" : "报告输出",
		limix: false
	};
	if (cmd === "runtime") return {
		title: "准备工作",
		limix: false
	};
	if (cmd === "benchmark") {
		const models = flag(list, "--models");
		return !models || /LIMIX/i.test(models) ? {
			title: "模型比较",
			limix: true
		} : {
			title: "模型比较",
			limix: false
		};
	}
	if (cmd === "api") {
		if (/explanation/i.test(joined)) return {
			title: "因果解释",
			limix: true
		};
		if (/visualization/i.test(joined)) return {
			title: "官方图表接口",
			limix: true
		};
		if (/evaluat/i.test(joined)) return {
			title: "评估",
			limix: true
		};
		if (/imput/i.test(joined)) return {
			title: "缺失补全",
			limix: true
		};
		return {
			title: "API 直调",
			limix: true
		};
	}
	return {
		title: titles[cmd] ?? `limix ${cmd}`,
		limix: true
	};
}
function scopeText(list) {
	const rows$1 = flag(list, "--rows");
	if (rows$1) return rows$1 === "all" ? "全部样本" : `第 ${rows$1} 行`;
	const row = flag(list, "--row");
	return row ? `第 ${row} 行` : "";
}
function limixMeta(cmd, list, data) {
	const model = data?.model_type ?? flag(list, "--model");
	if ([
		"classify",
		"regress",
		"forecast"
	].includes(cmd)) {
		const train = flag(list, "--train");
		const predict = flag(list, "--predict");
		return [
			model,
			flag(list, "--target") && `目标 ${flag(list, "--target")}`,
			train && `参考 ${baseName(train)}`,
			predict && `预测 ${baseName(predict)}`,
			flag(list, "--horizon") && `未来 ${flag(list, "--horizon")} 步`
		].filter(Boolean).join(" · ");
	}
	if (cmd === "explain") {
		const file = flag(list, "--data");
		return [
			model,
			scopeText(list),
			flag(list, "--target") && `目标 ${flag(list, "--target")}`,
			file && baseName(file)
		].filter(Boolean).join(" · ");
	}
	if (cmd === "benchmark") {
		const models = flag(list, "--models").split(",").filter(Boolean).join("、");
		const names = (Array.isArray(data?.datasets) ? data.datasets : []).map((d) => d.name).filter(Boolean);
		return [models, names.length === 1 ? names[0] : names.length > 1 ? `${names.length} 个数据集` : ""].filter(Boolean).join(" · ");
	}
	if (cmd === "upload") return list.filter((tok) => !tok.startsWith("-")).slice(0, 1).map(baseName).join("");
	return "";
}
function shortNumber(value) {
	return String(Number(value.toPrecision(Math.abs(value) >= 100 ? 5 : 4)));
}
function benchmarkOutcome(data) {
	const runs = Array.isArray(data.runs) ? data.runs : [];
	if (!runs.length) return "";
	const counts = `${runs.filter((r) => r.status === "succeeded").length}/${runs.length} 组完成`;
	if (!Array.isArray(data.datasets) || data.datasets.length !== 1) return counts;
	const key = data.datasets[0].task_type === "classification" ? "accuracy" : "rmse";
	const unit = key === "rmse" ? String(data.datasets[0].unit ?? "") : "";
	const rows$1 = runs.flatMap((r) => r.status === "succeeded" && typeof r.metrics?.[key] === "number" && Number.isFinite(r.metrics[key]) ? [`${r.model} ${shortNumber(r.metrics[key])}`] : []);
	return rows$1.length ? `${key === "rmse" ? "RMSE" : "准确率"}：${rows$1.join("，")}${unit && ` ${unit}`}` : counts;
}
function explainOutcome(data) {
	const view = data.explanation;
	if (!view) return "";
	if (Array.isArray(view.nodes) && Array.isArray(view.edges)) return `${view.nodes.length} 个变量 · ${view.edges.length} 条关系`;
	const parts = [];
	if (typeof view.explained_count === "number" && typeof view.requested_count === "number") parts.push(`已解释 ${view.explained_count}/${view.requested_count} 行`);
	if (Array.isArray(view.feature_names)) parts.push(`${view.feature_names.length} 个特征`);
	return parts.join(" · ");
}
function limixOutcome(cmd, data) {
	if (!data) return "";
	if (cmd === "explain") return explainOutcome(data);
	if (cmd === "benchmark") return benchmarkOutcome(data);
	if (cmd === "report" && data.kind === "report_facts") return "已核验图表指标与样本范围";
	if (cmd === "report" && data.kind === "report") return `Markdown + HTML · ${data.chart_count} 张结果图`;
	if (cmd === "upload" && typeof data.row_count === "number") return `${data.row_count} 行 × ${data.column_count} 列`;
	if (cmd === "check" && typeof data.allowed === "boolean") return data.allowed ? "有权限" : "无权限";
	const metrics = metricEntries(data).slice(0, 2).map((m) => `${m.label} ${m.value}`);
	return [...typeof data.metrics?.n === "number" ? [`${data.metrics.n} 行`] : [], ...metrics].join(" · ");
}
const DONE_STATUS = new Set([
	"finished",
	"succeeded",
	"degraded_succeeded",
	"partially_succeeded"
]);
const STOP_STATUS = {
	failed: "任务失败",
	timeout: "任务超时",
	cancelled: "任务取消"
};
function statusStep(status) {
	return DONE_STATUS.has(status) ? "任务完成" : STOP_STATUS[status] ?? "等待完成";
}
/** 解析 stderr 进度日志；旧会话缺的步骤保持缺失，不补写。 */
function parseSteps(text$1) {
	const idx = text$1.indexOf("\n[stderr]\n");
	if (idx < 0) return [];
	const out = [];
	const put = (step) => {
		if (out[out.length - 1] === "等待完成" && /^(等待完成|任务(完成|失败|超时|取消))$/.test(step)) out[out.length - 1] = step;
		else out.push(step);
	};
	for (const line of text$1.slice(idx + 10).split("\n")) {
		const l = line.trim();
		let m;
		if (m = l.match(/^上传成功:\s*(.+?)\s*→/)) put(`上传 ${m[1]}`);
		else if (m = l.match(/^([^:：]{1,12}):\s*使用已有数据版本/)) put(`复用${m[1]}`);
		else if (/^已提交异步任务\s/.test(l)) put("提交任务");
		else if (/^解释任务\s*\S+?；/.test(l)) put("提交解释");
		else if (/^续查解释任务\s/.test(l)) put("续查任务");
		else if (m = l.match(/^任务\s*\S+:\s*(\S+)/)) put(statusStep(m[1]));
		else if (m = l.match(/^已下载\s*→\s*(.+?)(?:\s+\(\d+ bytes\))?$/)) put(`下载 ${baseName(m[1])}`);
		else if (m = l.match(/^已保存解释\s*→\s*(.+)$/)) put(`保存 ${baseName(m[1])}`);
		else if (/^结果版本\s/.test(l)) put("生成结果版本");
		else if (m = l.match(/^benchmark\s+\S+?\/(\S+):\s*(\S+)/)) put(`${m[1]} ${m[2] === "succeeded" ? "完成" : m[2] === "failed" ? "失败" : "未完成"}`);
		else if (/重试/.test(l)) put("网络重试");
	}
	return out;
}
const ID_LABELS = {
	task_id: "任务",
	result_id: "解释结果",
	result_version_id: "结果版本",
	data_version_id: "数据版本"
};
function outputText(data, text$1) {
	return data ? clip(JSON.stringify(data, null, 2), 2e3) : clip(text$1.split("\n[stderr]\n")[0].trim() || text$1.trim(), 1200) || "（无输出）";
}
function errorLine(error, text$1) {
	if (typeof error?.error === "string") return error.error.slice(0, 180);
	if (typeof error?.error_message === "string") return error.error_message.slice(0, 180);
	const idx = text$1.indexOf("\n[stderr]\n");
	return ((idx >= 0 ? text$1.slice(idx + 10) : text$1).split("\n").map((l) => l.trim()).find(Boolean) ?? "").slice(0, 180);
}
function settledBase(text$1, isError, clock) {
	const { data, failed, error } = parseToolResult(text$1);
	const stopped = !!isError || failed;
	const state = resultState(true, stopped, data);
	return {
		data,
		...clock,
		ok: !stopped,
		stateKind: state.kind,
		stateLabel: state.label,
		errLine: stopped ? errorLine(error, text$1) : "",
		output: outputText(data, text$1)
	};
}
function limixStage(args, text$1, isError, clock) {
	const cmd = String(args.command ?? "");
	const list = argList(args);
	const { data,...base } = settledBase(text$1, isError, clock);
	const { title, limix } = classifyLimix(args);
	const ids = Object.keys(ID_LABELS).flatMap((key) => typeof data?.[key] === "string" ? [[ID_LABELS[key], data[key]]] : []);
	return {
		...base,
		toolName: "limix",
		args,
		data,
		title,
		limix,
		meta: limixMeta(cmd, list, data),
		outcome: limixOutcome(cmd, data),
		summary: [
			"limix",
			cmd,
			...list
		].filter(Boolean).join(" ").slice(0, 200),
		inputKv: limixKv(args),
		inputRaw: clip(JSON.stringify(args, null, 2), 2e3),
		metrics: metricEntries(data).map((m) => [m.label, m.value]),
		ids,
		substeps: limix ? parseSteps(text$1) : []
	};
}
const isReportFile = (path) => /\.(md|html)$/i.test(path);
/** 本地工具 → 业务标题与参数行；bash 优先用模型自述的 description */
function describeLocal(name, args) {
	const path = String(args.file_path ?? args.path ?? "");
	const file = path ? baseName(path) : "";
	const fileKv = file ? [["文件", file]] : [];
	const brief = (title) => ({
		title,
		kv: fileKv,
		summary: path || title
	});
	switch (name) {
		case "bash": {
			const command = String(args.command ?? "");
			const description = String(args.description ?? "").trim();
			return {
				title: description.slice(0, 60) || "运行命令",
				kv: [...description ? [["说明", description]] : [], ["命令", command.slice(0, 300) || "（命令为空）"]],
				summary: command.slice(0, 200)
			};
		}
		case "read": return brief(`读取文件 ${file}`);
		case "write": return brief(`${isReportFile(path) ? "生成报告" : "写入文件"} ${file}`);
		case "edit": return brief(`${isReportFile(path) ? "修改报告" : "修改文件"} ${file}`);
		case "present": {
			const files = Array.isArray(args.files) ? args.files : [];
			const first = baseName(String(files[0]?.path ?? ""));
			return {
				title: `展示文件 ${first}${files.length > 1 ? ` 等 ${files.length} 个` : ""}`,
				kv: files.map((f) => ["文件", baseName(String(f.path ?? ""))]),
				summary: first
			};
		}
		case "datasource": {
			const command = String(args.command ?? "");
			const title = command === "query" ? args.mode === "materialize" ? "取数落盘" : "取数预览" : command === "inspect" ? "查看库表结构" : "查看数据源清单";
			const kv = [["子命令", command]];
			if (args.table) kv.push(["表", String(args.table)]);
			if (args.fileName) kv.push(["落盘文件", String(args.fileName)]);
			if (args.sql) kv.push(["SQL", String(args.sql).slice(0, 300)]);
			return {
				title,
				kv,
				summary: String(args.sql ?? args.table ?? command).slice(0, 200)
			};
		}
		case "grep":
		case "glob": return {
			title: "搜索文件",
			kv: [["条件", String(args.pattern ?? "")]],
			summary: String(args.pattern ?? "")
		};
		case "web_fetch": return {
			title: "读取网页",
			kv: [["网址", String(args.url ?? "")]],
			summary: String(args.url ?? "")
		};
		case "web_search": return {
			title: "搜索网页",
			kv: [["关键词", JSON.stringify(args.queries ?? "")]],
			summary: "搜索网页"
		};
		case "todo_write": return brief("更新待办");
		case "ask_user_question": return brief("询问用户");
		case "load_workspace_dependencies": return brief("加载工作区依赖");
		case "subagent": return brief("调用子代理");
		case "skill": return brief("加载技能");
		default: return {
			title: name,
			kv: [],
			summary: name
		};
	}
}
function localStage(name, args, text$1, isError, clock) {
	const { data: _data,...base } = settledBase(text$1, isError, clock);
	const { title, kv, summary } = describeLocal(name, args);
	return {
		...base,
		toolName: name,
		args,
		data: _data,
		title,
		limix: false,
		meta: "",
		outcome: "",
		summary,
		inputKv: kv,
		inputRaw: clip(JSON.stringify(args, null, 2), 2e3),
		metrics: [],
		ids: [],
		substeps: [],
		output: clip(text$1.trim(), 1200) || "（无输出）"
	};
}
/** 运行中节点尚无输出：只翻译标题与参数，end 取最大值以便并行判定 */
function runningStage(name, args, key, time) {
	const local = name === "limix" ? null : describeLocal(name, args);
	const { title, limix } = local ? {
		title: local.title,
		limix: false
	} : classifyLimix(args);
	const list = argList(args);
	return {
		key,
		toolName: name,
		args,
		data: null,
		title,
		limix,
		running: true,
		ok: true,
		time,
		start: time,
		end: Number.MAX_SAFE_INTEGER,
		meta: local ? "" : limixMeta(String(args.command ?? ""), list, null),
		outcome: "",
		stateKind: "running",
		stateLabel: "运行中",
		summary: local?.summary ?? list.join(" ").slice(0, 200),
		inputKv: local?.kv ?? limixKv(args),
		inputRaw: clip(JSON.stringify(args, null, 2), 2e3),
		output: "（进行中）",
		metrics: [],
		ids: [],
		errLine: "",
		substeps: []
	};
}

//#endregion
//#region src/client/pipeline-model.ts
const blockKind = (b) => b.kind ?? b.type;
function textOf$1(blocks) {
	return (blocks ?? []).filter((b) => blockKind(b) === "text" && b.text).map((b) => b.text).join("\n");
}
function parseArgs(raw) {
	try {
		const v = JSON.parse(raw ?? "{}");
		return typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
	} catch {
		return {};
	}
}
/** 结论行只留可读文字：去掉 Markdown 粗体与行内代码，链接保留标题，避免露出路径语法 */
function firstLine(text$1) {
	return text$1.replace(/\[([^\]]*)\]\([^\n]*?\)(?=\s|$|[，。；：、])/g, "$1").replace(/\*\*|`/g, "").split("\n").map((s) => s.replace(/^[#>\-*\s]+/, "").trim()).find((s) => s.length > 4) ?? "";
}
function pushAssistant(round, node) {
	(node.blocks ?? node.content ?? []).forEach((block, index) => {
		const text$1 = (block.text ?? "").trim();
		if (!text$1) return;
		const kind = blockKind(block);
		if (kind === "reasoning") round.timeline.push({
			type: "thinking",
			key: `n${node.seq}-${index}`,
			text: text$1
		});
		else if (kind === "text") {
			round.timeline.push({
				type: "reply",
				key: `n${node.seq}-${index}`,
				text: text$1
			});
			round.result = firstLine(text$1).slice(0, 110) || round.result;
		}
	});
}
function pushStage(round, stage) {
	round.stages.push(stage);
	round.timeline.push({
		type: "stage",
		key: stage.key,
		stage
	});
}
function stageOf(node) {
	const name = node.call?.name;
	if (!name) return null;
	const args = parseArgs(node.call?.argsRaw);
	const text$1 = textOf$1(node.content);
	const clock = {
		key: `s${node.seq}`,
		time: node.time,
		start: node.callTime ?? node.time,
		end: node.time
	};
	return name === "limix" ? limixStage(args, text$1, node.isError, clock) : localStage(name, args, text$1, node.isError, clock);
}
/**
* 相邻阶段的并行分组，两个判据取或：
* ① 时间区间重叠 = 真并发；
* ② 无缝续接（间隔 ≤150ms）= 模型一步批量发出、宿主排队串行执行。
*   实测同批 limix 调用间隔 0~1ms；串行步之间隔着秒级 LLM 思考，不会误判。
*/
function groupParallel(stages) {
	const groups = [];
	for (const s of stages) {
		const cur = groups[groups.length - 1];
		if (cur) {
			const overlap = cur.some((x) => s.start < x.end);
			const queued = s.start - Math.max(...cur.map((x) => x.end)) <= 150;
			if (overlap || queued) {
				cur.push(s);
				continue;
			}
		}
		groups.push([s]);
	}
	return groups;
}
/** 会话节点 → 分轮模型（升序解析，返回最新一轮在前） */
function parseRounds(nodes, running) {
	const rounds = [];
	let cur = null;
	for (const node of nodes) if (node.kind === "user") {
		cur = {
			turn: rounds.length + 1,
			time: node.time,
			ask: textOf$1(node.content) || "（空消息）",
			result: "",
			stages: [],
			timeline: []
		};
		rounds.push(cur);
	} else if (!cur) continue;
	else if (node.kind === "assistant") pushAssistant(cur, node);
	else if (node.kind === "tool-result") {
		const stage = stageOf(node);
		if (stage) pushStage(cur, stage);
	}
	const last = rounds[rounds.length - 1];
	if (last) running.forEach((call, index) => {
		if (call.name) pushStage(last, runningStage(call.name, parseArgs(call.argsRaw), `r${call.callId ?? index}`, last.time));
	});
	for (const round of rounds) for (const group of groupParallel(round.stages)) if (group.length > 1) group.forEach((stage) => {
		stage.parallel = true;
	});
	return rounds.filter((r) => r.timeline.length > 0).reverse();
}
function fmtTime(t) {
	const d = new Date(t);
	const p = (x) => String(x).padStart(2, "0");
	return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

//#endregion
//#region src/client/pipeline-flow.ts
const REPORT = /\.(md|html?|pdf|docx|pptx)$/i;
const DATA = /\.(csv|tsv|xlsx?|parquet|json)$/i;
const fileName = (p) => p.split(/[/\\]/).pop() || p;
function argument(stage, name) {
	const args = Array.isArray(stage.args.args) ? stage.args.args : [];
	const index = args.indexOf(name);
	return index >= 0 && typeof args[index + 1] === "string" ? args[index + 1] : "";
}
function explanationMode(stage) {
	const mode = stage.data?.explanation?.mode ?? argument(stage, "--mode");
	if (mode === "directed") return "全局因果 · 有向";
	if (mode === "undirected") return "全局因果 · 无向";
	if (mode === "local" || stage.args.command === "explain") return argument(stage, "--task-type") === "timeseries" ? "局部归因 · 时序" : "局部归因";
	return "解释模式见调用详情";
}
/** 文件只取结构化参数与回执；失败写入不产生可打开的输出。 */
function stageFiles(stage) {
	const files = [];
	const add = (path, role, label) => {
		if (typeof path === "string" && path && !/[\u0000-\u001f]/.test(path)) files.push({
			path,
			role,
			label
		});
	};
	if (stage.toolName === "limix") {
		for (const [flag$1, label] of [
			["--train", "参考数据"],
			["--predict", "待预测数据"],
			["--data", "解释数据"],
			["--truth", "真值数据"],
			["--manifest", "比较清单"]
		]) add(argument(stage, flag$1), "input", label);
		if (stage.ok && !stage.running) {
			add(stage.data?.saved_to, "output", "结果文件");
			add(stage.data?.csv_path, "output", "结果数据");
			add(stage.data?.report_path, "output", "分析报告");
			add(stage.data?.markdown_path, "output", "Markdown 报告");
		}
	} else {
		const path = stage.args.file_path ?? stage.args.path;
		if (stage.toolName === "read") add(path, "input", "读取文件");
		if (["write", "edit"].includes(stage.toolName) && stage.ok && !stage.running) add(path, "output", stage.toolName === "edit" ? "修订文件" : "生成文件");
		if (stage.toolName === "present" && stage.ok && !stage.running && Array.isArray(stage.args.files)) for (const file of stage.args.files) add(file?.path, "output", "展示文件");
		if (stage.ok && !stage.running) add(stage.data?.saved_to, "output", "生成文件");
	}
	return files;
}
function stepFiles(step) {
	const unique = /* @__PURE__ */ new Map();
	for (const stage of step.stages) for (const file of stageFiles(stage)) {
		const path = (!/^(?:[/\\]|[A-Za-z]:)/.test(file.path) && step.cwd ? `${step.cwd}/${file.path}` : file.path).replace(/\\/g, "/").replace(/\/\.\//g, "/");
		const key = `${file.role}:${path}`;
		const previous = unique.get(key);
		unique.set(key, {
			...file,
			path,
			label: previous?.label === "修订文件" ? previous.label : file.label
		});
	}
	return [...unique.values()];
}
function category(stage, afterPrediction) {
	if (stage.title === "查看命令说明") return "准备工作";
	if (stage.toolName === "limix") return stage.title === "上传数据" || stage.title === "查询数据版本" ? "数据处理" : stage.title;
	const path = String(stage.args.file_path ?? stage.args.path ?? "");
	if (["write", "edit"].includes(stage.toolName) && REPORT.test(path)) return "报告输出";
	if (stage.toolName === "present") return stageFiles(stage).some((file) => REPORT.test(file.path)) ? "报告输出" : "结果分析";
	if (stage.toolName === "read" && REPORT.test(path)) return "结果分析";
	if (stage.toolName === "datasource" || DATA.test(path)) return afterPrediction ? "结果分析" : "数据处理";
	if (stage.toolName === "bash") {
		const description = String(stage.args.description ?? "");
		if (/依赖|环境|目录|deps|dependenc|environment|output dir/i.test(description)) return "准备工作";
		if (/报告|report/i.test(description) && /生成|写入|保存|修订|修改|输出|create|write/i.test(description)) return "报告输出";
		if (/分析|预测结果|指标|比较|评估|统计|绘图|图表|analy[sz]|evaluat|prediction|benchmark|artifact|explain|contribution/i.test(description)) return "结果分析";
		if (/数据|字段|缺失|清洗|转换|划分|csv|data|column/i.test(description)) return "数据处理";
		return afterPrediction ? "结果分析" : "准备工作";
	}
	if ([
		"read",
		"glob",
		"grep"
	].includes(stage.toolName)) return afterPrediction ? "结果分析" : "准备工作";
	if ([
		"load_workspace_dependencies",
		"skill",
		"todo_write"
	].includes(stage.toolName)) return "准备工作";
	return stage.title;
}
/** 只合并相邻本地同类操作；相同参数的失败重试可归入同一步。 */
function flowSteps(round, cwd) {
	const steps = [];
	let afterPrediction = false;
	let reportPhase = false;
	for (const [index, stage] of round.stages.entries()) {
		let title = category(stage, afterPrediction);
		const core = [
			"分类预测",
			"回归预测",
			"时序预测",
			"因果解释",
			"模型比较"
		].includes(title);
		if (core) reportPhase = false;
		if (!stage.limix && !core) {
			if (title === "报告输出") reportPhase = true;
			else if (reportPhase) title = "报告输出";
			else if (afterPrediction) title = "结果分析";
			else if (title === "结果分析" && round.stages.some((s) => [
				"分类预测",
				"回归预测",
				"时序预测",
				"因果解释",
				"模型比较"
			].includes(s.title))) title = "数据处理";
			else if (![
				"数据处理",
				"准备工作",
				"结果分析"
			].includes(title)) title = "准备工作";
		}
		const path = String(stage.args.file_path ?? stage.args.path ?? "");
		const next = round.stages[index + 1];
		const previous = steps[steps.length - 1];
		if (stage.toolName === "read" && REPORT.test(path) && (previous?.title === "报告输出" && stepFiles(previous).some((f) => f.path === path) || next && ["write", "edit"].includes(next.toolName) && (next.args.file_path ?? next.args.path) === path)) title = "报告输出";
		if (title === "准备工作" && previous && !previous.limix) {
			previous.stages.push(stage);
			continue;
		}
		if (previous?.title === "准备工作" && !stage.limix && title !== "准备工作") {
			previous.title = title;
			previous.stages.push(stage);
			continue;
		}
		if ([
			"分类预测",
			"回归预测",
			"时序预测",
			"因果解释",
			"模型比较"
		].includes(title)) afterPrediction = true;
		const prev = steps[steps.length - 1];
		const last = prev?.stages[prev.stages.length - 1];
		const retry = last && last.stateKind === "error" && last.toolName === stage.toolName && JSON.stringify(last.args) === JSON.stringify(stage.args);
		if (prev && prev.title === title && (!prev.limix && !stage.limix && !["模型比较"].includes(title) || retry)) prev.stages.push(stage);
		else steps.push({
			key: stage.key,
			title,
			stages: [stage],
			limix: stage.limix,
			cwd
		});
	}
	return steps;
}
function flowState(stages) {
	if (stages.some((s) => s.running || s.stateKind === "running")) return {
		kind: "running",
		label: "进行中"
	};
	const errors = stages.filter((s) => s.stateKind === "error");
	const previews = new Set(stages.filter((s) => s.ok && s.data?.kind === "report" && s.data?.status === "succeeded").flatMap((s) => Array.isArray(s.data?.preview_paths) ? s.data.preview_paths : []));
	const previewFailure = (s) => s.toolName === "read_image" && previews.has(s.args.path ?? s.args.file_path);
	if (errors.length && errors.every(previewFailure)) return {
		kind: "warning",
		label: "报告已生成，预览检查未完成"
	};
	if (errors.length) return {
		kind: "error",
		label: "有未完成步骤"
	};
	if (stages.some((s) => s.stateKind === "warning")) return {
		kind: "warning",
		label: "部分完成"
	};
	if (stages.some((s) => s.stateKind === "idle")) return {
		kind: "idle",
		label: stages.find((s) => s.stateKind === "idle").stateLabel
	};
	return {
		kind: "done",
		label: "已完成"
	};
}
function stepSummary(step) {
	const last = step.stages[step.stages.length - 1];
	if (step.title === "因果解释") return [explanationMode(last), last.outcome].filter(Boolean).join(" · ");
	if ([
		"分类预测",
		"回归预测",
		"时序预测",
		"模型比较"
	].includes(step.title)) {
		const target = argument(last, "--target");
		const horizon = argument(last, "--horizon");
		return [
			target && `目标 ${target}`,
			horizon && `未来 ${horizon} 步`,
			last.outcome || last.stateLabel
		].filter(Boolean).join(" · ");
	}
	const outputs = stepFiles(step).filter((f) => f.role === "output");
	if (step.title === "报告输出" && outputs.length) {
		const descriptions = outputs.map((f) => {
			return `${/\.md$/i.test(f.path) ? "分析报告" : /\.html?$/i.test(f.path) ? "HTML 报告" : fileName(f.path)}${f.label === "修订文件" ? "已修订" : "已保存"}`;
		});
		return [...new Set(descriptions)].join("；") + (flowState(step.stages).kind !== "done" ? "；仍有操作未完成" : "");
	}
	return localSummary(step);
}
/** 名称取自实际操作对象；缺少依据时保留通用标题。 */
function stepTitle(step) {
	if (step.title !== "结果分析") return step.title;
	const text$1 = step.stages.map((s) => String(s.args.description ?? "")).join(" ");
	if (/contribution|attribution|归因|贡献/i.test(text$1)) return "归因结果解读";
	if (/explan|解释/i.test(text$1)) return "解释结果核对";
	if (/prediction|预测/i.test(text$1)) return "预测结果核对";
	if (/benchmark|comparison|模型比较|基线/i.test(text$1)) return "模型比较复核";
	if (/artifact|产物|交付/i.test(text$1)) return "交付文件核对";
	return step.title;
}
/** 只陈述已返回操作的动作；指标仍只读结构化 metrics，不从脚本日志推算。 */
function localSummary(step) {
	const completed = step.stages.filter((s) => s.ok && !s.running && s.stateKind === "done");
	if (!completed.length) return flowState(step.stages).kind === "running" ? "正在执行，结果返回后更新摘要" : "未完成，展开查看原因与执行记录";
	const descriptions = completed.map((s) => String(s.args.description ?? "")).join(" ");
	const actions = [];
	const add = (text$1) => {
		if (!actions.includes(text$1)) actions.push(text$1);
	};
	if (step.title === "数据处理") {
		if (/reference|参考|训练/i.test(descriptions) && /predict|待预测/i.test(descriptions) && /truth|真值/i.test(descriptions)) add("核对参考数据、待预测数据与真值");
		if (completed.some((s) => s.toolName === "read" && /target_label/.test(s.output) && /fields/.test(s.output))) add("读取字段说明");
	}
	if (step.title === "结果分析") {
		if (/summari[sz]|汇总|rank|排序/i.test(descriptions) && /contribution|归因|贡献/i.test(descriptions)) add("汇总逐样本特征贡献");
		if (completed.some((s) => /解释时预测.*原预测|逐行预测对照|prior vs explanation/i.test(s.output + String(s.args.description ?? "")))) add("对照解释时预测与原预测");
		if (!actions.length && /prediction|预测/i.test(descriptions) && /compar|benchmark|比较/i.test(descriptions)) add("读取预测结果与模型比较明细");
		if (!actions.length && /explan|解释/i.test(descriptions)) add("核对解释明细与结果结构");
		if (!actions.length && /artifact|产物/i.test(descriptions)) add("核对输出文件与结果清单");
	}
	if (!actions.length) for (const stage of completed) {
		const description = String(stage.args.description ?? "");
		if (/清洗|clean/i.test(description)) add("执行数据清洗");
		else if (/转换|convert|transform/i.test(description)) add("转换数据格式");
		else if (/划分|split/i.test(description)) add("划分训练与预测数据");
		else if (/检查|核对|检验|inspect|check|verify|profile/i.test(description) && /data|csv|字段|数据/i.test(description)) add("检查数据内容与字段");
		else if (stage.toolName === "read") add(`读取 ${fileName(String(stage.args.file_path ?? stage.args.path ?? "文件"))}`);
		else if (/[\u4e00-\u9fff]/.test(description)) add(description);
	}
	const outputs = stepFiles(step).filter((f) => f.role === "output");
	if (outputs.length && step.title !== "报告输出") add(`输出 ${fileName(outputs[0].path)}`);
	return (actions.slice(0, 2).join("；") || "执行记录已返回，可展开查看输入与输出") + (flowState(step.stages).kind !== "done" ? "；仍有操作未完成" : "");
}

//#endregion
//#region src/client/PipelineParts.tsx
const PIPELINE_CSS = `
.lx-flow{height:100%;overflow:auto;box-sizing:border-box;padding:20px clamp(18px,3vw,44px) 160px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.5;container-type:inline-size}
.lx-flow-inner{max-width:1000px;margin:0 auto}
.lx-flow button{font:inherit;color:inherit;cursor:pointer;background:none;border:0;text-align:left;padding:0}
.lx-flow button:focus-visible,.lx-flow summary:focus-visible{outline:2px solid #416fbd;outline-offset:4px;border-radius:3px}
.lx-flow-kicker{color:var(--dsw-alias-label-secondary);font-size:11px;letter-spacing:.08em;margin-bottom:5px}
.lx-flow-header{padding-bottom:12px;border-bottom:1px solid var(--dsw-alias-border-l3,#e3e7ec);margin-bottom:12px}
.lx-flow-heading{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap}
.lx-flow h2{font-size:20px;font-weight:600;letter-spacing:-.02em;margin:0;overflow-wrap:anywhere}
.lx-flow-status{font-size:12px;color:#258068;white-space:nowrap}
.lx-flow-status[data-state=error]{color:#c64b42}.lx-flow-status[data-state=warning],.lx-flow-status[data-state=running]{color:#a47320}.lx-flow-status[data-state=idle]{color:var(--dsw-alias-label-secondary)}
.lx-flow-caption{color:var(--dsw-alias-label-secondary);margin:6px 0 0;font-size:12px}
.lx-flow-section{margin:0 0 18px}
.lx-flow-section-head{display:flex;align-items:center;gap:12px;margin:0 0 8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.lx-flow-section-head span:last-child{margin-left:auto;font-size:11px}
.lx-flow-request{margin-bottom:10px;color:var(--dsw-alias-label-secondary);font-size:12px}
.lx-flow-request summary{cursor:pointer}.lx-flow-request p{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}
.lx-flow-list{list-style:none;margin:0;padding:0}
.lx-flow-step{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:16px;margin:0;padding:7px 10px 11px 34px;min-width:0;border-radius:6px}
.lx-flow-step:hover{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 3%,transparent)}
.lx-flow-step[data-step="报告输出"]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 5%,transparent);margin-top:4px}
.lx-flow-step>.lx-flow-detail,.lx-flow-step>.lx-flow-result,.lx-flow-step>.lx-flow-error{grid-column:1/-1}
.lx-flow-step:not(:last-child):before{content:"";position:absolute;left:9px;top:29px;bottom:-3px;width:1px;background:var(--dsw-alias-border-l3,#dfe5ed)}
.lx-flow-marker{position:absolute;left:0;top:11px;border:0;border-radius:50%;width:19px;height:19px;display:flex;align-items:center;justify-content:center;color:#258068;font-size:12px;background:var(--dsw-alias-bg-base,#fff)}
.lx-flow-marker[data-state=running]{color:#a47320}.lx-flow-marker[data-state=error]{color:#c64b42}.lx-flow-marker[data-state=warning],.lx-flow-marker[data-state=idle]{color:#a47320}
.lx-flow button.lx-flow-step-toggle{display:block;width:100%;padding:0;min-width:0;grid-column:1;grid-row:1}
.lx-flow-step-toggle>*{pointer-events:none}
.lx-flow-title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:25px}
.lx-flow-title{font-weight:600;font-size:15px}.lx-flow-brand{font-size:10px;line-height:16px;color:var(--dsw-alias-state-business-primary,#3465ce);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 10%,transparent);padding:0 6px;border-radius:4px;font-weight:500;white-space:nowrap}
.lx-flow-chevron{color:var(--dsw-alias-label-secondary);font-size:11px}
.lx-flow-summary{font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:100%}
.lx-flow-actions{grid-column:2;grid-row:1;display:flex;align-items:center;justify-content:flex-end;gap:12px;flex-wrap:wrap;align-self:center;max-width:220px}
.lx-flow-actions:empty{display:none}
.lx-flow button.lx-flow-link{color:var(--dsw-alias-state-business-primary,#3465ce);font-size:12px;overflow-wrap:anywhere}
.lx-flow button.lx-flow-link:hover{text-decoration:underline}
.lx-flow-detail{margin-top:13px;padding:16px 18px;background:var(--dsw-alias-interactive-bg-hover,#f5f7fa);border-radius:8px;min-width:0}
.lx-flow-detail h4{font-size:11px;color:var(--dsw-alias-label-secondary);font-weight:500;letter-spacing:.04em;margin:0 0 8px}
.lx-flow-detail h4:not(:first-child){margin-top:18px}
.lx-flow-fields{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:5px 20px;margin:0;font-size:12px}
.lx-flow-fields dt{color:var(--dsw-alias-label-secondary)}.lx-flow-fields dd{margin:0;overflow-wrap:anywhere}
.lx-flow-files{display:flex;flex-direction:column;gap:6px}.lx-flow-files small{margin-right:10px;color:var(--dsw-alias-label-secondary)}
.lx-flow-operations{padding-left:18px;margin:0;font-size:12px}.lx-flow-operations li{padding:3px 0;overflow-wrap:anywhere}
.lx-flow-error{font-size:12px;color:#c64b42;margin:7px 0;overflow-wrap:anywhere}
.lx-flow-technical{margin-top:16px;font-size:12px;color:var(--dsw-alias-label-secondary)}.lx-flow-technical summary{cursor:pointer}
.lx-flow-technical pre{max-height:260px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;background:var(--dsw-alias-bg-base,#fff);padding:12px;border-radius:6px}
.lx-flow-result{margin-top:16px;min-width:0}.lx-flow-empty{padding:35px 0;color:var(--dsw-alias-label-secondary)}
@container(max-width:650px){.lx-flow-step{grid-template-columns:minmax(0,1fr);padding-right:4px}.lx-flow-actions{grid-column:1;grid-row:2;justify-content:flex-start;max-width:none;margin-top:4px}.lx-flow-step>.lx-flow-detail,.lx-flow-step>.lx-flow-result,.lx-flow-step>.lx-flow-error{grid-column:1}.lx-flow-summary{white-space:normal}.lx-flow h2{font-size:19px}.lx-flow-step{padding-left:34px}.lx-flow-title{font-size:15px}.lx-flow-detail{padding:13px 12px}.lx-flow-fields{gap:5px 10px}.lx-flow-status{font-size:11px}.lx-flow-summary{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}}
`;
function FileLinks({ step, openFile, role }) {
	const [error, setError] = (0, react.useState)("");
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "lx-flow-files",
		children: [stepFiles(step).filter((f) => f.role === role).map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: file.label }), openFile ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
			type: "button",
			className: "lx-flow-link",
			title: file.path,
			onClick: () => {
				setError("");
				Promise.resolve().then(() => openFile(file.path)).catch(() => setError("文件打开失败，请在工作区检查文件是否仍存在。"));
			},
			children: fileName(file.path)
		}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			title: file.path,
			children: fileName(file.path)
		})] }, file.path)), error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
			className: "lx-flow-error",
			role: "alert",
			children: error
		})]
	});
}
function TechnicalDetails({ stages }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
		className: "lx-flow-technical",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [
			"查看技术详情 · ",
			stages.length,
			" 次操作"
		] }), stages.map((stage) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
				stage.title,
				" · ",
				stage.stateLabel
			] }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: stage.inputRaw }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: stage.output })
		] }, stage.key))]
	});
}
function StepDetails({ step, openFile, expandToken }) {
	const last = step.stages[step.stages.length - 1];
	const fields = last.inputKv.filter(([key]) => ![
		"子命令",
		"命令",
		"说明",
		"参数",
		"解释方式"
	].includes(key) && !/文件|环境/.test(key));
	if (typeof last.data?.model_type === "string" && !fields.some(([key]) => key === "模型")) fields.unshift(["模型", last.data.model_type]);
	const inputs = stepFiles(step).filter((file) => file.role === "input");
	const outputs = stepFiles(step).filter((file) => file.role === "output");
	const prediction = [
		"分类预测",
		"回归预测",
		"时序预测"
	].includes(step.title);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "lx-flow-detail",
		children: [
			inputs.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: "输入" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileLinks, {
				step,
				role: "input",
				openFile
			})] }),
			(fields.length > 0 || step.title === "因果解释") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: "分析配置" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
				className: "lx-flow-fields",
				children: [step.title === "因果解释" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "解释模式" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: explanationMode(last) })] }), fields.map(([key, value], i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: { display: "contents" },
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: key }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: key === "任务类型" ? {
						regression: "回归",
						classification: "分类",
						timeseries: "时序"
					}[value] ?? value : key === "解释范围" && value === "all" ? "全部样本" : value })]
				}, i))]
			})] }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: "执行内容" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
				className: "lx-flow-operations",
				children: step.stages.map((stage) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
					stage.title,
					" ",
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "lx-flow-caption",
						children: ["· ", stage.stateLabel]
					}),
					stage.substeps.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "lx-flow-caption",
						children: stage.substeps.join(" → ")
					})
				] }, stage.key))
			}),
			(outputs.length > 0 || last.outcome || last.metrics.length > 0 || prediction) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: "结果" }),
				last.outcome && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						margin: "0 0 8px",
						fontSize: 12
					},
					children: last.outcome
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileLinks, {
					step,
					role: "output",
					openFile
				}),
				prediction && last.metrics.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "lx-flow-caption",
					children: last.running ? "预测结果返回后显示评估指标。" : "工具未返回评估指标；仅在有真值并完成评估后展示。"
				})
			] }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TechnicalDetails, { stages: step.stages })
		]
	});
}
function FlowStepRow({ step, openFile, expandToken }) {
	const state = flowState(step.stages);
	const [override, setOverride] = (0, react.useState)(null);
	(0, react.useEffect)(() => {
		if (expandToken) setOverride(true);
	}, [expandToken]);
	const [showResult, setShowResult] = (0, react.useState)(false);
	const [fileError, setFileError] = (0, react.useState)("");
	const open = override ?? state.kind === "running";
	const last = step.stages[step.stages.length - 1];
	const result = last.toolName === "limix" && last.data && [
		"分类预测",
		"回归预测",
		"时序预测",
		"因果解释",
		"模型比较"
	].includes(step.title);
	const reports = stepFiles(step).filter((f) => f.role === "output" && /\.(md|html?|pdf|docx|pptx)$/i.test(f.path));
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
		className: "lx-flow-step",
		"data-step": step.title,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "lx-flow-marker",
				"data-state": state.kind,
				"aria-hidden": "true",
				children: state.kind === "done" ? "✓" : state.kind === "running" ? "◌" : "!"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "lx-flow-step-toggle",
				"aria-label": `${open ? "收起" : "展开"}${stepTitle(step)}`,
				"aria-expanded": open,
				onClick: () => setOverride(!open),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "lx-flow-title-row",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "lx-flow-title",
							children: stepTitle(step)
						}),
						step.limix && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "lx-flow-brand",
							children: "LimiX"
						}),
						state.kind !== "done" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "lx-flow-status",
							"data-state": state.kind,
							children: state.label
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "lx-flow-chevron",
							children: open ? "▴" : "▾"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "lx-flow-summary",
					children: stepSummary(step)
				})]
			}),
			step.stages.filter((s) => s.errLine).map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "lx-flow-error",
				children: s.errLine
			}, s.key)),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-flow-actions",
				children: [result && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "lx-flow-link",
					"aria-expanded": showResult,
					onClick: () => setShowResult(!showResult),
					children: showResult ? "收起结果" : step.title === "因果解释" ? "解释图表" : step.title === "模型比较" ? "比较结果" : "预测结果"
				}), openFile && reports.map((file, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "lx-flow-link",
					title: file.path,
					onClick: () => {
						setFileError("");
						Promise.resolve().then(() => openFile(file.path)).catch(() => setFileError("文件打开失败，请在工作区检查文件是否仍存在。"));
					},
					children: reports.length === 1 ? "打开报告" : /\.md$/i.test(file.path) ? "分析报告" : /\.html?$/i.test(file.path) ? "HTML 报告" : `报告 ${index + 1}`
				}, file.path))]
			}),
			fileError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "lx-flow-error",
				role: "alert",
				children: fileError
			}),
			open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StepDetails, {
				step,
				openFile
			}),
			showResult && result && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-flow-result",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LimixToolCard, {
					callId: last.key,
					toolName: "limix",
					openFile,
					block: {
						kind: "tool-result",
						call: {
							name: "limix",
							argsRaw: JSON.stringify(last.args)
						},
						content: [{
							type: "text",
							text: JSON.stringify(last.data)
						}],
						isError: !last.ok
					}
				})
			})
		]
	});
}

//#endregion
//#region src/client/LimixPipelineView.tsx
function LimixPipelineView({ useTrajectory, useSession, useSessions, sessionId, cwd, openFile, viewRequest, completeViewRequest }) {
	const traj = useTrajectory((t) => t);
	const title = useSessions?.((s) => s.byId?.[sessionId]?.title);
	const session = useSession?.((s) => s);
	const visible = (0, react.useMemo)(() => parseRounds(traj?.eventNodes ?? [], traj?.runningCalls ?? []).reverse(), [traj]).filter((round) => round.stages.length > 0);
	const [focusedRound, setFocusedRound] = (0, react.useState)(null);
	const root = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		const key = viewRequest?.view === "limix-pipeline" ? viewRequest.focus?.stageKey : pendingTurnFlow(sessionId);
		if (!key) return;
		const round = visible.find((r) => r.stages.some((s) => s.key === key));
		const element = round && root.current?.querySelector(`[data-lx-round="${round.turn}"]`);
		if (!element) return;
		setFocusedRound({
			turn: round.turn,
			token: {}
		});
		const request = element.querySelector(".lx-flow-request");
		if (request) request.open = true;
		element.scrollIntoView({ block: "start" });
		element.focus({ preventScroll: true });
		clearTurnFlow(sessionId);
		if (viewRequest?.view === "limix-pipeline") completeViewRequest?.();
	}, [
		viewRequest,
		visible,
		completeViewRequest,
		sessionId
	]);
	const stages = visible.flatMap((round) => round.stages);
	const state = session?.running ? {
		kind: "running",
		label: "进行中"
	} : flowState(stages);
	const current = [...stages].reverse().find((stage) => stage.running || stage.stateKind === "running");
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "lx-flow",
		ref: root,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: PIPELINE_CSS }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "lx-flow-inner",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: "lx-flow-header",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "lx-flow-heading",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: typeof title === "string" && title ? title : "从数据到分析交付" }), stages.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "lx-flow-status",
							"data-state": state.kind,
							children: state.label
						})]
					}), (current || session?.running || !stages.length) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "lx-flow-caption",
						children: current ? `正在执行：${current.title}` : session?.running ? "Agent 正在继续分析" : "数据处理、预测、因果解释与报告将在这里按顺序呈现。"
					})]
				}),
				visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "lx-flow-empty",
					children: "本会话还没有分析活动。"
				}),
				visible.map((round, index) => {
					const steps = flowSteps(round, cwd);
					const revision = index > 0 && steps.some((s) => s.title === "报告输出" && s.stages.some((stage) => stage.toolName === "edit")) && !steps.some((s) => s.limix);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "lx-flow-section",
						"data-lx-round": round.turn,
						tabIndex: -1,
						"aria-label": `第 ${round.turn} 轮分析`,
						children: [
							visible.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "lx-flow-section-head",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: index === 0 ? "开始分析" : revision ? "报告修订" : "补充分析" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									"第 ",
									round.turn,
									" 轮 · ",
									fmtTime(round.time)
								] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: "lx-flow-request",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: ["本次请求 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { marginLeft: 8 },
									children: fmtTime(round.time)
								})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: round.ask })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
								className: "lx-flow-list",
								children: steps.map((step) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FlowStepRow, {
									step,
									openFile,
									expandToken: focusedRound?.turn === round.turn ? focusedRound.token : void 0
								}, step.key))
							})
						]
					}, `${sessionId ?? ""}-${round.turn}`);
				})
			]
		})]
	}, sessionId);
}

//#endregion
//#region src/client/LimixTurnStack.tsx
const KIND = {
	classify: "分类预测",
	regress: "回归预测",
	forecast: "时序预测",
	health: "连通性",
	check: "权限检查",
	upload: "上传数据",
	data: "数据列表",
	task: "查任务",
	tasks: "任务列表",
	cancel: "取消任务",
	result: "取结果",
	download: "下载结果",
	api: "直调接口",
	explain: "局部解释",
	benchmark: "模型比较",
	report: "分析报告"
};
const PREDICT = new Set([
	"classify",
	"regress",
	"forecast",
	"explain",
	"benchmark",
	"report"
]);
const METRIC_OF = {
	classify: ["accuracy", "准确率"],
	regress: ["r2", "R²"],
	forecast: ["mape", "MAPE"]
};
/** 输出 JSON 里深扫一个键（最多四层，用于任务状态与摘要）。 */
function deep(obj, key, depth = 4) {
	if (depth < 0 || obj === null || typeof obj !== "object") return void 0;
	if (key in obj) return obj[key];
	for (const v of Object.values(obj)) {
		const hit = deep(v, key, depth - 1);
		if (hit !== void 0) return hit;
	}
}
function textOf(node) {
	const blocks = node?.content ?? node?.blocks ?? [];
	return (Array.isArray(blocks) ? blocks : []).filter((b) => (b?.type === "text" || b?.kind === "text") && b.text).map((b) => b.text).join("\n");
}
function LimixTurnStack({ turn, useTrajectory, openView, sessionId }) {
	const nodes = useTrajectory((t) => t?.eventNodes) ?? [];
	const tasks = (0, react.useMemo)(() => {
		const from = turn?.start?.seq ?? -Infinity;
		const to = turn?.end?.seq ?? Infinity;
		const list = [];
		for (const n of Array.isArray(nodes) ? nodes : []) {
			if (typeof n?.seq === "number" && (n.seq < from || n.seq > to)) continue;
			const call = n?.call ?? n?.block?.call ?? null;
			if (call?.name !== "limix") continue;
			let args = {};
			try {
				const value = JSON.parse(call.argsRaw ?? "{}");
				if (value && typeof value === "object" && !Array.isArray(value)) args = value;
			} catch {}
			if (Array.isArray(args.args) && args.args.some((arg) => arg === "--help" || arg === "-h")) continue;
			list.push({
				seq: n.seq,
				command: String(args.command ?? "limix"),
				args,
				text: textOf(n),
				isError: n?.isError === true
			});
		}
		const out = [];
		const others = [];
		const grouped = /* @__PURE__ */ new Map();
		for (const c of list) {
			const parsed = parseToolResult(c.text).data;
			if (!PREDICT.has(c.command) || c.command === "report" && parsed?.kind === "report_facts") {
				others.push(c);
				continue;
			}
			const id = parsed ? deep(parsed, "task_id") : void 0;
			const artifact = ["benchmark", "report"].includes(c.command) ? parsed?.saved_to : void 0;
			const identity = typeof id === "string" && id ? `task:${id}` : typeof artifact === "string" && artifact ? `file:${artifact}` : `call:${c.seq}`;
			grouped.set(`${c.command}:${identity}`, c);
		}
		for (const c of grouped.values()) {
			const result = parseToolResult(c.text);
			const parsed = result.data;
			const [mk, ml] = METRIC_OF[c.command] ?? ["", ""];
			const metric = c.isError || result.failed ? void 0 : metricEntries(parsed).find((item) => item.key === mk);
			parsed && deep(parsed, "task_id");
			const state = resultState(true, c.isError || result.failed, parsed);
			const ok = state.kind !== "error";
			const rows$1 = parsed ? deep(parsed, "rows") : void 0;
			const cols = parsed ? deep(parsed, "columns") : void 0;
			const outFile = parsed ? deep(parsed, "output") : void 0;
			const facts = [
				outFile ? String(outFile).split("/").pop() : "",
				rows$1 !== void 0 ? `${rows$1} 行` : "",
				cols !== void 0 ? `${cols} 列` : "",
				c.args?.context ? `context ${c.args.context}` : "",
				c.args?.horizon ? `horizon ${c.args.horizon}` : ""
			].filter(Boolean).join(" · ");
			out.push({
				key: `s${c.seq}`,
				kind: (() => {
					const args = Array.isArray(c.args.args) ? c.args.args : [];
					const flag$1 = (name) => {
						const i = args.indexOf(name);
						return i >= 0 ? args[i + 1] : void 0;
					};
					const mode = flag$1("--mode"), target = parsed?.explanation?.target_label ?? flag$1("--target");
					const label = c.command === "explain" ? ["directed", "undirected"].includes(mode) ? "关系探索" : "局部解释" : KIND[c.command] ?? c.command;
					return target ? `${label} · ${target}` : label;
				})(),
				ok,
				metric: metric?.value ?? state.label,
				unit: metric ? ml : "",
				facts
			});
		}
		if (others.length > 0) {
			const bad = others.filter((c) => c.isError || parseToolResult(c.text).failed).length;
			const cmds = Array.from(new Set(others.map((c) => c.command)));
			out.push({
				key: "others",
				kind: "其它调用",
				ok: bad === 0,
				metric: `${others.length} 次`,
				unit: bad ? `· ${bad} 失败` : "",
				facts: cmds.map((c) => KIND[c] ?? c).join(" / ")
			});
		}
		return out;
	}, [nodes, turn]);
	const [expanded, setExpanded] = (0, react.useState)(false);
	const [navigationError, setNavigationError] = (0, react.useState)("");
	const root = (0, react.useRef)(null);
	const business = tasks.filter((task) => task.key !== "others");
	const auxiliary = tasks.find((task) => task.key === "others");
	const hidden = business.slice(3);
	const failures = hidden.filter((task) => !task.ok).length;
	(0, react.useEffect)(() => {
		setExpanded(false);
	}, [turn?.start?.seq]);
	(0, react.useEffect)(() => {
		const el = root.current;
		const click = (event) => {
			const action = event.target.closest("[data-lx-turn]")?.dataset.lxTurn;
			if (action === "expand") setExpanded((value) => !value);
			if (action === "flow") {
				const first = nodes.find((n) => typeof n?.seq === "number" && n.seq >= (turn?.start?.seq ?? -Infinity) && n.seq <= (turn?.end?.seq ?? Infinity) && (n.call?.name ?? n.block?.call?.name) === "limix");
				const key = tasks.find((task) => task.key !== "others")?.key ?? (first ? `s${first.seq}` : "");
				if (openView) openView("limix-pipeline", { stageKey: key });
				else if (el && !openTurnFlow(el, sessionId, key)) setNavigationError("请打开上方「任务流程」查看本轮。");
			}
		};
		el?.addEventListener("click", click);
		return () => el?.removeEventListener("click", click);
	}, [
		openView,
		tasks,
		turn,
		sessionId,
		nodes
	]);
	if (tasks.length === 0) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		ref: root,
		className: "lx-turn-summary",
		"aria-label": "本轮 LimiX 结果",
		style: {
			margin: "12px 0 4px",
			fontSize: 12,
			color: "var(--dsw-alias-label-secondary)"
		},
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `.lx-turn-summary button{border:0;background:none;padding:3px 0;font:inherit;font-size:11px;color:var(--dsw-alias-state-business-primary,#466eb9);cursor:pointer}.lx-turn-summary button:focus-visible{outline:2px solid #466eb9;outline-offset:3px}` }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 16,
					flexWrap: "wrap",
					marginBottom: 5,
					fontSize: 11,
					color: "var(--dsw-alias-label-tertiary)"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: business.length ? `本轮 LimiX · ${business.length} 个任务` : "本轮 LimiX · 辅助调用" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-turn": "flow",
					children: "查看本轮任务流程 ↗"
				})]
			}),
			(expanded ? tasks : business.slice(0, 3)).map((task) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexWrap: "wrap",
					gap: "4px 16px",
					alignItems: "baseline",
					padding: "5px 0"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: task.kind }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: {
							fontWeight: 500,
							fontVariantNumeric: "tabular-nums",
							color: task.ok ? "var(--dsw-alias-label-primary)" : "#cf4545"
						},
						children: [
							task.metric,
							" ",
							task.unit
						]
					}),
					task.facts && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { color: "var(--dsw-alias-label-tertiary)" },
						children: task.facts
					})
				]
			}, task.key)),
			navigationError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				role: "status",
				children: navigationError
			}),
			(hidden.length > 0 || auxiliary) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"data-lx-turn": "expand",
				"aria-expanded": expanded,
				children: expanded ? "收起 ⌃" : `${hidden.length ? `展开其余 ${hidden.length} 个任务` : "查看辅助调用"}${failures ? ` · 其中 ${failures} 个未完成` : ""}${auxiliary && !auxiliary.ok ? " · 辅助调用有失败" : ""} ⌄`
			})
		]
	});
}

//#endregion
//#region src/client/LimixWelcome.tsx
const EXAMPLES = [
	{
		label: "预测销量",
		question: "下个月，哪些商品会热销？",
		icon: "M3 17l6-6 4 4 8-10M15 5h6v6",
		prompt: "我想预测商品销量。请先帮我确认历史销量数据、预测周期和目标列，再用 LimiX 完成预测。"
	},
	{
		label: "材料性能预测",
		question: "这种材料的抗拉强度有多高？",
		icon: "M9 3h6M10 3v7l-5.2 8a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 10V3M8 16h8",
		prompt: "我想根据材料配方和工艺参数，预测新配方的抗拉强度。请先确认已有实验数据、配方与工艺字段、抗拉强度列及单位，再用 LimiX 做回归预测。"
	},
	{
		label: "预测电价",
		question: "未来电价会怎样变化？",
		icon: "M13 2L4 14h7l-1 8 10-12h-7l0-8z",
		prompt: "我想预测未来电价。请先确认历史电价数据的时间列、采样频率和预测时长，再用 LimiX 做时序预测。"
	}
];
const CSS = `
.lx-welcome{margin:6px var(--dsh-composer-side-clearance,20px) 0;color:var(--dsw-alias-label-secondary);font:inherit}
.lx-welcome p{margin:0 0 10px;font-size:12px;line-height:1.6}
.lx-welcome-examples{display:flex;gap:10px;flex-wrap:wrap}
.lx-welcome button{box-sizing:border-box;display:inline-flex;align-items:center;gap:7px;max-width:100%;min-height:36px;padding:7px 14px;border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 3%,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary);text-align:left;font:inherit;font-size:13px;line-height:20px;cursor:pointer}
.lx-welcome button:hover{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 7%,var(--dsw-alias-bg-base,#fff));border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary,#3465ce) 25%,transparent)}
.lx-welcome button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#3465ce);outline-offset:3px}
.lx-welcome button svg{width:15px;height:15px;flex:none;color:var(--dsw-alias-label-primary-bluish,#3465ce)}
`;
function LimixWelcome({ sessionId, session, useSessions, inputActions }) {
	const preset = useSessions((state) => state.byId[sessionId]?.projectionValues?.agentPreset);
	if (!session?.blank || preset !== "limix") return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WelcomeContent, { inputActions }, sessionId);
}
function WelcomeContent({ inputActions }) {
	const anchor = (0, react.useRef)(null);
	const [examplesHost, setExamplesHost] = (0, react.useState)(null);
	(0, react.useEffect)(() => {
		const composer = anchor.current?.closest("[data-composer-seat]")?.querySelector("[data-slot=\"conversation.composer.bar\"]");
		if (!composer) return;
		const host = document.createElement("div");
		host.setAttribute("data-limix-examples-host", "");
		composer.after(host);
		setExamplesHost(host);
		return () => host.remove();
	}, []);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
		ref: anchor,
		hidden: true,
		"data-limix-welcome": ""
	}), examplesHost && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: "lx-welcome",
		"aria-label": "LimiX 预测引导",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: CSS }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "上传数据，或告诉我你想预测什么。" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-welcome-examples",
				role: "group",
				"aria-label": "推荐问题",
				children: EXAMPLES.map((example) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					title: example.question,
					onClick: () => inputActions.setDraft(example.prompt),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinecap: "round",
						strokeLinejoin: "round",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: example.icon })
					}), example.label]
				}, example.label))
			})
		]
	}), examplesHost)] });
}

//#endregion
//#region src/client/index.tsx
const inject = [
	"slots",
	"locale",
	"sessions",
	"sidebarRight"
];
function apply(ctx) {
	ctx.effect(() => ctx.locale.register("limix-agent", {
		zh: { "view.pipeline": "任务流程" },
		en: { "view.pipeline": "Task flow" }
	}), "limix-agent: dictionaries");
	const t = ctx.locale.bind("limix-agent");
	ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
		name: "conversation.input.dock",
		id: "limix-welcome",
		order: -10
	}, LimixWelcome));
	ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
		name: "tool.call.toolview",
		key: "limix"
	}, LimixToolCard));
	ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
		name: "conversation.chat.turnTail",
		id: "limix-turn-stack",
		order: 30
	}, LimixTurnStack));
	ctx.slots.inject("conversation.view", () => ctx.slots.register({
		name: "conversation.view",
		id: "limix-pipeline",
		order: 15,
		label: () => t("view.pipeline"),
		inject: (sessionId) => ({
			cwd: ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd,
			openFile: (path) => {
				const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd?.replace(/\\/g, "/").replace(/\/+$/, "");
				let normalized = path.replace(/\\/g, "/").replace(/^(?:\.\/)+/, "");
				if (cwd && normalized.startsWith(cwd + "/")) normalized = normalized.slice(cwd.length + 1);
				const encode = (value) => encodeURIComponent(value).replace(/%3A/gi, ":");
				ctx.sidebarRight.openResource(`dsh-resource://file/session/${encode(sessionId)}/${normalized.split("/").map(encode).join("/")}`);
			}
		})
	}, LimixPipelineView));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });