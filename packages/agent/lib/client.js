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

//#region src/client/ConfusionMatrix.tsx
const ACCENT$2 = "#2563eb";
/** 单元格边长按类别数收缩，保证整图宽度稳定在卡片内 */
function cellSize(k) {
	return k <= 3 ? 62 : k <= 5 ? 52 : k <= 8 ? 42 : 34;
}
/** 标签过长会撑破行首，统一截断并留 title 兜底 */
function short(s, max) {
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
						children: short(c, 6)
					}, `h${c}`)),
					classes.map((rc, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: LEFT - 6,
						y: TOP + i * cs + cs / 2 + 3,
						textAnchor: "end",
						fontSize: "10",
						fill: "currentColor",
						opacity: "0.7",
						children: short(rc, 10)
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
								fill: ACCENT$2,
								opacity: v === 0 ? .04 : .1 + .72 * f
							}),
							diag && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								x: LEFT + j * cs + 1,
								y: TOP + i * cs + 1,
								width: cs - 2,
								height: cs - 2,
								rx: 3,
								fill: "none",
								stroke: ACCENT$2,
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
									children: short(c.label, 14)
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
const ACCENT$1 = "#2563eb";
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
					fill: ACCENT$1,
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
function parseToolResult(text$1) {
	const [stdout, stderr = ""] = text$1.split("\n[stderr]\n");
	const envelope = objectJson(stdout.trim());
	const data = typeof envelope?.stdout === "string" ? objectJson(envelope.stdout) : envelope;
	const errorData = objectJson(stderr.trim());
	return {
		data,
		failed: typeof envelope?.exitCode === "number" && envelope.exitCode !== 0 || data?.ok === false || data?.success === false || ["failed", "timeout"].includes(data?.task_status ?? data?.status) || !stdout.trim() && !!stderr.trim(),
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
		data.row_numbers ?? data.samples?.map((sample) => sample.row_number)
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

//#endregion
//#region src/client/LocalExplanation.tsx
function LocalExplanation({ data }) {
	const root = (0, react.useRef)(null), [expanded, setExpanded] = (0, react.useState)(false);
	(0, react.useEffect)(() => {
		const element = root.current;
		const click = (event) => {
			if (event.target.closest("[data-lx-local-toggle]")) setExpanded((v) => !v);
		};
		element?.addEventListener("click", click);
		return () => element?.removeEventListener("click", click);
	}, []);
	const factors = (data.features ?? []).filter((f) => Number.isFinite(f.score));
	const maximum = Math.max(...factors.map((f) => Math.abs(f.score)), 1e-5);
	const prediction = explanationPrediction(data);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: root,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-explain-head",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-explain-label",
					children: [
						sampleLabel({
							row_number: data.row_number ?? 1,
							step: data.step,
							timestamp: data.timestamp
						}, data),
						" · ",
						prediction.label
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-explain-value",
					children: [typeof data.prediction === "number" ? number(data.prediction) : data.prediction ?? "未返回", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "lx-explain-unit",
						children: prediction.unit
					})]
				})] }), prediction.comparable && data.prior_prediction !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-explain-diff",
					children: [
						"原预测 ",
						typeof data.prior_prediction === "number" ? number(data.prior_prediction) : data.prior_prediction,
						" ",
						prediction.unit,
						data.task_type === "classification" && data.prediction !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: String(data.prior_prediction) === String(data.prediction) ? "分类结果一致" : `重算类别 ${data.prior_prediction} → ${data.prediction}` }) : typeof data.prediction_delta === "number" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							"重算差异 ",
							data.prediction_delta > 0 ? "+" : "",
							number(data.prediction_delta),
							" ",
							prediction.unit
						] })
					]
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-explain-subtitle",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "主要影响因素" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "贡献分数 · 模型方向" })]
			}),
			(expanded ? factors : factors.slice(0, 6)).map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-factor",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "lx-factor-name",
						children: [f.label, f.label !== f.name && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "lx-factor-key",
							children: f.name
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "lx-factor-track",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "lx-factor-bar",
							"data-direction": f.direction,
							style: { width: `${Math.abs(f.score) / maximum * 100}%` }
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "lx-factor-score",
						children: number(f.score)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "lx-factor-direction",
						children: [directionLabel(f.direction), f.direction === 1 ? " ↑" : f.direction === -1 ? " ↓" : ""]
					})
				]
			}, f.name)),
			factors.length > 6 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "lx-explain-toggle",
				"data-lx-local-toggle": true,
				"aria-expanded": expanded,
				children: expanded ? "收起因素 ↑" : `查看全部 ${factors.length} 个因素 ↓`
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "lx-explain-foot",
				children: "解释模型如何得到本次预测；贡献分数不代表实际调节收益。"
			})
		]
	});
}

//#endregion
//#region src/client/ExplanationDataTable.tsx
function explanationRecords(data) {
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
	const headings = data.mode === "local" ? [
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
//#region src/client/graph-layout.ts
function graphLayout(nodes, edges) {
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
	if (isolated.length) columns.set(Math.max(-1, ...columns.keys()) + 1, isolated);
	const layers = [...columns.entries()].sort(([a], [b]) => a - b).map(([, group]) => group), width = Math.max(620, layers.length * 190 + 30);
	const height = Math.max(230, Math.max(0, ...layers.map((c) => c.length)) * 50 + 48);
	const positions = /* @__PURE__ */ new Map();
	layers.forEach((col, i) => col.forEach((n, j) => positions.set(n, [layers.length === 1 ? width / 2 : 85 + i * (width - 170) / (layers.length - 1), 35 + (j + .5) * (height - 55) / col.length])));
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
const signed = (v) => v === null ? "方向未定" : `${v > 0 ? "+" : ""}${number(v)}`;
function contributionExportSvg(data, filtered, description = "", theme = defaultExportTheme) {
	const coverage = data.samples?.length ? (filtered?.samples?.length ?? 0) / data.samples.length * 100 : 0;
	const groups = filtered ? [{
		data: filtered,
		title: `当前筛选 · ${filtered.samples?.length ?? 0} 个样本 · 覆盖率 ${number(coverage)}%`
	}, {
		data,
		title: `全样本 · ${data.samples?.length ?? 0} 个样本`
	}] : [{
		data,
		title: `全样本 · ${data.samples?.length ?? 0} 个样本`
	}];
	const plotWidth = Math.max(700, (data.feature_names?.length ?? 1) * 48);
	const labelWidth = Math.max(100, ...(data.feature_names ?? []).map((n) => (data.labels?.[n] ?? n).length * 10));
	const width = 80 + plotWidth + 64 + labelWidth + 20 + 290 + 110;
	const plotHeight = Math.max(330, Math.min(900, (data.samples?.length ?? 1) * 4), (data.feature_names?.length ?? 1) * 25);
	const sectionHeight = plotHeight + Math.max(95, ...(data.feature_names ?? []).map((n) => (data.labels?.[n] ?? n).length * 10)) + 100, height = 110 + groups.length * sectionHeight + 50;
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
			svg += `<g transform="translate(${x + (i + .5) * columnWidth} ${y + plotHeight + 16}) rotate(55)">` + text(0, 0, label, 12) + (label === name ? "" : text(0, 17, name, 10, "opacity=\".65\"")) + "</g>";
		});
		svg += `<line x1="${barZero}" x2="${barZero}" y1="${y}" y2="${y + plotHeight}" stroke="${theme.border}"/>`;
		matrix.ranking.forEach((feature, i) => {
			const cy = y + (i + .5) * plotHeight / Math.max(names.length, 1), v = feature.mean;
			const barWidth = v === null || !scales.meanMaximum ? 0 : Math.abs(v) / scales.meanMaximum * barHalf;
			svg += text(barLabel + labelWidth, cy - 1, feature.label, 12, "text-anchor=\"end\"") + (feature.label !== feature.name ? text(barLabel + labelWidth, cy + 13, feature.name, 10, "text-anchor=\"end\" opacity=\".6\"") : "");
			if (v !== null) svg += `<rect x="${v < 0 ? barZero - barWidth : barZero}" y="${cy - 5}" width="${barWidth}" height="10" fill="${v < 0 ? contributionColors.negative : contributionColors.positive}"/>`;
			svg += text(width - 30, cy + 4, signed(v), 12, "text-anchor=\"end\"");
		});
		svg += text(barZero - barHalf, y + plotHeight + 20, `−${number(scales.meanMaximum)}`, 11, "text-anchor=\"middle\"") + text(barZero, y + plotHeight + 20, "0", 11, "text-anchor=\"middle\"") + text(barZero + barHalf, y + plotHeight + 20, `+${number(scales.meanMaximum)}`, 11, "text-anchor=\"middle\"");
	});
	svg += text(36, height - 36, "蓝色负向 · 绿色正向 · 灰蓝中性 · 灰色方向未定；中性按 0 计入均值，正负会抵消。", 12);
	return svg + end;
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
function ExplanationExport({ build, filename }) {
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
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "导出图表" }),
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
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				role: "status",
				className: "lx-export-status",
				children: status
			})
		]
	});
}

