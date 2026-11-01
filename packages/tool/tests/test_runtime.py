"""
[INPUT]: 独立环境准备器、临时目录与受控子进程。
[OUTPUT]: 验证创建与探测的取消/超时覆盖后代，失败不写 ready 标记。
[POS]: Python 环境生命周期回归测试；不访问 PyPI、不安装依赖。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import os
import json
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

ASSETS = Path(__file__).resolve().parents[1] / 'assets'
sys.path.insert(0, str(ASSETS))
import limix_runtime as runtime


class RuntimeTests(unittest.TestCase):
    def test_probe_keeps_ninety_second_deadline(self):
        success = subprocess.CompletedProcess([], 0, json.dumps(runtime.PINS), '')
        with patch('limix_benchmark.delegated_process', return_value=success) as run:
            self.assertEqual(runtime.probe('/test/python'), runtime.PINS)
        self.assertEqual(run.call_args.kwargs, {'timeout': 90})

    def test_failed_venv_creation_does_not_start_pip_or_mark_ready(self):
        with tempfile.TemporaryDirectory() as folder:
            failed = subprocess.CompletedProcess([], 1, '', 'ensurepip unavailable')
            with patch('limix_benchmark.delegated_process', return_value=failed) as run:
                with self.assertRaisesRegex(RuntimeError, '环境创建失败'):
                    runtime.prepare(folder)
            self.assertEqual(run.call_count, 1)
            self.assertEqual(run.call_args.args[0][:3], [sys.executable, '-m', 'venv'])
            self.assertFalse((runtime.environment_path(folder) / 'ready.json').exists())

    @unittest.skipIf(os.name == 'nt', 'Windows 的 taskkill 进程树路径由宿主测试覆盖')
    def test_cancel_venv_creation_terminates_ensurepip_equivalent_child(self):
        self.assert_process_tree_stops('create')

    @unittest.skipIf(os.name == 'nt', 'Windows 的 taskkill 进程树路径由宿主测试覆盖')
    def test_cancel_probe_terminates_import_process_tree(self):
        self.assert_process_tree_stops('probe')

    @unittest.skipIf(os.name == 'nt', 'Windows 的 taskkill 进程树路径由宿主测试覆盖')
    def test_probe_timeout_terminates_import_process_tree(self):
        self.assert_process_tree_stops('timeout')

    def assert_process_tree_stops(self, stage):
        # 等价子进程持续写心跳；取消创建器后必须停止，不能成为后台安装孤儿。
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            heartbeat, child_pid = root / 'heartbeat', root / 'child.pid'
            child_code = ('import pathlib,time; p=pathlib.Path(' + repr(str(heartbeat)) + '); '
                          '\nwhile True: p.write_text(str(time.time_ns())); time.sleep(.03)')
            wrapper = root / 'python-wrapper'
            wrapper.write_text('#!' + sys.executable + '\nimport subprocess,sys,pathlib\n'
                               'child=subprocess.Popen([sys.executable,"-c",' + repr(child_code) + '])\n'
                               'pathlib.Path(' + repr(str(child_pid)) + ').write_text(str(child.pid))\n'
                               'child.wait()\n')
            wrapper.chmod(0o700)
            runner = root / 'runner.py'
            action = 'r.prepare(' + repr(str(root / 'env')) + ')\n'
            if stage != 'create':
                action = 'r.probe(' + repr(str(wrapper)) + ')\n'
            if stage == 'timeout':
                # 通过原 helper 缩短等待；仍执行真实 probe、超时和进程树终止路径。
                action = ('import limix_benchmark as b\noriginal=b.delegated_process\n'
                          'b.delegated_process=lambda command,env,timeout: original(command,env,timeout=2)\n'
                          + action)
            runner.write_text('import sys\nsys.path.insert(0,' + repr(str(ASSETS)) + ')\n'
                              'import limix_runtime as r\nr.sys.executable=' + repr(str(wrapper)) + '\n'
                              + action)
            parent = subprocess.Popen([sys.executable, str(runner)], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            pid = None
            try:
                deadline = time.monotonic() + 5
                while not heartbeat.exists() and parent.poll() is None and time.monotonic() < deadline:
                    time.sleep(.03)
                self.assertTrue(heartbeat.exists(), '创建阶段的子进程未启动')
                pid = int(child_pid.read_text())
                if stage != 'timeout':
                    parent.terminate()
                _, stderr = parent.communicate(timeout=5)
                if stage == 'timeout':
                    self.assertIn(b'TimeoutExpired', stderr)
                time.sleep(.1)
                after = heartbeat.read_text()
                time.sleep(.15)
                self.assertEqual(heartbeat.read_text(), after, '取消后子进程仍在运行')
                self.assertNotEqual(parent.returncode, 0)
            finally:
                if parent.poll() is None:
                    parent.kill()
                parent.communicate(timeout=5)
                if pid:
                    try: os.kill(pid, signal.SIGKILL)
                    except ProcessLookupError: pass


if __name__ == '__main__':
    unittest.main()
