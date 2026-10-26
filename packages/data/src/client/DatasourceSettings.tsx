/**
 * [INPUT]: 依赖 react（宿主 external）；数据面走同源路由 GET/POST /limix-datasource/config、POST /test
 * [OUTPUT]: 对外提供 DatasourceSettings——设置页"数据源"整页：连接清单、增删改表单、测试连接、保存
 * [POS]: limix-datasource 的设置 UI（对位 Next.js 版 /datasources 管理页的 DSH 形态）；
 *        样式对齐宿主 token（主色 rgb(65,118,230)、胶囊、幽灵钮、13px）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState } from "react";

const ACCENT = "rgb(65, 118, 230)";

interface Source {
  id?: string;
  name: string;
  kind: "postgres" | "mysql";
  host: string;
  port: number;
  database: string;
  schema?: string | null;
  username: string;
  password: string;
  isDemo?: boolean;
}

const EMPTY: Source = {
  name: "", kind: "postgres", host: "localhost", port: 5432,
  database: "", schema: "", username: "", password: "",
};

const ui = {
  wrap: { padding: "8px 4px", fontSize: 13, maxWidth: 760 },
  h: { fontSize: 15, fontWeight: 700, margin: "0 0 4px" },
  sub: { opacity: 0.55, marginBottom: 14, lineHeight: 1.6 },
  card: {
    border: "1px solid rgba(0,0,0,.09)", borderRadius: 12, padding: 14, marginBottom: 12,
  },
  row: { display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 8 },
  field: { display: "flex", flexDirection: "column" as const, gap: 3 },
  label: { fontSize: 11, opacity: 0.55 },
  input: {
    padding: "5px 9px", borderRadius: 8, border: "1px solid rgba(0,0,0,.15)",
    fontSize: 13, background: "Canvas", color: "CanvasText", minWidth: 0,
  },
  btn: (primary: boolean) => ({
    fontSize: 12.5, cursor: "pointer", padding: "5px 14px", borderRadius: 999,
    border: primary ? "none" : "1px solid rgba(0,0,0,.15)",
    background: primary ? ACCENT : "transparent",
    color: primary ? "#fff" : "inherit",
  }),
  tag: (ok: boolean) => ({
    fontSize: 12, marginLeft: 8, color: ok ? "#16a34a" : "#dc2626",
  }),
};

export function DatasourceSettings(): JSX.Element {
  const [sources, setSources] = useState<Source[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, { ok: boolean; text: string }>>({});

  useEffect(() => {
    fetch("/limix-datasource/config")
      .then((r) => r.json())
      .then((d) => { setSources(d.sources ?? []); setLoaded(true); })
      .catch(() => { setMsg({ ok: false, text: "读取配置失败（Node 半路由不可达）" }); setLoaded(true); });
  }, []);

  function patch(i: number, k: keyof Source, v: unknown) {
    setSources((ss) => ss.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
    setDirty(true);
    setMsg(null);
  }

  async function test(i: number) {
    setTesting(i);
    try {
      const r = await fetch("/limix-datasource/test", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: sources[i] }),
      }).then((x) => x.json());
      setTestResult((m) => ({ ...m, [i]: r.ok ? { ok: true, text: `连接成功 ${r.version ?? ""}` } : { ok: false, text: r.error ?? "失败" } }));
    } catch (e) {
      setTestResult((m) => ({ ...m, [i]: { ok: false, text: String(e) } }));
    } finally {
      setTesting(null);
    }
  }

  async function save() {
    try {
      const r = await fetch("/limix-datasource/config", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ sources }),
      }).then((x) => x.json());
      if (r.ok) { setSources(r.sources); setDirty(false); setMsg({ ok: true, text: "已保存，agent 侧即时生效" }); }
      else setMsg({ ok: false, text: r.error ?? "保存失败" });
    } catch (e) {
      setMsg({ ok: false, text: String(e) });
    }
  }

  const F = (i: number, k: keyof Source, label: string, width: number, type = "text") => (
    <span style={ui.field}>
      <span style={ui.label}>{label}</span>
      <input style={{ ...ui.input, width }} type={type} value={String(sources[i][k] ?? "")}
        onChange={(e) => patch(i, k, k === "port" ? Number(e.target.value) : e.target.value)} />
    </span>
  );

  return (
    <div style={ui.wrap}>
      <h3 style={ui.h}>数据源</h3>
      <div style={ui.sub}>
        配置客户数据库连接（postgres / mysql），LimiX 分析师即可对话取数：看表结构 → 生成 SQL（先展示确认）→
        预览 → 物化成 CSV 进文件区 → 预测。全链路只读三闸防护；<b>建议使用只读账号</b>。
        凭据以 0600 权限明文存于 DSH_HOME/limix-datasource.json（本地单用户环境取舍）。
      </div>

      {!loaded && <div style={{ opacity: 0.5 }}>加载中…</div>}
      {loaded && sources.length === 0 && <div style={{ opacity: 0.6, marginBottom: 12 }}>还没有数据源，点下方"新增"。</div>}

      {sources.map((s, i) => (
        <div key={s.id ?? `new-${i}`} style={ui.card}>
          <div style={ui.row}>
            {F(i, "name", "名称", 170)}
            <span style={ui.field}>
              <span style={ui.label}>类型</span>
              <select style={{ ...ui.input, width: 110 }} value={s.kind}
                onChange={(e) => patch(i, "kind", e.target.value)}>
                <option value="postgres">postgres</option>
                <option value="mysql">mysql</option>
              </select>
            </span>
            {F(i, "host", "主机", 150)}
            {F(i, "port", "端口", 70)}
          </div>
          <div style={ui.row}>
            {F(i, "database", "数据库", 130)}
            {F(i, "schema", "schema(PG 可选)", 130)}
            {F(i, "username", "用户名", 120)}
            {F(i, "password", "密码", 140, "password")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span role="button" style={ui.btn(false)} onClick={() => void test(i)}>
              {testing === i ? "测试中…" : "测试连接"}
            </span>
            <span role="button" style={{ ...ui.btn(false), color: "#dc2626" }}
              onClick={() => { setSources((ss) => ss.filter((_, j) => j !== i)); setDirty(true); }}>
              删除
            </span>
            {testResult[i] && <span style={ui.tag(testResult[i].ok)}>{testResult[i].text}</span>}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
        <span role="button" style={ui.btn(false)}
          onClick={() => { setSources((ss) => [...ss, { ...EMPTY }]); setDirty(true); }}>
          ＋ 新增数据源
        </span>
        <span role="button" style={{ ...ui.btn(true), opacity: dirty ? 1 : 0.5 }}
          onClick={() => { if (dirty) void save(); }}>
          保存
        </span>
        {msg && <span style={ui.tag(msg.ok)}>{msg.text}</span>}
      </div>
    </div>
  );
}