//#endregion
//#region src/client/ExplanationSingle.tsx
function ExplanationSingle({ data }) {
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
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
				build: (theme) => contributionExportSvg(matrix, void 0, `原始行 ${data.row_number ?? 1}`, theme)
			})]
		}), view === "visual" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LocalExplanation, { data }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationDataTable, { data: matrix })]
	});
}

//#endregion
//#region src/client/ContributionLegend.tsx
function ContributionLegend({ maximum, unknown, neutral = false }) {
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["负向 −", number(maximum)] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "0" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						"+",
						number(maximum),
						" 正向"
					] })
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
.lx-matrix-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:11px;color:var(--dsw-alias-label-secondary);margin:2px 0 14px}
.lx-matrix-scroll{overflow-x:auto}.lx-matrix-svg{display:block;width:100%;min-width:650px;max-height:430px;color:var(--dsw-alias-label-primary)}
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
	const root = (0, react.useRef)(null), [hint, setHint] = (0, react.useState)(""), [expanded, setExpanded] = (0, react.useState)(false);
	const matrix = (0, react.useMemo)(() => contributionMatrix(data), [data]);
	const samples = data.samples ?? [], names = data.feature_names ?? [];
	const { helpRef, helpId, helpOpen } = useExplanationHelp(!!samples.length && !!names.length);
	const plotHeight = expanded ? Math.max(312, names.length * 22) : 312, plotWidth = 548, rowHeight = plotHeight / (samples.length || 1), columnWidth = plotWidth / (names.length || 1);
	const angledLabels = names.some((name) => textWidth(data.labels?.[name] ?? name) * 11 > columnWidth - 6);
	const axisFont = angledLabels ? Math.min(11, Math.max(7, columnWidth * .7)) : 11;
	const axisWidth = angledLabels ? 94 : Math.min(120, columnWidth - 6);
	const featureHint = (index) => {
		const name = names[index], label = data.labels?.[name];
		return `特征 ${index + 1} · ${label && label !== name ? `${label} · 字段：` : ""}${name}`;
	};
	const unknown = samples.some((s) => s.directions.some((d) => !knownDirection(d)));
	const neutral = samples.some((s) => s.directions.includes(0)), prediction = explanationPrediction(data);
	const ranking = expanded ? matrix.ranking : matrix.ranking.slice(0, 16), maxMean = (scales?.meanMaximum ?? Math.abs(ranking[0]?.mean ?? 0)) || 1, maximum = scales?.maximum ?? matrix.maximum;
	const barStart = 720, barEnd = 838, barZero = (barStart + barEnd) / 2;
	const summaryHelp = "每个样本的贡献按方向带上正负号，再求平均；正负会抵消。按平均值的绝对大小排序。" + (data.task_type === "classification" ? "分类任务的正负仅表示服务返回方向，不对应指定类别概率。" : "");
	const rowTicks = [...new Set([
		0,
		.25,
		.5,
		.75,
		1
	].map((t) => Math.round(t * (samples.length - 1))))];
	(0, react.useEffect)(() => {
		setHint("");
	}, [data]);
	(0, react.useEffect)(() => {
		const element = root.current;
		const click = (event) => {
			if (event.target.closest("[data-lx-matrix-expand]")) setExpanded((v) => !v);
		};
		element?.addEventListener("click", click);
		return () => element?.removeEventListener("click", click);
	}, [!!samples.length, !!names.length]);
	(0, react.useEffect)(() => {
		const element = root.current;
		const describe = (event) => {
			const target = event.target.closest("[data-lx-matrix-cell], [data-lx-feature-label]");
			if (target) setHint(target.getAttribute("aria-label") ?? "");
		};
		const keydown = (event) => {
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
					" 个特征 · 不分页"
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContributionLegend, {
					maximum,
					unknown,
					neutral
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "lx-matrix-scroll",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					className: "lx-matrix-svg",
					viewBox: `0 0 900 ${plotHeight + (angledLabels ? 138 : 72)}`,
					role: "group",
					"aria-label": `${scope} ${samples.length} 个样本、${names.length} 个特征的贡献热力图，共 ${matrix.cellCount} 个色块`,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
							x: "0",
							y: "12",
							fontSize: "10",
							opacity: ".6",
							children: data.task_type === "timeseries" ? "预测步" : "原始行"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
							role: "group",
							"aria-label": "各影响因子影响分数对比",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								x: "626",
								y: "12",
								fontSize: "11",
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
							const hint$1 = `${sampleLabel(sample, data)} · ${label} ${cell.name} · 贡献 ${number(cell.score)} · ${directionLabel(cell.direction)}${sample.prediction === void 0 ? "" : ` · ${prediction.label} ${typeof sample.prediction === "number" ? number(sample.prediction) : sample.prediction}${prediction.unit ? " " + prediction.unit : ""}`}`;
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
								"data-lx-batch": "row",
								"data-row": row.rowNumber,
								"data-index": row.sampleIndex,
								"data-feature": cell.featureIndex,
								"aria-label": hint$1,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: `${hint$1}；点击查看此样本，方向键选择色块` })
							}, cell.name);
						}) }, row.rowNumber)),
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
									fontSize: "10",
									opacity: ".6",
									children: scales ? `−${number(scales.meanMaximum)}` : "负向"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: barEnd,
									y: plotHeight + 46,
									textAnchor: "end",
									fontSize: "10",
									opacity: ".6",
									children: scales ? `+${number(scales.meanMaximum)}` : "正向"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
							ref: helpRef,
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
				children: hint || "悬停或点击特征名查看全称；点击色块查看该样本。"
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
function ExplanationFilter({ data, value, onApply }) {
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
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
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
		}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
