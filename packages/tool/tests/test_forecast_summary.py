"""
[INPUT]: 独立任务的历史、真值及预测 CSV；真实推理编排使用网络替身。
[OUTPUT]: 验证跨月/跨年、多窗口、未知日期、部分真值与临时下载的时间证据。
[POS]: 时序总结的事实契约；不调用 API。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'assets'))
import limix
from limix_forecast import forecast_summary
from limix_metrics import compute_metrics


class TimeSummaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.train = self.write('train', 'date,y\n2026-12-29,10\n2026-12-30,20\n')
        self.truth = self.write('truth', 'date,y\n2026-12-31,30\n2027-01-01,40\n2027-01-02,50\n')
        self.result = self.write('result', 'date,pred_y\n2026-12-31,31\n2027-01-01,50\n2027-01-02,48\n')
        self.ctx = dict(train=str(self.train), predict_path=str(self.truth), date='date', target='y')
        self.payload = dict(context_size=2, horizon=3)

    def write(self, name, content):
        path = self.root / (name + '.csv'); path.write_text(content); return path

    def summary(self):
        metrics = compute_metrics('timeseries', self.ctx.get('predict_path'), 'y', self.result, 'date')
        return forecast_summary(self.ctx, self.payload, self.result, metrics)

    def test_cross_year_dates_and_computed_errors(self):
        s = self.summary()
        self.assertEqual(s['training']['end'], '2026-12-30')
        self.assertEqual(s['prediction']['start'], '2026-12-31')
        self.assertEqual(s['evaluation']['end'], '2027-01-02')
        self.assertEqual(s['largest_errors'][0], dict(date='2027-01-01', actual=40, prediction=50, error=10, absolute_error=10))
        self.assertEqual(s['largest_errors'][1]['error'], -2)

    def test_future_and_multiple_windows_never_reuse_previous_dates(self):
        first = self.summary()
        self.result = self.write('future', 'date,pred_y\n2027-01-03,51\n2027-01-04,52\n')
        self.ctx['predict_path'] = None
        second = self.summary()
        self.assertEqual(second['prediction']['start'], '2027-01-03')
        self.assertEqual(second['evaluation']['status'], 'unavailable')
        self.assertEqual(second['largest_errors'], [])
        self.assertEqual(first['evaluation']['end'], '2027-01-02')
        for start, end in [('2026-10-25','2026-10-31'), ('2026-11-01','2026-11-07')]:
            self.truth = self.write('truth', f'date,y\n{start},1\n{end},2\n')
            self.result = self.write('result', f'date,pred_y\n{start},2\n{end},2\n')
            self.ctx['predict_path'] = str(self.truth)
            self.assertEqual(self.summary()['evaluation']['dates'], [start, end])

    def test_partial_evaluation_exposes_exact_dates(self):
        self.truth.write_text('date,y\n2026-12-31,30\n2027-01-01,NaN\n2027-01-02,50\n')
        s = self.summary()
        self.assertEqual(s['evaluation']['coverage'], 'partial')
        self.assertEqual(s['evaluation']['dates'], ['2026-12-31','2027-01-02'])
        self.assertEqual(len(s['largest_errors']), 2)

    def test_unaligned_missing_duplicate_dates_are_not_invented(self):
        for content in ['pred_y\n31\n48\n', 'date,pred_y\n2026-12-31,31\n2026-12-31,48\n',
                        'date,pred_y\nwrong,31\nwrong2,48\n']:
            self.result.write_text(content)
            s = self.summary()
            self.assertEqual(s['prediction']['status'], 'unavailable')
            self.assertEqual(s['largest_errors'], [])
        self.result.write_text('date,pred_y\n2027-01-03,31\n2027-01-04,48\n')
        self.assertEqual(self.summary()['evaluation']['status'], 'unavailable')

    def test_hourly_and_remote_train_have_no_assumed_daily_scope(self):
        self.ctx.update(train='remote-version', predict_path=None)
        self.result.write_text('date,pred_y\n2026-12-31T23:00:00,31\n2027-01-01T00:00:00,48\n')
        s = self.summary()
        self.assertEqual(s['training']['status'], 'unavailable')
        self.assertEqual(s['prediction']['end'], '2027-01-01T00:00:00')

    def test_inference_without_output_preserves_summary_after_temp_cleanup(self):
        paths = []
        def download(cfg, version, path):
            paths.append(Path(path)); paths[-1].write_bytes(self.result.read_bytes()); return path
        output = io.StringIO()
        with patch.object(limix, 'api_call', return_value={'status':'finished', 'task_id':'one', 'result_version_id':'v1'}), \
             patch.object(limix, 'download_result', side_effect=download), contextlib.redirect_stdout(output):
            limix.run_inference({}, 'timeseries', self.payload, True, False, None, 10, self.ctx)
        result = json.loads(output.getvalue())
        self.assertEqual(result['time_summary']['evaluation']['end'], '2027-01-02')
        self.assertEqual(result['task_id'], 'one')
        self.assertFalse(paths[0].exists())

if __name__ == '__main__': unittest.main()
