/**
 * [INPUT]: 依赖宿主 slots 服务；组件见 ./DatasourceSettings
 * [OUTPUT]: 浏览器半 Cordis 插件：settings.section 挂"数据源"整页（官方 ui-settings-models 同款注册法）
 * [POS]: limix-datasource 的设置入口；数据经同源路由 /limix-datasource/* 与 Node 半交互
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { DatasourceSettings } from "./DatasourceSettings.tsx";

export const inject = ["slots"];

export function apply(ctx: any): void {
  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      { name: "settings.section", id: "limix-datasource", order: 30, label: () => "数据源" },
      DatasourceSettings,
    ),
  );
}