function ExplanationBatch({ data }) {
	const root = (0, react.useRef)(null);
	const [tab, setTab] = (0, react.useState)("distribution"), [view, setView] = (0, react.useState)("visual");
	const [filter, setFilter] = (0, react.useState)(emptyFilter);
	const applyFilter = (0, react.useCallback)((value) => {
		setFilter(value);
		setPage(0);
		setSelected(null);
	}, []);
	const active = filterActive(filter), description = filterDescription(filter, data);
	const visible = (0, react.useMemo)(() => active ? {
		...data,
		samples: filterSamples(data, filter)
	} : data, [
		data,
		filter,
		active
	]);
	const scales = (0, react.useMemo)(() => contributionScales(data, visible), [data, visible]);
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
			if (action === "visual" || action === "raw") setView(action);
			if (action === "distribution" || action === "sample") setTab(action);
			if (action === "row") {
				setSelected(Number(button.dataset.row));
				setTab("sample");
				setView("visual");
			}
			if (action === "previous") setPage((p) => Math.max(0, p - 1));
			if (action === "next") setPage((p) => Math.min(pages - 1, p + 1));
			if (action === "table") setSelected(null);
		};
		const change = (event) => {
			if (event.target.matches("[data-lx-sample-select]")) setSelected(Number(event.target.value));
		};
		element?.addEventListener("click", click);
		element?.addEventListener("change", change);
		return () => {
			element?.removeEventListener("click", click);
			element?.removeEventListener("change", change);
		};
	}, [pages]);
	const cellMax = scales.maximum;
	const unknown = samples.some((s) => s.directions.some((d) => !knownDirection(d)));
	const neutral = samples.some((s) => s.directions.includes(0));
	const selectedSample = selected === null ? void 0 : allSamples.find((s) => s.row_number === selected);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: root,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-batch-summary",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
					data.explained_count ?? allSamples.length,
					" / ",
					data.requested_count ?? allSamples.length,
					" 个样本"
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-batch-meta",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						names.length,
						" 个特征",
						data.input_rows ? ` · 输入共 ${data.input_rows} 行` : ""
					] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ExplanationHelp, {
						label: "数据说明",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: data.mapping === "forecast_steps" ? "按接口返回的预测步与时间对应；特征包含服务生成的时间和季节性特征。" : data.mapping === "input_order" ? "样本按输入顺序对应；接口未返回样本索引，返回数量与请求一致。" : "样本按接口返回的样本索引对应。" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "贡献用于解释预测，不代表实际调节收益。" })]
					})]
				})]
			}),
			!!data.missing_rows?.length && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: "lx-explain-warning",
				children: [
					"仅解释了部分样本；未返回原始行：",
					data.missing_rows.join("、"),
					"。整体排序只统计已返回样本。"
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-explain-tabs",
				"aria-label": "解释数据视图",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-batch": "visual",
					"aria-pressed": view === "visual",
					children: "可视化"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-batch": "raw",
					"aria-pressed": view === "raw",
					children: "原始数据"
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-analysis-toolbar",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationFilter, {
					data,
					value: filter,
					onApply: applyFilter
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationExport, {
					filename: `${data.target}-解释${active ? "-筛选对比" : ""}`,
					build: (theme) => contributionExportSvg(data, active ? visible : void 0, description, theme)
				})]
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
			view === "raw" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationDataTable, { data: visible }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-plot-tabs",
				"aria-label": "解释图表",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-batch": "distribution",
					"aria-pressed": tab === "distribution",
					children: "贡献热力图"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-batch": "sample",
					"aria-pressed": tab === "sample",
					children: "逐样本"
				})]
			}), tab === "distribution" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: active ? "lx-matrix-comparison" : "",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContributionHeatmap, {
					data: visible,
					scope: active ? "当前筛选" : "全部",
					scales: active ? scales : void 0
				}), active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContributionHeatmap, {
					data,
					scope: "全样本",
					scales
				})]
			}) : selectedSample ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-sample-control",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-batch": "table",
					children: "← 返回样本表"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["选择样本 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
					"data-lx-sample-select": true,
					value: selected ?? 0,
					onChange: () => {},
					"aria-label": "选择原始样本行",
					children: allSamples.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: s.row_number,
						children: sampleLabel(s, data)
					}, s.row_number))
				})] })]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LocalExplanation, { data: sampleView(data, selectedSample) }, selectedSample.row_number)] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
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
			] })] })
		]
	});
}

//#endregion
//#region src/client/ExplanationGraph.tsx
function ExplanationGraph({ data }) {
	const root = (0, react.useRef)(null), id = (0, react.useId)().replace(/:/g, "");
	const [focus, setFocus] = (0, react.useState)(false), [selected, setSelected] = (0, react.useState)(null), [expanded, setExpanded] = (0, react.useState)(false);
	const [view, setView] = (0, react.useState)("visual");
	const allNodes = data.nodes ?? [], allEdges = data.edges ?? [];
	const label = (n) => data.labels?.[n] ?? n;
	const edges = focus ? allEdges.filter((e) => e.source === data.target || e.target === data.target) : allEdges;
	const neighbors = new Set([data.target, ...edges.flatMap((e) => [e.source, e.target])]);
	const nodes = focus ? allNodes.filter((n) => neighbors.has(n)) : allNodes;
	const { positions, width, height, isolated, cycles } = graphLayout(nodes, edges);
	(0, react.useEffect)(() => {
		const element = root.current;
		const click = (event) => {
			const button = event.target.closest("[data-lx-graph]");
			if (!button || !element?.contains(button)) return;
			if (button.dataset.lxGraph === "focus") {
				setFocus((v) => !v);
				setSelected(null);
			}
			if (button.dataset.lxGraph === "details") setExpanded((v) => !v);
			if (button.dataset.lxGraph === "node") setSelected((v) => v === button.dataset.node ? null : button.dataset.node);
			if (button.dataset.lxGraph === "clear") setSelected(null);
			if (button.dataset.lxGraph === "visual" || button.dataset.lxGraph === "raw") setView(button.dataset.lxGraph);
		};
		const keydown = (e) => {
			if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-lx-graph=\"node\"]")) {
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
	}, []);
	const active = new Set(selected ? [selected, ...edges.filter((e) => e.source === selected || e.target === selected).flatMap((e) => [e.source, e.target])] : nodes);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: root,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-explain-subtitle",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-graph-mode",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: data.mode === "directed" ? "有向关系探索" : "无向关联探索" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ExplanationHelp, {
						label: "关系图说明",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "连线表示模型发现的关系，数值为关系分数。" }), data.mode === "directed" && cycles.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "图中含双向或循环关系，不代表确定的因果顺序。" })]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
					allNodes.length,
					" 个变量 · ",
					allEdges.length,
					" 条关系"
				] })]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-explain-tabs",
				"aria-label": "关系数据视图",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-graph": "visual",
					"aria-pressed": view === "visual",
					children: "可视化"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-lx-graph": "raw",
					"aria-pressed": view === "raw",
					children: "原始数据"
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "lx-analysis-toolbar",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "lx-graph-toolbar",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-lx-graph": "focus",
							"aria-pressed": focus,
							children: focus ? "显示全部关系" : "聚焦目标关系"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: focus ? `当前 ${nodes.length} 个变量 · ${edges.length} 条关系` : "完整网络 · 点击变量高亮关联" }),
						selected && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-lx-graph": "clear",
							children: "清除高亮"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationExport, {
					filename: `${data.target}-关系图`,
					build: (theme) => graphExportSvg({
						...data,
						nodes,
						edges
					}, theme, focus ? "目标关系" : "完整网络")
				})]
			}),
			view === "raw" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationDataTable, { data: {
				...data,
				edges
			} }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "lx-graph-scroll",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
						className: "lx-causal-graph",
						viewBox: `0 0 ${width} ${height}`,
						style: {
							minWidth: Math.min(width, 720),
							maxHeight: 460
						},
						role: "group",
						"aria-label": `${nodes.length} 个变量、${edges.length} 条真实${data.mode === "directed" ? "有向" : "无向"}关系`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("marker", {
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
							}) }),
							edges.map((e, i) => {
								const a = positions.get(e.source), b = positions.get(e.target);
								if (!a || !b) return null;
								const right = b[0] > a[0], same = b[0] === a[0];
								const ax = a[0] + (right || same ? 68 : -68), bx = b[0] + (right ? -68 : 68);
								const path = same ? `M ${ax} ${a[1]} C ${ax + 30} ${a[1]}, ${bx + 30} ${b[1]}, ${bx} ${b[1]}` : `M ${ax} ${a[1]} C ${(ax + bx) / 2} ${a[1]}, ${(ax + bx) / 2} ${b[1]}, ${bx} ${b[1]}`;
								const emphasized = !selected || e.source === selected || e.target === selected;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
									opacity: emphasized ? 1 : .12,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
										className: "lx-causal-edge",
										d: path,
										style: { strokeWidth: selected && emphasized ? 2.1 : 1.25 },
										markerEnd: data.mode === "directed" ? `url(#lx-arrow-${id})` : void 0,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: `${label(e.source)} ${data.mode === "directed" ? "→" : "—"} ${label(e.target)}：${number(e.weight)}` })
									}), edges.length <= 5 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										x: (ax + bx) / 2,
										y: (a[1] + b[1]) / 2 - 7,
										textAnchor: "middle",
										fontSize: "11",
										children: number(e.weight)
									})]
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
				}),
				!edges.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "lx-explain-foot",
					children: "当前返回结果未发现与目标直接相连的关系。"
				}),
				!!isolated.length && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					className: "lx-explain-foot",
					children: [isolated.length, " 个变量未检出连线"]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "lx-explain-toggle",
					"data-lx-graph": "details",
					"aria-expanded": expanded,
					children: expanded ? "收起关系明细 ↑" : `查看 ${edges.length} 条关系明细 ↓`
				}),
				expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: "lx-edge-list",
					children: edges.map((e, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						label(e.source),
						" ",
						data.mode === "directed" ? "→" : "—",
						" ",
						label(e.target)
					] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: number(e.weight) })] }, i))
				})
			] })
		]
	});
}

