/**
 * [INPUT]: 依赖 node:fs/path/crypto 与 DSH_HOME 环境变量；类型对齐 ./types
 * [OUTPUT]: 对外提供 readConfig/writeConfig/listSources/getSource/toConn —— JSON 配置文件版数据源清单
 * [POS]: core 的存储层（DSH 形态重写：原版是 Postgres 表 + AES-GCM 密文，此处为
 *        $DSH_HOME/limix-datasource.json 明文配置 + 0600 权限——本地单用户演示环境的诚实取舍，
 *        对外网生产库应配只读账号（三闸模型第三闸）。保持 toConn 出参形状不变，drivers/materialize 零改动）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import type { DataSourceConn, DataSourceKind } from "./types";

/** 配置文件里的一条数据源（密码明文；文件 0600） */
export type StoredSource = {
  id: string;
  name: string;
  kind: DataSourceKind;
  host: string;
  port: number;
  database: string;
  schema?: string | null;
  username: string;
  password: string;
  isDemo?: boolean;
};

export type DatasourceConfig = { sources: StoredSource[] };

export function configPath(): string {
  const home = process.env.DSH_HOME || join(process.env.HOME || "~", ".dsh");
  return join(home, "limix-datasource.json");
}

export function readConfig(): DatasourceConfig {
  try {
    const raw = readFileSync(configPath(), "utf8");
    const v = JSON.parse(raw);
    return { sources: Array.isArray(v?.sources) ? v.sources : [] };
  } catch {
    return { sources: [] };
  }
}

/** 原子写（tmp+rename）+ 0600 */
export function writeConfig(cfg: DatasourceConfig): void {
  const p = configPath();
  mkdirSync(dirname(p), { recursive: true });
  const tmp = p + ".tmp";
  writeFileSync(tmp, JSON.stringify(cfg, null, 2), "utf8");
  chmodSync(tmp, 0o600);
  renameSync(tmp, p);
}

export function listSources(): StoredSource[] {
  return readConfig().sources;
}

export function getSource(id: string): StoredSource | null {
  return readConfig().sources.find((s) => s.id === id) ?? null;
}

export function upsertSource(s: Omit<StoredSource, "id"> & { id?: string }): StoredSource {
  const cfg = readConfig();
  const row: StoredSource = { ...s, id: s.id || randomUUID() };
  const i = cfg.sources.findIndex((x) => x.id === row.id);
  if (i >= 0) cfg.sources[i] = row;
  else cfg.sources.push(row);
  writeConfig(cfg);
  return row;
}

export function deleteSource(id: string): boolean {
  const cfg = readConfig();
  const n = cfg.sources.length;
  cfg.sources = cfg.sources.filter((x) => x.id !== id);
  if (cfg.sources.length === n) return false;
  writeConfig(cfg);
  return true;
}

/** 行 → 驱动连接参数（形状与原版一致，drivers/materialize 零改动消费） */
export function toConn(row: StoredSource): DataSourceConn {
  return {
    kind: row.kind,
    host: row.host,
    port: row.port,
    database: row.database,
    schema: row.schema ?? null,
    username: row.username,
    password: row.password,
  };
}

export function ensureConfigFile(): void {
  if (!existsSync(configPath())) writeConfig({ sources: [] });
}
