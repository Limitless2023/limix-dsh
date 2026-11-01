"""离线重现 benchmark 输出、失败状态与分类校验边界。

[INPUT]: tool/assets 的 benchmark；已有 numpy/pandas/sklearn 环境。
[OUTPUT]: 各边界的实际行为；只在自动清理的临时目录写文件。
[POS]: reviews 独立证据；CLI 是假对象，不读取凭据或访问服务。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import argparse
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'packages/tool/assets'))
import limix_benchmark as bench


class OfflineCLI:
    def log(self, *_args):
        pass

    def upload_file(self, *_args):
        raise SystemExit(4)


with tempfile.TemporaryDirectory(prefix='limix-benchmark-review-') as directory:
    folder = Path(directory)
    (folder / 'train.csv').write_text('x,y\n1,2\n2,3\n3,4\n')
    (folder / 'predict.csv').write_text('x\n4\n5\n')
    (folder / 'truth.csv').write_text('y\n4\n6\n')
    entry = {'id': 'test', 'name': '自有数据', 'task_type': 'regression', 'target': 'y',
             'train': 'train.csv', 'predict': 'predict.csv', 'truth': 'truth.csv',
             'split': 'fixed', 'source_url': 'javascript:alert(1)',
             'citation': 'Internal data, all rights reserved'}
    manifest = folder / 'manifest.json'
    manifest.write_text(json.dumps({'datasets': [entry]}))
    for suffix in ['json', 'csv', 'html', '']:
        output = folder / (f'result.{suffix}' if suffix else 'bare')
        args = argparse.Namespace(models='BASELINE', manifest=str(manifest), datasets=None,
                                  seed=42, timeout=1, output=str(output))
        try:
            result = bench.execute({}, args, OfflineCLI())
            try:
                json.loads(output.read_text())
                valid_json = True
            except json.JSONDecodeError:
                valid_json = False
            print('output', suffix or '(none)', result['status'], 'valid_json', valid_json)
        except Exception as error:
            print('output', suffix or '(none)', type(error).__name__, str(error))
    args.output = str(folder / 'partial.json')
    args.models = 'BASELINE,LIMIX_7M'
    try:
        bench.execute({}, args, OfflineCLI())
    except (Exception, SystemExit) as error:
        print('upload_failure', type(error).__name__, str(error))
    print('summary_exists', (folder / 'partial.json').exists(),
          'local_receipt_exists', (folder / 'partial/test/BASELINE/receipt.json').exists())
    html = (folder / 'result.html').read_text()
    print('unsafe_url_retained', 'javascript:alert(1)' in html,
          'hardcoded_UCI_CC_BY', 'UCI 数据来源</a> · CC BY 4.0' in html)
    try:
        print('classification_inf', bench.score('classification', [0, 1], [0, float('inf')],
                                                bench.dependencies(['BASELINE'])))
    except Exception as error:
        print('classification_inf_rejected', type(error).__name__)
