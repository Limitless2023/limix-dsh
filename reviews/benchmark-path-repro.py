"""R7 的独立离线路径对抗复现。

[INPUT]: benchmark 的 execute；临时目录内的伪造输入和输出路径。
[OUTPUT]: 每个冲突的提前拒绝、输入摘要不变、零调用和零新增文件断言。
[POS]: reviews 的审查证据；不加载计算依赖，不连接服务。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'packages/tool/assets'))
import limix_benchmark as bench


def snapshot(root):
    """不跟随软链接，记录文件、目录和链接，避免漏掉新锁或临时文件。"""
    state = {}
    for folder, directories, files in os.walk(root, followlinks=False):
        for name in directories + files:
            path = Path(folder) / name
            key = str(path.relative_to(root))
            if path.is_symlink():
                state[key] = ('link', os.readlink(path))
            elif path.is_dir():
                state[key] = ('directory',)
            else:
                state[key] = ('file', hashlib.sha256(path.read_bytes()).hexdigest())
    return state


def run_case(name):
    with tempfile.TemporaryDirectory(prefix='limix-r7-review-') as temp:
        root = Path(temp)
        for filename, content in {
            'train.csv': 'x,y\n1,2\n2,3\n3,4\n',
            'predict.csv': 'x\n4\n5\n',
            'truth.csv': 'y\n4\n6\n',
        }.items():
            (root / filename).write_text(content)
        entry = dict(id='test', name='离线复现', task_type='regression',
                     target='y', train='train.csv', predict='predict.csv', truth='truth.csv')
        output = 'results.json'
        if name in ('train', 'predict', 'truth', 'manifest'):
            output = name + '.json'
        elif name in ('html', 'tmp', 'lock'):
            source = {'html': 'results.html', 'tmp': 'results.json.tmp', 'lock': 'results.json.lock'}[name]
            (root / source).write_bytes((root / 'train.csv').read_bytes())
            entry['train'] = source
        elif name in ('receipt_child', 'case_directory'):
            source = ('RESULTS' if name == 'case_directory' else 'results') + '/test/train.csv'
            (root / source).parent.mkdir(parents=True)
            (root / source).write_bytes((root / 'train.csv').read_bytes())
            entry['train'] = source
            if name == 'case_directory':
                assert (root / 'results').exists(), 'This case requires a case-insensitive filesystem'
                writer, reader = (root / 'results').resolve(), (root / source).resolve()
                legacy = (writer == reader or writer in reader.parents or reader in writer.parents
                          or (writer.exists() and reader.exists() and os.path.samefile(writer, reader)))
                assert not legacy, 'Fixture must reproduce the previous ancestor-check gap'
                assert bench.overlapping_paths(writer, reader)
                assert bench.overlapping_paths(reader, writer)
        elif name == 'receipt_parent':
            output = 'train.csv/results.json'
        elif name == 'symlink_file':
            (root / 'results.csv').symlink_to(root / 'train.csv')
        elif name == 'symlink_parent':
            (root / 'alias').symlink_to(root, target_is_directory=True)
            output = 'alias/train.json'
        elif name == 'symlink_root':
            (root / 'results').symlink_to(root, target_is_directory=True)
        elif name == 'hardlink':
            os.link(root / 'train.csv', root / 'results.csv')
        elif name == 'case_file':
            assert (root / 'TRAIN.csv').exists(), 'This case requires a case-insensitive filesystem'
            output = 'TRAIN.json'
        manifest = root / 'manifest.json'
        manifest.write_text(json.dumps({'datasets': [entry]}))
        args = argparse.Namespace(manifest=str(manifest), datasets=None, models='BASELINE,LIMIX_7M',
                                  seed=42, timeout=1, python=None, output=str(root / output))
        cli = mock.Mock()
        before = snapshot(root)
        with mock.patch.object(bench, 'dependencies', side_effect=AssertionError('Preflight was bypassed')) as deps:
            try:
                bench.execute({}, args, cli)
            except ValueError as error:
                assert '冲突' in str(error), str(error)
            else:
                raise AssertionError('Conflict was accepted: ' + name)
            deps.assert_not_called()
        assert snapshot(root) == before, 'Filesystem changed: ' + name
        assert not cli.mock_calls, 'CLI was invoked: ' + name
        print(name, 'rejected; hashes unchanged; zero calls; zero new files')


if __name__ == '__main__':
    cases = ('train', 'predict', 'truth', 'manifest', 'html', 'tmp', 'lock',
             'receipt_child', 'receipt_parent', 'symlink_file', 'symlink_parent',
             'symlink_root', 'hardlink', 'case_file', 'case_directory')
    for case in cases:
        run_case(case)
    print(f'PASS {len(cases)}/{len(cases)}')
