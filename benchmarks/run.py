"""开发目录中的 benchmark 薄入口。

[INPUT]: CLI 参数和 tool/assets 的可复用 runner。
[OUTPUT]: 与 limix.py benchmark 相同的结果文件。
[POS]: benchmark 本地重现入口；不复制模型编排逻辑。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import runpy
import sys
from pathlib import Path

assets = Path(__file__).resolve().parents[1] / 'packages/tool/assets'
sys.path.insert(0,str(assets))
runpy.run_path(str(assets/'limix_benchmark.py'),run_name='__main__')
