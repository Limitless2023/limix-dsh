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
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n$1 = keys.length, key; i < n$1; i++) {
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
	const { classes, matrix, n: n$1, accuracy, perClass, majorityBaseline } = data;
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
					n$1,
					" 个样本 · 准确率 ",
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: pct(accuracy) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: { opacity: .75 },
						children: [
							"（多数类基线 ",
							pct(majorityBaseline),
							"——把所有样本都猜成最大类别能拿到的分数， 准确率须高过它才说明模型学到了东西）"
						]
					})
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
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					fontSize: 10,
					opacity: .5,
					marginTop: 2
				},
				children: "深浅按行归一 · 描边格为预测正确 · 对角线越亮越好"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					fontSize: 11,
					opacity: .5,
					marginTop: 4,
					lineHeight: 1.5
				},
				children: "精确率 = 判成这一类的样本里有多少判对了（少冤枉）； 召回率 = 这一类的真实样本里有多少被找了出来（少漏掉）；F1 = 两者的调和平均。"
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
function toPoints(ys, i0, n$1, min, max) {
	const iw = W$1 - PAD$1.left - PAD$1.right;
	const ih = H$1 - PAD$1.top - PAD$1.bottom;
	const span = max - min || 1;
	return ys.map((y, i) => {
		const x = PAD$1.left + (i0 + i) / Math.max(1, n$1 - 1) * iw;
		const yy = PAD$1.top + (1 - (y - min) / span) * ih;
		return `${x.toFixed(1)},${yy.toFixed(1)}`;
	}).join(" ");
}
function ForecastChart({ hist, pred, p10, p90, truth, startLabel, endLabel, target }) {
	if (!hist.length && !pred.length) return null;
	const n$1 = hist.length + pred.length;
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
		const up = toPoints(p90, hist.length, n$1, min, max).split(" ");
		const dn = toPoints(p10, hist.length, n$1, min, max).split(" ").reverse();
		bandPath = "M" + [...up, ...dn].join(" L") + " Z";
	}
	const predWithBridge = hist.length && pred.length ? [hist[hist.length - 1], ...pred] : pred;
	const predStart = hist.length ? hist.length - 1 : 0;
	const fmt = (v) => Math.abs(v) >= 1e3 ? v.toFixed(0) : v.toPrecision(3);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
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
				x1: PAD$1.left + (hist.length - 1) / Math.max(1, n$1 - 1) * (W$1 - PAD$1.left - PAD$1.right),
				y1: PAD$1.top,
				x2: PAD$1.left + (hist.length - 1) / Math.max(1, n$1 - 1) * (W$1 - PAD$1.left - PAD$1.right),
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
				points: toPoints(hist, 0, n$1, min, max),
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				opacity: "0.65"
			}),
			!!truth?.length && truth.length === pred.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polyline", {
				points: toPoints(hist.length ? [hist[hist.length - 1], ...truth] : truth, predStart, n$1, min, max),
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.3",
				opacity: "0.45"
			}),
			predWithBridge.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polyline", {
				points: toPoints(predWithBridge, predStart, n$1, min, max),
				fill: "none",
				stroke: "#2563eb",
				strokeWidth: "1.8",
				strokeDasharray: "5,3"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
				fontSize: "10",
				fill: "currentColor",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: PAD$1.left,
						y1: 6,
						x2: PAD$1.left + 16,
						y2: 6,
						stroke: "currentColor",
						strokeWidth: "1.5",
						opacity: "0.65"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: PAD$1.left + 20,
						y: 9,
						opacity: "0.65",
						children: "历史"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: PAD$1.left + 52,
						y1: 6,
						x2: PAD$1.left + 68,
						y2: 6,
						stroke: "#2563eb",
						strokeWidth: "1.8",
						strokeDasharray: "5,3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("text", {
						x: PAD$1.left + 72,
						y: 9,
						opacity: "0.65",
						children: ["预测", target ? `（${target}）` : ""]
					}),
					!!truth?.length && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: PAD$1.left + 130,
						y1: 6,
						x2: PAD$1.left + 146,
						y2: 6,
						stroke: "currentColor",
						strokeWidth: "1.3",
						opacity: "0.45"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: PAD$1.left + 150,
						y: 9,
						opacity: "0.65",
						children: "真值"
					})] }),
					hasBand && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: PAD$1.left + (truth?.length ? 186 : 120),
						y: 2,
						width: 16,
						height: 8,
						fill: "#2563eb",
						opacity: "0.13"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
						x: PAD$1.left + (truth?.length ? 206 : 140),
						y: 9,
						opacity: "0.65",
						children: "P10–P90"
					})] })
				]
			})
		]
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
	const { points, n: n$1, shown, mae, rmse, r2, min, max } = data;
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
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					fontSize: 12,
					opacity: .7,
					marginBottom: 4
				},
				children: [
					"预测 vs 真实 · 共 ",
					n$1,
					" 个样本",
					shown < n$1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: { opacity: .75 },
						children: [
							"（等距抽样画出 ",
							shown,
							" 点，指标仍按全量计算）"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
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
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					gap: 18,
					fontSize: 12,
					marginTop: 6,
					flexWrap: "wrap"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { opacity: .55 },
						children: "MAE "
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmt(mae) })] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { opacity: .55 },
						children: "RMSE "
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmt(rmse) })] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { opacity: .55 },
						children: "R² "
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: r2 === null ? "—" : r2.toFixed(4) })] })
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					fontSize: 11,
					opacity: .5,
					marginTop: 4,
					lineHeight: 1.5
				},
				children: ["MAE = 平均绝对误差（平均差多少）；RMSE = 均方根误差（对大错更敏感，恒 ≥ MAE， 两者差距大说明存在少数离谱错例）；R² = 相对\"直接猜平均值\"好多少，1 为完美、0 为等同猜均值、可为负。", r2 === null && "本次真实值无波动，R² 无定义故不显示。"]
			})
		]
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
	return rows$1.map((r) => Number(r[idx]));
}
/**
* 解析 limix 时序结果 CSV。识别不出 pred_ 列时返回 null（渲染方零回归降级）。
*
* ⚠️ 必须把分类/回归结果挡在门外：三类任务共用 pred_ 前缀但语义不同——
* 时序是 `pred_{目标列}`，分类与回归都是字面 `pred_label`。若不区分，
* `limix download` 一个分类结果（标签为 0/1 等数值）会被画成一条按行序连点的
* 折线，而分类结果的行序不含时间语义，那条线纯属无中生有。
* 两条判据：① 出现 pred_probs_ 概率列 → 必为分类；② 预测列字面等于 pred_label
* → 必为分类或回归。代价是目标列恰好取名 "label" 的时序会丢图——
* 宁可少画一张，不可画错一张。
*/
function parseForecastCsv(text) {
	const lines = text.trim().split(/\r?\n/);
	if (lines.length < 2) return null;
	const header = splitCsvLine(lines[0]);
	if (header.some((h) => h.startsWith("pred_probs_"))) return null;
	const predIdx = header.findIndex((h) => h.startsWith("pred_") && !h.startsWith("pred_q"));
	if (predIdx < 0 || header[predIdx] === "pred_label") return null;
	const q10Idx = header.findIndex((h) => h.startsWith("pred_q10_"));
	const q90Idx = header.findIndex((h) => h.startsWith("pred_q90_"));
	const rows$1 = lines.slice(1).map(splitCsvLine).filter((r) => r.length === header.length);
	if (!rows$1.length) return null;
	const pred = toNums(rows$1, predIdx);
	if (pred.some((v) => !Number.isFinite(v))) return null;
	const series = {
		dates: rows$1.map((r) => r[0]),
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
function parseTrainTail(text, colTarget, n$1) {
	const lines = text.trim().split(/\r?\n/);
	if (lines.length < 2) return null;
	const header = splitCsvLine(lines[0]);
	const idx = header.indexOf(colTarget);
	if (idx < 0) return null;
	const rows$1 = lines.slice(Math.max(1, lines.length - n$1)).map(splitCsvLine).filter((r) => r.length === header.length);
	const values = toNums(rows$1, idx);
	if (!values.length || values.some((v) => !Number.isFinite(v))) return null;
	return {
		dates: rows$1.map((r) => r[0]),
		values
	};
}

//#endregion
//#region src/client/eval-csv.ts
/** 类别数上限：超过则不画矩阵（格子退化成噪点，读不出信息） */
const MAX_CLASSES = 12;
/** 散点上限：超过则等距抽样，避免上万点拖垮 SVG */
const MAX_POINTS = 1500;
function rows(text) {
	const lines = text.trim().split(/\r?\n/);
	if (lines.length < 2) return null;
	const header = splitCsvLine(lines[0]);
	const body = lines.slice(1).map(splitCsvLine).filter((r) => r.length === header.length);
	return body.length ? {
		header,
		body
	} : null;
}
/** 按列名取整列原始字符串；列不存在返回 null */
function pickColumn(text, col) {
	const t = rows(text);
	if (!t) return null;
	const i = t.header.indexOf(col);
	return i < 0 ? null : t.body.map((r) => r[i]);
}
/**
* 取分类/回归结果的预测列。优先字面 pred_label（平台契约），
* 退而求其次取首个非分位的 pred_ 列（防平台日后改名导致整块失效）
*/
function pickPredLabel(text) {
	const t = rows(text);
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
	const n$1 = pairs.length;
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
		n: n$1,
		correct,
		accuracy: correct / n$1,
		perClass,
		majorityBaseline: Math.max(...perClass.map((c) => c.support)) / n$1
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
		const t = Number(norm(truthRaw[i]));
		const p = Number(norm(predRaw[i]));
		if (Number.isFinite(t) && Number.isFinite(p)) all.push({
			t,
			p
		});
	}
	if (!all.length) return null;
	const n$1 = all.length;
	let ae = 0, se = 0, sum = 0;
	for (const { t, p } of all) {
		ae += Math.abs(p - t);
		se += (p - t) ** 2;
		sum += t;
	}
	const mean = sum / n$1;
	let ssTot = 0;
	for (const { t } of all) ssTot += (t - mean) ** 2;
	const r2 = ssTot > 0 ? 1 - se / ssTot : null;
	const step = Math.ceil(n$1 / MAX_POINTS);
	const points = step > 1 ? all.filter((_, i) => i % step === 0) : all;
	const vals = all.flatMap(({ t, p }) => [t, p]);
	return {
		points,
		n: n$1,
		shown: points.length,
		mae: ae / n$1,
		rmse: Math.sqrt(se / n$1),
		r2,
		min: Math.min(...vals),
		max: Math.max(...vals)
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
/** 中文指标名映射：CLI JSON 键 → 业务读者能看懂的行标签 */
const KEY_LABELS = {
	status: "状态",
	task_id: "任务 ID",
	is_ready: "完成",
	data_version_id: "数据版本",
	accuracy: "准确率",
	rmse: "RMSE",
	mae: "MAE",
	mape: "MAPE",
	r2: "R²",
	message: "消息",
	file: "文件",
	output: "输出文件",
	rows: "行数",
	task_type: "任务类型",
	engine_type: "引擎",
	model_type: "模型",
	config_name: "配置",
	callback_url: "回调地址",
	priority: "优先级",
	created_at: "创建时间",
	queued_at: "入队时间",
	started_at: "开始时间",
	finished_at: "完成时间",
	updated_at: "更新时间",
	elapsed: "耗时",
	file_id: "文件 ID",
	filename: "文件名",
	columns: "列数",
	n_rows: "行数"
};
/**
* 从 CLI 文本输出里尽力解析 JSON，失败返回 null 走原文展示。
* 真实形态：limix.py 的 emit() 是 indent=2 的多行美化 JSON，且工具 render 会把
* stderr 以 "\n[stderr]\n" 拼接在 stdout 之后——解析顺序：
* ① 剥离 stderr 段后整体 parse ② 首"{"到末"}"截取 parse ③ JSON-lines 逐行取末条
*/
function parseCliJson(text) {
	const stdout = text.split("\n[stderr]\n")[0].trim();
	if (!stdout) return null;
	const asObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v) ? v : null;
	try {
		const v = asObj(JSON.parse(stdout));
		if (v) return v;
	} catch {}
	const a = stdout.indexOf("{");
	const b = stdout.lastIndexOf("}");
	if (a >= 0 && b > a) try {
		const v = asObj(JSON.parse(stdout.slice(a, b + 1)));
		if (v) return v;
	} catch {}
	let last = null;
	for (const line of stdout.split("\n")) {
		const l = line.trim();
		if (!l.startsWith("{")) continue;
		try {
			const v = asObj(JSON.parse(l));
			if (v) last = v;
		} catch {}
	}
	return last;
}
const ui$1 = {
	card: {
		border: "1px solid rgba(127,127,127,.25)",
		borderRadius: 10,
		padding: "8px 12px",
		fontSize: 13,
		lineHeight: 1.6,
		margin: "2px 0",
		overflow: "hidden",
		minWidth: 0,
		overflowWrap: "anywhere"
	},
	badge: (err, running) => ({
		display: "inline-block",
		padding: "0 8px",
		borderRadius: 6,
		fontSize: 12,
		fontWeight: 600,
		color: running ? "#b45309" : err ? "#dc2626" : "#16a34a",
		background: running ? "rgba(180,83,9,.1)" : err ? "rgba(220,38,38,.1)" : "rgba(22,163,74,.1)"
	}),
	kv: {
		display: "grid",
		gridTemplateColumns: "auto minmax(0, 1fr)",
		gap: "2px 14px",
		margin: "6px 0 0"
	},
	k: {
		opacity: .6,
		whiteSpace: "nowrap"
	},
	v: {
		wordBreak: "break-all",
		minWidth: 0
	},
	raw: {
		whiteSpace: "pre-wrap",
		overflowWrap: "anywhere",
		fontFamily: "ui-monospace, monospace",
		fontSize: 12,
		background: "rgba(127,127,127,.08)",
		borderRadius: 6,
		padding: 8,
		marginTop: 6,
		maxHeight: 240,
		overflowY: "auto"
	}
};
const FIELD_ORDER = {
	forecast: [
		"task_id",
		"status",
		"result_content"
	],
	regress: [
		"task_id",
		"status",
		"result_content"
	],
	classify: [
		"task_id",
		"status",
		"result_content"
	],
	health: ["status"],
	check: [
		"allowed",
		"api_key_permission",
		"route_permission"
	]
};
/** 预测类任务优先露 任务ID/状态/结果，其余保持服务端顺序。 */
function orderedEntries(obj, command) {
	const all = Object.entries(obj);
	const pref = FIELD_ORDER[String(command ?? "")];
	if (!pref) return all;
	const rank = (k) => pref.indexOf(k) >= 0 ? pref.indexOf(k) : 999;
	return [...all].sort((a, b) => rank(a[0]) - rank(b[0]));
}
function LimixToolCard({ block, inspect, cwd }) {
	const settled = !!block && "kind" in block;
	const [showRaw, setShowRaw] = (0, react.useState)(false);
	const [kvExpanded, setKvExpanded] = (0, react.useState)(false);
	const rootRef = (0, react.useRef)(null);
	const inspectRef = (0, react.useRef)(inspect);
	inspectRef.current = inspect;
	(0, react.useEffect)(() => {
		const el = rootRef.current;
		if (!el) return;
		const onNativeClick = (e) => {
			const hit = e.target.closest?.("[data-lx]");
			if (!hit || !el.contains(hit)) return;
			if (hit.dataset.lx === "raw") setShowRaw((s) => !s);
			else if (hit.dataset.lx === "inspect") inspectRef.current?.();
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
	const text = (0, react.useMemo)(() => (block?.content ?? []).filter((c) => c.type === "text" && c.text).map((c) => c.text).join("\n"), [block]);
	const parsed = (0, react.useMemo)(() => parseCliJson(text), [text]);
	const cliFailed = (0, react.useMemo)(() => {
		if (!settled) return false;
		if (block?.isError) return true;
		const [stdout, stderr] = text.split("\n[stderr]\n");
		return !stdout?.trim() && !!stderr?.trim();
	}, [
		settled,
		block,
		text
	]);
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
			target: flagValue("--target")
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
		const target = flagValue("--target");
		if (!target) return null;
		return {
			kind: args.command,
			saved: savedCsv,
			target,
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
				let truth = pickColumn(resultText, evalInfo.target);
				if (!truth && evalInfo.predict) truth = pickColumn(await fetchCsv(evalInfo.predict), evalInfo.target);
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
				const series = parseForecastCsv(await fetchCsv(chartInfo.saved));
				if (!series) return;
				let hist = [];
				let startLabel;
				const colTarget = series.target ?? chartInfo.target;
				if (chartInfo.train && colTarget) try {
					const tail = parseTrainTail(await fetchCsv(chartInfo.train), colTarget, Math.min(3 * series.pred.length, 120));
					if (tail) {
						hist = tail.values;
						startLabel = tail.dates[0];
					}
				} catch {}
				if (!alive) return;
				setChart({
					hist,
					pred: series.pred,
					p10: series.p10,
					p90: series.p90,
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
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: ui$1.card,
		ref: rootRef,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 8,
					flexWrap: "wrap"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: { fontWeight: 700 },
						children: "LimiX 开放平台"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: ui$1.badge(cliFailed, !settled),
						children: !settled ? "运行中…" : cliFailed ? "失败" : "完成"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
						style: {
							fontSize: 12,
							opacity: .75,
							flex: "1 1 auto",
							minWidth: 0,
							wordBreak: "break-all"
						},
						children: cmdLine
					}),
					inspect && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"data-lx": "inspect",
						role: "button",
						style: {
							fontSize: 12,
							opacity: .55,
							cursor: "pointer",
							marginLeft: "auto"
						},
						children: "检视调用 ↗"
					})
				]
			}),
			chart && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ForecastChart, { ...chart }),
			evalView?.kind === "cls" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfusionMatrix, { data: evalView.data }),
			evalView?.kind === "reg" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScatterChart, { data: evalView.data }),
			settled && parsed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: ui$1.kv,
				children: orderedEntries(parsed, args.command).slice(0, kvExpanded ? 20 : 3).map(([k, v]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: { display: "contents" },
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: ui$1.k,
						children: KEY_LABELS[k] ?? k
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: ui$1.v,
						children: typeof v === "object" ? JSON.stringify(v) : String(v)
					})]
				}, k))
			}),
			settled && text && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				style: {
					fontSize: 12,
					opacity: .6,
					cursor: "pointer",
					userSelect: "none"
				},
				"data-lx": "raw",
				children: [Object.keys(parsed).length > 3 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					onClick: () => setKvExpanded((v) => !v),
					style: { marginRight: 12 },
					children: kvExpanded ? "▲ 收起字段" : `▼ 还有 ${Object.keys(parsed).length - 3} 个字段`
				}), showRaw ? "▲ 收起原始输出" : "▼ 原始输出"]
			}), showRaw && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: ui$1.raw,
				"data-lx": "rawbox",
				children: text
			})] })
		]
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
function parseOutObj(text) {
	const stdout = text.split("\n[stderr]\n")[0].trim();
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
	const n$1 = Number(v);
	if (!Number.isFinite(n$1)) return String(v);
	return Math.abs(n$1) >= 100 ? n$1.toFixed(1) : String(Number(n$1.toPrecision(4)));
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
function parseSubsteps(text) {
	const idx = text.indexOf("\n[stderr]\n");
	if (idx < 0) return [];
	const out = [];
	let poll = 0;
	for (const line of text.slice(idx + 10).split("\n")) {
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
function firstErrLine(text) {
	const idx = text.indexOf("\n[stderr]\n");
	const err = idx >= 0 ? text.slice(idx + 10) : text;
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
function deriveOut(text) {
	const obj = parseOutObj(text);
	const output = obj ? JSON.stringify(obj, null, 2).slice(0, 2e3) : (text.split("\n[stderr]\n")[0].trim() || text.trim()).slice(0, 1200) || "（无输出）";
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
	for (const n$1 of nodes) {
		if (n$1.kind === "user") {
			turn += 1;
			cur = {
				turn,
				time: n$1.time,
				ask: textOf$1(n$1.content).slice(0, 120) || "（空消息）",
				result: "",
				stages: [],
				others: []
			};
			rounds.push(cur);
			continue;
		}
		if (!cur) continue;
		if (n$1.kind === "assistant") {
			const first = textOf$1(n$1.blocks ?? n$1.content).split("\n").map((s) => s.replace(/^[#>\-*\s]+/, "").trim()).find((s) => s.length > 4);
			if (first) cur.result = first.slice(0, 110);
			continue;
		}
		if (n$1.kind !== "tool-result") continue;
		const name = n$1.call?.name;
		const args = parseArgs(n$1.call?.argsRaw);
		const fullText = textOf$1(n$1.content);
		const ok = !n$1.isError && !(/^\s*$/.test(fullText.split("\n[stderr]\n")[0]) && fullText.includes("[stderr]"));
		const base = {
			ok,
			time: n$1.time,
			start: n$1.callTime ?? n$1.time,
			end: n$1.time,
			errLine: ok ? "" : firstErrLine(fullText)
		};
		if (name === "limix") {
			const { cat, title } = classifyLimix(args);
			const list = Array.isArray(args.args) ? args.args.map(String) : [];
			cur.stages.push({
				key: `s${n$1.seq}`,
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
				key: `s${n$1.seq}`,
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
				key: `s${n$1.seq}`,
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
				key: `s${n$1.seq}`,
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
		} else if (name === "str_replace_editor" && /\.(html|md)"/.test(n$1.call?.argsRaw ?? "") && /create/.test(String(args.command ?? ""))) {
			const path = String(args.path ?? "");
			cur.stages.push({
				key: `s${n$1.seq}`,
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
			const brief = String(args.command ?? args.path ?? args.query ?? args.name ?? "").slice(0, 90) || (n$1.call?.argsRaw ?? "").slice(0, 90);
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
								const detail = [...byTitle].map(([t, n$1]) => n$1 > 1 ? `${t} ×${n$1}` : t).join(" · ");
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
const STYLE_ID = "limix-deck-style";
const CSS = `
.lx-deck{position:relative;height:132px;margin-top:4px}
.lx-card{position:absolute;width:290px;background:#fff;border:1px solid rgba(16,24,40,.08);
  border-radius:12px;padding:11px 13px 10px;text-align:left;font:inherit;cursor:pointer;
  box-shadow:0 1px 2px rgba(16,24,40,.05),0 10px 24px -18px rgba(16,24,40,.30);
  transition:transform .2s ease,box-shadow .2s ease}
.lx-card::before{content:"";position:absolute;inset:0 0 auto 0;height:2px;border-radius:12px 12px 0 0;
  background:linear-gradient(90deg,#12b76a,#5ce0a4 35%,rgba(18,183,106,0) 92%)}
.lx-card .lx-metric{background:linear-gradient(120deg,#122a72,#2e5bff 62%,#5f7dff);-webkit-background-clip:text;background-clip:text;color:transparent}
.lx-card.bad .lx-metric{background:none;color:#d92d20}
.lx-card.bad::before{background:linear-gradient(90deg,#f04438,#f97066 35%,rgba(240,68,56,0) 92%)}
.lx-card:hover{transform:translateY(-6px);box-shadow:0 2px 4px rgba(16,24,40,.06),0 18px 34px -18px rgba(16,24,40,.42);z-index:99!important}
.lx-cards.pile{height:170px}
.lx-cards.pile .lx-card{left:50%;translate:-50% 0}
.lx-cards.pile .lx-card:nth-child(1){top:8px;rotate:-6deg}
.lx-cards.pile .lx-card:nth-child(2){top:14px;rotate:-2deg;z-index:2}
.lx-cards.pile .lx-card:nth-child(3){top:20px;rotate:2deg;z-index:3}
.lx-cards.pile .lx-card:nth-child(4){top:26px;rotate:6deg;z-index:4}
.lx-cards.pile .lx-card:hover{translate:-50% -6px;rotate:0deg}
.lx-row{display:flex;align-items:baseline;gap:10px;padding:8px 12px;border:1px solid rgba(16,24,40,.08);
  border-radius:10px;background:#fff;margin-top:6px}
.lx-row .m{font-family:var(--ds-font-family-code,ui-monospace);font-size:11px;color:#98a2b3;width:64px;flex:none}
.lx-row .v{font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums}
.lx-row .u{font-size:11px;color:#667085}
.lx-row .r{margin-left:auto;font-size:11px;color:#98a2b3}
`;
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
	api: "直调接口"
};
const PREDICT = new Set([
	"classify",
	"regress",
	"forecast"
]);
const METRIC_OF = {
	classify: ["accuracy", "准确率"],
	regress: ["r2", "R²"],
	forecast: ["mape", "MAPE"]
};
/** 输出 JSON 里深扫一个键（只扫两层，够用且不会失控）。 */
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
/** 从混杂文本里取出第一个完整 JSON 值（输出常带前导说明与尾部 [stderr] 段）。 */
function extractJson(text) {
	const start = text.search(/[[{]/);
	if (start < 0) return null;
	const open = text[start];
	const close = open === "{" ? "}" : "]";
	let depth = 0, inStr = false, esc = false;
	for (let i = start; i < text.length; i++) {
		const ch = text[i];
		if (inStr) {
			if (esc) esc = false;
			else if (ch === "\\") esc = true;
			else if (ch === "\"") inStr = false;
			continue;
		}
		if (ch === "\"") {
			inStr = true;
			continue;
		}
		if (ch === open) depth++;
		else if (ch === close) {
			depth--;
			if (depth === 0) try {
				return JSON.parse(text.slice(start, i + 1));
			} catch {
				return null;
			}
		}
	}
	return null;
}
function LimixTurnStack({ turn, useTrajectory }) {
	const nodes = useTrajectory((t) => t?.eventNodes) ?? [];
	const [open, setOpen] = (0, react.useState)(false);
	const [pile, setPile] = (0, react.useState)(false);
	(0, react.useEffect)(() => {
		if (document.getElementById(STYLE_ID)) return;
		const tag = document.createElement("style");
		tag.id = STYLE_ID;
		tag.textContent = CSS;
		document.head.appendChild(tag);
	}, []);
	const tasks = (0, react.useMemo)(() => {
		const from = turn?.start?.seq ?? -Infinity;
		const to = turn?.end?.seq ?? Infinity;
		const list = [];
		for (const n$1 of Array.isArray(nodes) ? nodes : []) {
			if (typeof n$1?.seq === "number" && (n$1.seq < from || n$1.seq > to)) continue;
			const call = n$1?.call ?? n$1?.block?.call ?? null;
			if (call?.name !== "limix") continue;
			let args = {};
			try {
				args = JSON.parse(call.argsRaw ?? "{}");
			} catch {}
			list.push({
				command: String(args.command ?? "limix"),
				args,
				text: textOf(n$1),
				isError: n$1?.isError === true
			});
		}
		const out = [];
		const others = [];
		for (const c of list) {
			if (!PREDICT.has(c.command)) {
				others.push(c);
				continue;
			}
			let parsed = null;
			parsed = extractJson(c.text);
			if (parsed && typeof parsed.stdout === "string") {
				const inner = extractJson(parsed.stdout);
				if (inner) parsed = inner;
			}
			if (!parsed) parsed = extractJson(c.text.replace(/\\"/g, "\""));
			const [mk, ml] = METRIC_OF[c.command] ?? ["", ""];
			let mv = parsed ? deep(parsed, mk) : void 0;
			if (mv === void 0) {
				const mm = JSON.stringify(n).match(/\\?"metrics\\?"\s*:\s*\\?{([^}]*)/);
				if (mm && mk) {
					const hit = mm[1].match(/* @__PURE__ */ new RegExp("\\\\?\"" + mk + "\\\\?\"\\s*:\\s*(-?[0-9.]+)"));
					if (hit) mv = hit[1];
				}
			}
			if (mv === void 0 && mk) {
				const re = new RegExp("\"?" + mk + "\"?\\s*[:=]\\s*\"?(-?[0-9.]+)", "i");
				const hit = c.text.match(re);
				if (hit) mv = hit[1];
			}
			const tid = parsed ? deep(parsed, "task_id") : c.text.match(/"task_id"\s*:\s*"([^"]+)"/)?.[1];
			const ready = parsed ? deep(parsed, "is_ready") : void 0;
			const ok = !c.isError && !/^\s*(error|traceback)/i.test(c.text) && ready !== false;
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
				command: c.command,
				ok,
				metric: mv !== void 0 ? String(mv) : ok ? String((parsed && (deep(parsed, "status") ?? (deep(parsed, "is_ready") === true ? "finished" : void 0))) ?? "已完成") : "失败",
				unit: mv !== void 0 ? ml : "",
				facts,
				id: tid ? String(tid) : "",
				count: 1
			});
		}
		if (others.length > 0) {
			const bad = others.filter((c) => c.isError || /^\s*(error|traceback)/i.test(c.text)).length;
			const cmds = Array.from(new Set(others.map((c) => c.command)));
			out.push({
				key: "others",
				kind: "其它调用",
				command: cmds.slice(0, 3).join(" · "),
				ok: bad === 0,
				metric: `${others.length} 次`,
				unit: bad ? `· ${bad} 失败` : "",
				facts: cmds.map((c) => KIND[c] ?? c).join(" / "),
				id: "",
				count: others.length
			});
		}
		return out;
	}, [nodes, turn]);
	if (tasks.length === 0) return null;
	const shown = tasks.slice(0, 4);
	const rest = tasks.length - shown.length;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: { margin: "4px 0 2px" },
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				fontSize: 12,
				color: "var(--dsw-alias-label-caption, #98a2b3)",
				marginBottom: 2
			},
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
					"本轮 LimiX · ",
					tasks.length,
					" 个任务"
				] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setPile((v) => !v),
					style: {
						font: "inherit",
						fontSize: 11,
						color: "inherit",
						background: "transparent",
						border: "1px solid rgba(16,24,40,.14)",
						borderRadius: 6,
						padding: "1px 6px",
						cursor: "pointer"
					},
					children: pile ? "离开牌堆" : "牌堆"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setOpen((v) => !v),
					style: {
						marginLeft: "auto",
						font: "inherit",
						fontSize: 11,
						color: "inherit",
						background: "transparent",
						border: 0,
						cursor: "pointer"
					},
					children: open ? "收起（也可点任意一行）" : "展开"
				})
			]
		}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: tasks.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "lx-row",
			onClick: () => setOpen(false),
			style: { cursor: "pointer" },
			title: "点击收起",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "m",
					children: t.command
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "v",
					children: t.metric
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "u",
					children: t.unit
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "r",
					children: [t.kind, t.facts ? ` · ${t.facts}` : ""]
				})
			]
		}, t.key)) }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: `lx-deck lx-cards${pile ? " pile" : ""}`,
			children: [shown.map((t, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: `lx-card${t.ok ? "" : " bad"}`,
				onClick: () => setOpen(true),
				style: pile ? {} : {
					left: 12 + i * 30,
					top: 8 + i * 9,
					zIndex: i + 1
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 6,
							fontSize: 11.5,
							color: "#667085"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								width: 5,
								height: 5,
								borderRadius: 99,
								background: t.ok ? "#12b76a" : "#d92d20",
								display: "inline-block"
							} }),
							t.kind,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 10,
									padding: "0 6px",
									borderRadius: 999,
									lineHeight: "16px",
									background: t.ok ? "#ecfdf3" : "#fef3f2",
									color: t.ok ? "#079455" : "#d92d20"
								},
								children: t.ok ? "完成" : "失败"
							}),
							t.count > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									marginLeft: "auto",
									fontSize: 10.5,
									color: "#98a2b3"
								},
								children: ["×", t.count]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: t.metric.length > 6 ? 15 : 23,
							fontWeight: 600,
							letterSpacing: "-.03em",
							marginTop: 6,
							lineHeight: 1,
							fontVariantNumeric: "tabular-nums"
						},
						className: "lx-metric",
						children: [t.metric, t.unit && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 10.5,
								fontWeight: 400,
								color: "#98a2b3",
								marginLeft: 4,
								letterSpacing: 0
							},
							children: t.unit
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 10.5,
							color: "#98a2b3",
							marginTop: 6,
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis"
						},
						children: t.facts || (t.id ? t.id.slice(0, 12) + "…" : t.command)
					}),
					t.facts && t.id && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: 10,
							color: "#c0c7d2",
							marginTop: 2,
							fontFamily: "var(--ds-font-family-code,ui-monospace)"
						},
						children: [t.id.slice(0, 13), "…"]
					})
				]
			}, t.key)), rest > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				style: {
					position: "absolute",
					right: 4,
					bottom: 2,
					fontSize: 10.5,
					color: "#98a2b3"
				},
				children: ["+", rest]
			})]
		})]
	});
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