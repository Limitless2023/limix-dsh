"""
[INPUT]: 数值、文本标识和业务分类字段；分类预测及固定拆分时序。
[OUTPUT]: 验证预检、确定性选样和时序基线无未来真值泄漏。
[POS]: Scenarios 问题复现测试，不调用 API。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import csv
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'assets'))
from limix_explain_input import prepare_features, stratified_rows
from limix_metrics import seasonal_baseline

class InputPreflightTest(unittest.TestCase):
    def test_id_is_kept_for_tracking_not_features_and_explicit_override_is_validated(self):
        rows=[{'sample_id':'steel-a','x':'1'},{'sample_id':'steel-b','x':'2'}]
        features,excluded=prepare_features(['sample_id','x'],rows,'y',None,rows)
        self.assertEqual(features,['x']);self.assertEqual(excluded,['sample_id'])
        self.assertEqual(rows[0]['sample_id'],'steel-a')
        with self.assertRaisesRegex(ValueError,'sample_id'):
            prepare_features(['sample_id','x'],rows,'y','sample_id,x',rows)

    def test_business_category_not_silently_dropped_and_numeric_named_id_not_assumed_identifier(self):
        rows=[{'type':'a','id':'1.5'},{'type':'b','id':'2.8'}]
        with self.assertRaisesRegex(ValueError,'业务分类特征'):
            prepare_features(['type','id'],rows,'y',None)
        self.assertEqual(prepare_features(['id'],[{'id':'1.5'},{'id':'2.8'}],'y',None),(['id'],[]))

    def test_missing_training_value_is_rejected_before_network(self):
        with self.assertRaisesRegex(ValueError,'参考数据第 2 行'):
            prepare_features(['x'],[{'x':'1'}],'y',None,[{'x':'2'},{'x':''}])

    def test_class_sampling_covers_minority_and_is_reproducible(self):
        rows=[{'pred_label':'0'} for _ in range(99)]+[{'pred_label':'1'}]
        result=stratified_rows(rows,10,42)
        self.assertEqual(result,stratified_rows(rows,10,42))
        self.assertIn(100,result);self.assertEqual(len(set(result)),10)
        with self.assertRaisesRegex(ValueError,'类别数'):stratified_rows(rows,1)

    def test_seasonal_forecast_does_not_use_future_truth(self):
        from datetime import date,timedelta
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            def write(name,header,rows):
                with (root/name).open('w') as f:
                    w=csv.writer(f);w.writerow(header);w.writerows(rows)
                return str(root/name)
            dates=[(date(2026,1,1)+timedelta(days=i)).isoformat() for i in range(21)]
            train=write('train.csv',['date','y'],zip(dates[:7],range(1,8)))
            pred=write('pred.csv',['date','pred_y'],zip(dates[7:],[0]*14))
            truth=write('truth.csv',['date','y'],zip(dates[7:],[100]*14))
            first=seasonal_baseline(train,truth,pred,'y','date')
            self.assertEqual(first['predictions'],list(range(1,8))*2)
            write('truth.csv',['date','y'],zip(dates[7:],range(200,214)))
            second=seasonal_baseline(train,truth,pred,'y','date')
            self.assertEqual(second['predictions'],first['predictions'])
            self.assertNotEqual(second['metrics'],first['metrics'])
            write('train.csv',['date','y'],zip(dates[:8],range(8)))
            self.assertEqual(seasonal_baseline(train,truth,pred,'y','date')['status'],'unavailable')

if __name__=='__main__':unittest.main()
