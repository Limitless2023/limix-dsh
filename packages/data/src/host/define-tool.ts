/**
 * [INPUT]: 接收 DSH 参数字段表与输出 schema DSL；不依赖宿主内部包。
 * [OUTPUT]: defineTool 返回工具注册定义，参数根节点固定为 object。
 * [POS]: data 的宿主适配层；将字段 required 标记提升到父节点数组。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
type Spec = Record<string, any>

function toJsonSchema(spec: Spec): any {
  if (spec && spec.type === 'object' && spec.properties) {
    return {
      type: 'object',
      additionalProperties: spec.additionalProperties ?? false,
      required: spec.required ?? Object.keys(spec.properties).filter((k) => spec.properties[k]?.required),
      properties: Object.fromEntries(Object.entries(spec.properties).map(([k, v]) => [k, toJsonSchema(v as Spec)])),
    }
  }
  const out: Spec = {}
  if (spec?.type) out.type = spec.type
  if (spec?.description) out.description = spec.description
  if (spec?.enum) out.enum = spec.enum
  if (spec?.items) out.items = toJsonSchema(spec.items)
  if (spec?.properties) out.properties = toJsonSchema({ type: 'object', properties: spec.properties })
  if (spec?.additionalProperties !== undefined) out.additionalProperties = spec.additionalProperties
  return out
}

export function defineTool(spec: any) {
  return {
    name: spec.name,
    description: spec.description,
    // parameters 是字段表，先补 object 根节点再递归转换。
    parameters: toJsonSchema({ type: 'object', properties: spec.parameters ?? {} }),
    output: { schema: toJsonSchema(spec.output?.schema ?? {}), render: spec.output.render },
    ...(spec.timeoutMs !== undefined ? { timeoutMs: spec.timeoutMs } : {}),
    execute: spec.execute,
  }
}
