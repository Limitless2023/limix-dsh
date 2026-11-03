/**
 * [INPUT]: 已解析的本地任务文件列表。
 * [OUTPUT]: 更多菜单中的文件入口；用途和文件名分层，完整路径按需查看。
 * [POS]: 使用 LimixToolCard 的原生 data-lx=file 委托打开宿主侧栏，不自行读取文件。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { TaskFile } from './task-files'
export function TaskFiles({ files }: { files: TaskFile[] }) {
  if (!files.length) return null
  return <div className="lx-task-files">
    <style>{`.lx-task-files{border-top:1px solid var(--dsw-alias-border-l3,#e3e6eb);margin-top:5px;padding-top:5px;max-height:260px;overflow:auto}.lx-task-files-label{padding:3px 10px;font-size:11px;color:var(--dsw-alias-label-tertiary,#858d99)}.lx-result .lx-task-files button{display:flex;flex-direction:column;width:100%;max-width:min(310px,65vw);padding:6px 10px;gap:1px;border-radius:4px}.lx-task-files button:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f5f8)}.lx-task-files button span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lx-task-files-name{font-size:11px;color:var(--dsw-alias-label-secondary,#767d89)}`}</style>
    <div className="lx-task-files-label">任务文件</div>
    {files.map(file => <button key={file.path} type="button" data-lx="file" data-path={file.path} title={file.path} aria-label={`打开${file.label}：${file.name}`}>
      <span>{file.label}</span><span className="lx-task-files-name">{file.name}</span>
    </button>)}
  </div>
}
