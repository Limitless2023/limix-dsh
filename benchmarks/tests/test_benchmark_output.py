"""大结果在工具通道中保持可解析。

[INPUT]: 已实测的 12 模型公开结果、benchmark emit 层和真实委派子进程。
[OUTPUT]: 紧凑 stdout、完整下载文件、失败状态与指标不变的离线断言。
[POS]: 工具卡输入契约回归；不加载模型或调用生产 API。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import argparse
import copy
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT/'packages/tool/assets'
sys.path.insert(0,str(ASSETS))
import limix
import limix_benchmark as bench


class BenchmarkOutputTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.output = self.root/'results.json'
        self.result = json.loads((ROOT/'benchmarks/results/2026-11-01.json').read_text())
        self.result.update(schema_version=1,kind='benchmark')
        # 这是回执体积探针，不修改任何实测预测或指标。
        self.result['rawreceipts'] = {'probe':'raw-receipt-marker'*2000}
        for record in self.result['runs']:
            record['service_result'] = {'probe':'service-result-marker'*2000}
            record['receipt_path'] = str(self.root/'receipt-marker.json')
        self.args = argparse.Namespace(manifest='unused.json',models=','.join(bench.MODELS),
                                       datasets=None,seed=42,timeout=1,python=None,output=str(self.output))
        self.cfg = {'base_url':'https://unused.invalid'}

    def emit(self):
        stdout = io.StringIO()
        with mock.patch.object(bench,'execute',return_value=self.result), redirect_stdout(stdout):
            bench.run(self.cfg,self.args,limix)
        return stdout.getvalue()

    def assert_compact(self,text):
        self.assertLess(len(text.encode('utf-8')),10000)
        data = json.loads(text)
        for key in ('schema_version','kind','status','seed','saved_to','csv_path','report_path','artifacts'):
            self.assertEqual(data[key],self.result[key])
        self.assertEqual(len(data['datasets']),3)
        self.assertEqual(len(data['runs']),12)
        for actual,expected in zip(data['datasets'],self.result['datasets']):
            for key in ('id','name','task_type','train_rows','test_rows','feature_count',
                        'source_name','source_url','license','license_url','citation'):
                self.assertEqual(actual[key],expected[key])
        for actual,expected in zip(data['runs'],self.result['runs']):
            for key in ('dataset_id','model','status','metrics','elapsed_seconds','stage','error'):
                self.assertEqual(actual.get(key),expected.get(key))
            for key in ('samples','service_result','receipt_path'):
                self.assertNotIn(key,actual)
        self.assertNotIn('rawreceipts',data)
        self.assertNotIn('receipt-marker',text)
        self.assertNotIn('service-result-marker',text)
        return data

    def test_real_12_run_stdout_is_small_and_saved_artifacts_stay_complete(self):
        bench.write_summary(self.output,self.result)
        before = {path:Path(path).read_bytes() for path in self.result['artifacts'].values()}
        original = copy.deepcopy(self.result)
        self.assertGreater(len(before[str(self.output)]),400000)
        self.assert_compact(self.emit())
        self.assertEqual(original,self.result)
        self.assertEqual(before,{path:Path(path).read_bytes() for path in before})
        saved = json.loads(self.output.read_text())
        self.assertEqual(saved,self.result)
        html = self.output.with_suffix('.html').read_text()
        embedded = html.split('<script type="application/json" id="data">')[1].split('</script>',1)[0]
        report = json.loads(embedded)
        for actual,expected in zip(report['runs'],self.result['runs']):
            self.assertEqual(actual['samples'],expected['samples'])

    def test_partial_failed_and_pending_statuses_keep_errors_without_zero_metrics(self):
        for state in ('partial','failed','pending'):
            with self.subTest(state=state):
                count = 12 if state=='failed' else 1
                original = copy.deepcopy(self.result)
                for record in self.result['runs'][:count]:
                    record.update(status='pending' if state=='pending' else 'failed',
                                  stage='poll' if state=='pending' else 'upload',error='离线故障探针：等待续查或重试')
                    record.pop('metrics',None)
                bench.write_summary(self.output,self.result)
                data = self.assert_compact(self.emit())
                self.assertEqual(data['status'],state)
                self.assertNotIn('metrics',data['runs'][0])
                self.assertEqual(data['runs'][0]['error'],'离线故障探针：等待续查或重试')
                self.result = original

    def test_delegated_python_emits_the_same_compact_result(self):
        bench.write_summary(self.output,self.result)
        expected = self.emit()
        original = self.output.read_bytes()
        worker = self.root/'offline_worker.py'
        worker.write_text(
            'import argparse,json,sys\n'
            f'sys.path.insert(0,{str(ASSETS)!r})\n'
            'import limix,limix_benchmark as bench\n'
            'from pathlib import Path\n'
            'fixture=json.loads(Path(sys.argv[1]).read_text())\n'
            'bench.execute=lambda cfg,args,cli:fixture\n'
            'parser=argparse.ArgumentParser()\n'
            'bench.arguments(parser)\n'
            "bench.run({'base_url':'https://unused.invalid'},parser.parse_args(sys.argv[2:]),limix)\n")
        self.args.python = str(self.root/'independent-python')
        process = bench.delegated_process
        def offline_delegate(command,env):
            self.assertEqual(command[0],self.args.python)
            return process([sys.executable,str(worker),str(self.output),*command[2:]],env)
        stdout = io.StringIO()
        with mock.patch.object(bench,'delegated_process',side_effect=offline_delegate), \
             mock.patch.object(bench,'execute',side_effect=AssertionError('必须委派给子进程')), \
             redirect_stdout(stdout):
            bench.run(self.cfg,self.args,limix)
        self.assertEqual(stdout.getvalue(),expected)
        self.assert_compact(stdout.getvalue())
        self.assertEqual(self.output.read_bytes(),original)


if __name__ == '__main__':
    unittest.main()
