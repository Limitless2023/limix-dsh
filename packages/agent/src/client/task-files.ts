/**
 * [INPUT]: 工具命令、真实参数、结构化回执和会话工作目录。
 * [OUTPUT]: 按用途分组的本地任务文件；不将版本 ID、远程 URL 或输出意图当成文件。
 * [POS]: 预测与解释卡的文件入口模型；打开权限继续由宿主 openFile 校验。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export interface TaskFile { label: string; path: string; name: string }

function localPath(value: unknown, cwd?: string): string | null {
  if (typeof value !== 'string' || !value.trim() || /[\0\r\n]/.test(value)) return null
  const path = value.replace(/\\/g, '/')
  if (/^[a-z][a-z\d+.-]*:/i.test(path) && !/^[a-z]:\//i.test(path)) return null
  if (path.startsWith('//') || path.startsWith('~')) return null
  const absolute = path.startsWith('/') || /^[a-z]:\//i.test(path)
  if (!absolute && !/\.(csv|xlsx?|parquet|json|tsv)$/i.test(path)) return null
  if (absolute) return path
  return cwd ? `${cwd.replace(/\\/g, '/').replace(/\/$/, '')}/${path.replace(/^\.\//, '')}` : path
}

export function taskFiles(command: string, args: string[], result: Record<string, any> | null, cwd?: string): TaskFile[] {
  if (!['regress', 'classify', 'forecast', 'explain'].includes(command)) return []
  const files: TaskFile[] = []
  const flag = (name: string) => {
    for (let i = args.length - 1; i >= 0; i--) {
      if (args[i].startsWith(name + '=')) return args[i].slice(name.length + 1)
      if (args[i] === name && args[i + 1] && !args[i + 1].startsWith('-')) return args[i + 1]
    }
  }
  const add = (label: string, value: unknown) => {
    const path = localPath(value, cwd)
    if (!path) return
    const found = files.find(file => file.path === path)
    if (found) { found.label += ` / ${label}`; return }
    files.push({ label, path, name: path.split('/').pop() || path })
  }
  add('训练集', flag('--train'))
  add('预测集', flag('--predict'))
  if (command === 'explain') {
    add('待解释数据', flag('--data'))
    add('原预测结果', flag('--prediction'))
    add('场景 A 解释', flag('--compare-left'))
    add('场景 B 解释', flag('--compare-right'))
  }
  add('评估真值', flag('--truth'))
  // -o 只是输出意图；只有回执确认的文件才提供结果入口。
  add(command === 'explain' ? '解释结果' : '预测结果', result?.saved_to)
  if (command === 'explain') add('解释数据 CSV', result?.csv_path)
  return files
}
