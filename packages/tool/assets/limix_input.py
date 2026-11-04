"""
[INPUT]: 本地文件路径或已有 data_version_id。
[OUTPUT]: checked_ref；在上传前拒绝不存在、不可读或非文件的本地引用。
[POS]: 预测输入引用预检；保留远程 ID，不发请求、不修改文件。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
from pathlib import Path


def checked_ref(ref, label):
    if not ref:
        return ref
    path = Path(ref).expanduser()
    local = (path.exists() or path.is_symlink() or any(c in str(ref) for c in '/\\')
             or str(ref).startswith(('~', '.'))
             or path.suffix.lower() in {'.csv', '.tsv', '.xls', '.xlsx', '.parquet'})
    if not local:
        return ref
    if not path.is_file():
        raise ValueError(f'{label}本地文件不存在或不是文件：{ref}')
    try:
        with path.open('rb') as source:
            source.read(1)
    except OSError as exc:
        raise ValueError(f'{label}本地文件无法读取：{ref}') from exc
    return str(path)
