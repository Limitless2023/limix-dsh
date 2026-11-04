"""
[INPUT]: 临时输入文件与模拟预测任务状态。
[OUTPUT]: 缺失路径在请求前拒绝；提前 ready 继续等终态；缺失结果保留任务。
[POS]: CLI 预测生命周期回归验证；不调用 API。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'assets'))
import limix
from limix_input import checked_ref
from limix_forecast import forecast_payload


class LifecycleTests(unittest.TestCase):
    def test_missing_predict_never_uploads_training(self):
        with tempfile.TemporaryDirectory() as folder:
            train = Path(folder) / 'train.csv'
            train.write_text('x,y\n1,2\n')
            for fn in [limix.cmd_classify, limix.cmd_regress, limix.cmd_forecast]:
                args = SimpleNamespace(train=str(train), predict=str(Path(folder)/'missing.csv'))
                with self.subTest(command=fn.__name__), patch.object(limix, 'api_call') as api, contextlib.redirect_stderr(io.StringIO()) as err:
                    with self.assertRaises(SystemExit) as failure:
                        fn({}, args)
                    self.assertEqual(failure.exception.code, 2)
                    self.assertIn('本地文件不存在', err.getvalue())
                    api.assert_not_called()

    def test_refs_allow_remote_ids_and_reject_directory_or_missing_file(self):
        self.assertEqual(checked_ref('remote-version', '训练集'), 'remote-version')
        for ref in ['missing.csv', './missing', '/nonexistent/train', '~/not-found.csv']:
            with self.subTest(ref=ref), self.assertRaises(ValueError):
                checked_ref(ref, '训练集')
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError):
                checked_ref(folder, '训练集')
            with patch('os.path.expanduser', side_effect=lambda value: str(Path(folder) / value[2:])):
                Path(folder, 'train.csv').write_text('x,y\n1,2\n')
                self.assertEqual(checked_ref('~/train.csv','训练集'),str(Path(folder,'train.csv')))

    def test_premature_ready_does_not_fail_or_resubmit(self):
        states = [dict(status='queued', is_ready=False), dict(status='running', is_ready=True),
                  dict(status='finished', is_ready=True, result_version_id='result')]
        with patch.object(limix, 'api_call', side_effect=states) as api, patch.object(limix.time, 'sleep'), contextlib.redirect_stderr(io.StringIO()):
            result = limix.poll_task({}, 'same-task', 30)
        self.assertEqual(result['result_version_id'], 'result')
        self.assertEqual(api.call_count, 3)
        self.assertTrue(all(call.args[1:3] == ('GET','/v1/inference/tasks/same-task') for call in api.call_args_list))

    def test_failure_is_terminal_even_without_ready(self):
        for status in ['failed', 'timeout', 'cancelled']:
            with patch.object(limix,'api_call',return_value={'status':status,'is_ready':False}) as api, contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(limix.poll_task({},'task',30)['status'],status)
                api.assert_called_once()

    def test_missing_result_fails_with_task_not_keyerror(self):
        with patch.object(limix,'api_call',return_value={'status':'finished','task_id':'known'}) as api, contextlib.redirect_stderr(io.StringIO()) as err:
            with self.assertRaises(SystemExit):
                limix.run_inference({},'regression',{},True,False,'output.csv',30)
            self.assertIn('known',err.getvalue())
            self.assertIn('不重复提交',err.getvalue())
            api.assert_called_once()

if __name__ == '__main__': unittest.main()
