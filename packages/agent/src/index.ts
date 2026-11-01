/**
 * [INPUT]: DSH 插件宿主的入口扫描。
 * [OUTPUT]: name 与空 apply，供客户端插件声明挂载。
 * [POS]: dsh-limix-agent 的宿主半——只占一行，让浏览器半（工具卡 + 分析过程）被扫描进 boot 图。
 *        工具与 csv 路由已拆到 dsh-limix-tool，由 LimiX Agent preset 挂载。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export const name = 'limix-agent'
export function apply(): void {}