//#endregion
//#region src/client/ExplanationView.tsx
const CSS$3 = `
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
.lx-filter{flex:1}.lx-filter-panel{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-top:12px;padding:12px;background:var(--dsw-alias-background-secondary,#f7f8fa);border-radius:6px}.lx-filter-panel label{display:grid;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.lx-filter input,.lx-filter select,.lx-raw input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3,#dce2eb);border-radius:4px;padding:5px 7px;min-height:29px;background:var(--dsw-alias-background-primary,#fff);color:var(--dsw-alias-label-primary,#202734);font:inherit;max-width:220px}.lx-filter-range{display:flex;align-items:center;gap:6px}.lx-filter-range input{width:74px}.lx-filter-actions{display:flex;align-items:center;gap:10px;font-size:11px}.lx-filter-error{width:100%;font-size:11px;color:#986b23;margin:0}
.lx-filter-summary{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:11px;margin:8px 0 16px;color:var(--dsw-alias-label-secondary)}.lx-filter-summary strong{font-weight:500;color:var(--dsw-alias-label-primary)}
.lx-export{display:flex;gap:9px;align-items:center;flex-wrap:wrap;font-size:10px;color:var(--dsw-alias-label-secondary);padding-top:5px}.lx-export button{font-size:10px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important}.lx-export-status:empty{display:none}
.lx-plot-tabs{display:flex;gap:14px;margin:0 0 16px}.lx-plot-tabs button{font-size:11px!important;color:var(--dsw-alias-label-secondary)!important;padding:3px 0!important}.lx-plot-tabs button[aria-pressed=true]{color:var(--dsw-alias-state-business-primary,#3465ce)!important;font-weight:500}
.lx-matrix-comparison>div+div{border-top:1px solid var(--dsw-alias-border-l3,#dce2eb);margin-top:20px;padding-top:20px}.lx-matrix-comparison .lx-matrix-svg{max-height:290px}.lx-matrix-comparison .lx-matrix-readout{min-height:0}
.lx-raw-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 0;font-size:11px;color:var(--dsw-alias-label-secondary)}.lx-raw-toolbar input{width:250px;max-width:70%;font-size:11px}.lx-raw-scroll{overflow:auto;max-height:490px}.lx-raw-table{border-collapse:collapse;width:100%;font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}.lx-raw-table th,.lx-raw-table td{text-align:left;padding:7px 10px!important;border-bottom:1px solid var(--dsw-alias-border-l3,#e7e9ed)}.lx-raw-table th{position:sticky;top:0;background:var(--dsw-alias-background-primary,#fff);font-weight:500;color:var(--dsw-alias-label-secondary)}.lx-raw-table button{font-size:11px!important;color:var(--dsw-alias-state-business-primary,#3465ce)!important}
@container(max-width:520px){.lx-heatmap-heading{display:block}.lx-batch-summary{flex-wrap:wrap}.lx-graph-toolbar{flex-wrap:wrap}}
`;
function ExplanationView({ data }) {
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
		if (!data.detail_path) return;
		const controller = new AbortController();
		setFailure(null);
		setDetail(null);
		fetch("/limix-ui/artifact?path=" + encodeURIComponent(data.detail_path), { signal: controller.signal }).then(async (response) => {
			if (!response.ok) throw new Error(`读取失败（${response.status}）`);
			const value = await response.json();
			if (!validBatchDetail(value, data)) throw new Error("样本文件与本次结果不一致");
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
			data.mode !== "local" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationGraph, { data }) : batch ? loaded.samples ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationBatch, { data: loaded }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
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
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationSingle, { data }),
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
function BenchmarkView({ data }) {
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
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["数据集 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
						"data-bench": "dataset",
						value: dataset.id,
						onChange: () => {},
						"aria-label": "比较数据集",
						children: datasets.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: item.id,
							children: item.name
						}, item.id))
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["指标 ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
						"data-bench": "metric",
						value: key,
						onChange: () => {},
						"aria-label": "比较指标",
						children: keys.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: item,
							children: labels[item]
						}, item))
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "lx-result-meta",
						children: key === "rmse" || key === "mae" ? "越低越好" : "越高越好"
					})
				]
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
	explain: "预测解释",
	benchmark: "多模型效果比较"
};
const CSS$1 = `
.lx-result{border:1px solid var(--dsw-alias-border-l3,#e3e6eb);border-radius:12px;padding:16px 18px;margin:4px 0;font:inherit;font-size:13px;line-height:1.6;min-width:0;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary)}
.lx-result-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.lx-result-brand{font-size:11px;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary);margin-bottom:5px}
.lx-result h3{margin:0;font:inherit;font-weight:600;font-size:15px}
.lx-result-status{display:inline-flex;align-items:center;gap:5px;font-size:12px;margin-left:auto;color:var(--dsw-alias-label-secondary)}
.lx-result-status::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.lx-result-status[data-state=done]{color:#21835c}
.lx-result-status[data-state=error]{color:#cf4545}
.lx-result-status[data-state=running]{color:#a56b16}
.lx-result-status[data-state=warning]{color:#a56b16}
.lx-result-meta{margin:5px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px}
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
	const [showMetrics, setShowMetrics] = (0, react.useState)(false);
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
			if (hit.dataset.lx === "raw") setShowRaw((s) => !s);
			else if (hit.dataset.lx === "metrics") setShowMetrics((s) => !s);
			else if (hit.dataset.lx === "inspect") inspectRef.current?.();
			else if (hit.dataset.lx === "file" && hit.dataset.path) openFileRef.current?.(hit.dataset.path);
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
	const argList = (0, react.useMemo)(() => {
		const raw = Array.isArray(args.args) ? args.args.filter((a) => typeof a === "string") : [];
		return raw[0] === args.command ? raw.slice(1) : raw;
	}, [args]);
	const shorten = (v) => typeof v === "string" && cwd && v.startsWith(cwd + "/") ? v.slice(cwd.length + 1) : v;
	const cmdLine = [
		"limix",
		typeof args.command === "string" ? args.command : "",
		...argList.map(shorten)
	].filter(Boolean).join(" ");
	/** 取命令行某个 flag 的值；时序与分类/回归两条支路共用 */
	const flagValue = (0, react.useMemo)(() => (flag) => {
		const i = argList.indexOf(flag);
		return i >= 0 && i + 1 < argList.length ? argList[i + 1] : void 0;
	}, [argList]);
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
	const explanation = command === "explain" && !cliFailed ? parsed?.explanation : null;
	const target = explanation?.target_label ?? flagValue("--target");
	const rows$1 = parsed?.result_content?.rows ?? parsed?.rows;
	const sampleCount = parsed?.metrics?.n;
	const help = argList.some((arg) => arg === "--help" || arg === "-h");
	const prediction = !help && [
		"regress",
		"classify",
		"forecast"
	].includes(command);
	const title = help ? "参数说明" : explanation && explanation.mode !== "local" ? "因果关系探索" : COMMAND_LABELS[command] ?? "工具结果";
	const file = typeof parsed?.saved_to === "string" ? parsed.saved_to : null;
	const errorMessage = typeof result.error?.error === "string" ? result.error.error : typeof result.error?.error_message === "string" ? result.error.error_message : "请展开调用详情，查看失败原因。";
	const hint = typeof result.error?.hint === "string" ? result.error.hint : "";
	const detailsId = `lx-result-details-${String(callId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
	const metricsId = `${detailsId}-metrics`;
	const compact = help || command === "health";
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
				className: `lx-result${compact ? " lx-result-compact" : ""}`,
				ref: rootRef,
				"aria-label": `LimiX ${title}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: CSS$1 + CARD_FULLSCREEN_CSS }),
					!compact && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "lx-result-brand",
						children: "LimiX"
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
							compact && rawToggle,
							(explanation || benchmark) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "lx-fullscreen-button",
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
					!compact && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "lx-result-meta",
						children: [typeof rows$1 === "number" && Number.isFinite(rows$1) ? `${rows$1} 行预测结果` : "", typeof sampleCount === "number" && Number.isFinite(sampleCount) ? `${typeof rows$1 === "number" ? " · " : ""}${sampleCount} 个样本参与评估` : ""]
					}),
					benchmark && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BenchmarkView, { data: benchmark }),
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
						explanation && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationView, { data: explanation }),
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
						prediction && settled && status.kind === "done" && metrics.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "lx-result-note",
							children: "预测已完成；本次未返回评估指标。"
						}),
						chart && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ForecastChart, { ...chart }),
						evalView?.kind === "cls" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfusionMatrix, { data: evalView.data }),
						evalView?.kind === "reg" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScatterChart, { data: evalView.data })
					] }),
					!compact && (text$1 || file || inspect) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "lx-result-actions",
						children: [
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
							explanation && typeof parsed?.csv_path === "string" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
								href: "/limix-ui/artifact?path=" + encodeURIComponent(parsed.csv_path),
								download: true,
								children: [
									"下载",
									explanation.mode === "local" ? "贡献" : "关系",
									" CSV ↓"
								]
							}),
							explanation && file && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/limix-ui/artifact?path=" + encodeURIComponent(file),
								download: true,
								children: "下载原始 JSON ↓"
							}),
							savedCsv && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "/limix-ui/csv?path=" + encodeURIComponent(savedCsv) + "&download=1",
								download: savedCsv.split("/").pop(),
								children: "下载 CSV ↓"
							}),
							file && (openFile ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
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
							rawToggle,
							metrics.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"data-lx": "metrics",
								"aria-expanded": showMetrics,
								"aria-controls": metricsId,
								children: showMetrics ? "收起指标说明 ↑" : "指标说明 ↓"
							}),
							showRaw && inspect && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
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
//#region src/client/LimixPipelineView.tsx
const ACCENT = "rgb(65, 118, 230)";
function textOf$1(blocks) {
	return (blocks ?? []).filter((b) => (b.type === "text" || b.kind === "text") && b.text).map((b) => b.text).join("\n");
}
function parseArgs(raw) {
	try {
		const v = JSON.parse(raw ?? "{}");
		return typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
	} catch {
		return {};
	}
}
/** stdout 段解析成对象（剥 [stderr] 段；整体 → 首末花括号截取） */
function parseOutObj(text$1) {
	const stdout = text$1.split("\n[stderr]\n")[0].trim();
	if (!stdout) return null;
	const asObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v) ? v : null;
	try {
		const v = asObj(JSON.parse(stdout));
		if (v) return v;
	} catch {}
	const a = stdout.indexOf("{");
	const b = stdout.lastIndexOf("}");
	if (a >= 0 && b > a) try {
		return asObj(JSON.parse(stdout.slice(a, b + 1)));
	} catch {}
	return null;
}
/** 深扫对象里的目标键（≤3 层），同键取首见 */
function deepFind(obj, keys, depth = 0, out = {}) {
	if (!obj || typeof obj !== "object" || depth > 3) return out;
	for (const [k, v] of Object.entries(obj)) {
		const lk = k.toLowerCase();
		if (keys.includes(lk) && (typeof v === "number" || typeof v === "string")) {
			if (!(lk in out)) out[lk] = v;
		} else if (typeof v === "object") deepFind(v, keys, depth + 1, out);
	}
	return out;
}
const METRIC_KEYS = [
	"mape",
	"rmse",
	"mae",
	"r2",
	"accuracy",
	"auc",
	"f1",
	"skillmape",
	"skillmae"
];
const METRIC_ZH = {
	mape: "MAPE",
	rmse: "RMSE",
	mae: "MAE",
	r2: "R²",
	accuracy: "准确率",
	auc: "AUC",
	f1: "F1",
	skillmape: "超基线(MAPE)",
	skillmae: "超基线(MAE)"
};
const ID_KEYS = [
	"task_id",
	"result_version_id",
	"data_version_id"
];
const ID_ZH = {
	task_id: "任务",
	result_version_id: "结果版本",
	data_version_id: "数据版本"
};
function fmtMetric(v) {
	const n = Number(v);
	if (!Number.isFinite(n)) return String(v);
	return Math.abs(n) >= 100 ? n.toFixed(1) : String(Number(n.toPrecision(4)));
}
/** 兜底区的工具中文名 */
const TOOL_ZH = {
	bash: "Shell",
	str_replace_editor: "编辑文件",
	web_search: "网页搜索",
	skill: "加载技能",
	todo_write: "待办",
	ask_user_question: "询问用户",
	goal: "目标",
	subagent: "子代理"
};
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
	"-o": "输出文件",
	"--output": "输出文件",
	"--levels": "分位档",
	"--quantile": "带分位区间",
	"--sync": "同步模式",
	"--timeout": "超时(s)",
	"--data": "请求体",
	"--date-format": "时间格式"
};
const baseName = (p) => p.includes("/") ? p.split("/").pop() ?? p : p;
/** limix 参数 → 中文键值行 */
function limixKv(args) {
	const rows$1 = [["子命令", String(args.command ?? "")]];
	const list = Array.isArray(args.args) ? args.args.map(String) : [];
	for (let i = 0; i < list.length; i++) {
		const tok = list[i];
		if (tok.startsWith("-")) {
			const zh = FLAG_ZH[tok] ?? tok;
			const next = list[i + 1];
			if (next !== void 0 && !next.startsWith("--")) {
				rows$1.push([zh, /文件/.test(zh) ? baseName(next) : next]);
				i++;
			} else rows$1.push([zh, "开"]);
		} else rows$1.push(["参数", baseName(tok)]);
	}
	return rows$1.filter(([, v]) => v !== "");
}
/**
* 解析一条龙命令内部的接口序列（CLI stderr 日志：上传/复用/提交/轮询/下载/结果版本/重试）
*/
function parseSubsteps(text$1) {
	const idx = text$1.indexOf("\n[stderr]\n");
	if (idx < 0) return [];
	const out = [];
	let poll = 0;
	for (const line of text$1.slice(idx + 10).split("\n")) {
		const l = line.trim();
		let m;
		if (m = l.match(/^上传成功:\s*(\S+)\s*→/)) out.push(`⇧ 上传 ${m[1]}`);
		else if (m = l.match(/^([^:：]{1,12}):\s*使用已有数据版本/)) out.push(`⇧ ${m[1]}复用已有版本`);
		else if (m = l.match(/^已提交异步任务\s*(\S+)/)) out.push(`▶ 提交任务 ${m[1].slice(0, 8)}…`);
		else if (m = l.match(/^任务\s*\S+:\s*(\S+)/)) {
			poll += 1;
			const label = `↻ 轮询 ×${poll}（${m[1]}）`;
			if (out.length && out[out.length - 1].startsWith("↻ 轮询")) out[out.length - 1] = label;
			else out.push(label);
		} else if (m = l.match(/^已下载\s*→\s*(\S+)/)) out.push(`⇩ 下载 ${m[1].split("/").pop() ?? m[1]}`);
		else if (m = l.match(/^结果版本\s*(\S+)/)) out.push(`✓ 结果版本 ${m[1].slice(0, 8)}…`);
		else if (/重试/.test(l)) out.push("↻ 网络重试");
	}
	return out;
}
/** 失败时抽 stderr 首个有内容行 */
function firstErrLine(text$1) {
	const idx = text$1.indexOf("\n[stderr]\n");
	const err = idx >= 0 ? text$1.slice(idx + 10) : text$1;
	for (const line of err.split("\n")) {
		const l = line.trim();
		if (l) return l.slice(0, 180);
	}
	return "";
}
/** limix 工具调用 → 阶段分类 */
function classifyLimix(args) {
	const cmd = String(args.command ?? "");
	const list = Array.isArray(args.args) ? args.args.map(String) : [];
	const joined = list.join(" ");
	if (cmd === "upload") return {
		cat: "upload",
		title: "上传数据"
	};
	if (cmd === "classify" || cmd === "regress" || cmd === "forecast") {
		if (list.includes("--help") || list.includes("-h")) return {
			cat: "api",
			title: "查用法"
		};
		return {
			cat: "predict",
			title: `LimiX 预测（${cmd === "classify" ? "分类" : cmd === "regress" ? "回归" : "时序"}）`
		};
	}
	if (cmd === "api") {
		if (/explanation/i.test(joined)) return {
			cat: "explain",
			title: "因果解释"
		};
		if (/evaluat/i.test(joined)) return {
			cat: "evaluate",
			title: "评估"
		};
		if (/imput/i.test(joined)) return {
			cat: "data",
			title: "缺失补全"
		};
		return {
			cat: "api",
			title: "API 直调"
		};
	}
	if (cmd === "task" || cmd === "tasks" || cmd === "result") return {
		cat: "poll",
		title: "任务查询"
	};
	if (cmd === "download") return {
		cat: "download",
		title: "下载结果"
	};
	if (cmd === "health" || cmd === "check") return {
		cat: "health",
		title: "连通性检查"
	};
	if (cmd === "data") return {
		cat: "poll",
		title: "数据查询"
	};
	return {
		cat: "api",
		title: `limix ${cmd}`
	};
}
/** 由输出对象派生指标与 ID 标签 */
function deriveOut(text$1) {
	const obj = parseOutObj(text$1);
	const output = obj ? JSON.stringify(obj, null, 2).slice(0, 2e3) : (text$1.split("\n[stderr]\n")[0].trim() || text$1.trim()).slice(0, 1200) || "（无输出）";
	const metricsRaw = obj ? deepFind(obj, METRIC_KEYS) : {};
	const idsRaw = obj ? deepFind(obj, ID_KEYS) : {};
	return {
		output,
		metrics: Object.entries(metricsRaw).map(([k, v]) => [METRIC_ZH[k] ?? k, fmtMetric(v)]),
		ids: Object.entries(idsRaw).map(([k, v]) => [ID_ZH[k] ?? k, String(v)])
	};
}
/** 会话节点 → 分轮管线（升序解析，调用方倒序展示） */
function parseRounds(nodes, running) {
	const rounds = [];
	let cur = null;
	let turn = 0;
	for (const n of nodes) {
		if (n.kind === "user") {
			turn += 1;
			cur = {
				turn,
				time: n.time,
				ask: textOf$1(n.content).slice(0, 120) || "（空消息）",
				result: "",
				stages: [],
				others: []
			};
			rounds.push(cur);
			continue;
		}
		if (!cur) continue;
		if (n.kind === "assistant") {
			const first = textOf$1(n.blocks ?? n.content).split("\n").map((s) => s.replace(/^[#>\-*\s]+/, "").trim()).find((s) => s.length > 4);
			if (first) cur.result = first.slice(0, 110);
			continue;
		}
		if (n.kind !== "tool-result") continue;
		const name = n.call?.name;
		const args = parseArgs(n.call?.argsRaw);
		const fullText = textOf$1(n.content);
		const ok = !n.isError && !(/^\s*$/.test(fullText.split("\n[stderr]\n")[0]) && fullText.includes("[stderr]"));
		const base = {
			ok,
			time: n.time,
			start: n.callTime ?? n.time,
			end: n.time,
			errLine: ok ? "" : firstErrLine(fullText)
		};
		if (name === "limix") {
			const { cat, title } = classifyLimix(args);
			const list = Array.isArray(args.args) ? args.args.map(String) : [];
			cur.stages.push({
				key: `s${n.seq}`,
				cat,
				title,
				summary: [
					"limix",
					String(args.command ?? ""),
					...list
				].filter(Boolean).join(" ").slice(0, 200),
				inputKv: limixKv(args),
				inputRaw: JSON.stringify(args, null, 2).slice(0, 2e3),
				...deriveOut(fullText),
				substeps: parseSubsteps(fullText),
				...base,
				limix: true
			});
		} else if (name === "datasource") {
			const cmd = String(args.command ?? "");
			const kv = [["子命令", cmd]];
			if (args.source) kv.push(["数据源", String(args.source).slice(0, 12) + "…"]);
			if (args.table) kv.push(["表", String(args.table)]);
			if (args.mode) kv.push(["模式", String(args.mode)]);
			if (args.fileName) kv.push(["落盘文件", String(args.fileName)]);
			if (args.sql) kv.push(["SQL", String(args.sql).slice(0, 300)]);
			cur.stages.push({
				key: `s${n.seq}`,
				cat: "data",
				title: cmd === "query" ? args.mode === "materialize" ? "取数落盘（宽表）" : "取数预览" : cmd === "inspect" ? "看库表结构" : "数据源清单",
				summary: [
					"datasource",
					cmd,
					String(args.sql ?? args.table ?? "")
				].filter(Boolean).join(" ").slice(0, 200),
				inputKv: kv,
				inputRaw: JSON.stringify(args, null, 2).slice(0, 2e3),
				...deriveOut(fullText),
				substeps: [],
				...base
			});
		} else if (name === "bash") {
			const cmdText = String(args.command ?? "");
			if (/\.html|\.md\b|报告/i.test(cmdText) && /python|cat|tee|>|write/i.test(cmdText)) cur.stages.push({
				key: `s${n.seq}`,
				cat: "report",
				title: "生成报告",
				summary: cmdText.slice(0, 200),
				inputKv: [["命令", cmdText.slice(0, 300)]],
				inputRaw: cmdText.slice(0, 2e3),
				output: fullText.slice(0, 1200) || "（无输出）",
				metrics: [],
				ids: [],
				substeps: [],
				...base
			});
			else if (/pandas|\.csv|python/i.test(cmdText)) cur.stages.push({
				key: `s${n.seq}`,
				cat: "prep",
				title: "数据处理",
				summary: cmdText.slice(0, 200) || "bash 数据处理",
				inputKv: [["命令", cmdText.slice(0, 300) || "（见原始参数）"]],
				inputRaw: cmdText.slice(0, 2e3),
				output: fullText.slice(0, 1200) || "（无输出）",
				metrics: [],
				ids: [],
				substeps: [],
				...base
			});
			else cur.others.push(["Shell", cmdText.slice(0, 90) || "（命令为空）"]);
		} else if (name === "str_replace_editor" && /\.(html|md)"/.test(n.call?.argsRaw ?? "") && /create/.test(String(args.command ?? ""))) {
			const path = String(args.path ?? "");
			cur.stages.push({
				key: `s${n.seq}`,
				cat: "report",
				title: "生成报告",
				summary: `写入 ${baseName(path)}`,
				inputKv: [["文件", baseName(path) || "（未知）"]],
				inputRaw: JSON.stringify(args, null, 2).slice(0, 2e3),
				output: fullText.slice(0, 800) || "（已写入）",
				metrics: [],
				ids: [],
				substeps: [],
				...base
			});
		} else if (name) {
			const brief = String(args.command ?? args.path ?? args.query ?? args.name ?? "").slice(0, 90) || (n.call?.argsRaw ?? "").slice(0, 90);
			cur.others.push([TOOL_ZH[name] ?? name, brief]);
		}
	}
	const last = rounds[rounds.length - 1];
	if (last) for (const rc of running) {
		if (rc.name !== "limix" && rc.name !== "datasource") continue;
		const args = parseArgs(rc.argsRaw);
		const meta = rc.name === "limix" ? classifyLimix(args) : {
			cat: "data",
			title: "数据源调用"
		};
		last.stages.push({
			key: `r${rc.callId ?? String(last.stages.length)}`,
			cat: meta.cat,
			title: meta.title,
			summary: "运行中…",
			inputKv: rc.name === "limix" ? limixKv(args) : [["参数", "（运行中）"]],
			inputRaw: JSON.stringify(args, null, 2).slice(0, 2e3),
			output: "（进行中）",
			metrics: [],
			ids: [],
			errLine: "",
			ok: true,
			running: true,
			time: last.time,
			start: last.time,
			end: Number.MAX_SAFE_INTEGER,
			substeps: [],
			limix: rc.name === "limix"
		});
	}
	return rounds.filter((r) => r.stages.length > 0 || r.others.length > 0).reverse();
}
/**
* 相邻阶段的"并行"分组，两个判据取或：
* ① 时间区间重叠 = 真·并发执行；
* ② 无缝续接（间隔 ≤150ms）= 模型一步批量发出、宿主执行器排队串行跑
*   （实测同批 limix 调用间隔 0~1ms；真·串行步之间隔着秒级 LLM 思考，不会误判）。
* 两种在业务叙事里都是"agent 同时安排了这几件事"，且运行中/落定后显示一致
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
const CAT_STYLE = {
	prep: {
		bg: "rgba(15,17,21,.055)",
		label: "⚙"
	},
	data: {
		bg: "rgba(88,120,180,.14)",
		label: "🗄"
	},
	upload: {
		bg: "rgba(65,118,230,.12)",
		label: "⇧"
	},
	predict: {
		bg: "rgba(65,118,230,.2)",
		label: "◆"
	},
	evaluate: {
		bg: "rgba(22,163,74,.14)",
		label: "☑"
	},
	explain: {
		bg: "rgba(150,90,200,.16)",
		label: "☀"
	},
	poll: {
		bg: "rgba(127,127,127,.12)",
		label: "↻"
	},
	download: {
		bg: "rgba(127,127,127,.12)",
		label: "⇩"
	},
	health: {
		bg: "rgba(127,127,127,.12)",
		label: "♥"
	},
	api: {
		bg: "rgba(127,127,127,.12)",
		label: "≡"
	},
	running: {
		bg: "rgba(180,83,9,.14)",
		label: "…"
	},
	report: {
		bg: "rgba(20,140,120,.13)",
		label: "📄"
	}
};
function fmtDur(ms) {
	if (!Number.isFinite(ms) || ms < 0) return "";
	const s = Math.round(ms / 1e3);
	if (s < 1) return "<1s";
	if (s < 60) return `${s}s`;
	return `${Math.floor(s / 60)}分${s % 60}秒`;
}
function fmtTime(t) {
	const d = new Date(t);
	const p = (x) => String(x).padStart(2, "0");
	return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
/** 轮次总耗时：首个发起到末个完成（排除运行中的 Infinity） */
function roundDur(r) {
	const ends = r.stages.map((s) => s.end).filter((e) => e !== Number.MAX_SAFE_INTEGER);
	if (!ends.length) return "运行中";
	return fmtDur(Math.max(...ends) - Math.min(...r.stages.map((s) => s.start)));
}
const ui = {
	wrap: {
		padding: "14px 22px",
		overflowY: "auto",
		height: "100%",
		fontSize: 13
	},
	empty: {
		opacity: .55,
		padding: 24,
		textAlign: "center",
		lineHeight: 2
	},
	round: {
		border: "1px solid rgba(0,0,0,.09)",
		borderRadius: 12,
		padding: "12px 16px",
		marginBottom: 14,
		overflow: "hidden",
		minWidth: 0
	},
	roundHead: {
		display: "flex",
		alignItems: "baseline",
		gap: 10,
		flexWrap: "wrap",
		cursor: "pointer",
		userSelect: "none"
	},
	caret: {
		fontSize: 11,
		opacity: .45,
		width: 12
	},
	turnTag: {
		fontSize: 11,
		fontWeight: 700,
		color: ACCENT,
		background: "rgba(65,118,230,.1)",
		padding: "1px 8px",
		borderRadius: 999,
		whiteSpace: "nowrap"
	},
	limixTag: {
		fontSize: 11,
		fontWeight: 700,
		color: "#fff",
		background: ACCENT,
		padding: "1px 8px",
		borderRadius: 999,
		whiteSpace: "nowrap",
		cursor: "help"
	},
	ask: {
		fontWeight: 600,
		overflowWrap: "anywhere"
	},
	time: {
		fontSize: 11,
		opacity: .45,
		marginLeft: "auto",
		whiteSpace: "nowrap"
	},
	result: {
		margin: "6px 0 0 22px",
		fontSize: 12.5,
		opacity: .75,
		overflowWrap: "anywhere",
		borderLeft: `2px solid rgba(65,118,230,.35)`,
		paddingLeft: 8
	},
	flow: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 6,
		marginTop: 10
	},
	chip: (cat, ok, active, running) => ({
		display: "inline-flex",
		alignItems: "center",
		gap: 5,
		padding: "4px 11px",
		borderRadius: 8,
		fontSize: 12.5,
		cursor: "pointer",
		background: CAT_STYLE[cat].bg,
		border: active ? `1.5px solid ${ACCENT}` : ok ? "1px solid rgba(0,0,0,.08)" : "1px solid rgba(220,38,38,.55)",
		color: ok ? "inherit" : "#dc2626",
		opacity: running ? .8 : 1
	}),
	chipMeta: {
		fontSize: 10.5,
		opacity: .55
	},
	arrow: {
		opacity: .3,
		fontSize: 12
	},
	parallel: {
		display: "inline-flex",
		flexDirection: "column",
		gap: 4,
		padding: 5,
		borderRadius: 10,
		border: `1px dashed rgba(65,118,230,.4)`
	},
	parallelTag: {
		fontSize: 10,
		color: ACCENT,
		opacity: .75,
		lineHeight: 1,
		paddingLeft: 2
	},
	errBox: {
		marginTop: 10,
		padding: "6px 10px",
		borderRadius: 8,
		fontSize: 12,
		color: "#dc2626",
		background: "rgba(220,38,38,.07)",
		border: "1px solid rgba(220,38,38,.25)",
		overflowWrap: "anywhere"
	},
	metricPill: {
		display: "inline-flex",
		gap: 4,
		alignItems: "baseline",
		padding: "2px 10px",
		borderRadius: 999,
		fontSize: 12,
		background: "rgba(22,163,74,.09)",
		border: "1px solid rgba(22,163,74,.3)"
	},
	idPill: {
		display: "inline-flex",
		gap: 4,
		alignItems: "baseline",
		padding: "2px 10px",
		borderRadius: 999,
		fontSize: 11.5,
		background: "rgba(127,127,127,.08)",
		border: "1px solid rgba(0,0,0,.1)"
	},
	idVal: {
		fontFamily: "ui-monospace, monospace",
		userSelect: "all",
		cursor: "text"
	},
	substeps: {
		marginTop: 10,
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 5,
		borderTop: "1px dashed rgba(0,0,0,.12)",
		paddingTop: 10
	},
	substep: {
		fontSize: 11.5,
		padding: "2px 9px",
		borderRadius: 999,
		background: "rgba(65,118,230,.07)",
		border: "1px solid rgba(65,118,230,.2)",
		whiteSpace: "nowrap"
	},
	detail: {
		marginTop: 10,
		borderTop: "1px dashed rgba(0,0,0,.12)",
		paddingTop: 10,
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
		gap: 12
	},
	ioLabel: {
		fontSize: 11,
		opacity: .5,
		marginBottom: 4
	},
	kvGrid: {
		display: "grid",
		gridTemplateColumns: "auto minmax(0,1fr)",
		gap: "3px 12px",
		fontSize: 12.5,
		background: "rgba(127,127,127,.07)",
		borderRadius: 8,
		padding: 10
	},
	kvKey: {
		opacity: .55,
		whiteSpace: "nowrap"
	},
	kvVal: {
		overflowWrap: "anywhere",
		minWidth: 0
	},
	io: {
		whiteSpace: "pre-wrap",
		overflowWrap: "anywhere",
		fontFamily: "ui-monospace, monospace",
		fontSize: 11.5,
		lineHeight: 1.55,
		background: "rgba(127,127,127,.07)",
		borderRadius: 8,
		padding: 10,
		maxHeight: 260,
		overflowY: "auto"
	},
	rawToggle: {
		fontSize: 11,
		opacity: .5,
		cursor: "pointer",
		marginTop: 6
	}
};
function LimixPipelineView({ useSession, useTrajectory }) {
	const traj = useTrajectory((t) => t);
	const nodes = (0, react.useMemo)(() => traj?.eventNodes ?? [], [traj]);
	const runningCalls = traj?.runningCalls ?? [];
	const rounds = (0, react.useMemo)(() => parseRounds(nodes, runningCalls), [nodes, runningCalls]);
	window.__lxPipelineNodes = nodes;
	const [openKey, setOpenKey] = (0, react.useState)(null);
	const [override, setOverride] = (0, react.useState)({});
	const [showRaw, setShowRaw] = (0, react.useState)(false);
	if (!rounds.length) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: ui.empty,
		children: [
			"本会话还没有 LimiX 分析活动。 发起一次预测（样例库选一个，或直接描述需求），这里会实时展开完整的调用管线：",
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
			"数据处理 → 上传 → 预测 → 评估 / 因果解释 → 取结果。"
		]
	});
	const newestTurn = rounds[0].turn;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		style: ui.wrap,
		children: rounds.map((r) => {
			const open = override[r.turn] ?? r.turn === newestTurn;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: ui.round,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: ui.roundHead,
						onClick: () => setOverride((o) => ({
							...o,
							[r.turn]: !open
						})),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: ui.caret,
								children: open ? "▾" : "▸"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: ui.turnTag,
								children: [
									"第 ",
									r.turn,
									" 轮"
								]
							}),
							(() => {
								const lx = r.stages.filter((st) => st.limix);
								if (lx.length === 0) return null;
								const byTitle = /* @__PURE__ */ new Map();
								for (const st of lx) byTitle.set(st.title, (byTitle.get(st.title) ?? 0) + 1);
								const detail = [...byTitle].map(([t, n]) => n > 1 ? `${t} ×${n}` : t).join(" · ");
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: ui.limixTag,
									title: detail,
									children: ["LimiX ×", lx.length]
								});
							})(),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: ui.ask,
								children: r.ask
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: ui.time,
								children: [
									r.stages.length,
									" 阶段 · ",
									roundDur(r),
									" · ",
									fmtTime(r.time)
								]
							})
						]
					}),
					r.result && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: ui.result,
						children: ["结论：", r.result]
					}),
					open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: ui.flow,
							children: [groupParallel(r.stages).map((group, gi) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: { display: "contents" },
								children: [gi > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: ui.arrow,
									children: "→"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: group.length > 1 ? ui.parallel : { display: "contents" },
									children: [group.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: ui.parallelTag,
										title: "模型一步并行发出；宿主按队列依次执行",
										children: ["并行 ×", group.length]
									}), group.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: ui.chip(s.cat, s.ok, openKey === s.key, s.running),
										title: s.summary,
										onClick: () => {
											setOpenKey((k) => k === s.key ? null : s.key);
											setShowRaw(false);
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												"aria-hidden": "true",
												children: CAT_STYLE[s.cat].label
											}),
											s.title,
											s.substeps.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: ui.chipMeta,
												children: [
													"·",
													s.substeps.length,
													"接口"
												]
											}),
											!s.running && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: ui.chipMeta,
												children: fmtDur(s.end - s.start)
											}),
											s.running && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													fontSize: 11,
													opacity: .7
												},
												children: "运行中"
											}),
											!s.ok && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: { fontSize: 11 },
												children: "失败"
											})
										]
									}, s.key))]
								})]
							}, group[0].key)), r.others.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: { display: "contents" },
								children: [r.stages.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: ui.arrow,
									children: "→"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: ui.chip("api", true, openKey === `others-${r.turn}`),
									title: "不进主线的其他工具活动（搜索/读改文件/普通 Shell 等）",
									onClick: () => setOpenKey((k) => k === `others-${r.turn}` ? null : `others-${r.turn}`),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											"aria-hidden": "true",
											children: "≡"
										}),
										"其他活动",
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: ui.chipMeta,
											children: ["×", r.others.length]
										})
									]
								})]
							})]
						}),
						openKey === `others-${r.turn}` && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...ui.detail,
								gridTemplateColumns: "minmax(0,1fr)"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: ui.kvGrid,
								children: r.others.map(([name, brief], i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: { display: "contents" },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: ui.kvKey,
										children: name
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: ui.kvVal,
										children: brief || "—"
									})]
								}, i))
							})
						}),
						r.stages.filter((s) => s.key === openKey).map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							!s.ok && s.errLine && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: ui.errBox,
								children: ["✕ ", s.errLine]
							}),
							(s.metrics.length > 0 || s.ids.length > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexWrap: "wrap",
									gap: 6,
									marginTop: 10
								},
								children: [s.metrics.map(([k, v]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: ui.metricPill,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											opacity: .6,
											fontSize: 11
										},
										children: k
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: v })]
								}, k)), s.ids.map(([k, v]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: ui.idPill,
									title: "点击全选后 Cmd+C 复制",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											opacity: .55,
											fontSize: 10.5
										},
										children: k
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: ui.idVal,
										children: v.length > 18 ? v.slice(0, 18) + "…" : v
									})]
								}, k))]
							}),
							s.substeps.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: ui.substeps,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...ui.ioLabel,
										marginBottom: 0,
										marginRight: 4
									},
									children: "内部接口序列"
								}), s.substeps.map((step, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: { display: "contents" },
									children: [i > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: ui.arrow,
										children: "→"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: ui.substep,
										children: step
									})]
								}, i))]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: ui.detail,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { minWidth: 0 },
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: ui.ioLabel,
											children: "输入"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: ui.kvGrid,
											children: s.inputKv.map(([k, v], i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: { display: "contents" },
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: ui.kvKey,
													children: k
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: ui.kvVal,
													children: v
												})]
											}, i))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: ui.rawToggle,
											onClick: (e) => {
												e.stopPropagation();
												setShowRaw((x) => !x);
											},
											children: showRaw ? "▲ 收起原始参数" : "▼ 原始参数"
										}),
										showRaw && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												...ui.io,
												marginTop: 4
											},
											children: s.inputRaw
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { minWidth: 0 },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: ui.ioLabel,
										children: ["输出 · ", fmtTime(s.time)]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: ui.io,
										children: s.output
									})]
								})]
							})
						] }, s.key))
					] })
				]
			}, r.turn);
		})
	});
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
	explain: "预测与因果解释"
};
const PREDICT = new Set([
	"classify",
	"regress",
	"forecast",
	"explain"
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
function LimixTurnStack({ turn, useTrajectory }) {
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
				command: String(args.command ?? "limix"),
				args,
				text: textOf(n),
				isError: n?.isError === true
			});
		}
		const out = [];
		const others = [];
		for (const c of list) {
			if (!PREDICT.has(c.command)) {
				others.push(c);
				continue;
			}
			const result = parseToolResult(c.text);
			const parsed = result.data;
			const [mk, ml] = METRIC_OF[c.command] ?? ["", ""];
			const metric = c.isError || result.failed ? void 0 : metricEntries(parsed).find((item) => item.key === mk);
			const tid = parsed ? deep(parsed, "task_id") : void 0;
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
				key: `${c.command}:${String(tid ?? out.length)}`,
				kind: KIND[c.command] ?? c.command,
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
	if (tasks.length === 0) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: "lx-turn-summary",
		"aria-label": "本轮 LimiX 结果",
		style: {
			margin: "12px 0 4px",
			fontSize: 12,
			color: "var(--dsw-alias-label-secondary)"
		},
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				marginBottom: 5,
				fontSize: 11,
				color: "var(--dsw-alias-label-tertiary)"
			},
			children: [
				"本轮 LimiX · ",
				tasks.length,
				" 个任务"
			]
		}), tasks.map((task) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
		}, task.key))]
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
const inject = ["slots", "locale"];
function apply(ctx) {
	ctx.effect(() => ctx.locale.register("limix-agent", {
		zh: { "view.pipeline": "分析过程" },
		en: { "view.pipeline": "Analysis" }
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
		label: () => t("view.pipeline")
	}, LimixPipelineView));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });