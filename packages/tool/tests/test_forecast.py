"""
[INPUT]: 临时日频 CSV、forecast 参数与上传替身。
[OUTPUT]: 验证上传前拒绝错误，兼容分隔符与 UTF 编码，未知编码明确委派服务端。
[POS]: 时序输入预检测试，不调用 API。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import sys, tempfile, unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'assets'))
from limix_forecast import forecast_payload, local_rows

class ForecastTests(unittest.TestCase):
    def args(self, **updates):
        values = dict(train='train-version', predict=None, target='y', date='date',
                      date_format=None, covariates=None, context=2, horizon=1,
                      quantile=True, levels='0.1,0.5,0.9', point=None,
                      reduce_window=None, stride=None, model=None, finetuned=None, timeout=60)
        values.update(updates)
        return SimpleNamespace(**values)

    def test_invalid_levels_stop_before_upload_with_value_error(self):
        for levels in ['inf', '-inf', 'nan', '1e309', '0.1,inf', '0.05', '0.9,0.1', '0.1,0.1']:
            with self.subTest(levels=levels):
                upload = Mock()
                with self.assertRaisesRegex(ValueError, '分位点'):
                    forecast_payload(self.args(levels=levels), upload)
                upload.assert_not_called()

    def test_supported_csv_dialects_and_bom_encodings_keep_request_contract(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'train.csv'
            for delimiter in [',', ';', '\t', '|']:
                for encoding in ['utf-8', 'utf-8-sig', 'utf-16', 'utf-32']:
                    with self.subTest(delimiter=delimiter, encoding=encoding):
                        path.write_text('\n'.join(delimiter.join(row) for row in [
                            ['date', 'y'], ['2026-01-01', '600'], ['2026-01-02', '700']]), encoding=encoding)
                        upload = Mock(return_value='train-version')
                        result = forecast_payload(self.args(train=str(path)), upload)
                        self.assertEqual(result['train_data_version_id'], 'train-version')
                        upload.assert_called_once_with(str(path), '训练集')

    def test_delimited_missing_columns_and_ragged_rows_are_not_deferred(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'train.csv'
            for content, error in [
                ('date;wrong\n2026-01-01;600\n2026-01-02;700\n', '缺少列'),
                ('date;y\n2026-01-01;600\n2026-01-02;700;extra\n', '列数不一致'),
                ('date;y;y\n2026-01-01;600;700\n', '列名重复')
            ]:
                path.write_text(content, encoding='utf-16')
                upload = Mock()
                with self.subTest(error=error), self.assertRaisesRegex(ValueError, error):
                    forecast_payload(self.args(train=str(path)), upload)
                upload.assert_not_called()

    def test_unconfirmed_encoding_is_explicitly_deferred_to_server(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'train.csv'
            path.write_bytes('date,y,门店\n2026-01-01,600,梧桐\n'.encode('gb18030'))
            with self.assertLogs('limix_forecast', level='WARNING') as logs:
                self.assertIsNone(local_rows(str(path), '训练集'))
            self.assertIn('交服务端自动识别并校验内容', logs.output[0])

    def test_preflight_before_upload_and_valid_requests(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);train=root/'train.csv';future=root/'future.csv'
            train.write_text('date,y,promo\n2026-01-01,600,0\n2026-01-02,700,1\n')
            future.write_text('date\n2026-01-03\n')
            args=SimpleNamespace(train=str(train),predict=str(future),target='y',date='date',date_format=None,covariates=None,context=2,horizon=1,quantile=True,levels='0.1,0.5,0.9',point=None,reduce_window=None,stride=None,model=None,finetuned=None,timeout=60)
            upload=Mock(return_value='id')
            with self.assertRaisesRegex(ValueError,'仅日期列'):forecast_payload(args,upload)
            upload.assert_not_called()
            args.predict=None;result=forecast_payload(args,upload)
            self.assertIsNone(result['predict_data_version_id']);self.assertEqual(upload.call_count,1)
            args.predict=str(future);args.covariates='promo';upload.reset_mock()
            with self.assertRaisesRegex(ValueError,'缺少列'):forecast_payload(args,upload)
            upload.assert_not_called()
            future.write_text('date,promo\n2026-01-03,1\n');result=forecast_payload(args,upload)
            self.assertEqual(result['col_covariates'],['promo']);self.assertEqual(upload.call_count,2)
            for content,error in [('date,promo\n2026-01-02,1\n','晚于'),('date,promo\n2026-01-03,\n','缺失'),('date,promo\n2026-01-04,1\n2026-01-03,1\n','严格递增')]:
                future.write_text(content);upload.reset_mock()
                with self.assertRaisesRegex(ValueError,error):forecast_payload(args,upload)
                upload.assert_not_called()

if __name__=='__main__':unittest.main()
