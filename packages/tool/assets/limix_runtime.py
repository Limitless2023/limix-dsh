#!/usr/bin/env python3
"""
[INPUT]: Python 3.12+、官方 PyPI、用户目录；固定版本的比较与表格读取依赖。
[OUTPUT]: prepare 创建独立 venv；status 限时校验依赖；全部子进程支持取消。
[POS]: 插件激活时的运行环境准备；不修改系统 Python，不读取 API 凭据。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import sys
import time

PINS = {'numpy': '2.5.4', 'pandas': '3.1.0', 'scikit-learn': '1.9.1',
        'xgboost': '3.4.1', 'openpyxl': '3.1.5', 'xlrd': '2.0.2'}

def environment_path(root):
    signature = json.dumps([PINS, sys.version_info[:2], platform.system(), platform.machine()], sort_keys=True)
    return Path(root) / hashlib.sha256(signature.encode()).hexdigest()[:16]


def probe(python):
    from limix_benchmark import delegated_process
    code = ('import importlib.metadata as m,json; import numpy,pandas,sklearn,xgboost,openpyxl,xlrd; '
            'print(json.dumps({k:m.version(k) for k in ' + repr(list(PINS)) + '}))')
    result = delegated_process([str(python), '-c', code], dict(os.environ), timeout=90)
    if result.returncode:
        raise RuntimeError('依赖导入失败：' + result.stderr[-1800:])
    versions = json.loads(result.stdout)
    if versions != PINS:
        raise RuntimeError('独立环境依赖版本不匹配，请重新准备环境')
    return versions


def prepare(root, install=True):
    if sys.version_info < (3, 12):
        raise RuntimeError('模型比较环境需要 Python 3.12 或更新版本；基础预测仍可使用现有 Python')
    target = environment_path(root)
    python = target / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    if (target / 'ready.json').exists():
        try:
            return {'status': 'ready', 'python': str(python), 'versions': probe(python)}
        except (RuntimeError, OSError, ValueError):
            if not install: raise
    if not install:
        return {'status': 'not_ready', 'python': str(python)}
    Path(root).mkdir(parents=True, exist_ok=True)
    # OS 文件锁在崩溃和取消后自动释放，不产生永久的过期锁。
    from limix_benchmark import acquire_file_lock
    with open(str(target) + '.lock', 'a+b') as lock:
        deadline = time.monotonic() + 600
        while True:
            try:
                unlock = acquire_file_lock(lock)
                break
            except (BlockingIOError, OSError, ValueError):
                if time.monotonic() > deadline: raise RuntimeError('另一个进程仍在准备 Python 环境，请稍后重试')
                time.sleep(1)
        try:
            if (target / 'ready.json').exists():
                try: return {'status': 'ready', 'python': str(python), 'versions': probe(python)}
                except (RuntimeError, OSError, ValueError): pass
            print('正在准备 LimiX 独立 Python 环境（只需首次安装）', file=sys.stderr, flush=True)
            from limix_benchmark import delegated_process
            # venv 内部还会启动 ensurepip；整个创建过程统一终止进程树。
            created = delegated_process([sys.executable, '-m', 'venv', str(target)], dict(os.environ))
            if created.returncode:
                raise RuntimeError('独立 Python 环境创建失败：' + created.stderr[-1800:])
            command = [str(python), '-m', 'pip', 'install', '--disable-pip-version-check',
                       '--only-binary=:all:', '--index-url', 'https://pypi.org/simple',
                       *[f'{k}=={v}' for k,v in PINS.items()]]
            installed = delegated_process(command, dict(os.environ))
            if installed.returncode:
                raise RuntimeError('依赖安装失败；检查网络及 Python 版本后运行 runtime prepare 重试。' + installed.stderr[-1800:])
            versions = probe(python)
            (target / 'ready.json').write_text(json.dumps(versions), encoding='utf-8')
            return {'status': 'ready', 'python': str(python), 'versions': versions}
        finally: unlock()


def main():
    parser = argparse.ArgumentParser(description='LimiX 独立 Python 环境；不修改系统依赖')
    parser.add_argument('action', choices=['prepare', 'status'])
    parser.add_argument('--root', default=str(Path.home() / '.limix' / 'python'))
    args = parser.parse_args()
    try:
        print(json.dumps(prepare(args.root, args.action == 'prepare'), ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({'error': str(exc), 'stage': 'environment', 'hint': '运行 limix 工具 command=runtime args=["prepare"] 重试；无需更改预测数据。'}, ensure_ascii=False))
        return 2
    return 0

if __name__ == '__main__':
    sys.exit(main())
