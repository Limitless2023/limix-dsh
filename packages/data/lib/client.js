window.__ModuleLoader__.load({ id: "dsh-limix-data", factory: (require) => {
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

//#region src/client/DatasourceSettings.tsx
const ACCENT = "rgb(65, 118, 230)";
const EMPTY = {
	name: "",
	kind: "postgres",
	host: "localhost",
	port: 5432,
	database: "",
	schema: "",
	username: "",
	password: ""
};
const ui = {
	wrap: {
		padding: "8px 4px",
		fontSize: 13,
		maxWidth: 760
	},
	h: {
		fontSize: 15,
		fontWeight: 700,
		margin: "0 0 4px"
	},
	sub: {
		opacity: .55,
		marginBottom: 14,
		lineHeight: 1.6
	},
	card: {
		border: "1px solid rgba(0,0,0,.09)",
		borderRadius: 12,
		padding: 14,
		marginBottom: 12
	},
	row: {
		display: "flex",
		gap: 8,
		flexWrap: "wrap",
		marginBottom: 8
	},
	field: {
		display: "flex",
		flexDirection: "column",
		gap: 3
	},
	label: {
		fontSize: 11,
		opacity: .55
	},
	input: {
		padding: "5px 9px",
		borderRadius: 8,
		border: "1px solid rgba(0,0,0,.15)",
		fontSize: 13,
		background: "Canvas",
		color: "CanvasText",
		minWidth: 0
	},
	btn: (primary) => ({
		fontSize: 12.5,
		cursor: "pointer",
		padding: "5px 14px",
		borderRadius: 999,
		border: primary ? "none" : "1px solid rgba(0,0,0,.15)",
		background: primary ? ACCENT : "transparent",
		color: primary ? "#fff" : "inherit"
	}),
	tag: (ok) => ({
		fontSize: 12,
		marginLeft: 8,
		color: ok ? "#16a34a" : "#dc2626"
	})
};
function DatasourceSettings() {
	const [sources, setSources] = (0, react.useState)([]);
	const [loaded, setLoaded] = (0, react.useState)(false);
	const [dirty, setDirty] = (0, react.useState)(false);
	const [msg, setMsg] = (0, react.useState)(null);
	const [testing, setTesting] = (0, react.useState)(null);
	const [testResult, setTestResult] = (0, react.useState)({});
	(0, react.useEffect)(() => {
		fetch("/limix-datasource/config").then((r) => r.json()).then((d) => {
			setSources(d.sources ?? []);
			setLoaded(true);
		}).catch(() => {
			setMsg({
				ok: false,
				text: "读取配置失败（Node 半路由不可达）"
			});
			setLoaded(true);
		});
	}, []);
	function patch(i, k, v) {
		setSources((ss) => ss.map((s, j) => j === i ? {
			...s,
			[k]: v
		} : s));
		setDirty(true);
		setMsg(null);
	}
	async function test(i) {
		setTesting(i);
		try {
			const r = await fetch("/limix-datasource/test", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ source: sources[i] })
			}).then((x) => x.json());
			setTestResult((m) => ({
				...m,
				[i]: r.ok ? {
					ok: true,
					text: `连接成功 ${r.version ?? ""}`
				} : {
					ok: false,
					text: r.error ?? "失败"
				}
			}));
		} catch (e) {
			setTestResult((m) => ({
				...m,
				[i]: {
					ok: false,
					text: String(e)
				}
			}));
		} finally {
			setTesting(null);
		}
	}
	async function save() {
		try {
			const r = await fetch("/limix-datasource/config", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ sources })
			}).then((x) => x.json());
			if (r.ok) {
				setSources(r.sources);
				setDirty(false);
				setMsg({
					ok: true,
					text: "已保存，agent 侧即时生效"
				});
			} else setMsg({
				ok: false,
				text: r.error ?? "保存失败"
			});
		} catch (e) {
			setMsg({
				ok: false,
				text: String(e)
			});
		}
	}
	const F = (i, k, label, width, type = "text") => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
		style: ui.field,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			style: ui.label,
			children: label
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
			style: {
				...ui.input,
				width
			},
			type,
			value: String(sources[i][k] ?? ""),
			onChange: (e) => patch(i, k, k === "port" ? Number(e.target.value) : e.target.value)
		})]
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: ui.wrap,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
				style: ui.h,
				children: "数据源"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: ui.sub,
				children: [
					"配置客户数据库连接（postgres / mysql），LimiX 分析师即可对话取数：看表结构 → 生成 SQL（先展示确认）→ 预览 → 物化成 CSV 进文件区 → 预测。全链路只读三闸防护；",
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "建议使用只读账号" }),
					"。 凭据以 0600 权限明文存于 DSH_HOME/limix-datasource.json（本地单用户环境取舍）。"
				]
			}),
			!loaded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: { opacity: .5 },
				children: "加载中…"
			}),
			loaded && sources.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					opacity: .6,
					marginBottom: 12
				},
				children: "还没有数据源，点下方\"新增\"。"
			}),
			sources.map((s, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: ui.card,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: ui.row,
						children: [
							F(i, "name", "名称", 170),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: ui.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: ui.label,
									children: "类型"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									style: {
										...ui.input,
										width: 110
									},
									value: s.kind,
									onChange: (e) => patch(i, "kind", e.target.value),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "postgres",
										children: "postgres"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "mysql",
										children: "mysql"
									})]
								})]
							}),
							F(i, "host", "主机", 150),
							F(i, "port", "端口", 70)
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: ui.row,
						children: [
							F(i, "database", "数据库", 130),
							F(i, "schema", "schema(PG 可选)", 130),
							F(i, "username", "用户名", 120),
							F(i, "password", "密码", 140, "password")
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								role: "button",
								style: ui.btn(false),
								onClick: () => void test(i),
								children: testing === i ? "测试中…" : "测试连接"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								role: "button",
								style: {
									...ui.btn(false),
									color: "#dc2626"
								},
								onClick: () => {
									setSources((ss) => ss.filter((_, j) => j !== i));
									setDirty(true);
								},
								children: "删除"
							}),
							testResult[i] && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: ui.tag(testResult[i].ok),
								children: testResult[i].text
							})
						]
					})
				]
			}, s.id ?? `new-${i}`)),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					gap: 10,
					alignItems: "center",
					marginTop: 4
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						role: "button",
						style: ui.btn(false),
						onClick: () => {
							setSources((ss) => [...ss, { ...EMPTY }]);
							setDirty(true);
						},
						children: "＋ 新增数据源"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						role: "button",
						style: {
							...ui.btn(true),
							opacity: dirty ? 1 : .5
						},
						onClick: () => {
							if (dirty) save();
						},
						children: "保存"
					}),
					msg && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: ui.tag(msg.ok),
						children: msg.text
					})
				]
			})
		]
	});
}

//#endregion
//#region src/client/index.tsx
const inject = ["slots"];
function apply(ctx) {
	ctx.slots.inject("settings.section", () => ctx.slots.register({
		name: "settings.section",
		id: "limix-datasource",
		order: 30,
		label: () => "数据源"
	}, DatasourceSettings));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });