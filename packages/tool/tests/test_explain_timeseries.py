"""
[INPUT]: 官方文档与成功时序结果的字段契约；模拟 HTTP、临时回执与输出文件。
[OUTPUT]: 时序提交/续查、矩阵长表核对、未知尺度、时间标签与完整 CSV 验证。
[POS]: 时序解释后端契约测试；不调用生产 API，不替代真实 UI 验证。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import argparse
import copy
import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock,patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'assets'))
import limix_explain as explain


def result():
    # 字段/索引契约来自生产时序解释；用小数据验证错配，不复制业务数据。
    source={'explanation_mode':'local','local_task_type':'timeseries','graph_type':'local_timeseries',
            'result_version_id':'forecast-version','source_task_id':'forecast-task','target_column':'demand',
            'col_target':'demand','col_date':'date','horizon':2,'context_size':90,
            'feature_names':['holiday','date_hour_sin'],'feature_scores':[[.8,.2],[.4,.6]],
            'sign_scores':[[1,-1],[-1,-1]],'predictions':[120,130],
            'horizon_index':[1780444800000000000,1780531200000000000],
            'feature_columns':[{'name':'holiday','column_index':0,'source':'covariate'},
                               {'name':'date_hour_sin','column_index':1,'source':'engineered'}]}
    source['feature_causality']=[{'horizon_step':step,'feature_name':name,'feature_index':column,
        'timestamp':['2026-06-03T00:00:00','2026-06-04T00:00:00'][step],
        'prediction':source['predictions'][step],'causal_score':source['feature_scores'][step][column],
        'sign_score':source['sign_scores'][step][column]}
        for step in range(2) for column,name in enumerate(source['feature_names'])]
    return {'task_id':'explain-task','task_status':'succeeded','result_id':'explain-result','result':source}


class TimeseriesTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        parser=argparse.ArgumentParser();explain.add_parser(parser.add_subparsers(),Mock())
        self.args=parser.parse_args(['explain','--mode','local','--task-type','timeseries',
            '--result-version-id','forecast-version','--output',str(self.root/'out.json')])
        _,_,self.context=explain.validate(self.args)

    def tearDown(self):self.temp.cleanup()

    def cli(self):
        cli=Mock();cli.die.side_effect=lambda *a,**kw: (_ for _ in ()).throw(SystemExit(kw.get('exit_code',2)))
        return cli

    def test_request_uses_only_completed_forecast_reference_without_uploads(self):
        cli=self.cli();cli.api_call.side_effect=[{'task_id':'explain-task'},result()]
        explain.run({},self.args,cli)
        cli.upload_file.assert_not_called()
        self.assertEqual(cli.api_call.call_args_list[0].kwargs['body'],{
            'explanation_mode':'local','local_task_type':'timeseries','result_version_id':'forecast-version'})
        summary=cli.emit.call_args.args[0]['explanation']
        self.assertEqual(summary['task_type'],'timeseries')
        self.assertNotIn('samples',summary)
        view=json.loads(Path(summary['detail_path']).read_text())
        self.assertEqual(view['samples'][1]['step'],2)
        self.assertEqual(view['samples'][1]['timestamp'],'2026-06-04T00:00:00')
        self.assertEqual(view['target'],'demand')
        self.assertEqual(view['features'][0]['name'],'date_hour_sin')
        self.assertAlmostEqual(view['features'][0]['score'],-.4)
        self.assertEqual(view['missing_rows'],[])

    def test_csv_has_all_steps_dates_and_signed_scores(self):
        view=explain.normalize(result(),self.context)
        path=self.root/'contributions.csv';explain.export_csv(path,view)
        with path.open(encoding='utf-8-sig') as f:rows=list(csv.DictReader(f))
        self.assertEqual(len(rows),4)
        self.assertEqual(rows[-1]['forecast_step'],'2')
        self.assertEqual(rows[-1]['timestamp'],'2026-06-04T00:00:00')
        self.assertEqual(rows[-1]['signed_score'],'-0.6')
        self.assertEqual(rows[-1]['feature_value'],'')

    def test_existing_forecast_parameters_cannot_be_overridden(self):
        for name,value in [('data','file.csv'),('train','file.csv'),('target','other'),('features','x'),
                           ('row',1),('rows','all'),('prediction','file.csv'),('model','LIMIX_16M')]:
            with self.subTest(name=name):
                args=copy.copy(self.args);setattr(args,name,value)
                with self.assertRaisesRegex(ValueError,'沿用原预测参数'):explain.validate(args)
        for version in [None,'','   ']:
            with self.subTest(version=version):
                args=copy.copy(self.args);args.result_version_id=version
                with self.assertRaisesRegex(ValueError,'result-version-id'):explain.validate(args)

    def test_version_target_and_task_type_mismatch_are_rejected(self):
        for patch_data in [{'result_version_id':'another-forecast'},{'col_target':'other'},
                           {'local_task_type':'regression'},{'graph_type':'local'}]:
            data=result();data['result'].update(patch_data)
            with self.subTest(patch=patch_data),self.assertRaises(ValueError):explain.normalize(data,self.context)

    def test_long_table_duplicate_wrong_feature_score_or_timestamp_rejected(self):
        patches=[{'horizon_step':2},{'horizon_step':True},{'feature_index':1},{'feature_name':'unknown'},
                 {'causal_score':float('nan')},{'causal_score':.7},{'sign_score':-1},
                 {'prediction':999},{'timestamp':'different-time'}]
        for patch_data in patches:
            data=result();data['result']['feature_causality'][0].update(patch_data)
            with self.subTest(patch=patch_data),self.assertRaises(ValueError):explain.normalize(data,self.context)
        data=result();data['result']['feature_causality'].append(data['result']['feature_causality'][0])
        with self.assertRaisesRegex(ValueError,'重复'):explain.normalize(data,self.context)
        data=result();data['result']['feature_causality'].pop()
        with self.assertRaisesRegex(ValueError,'缺少'):explain.normalize(data,self.context)

    def test_nan_prediction_catalog_order_and_missing_step_are_rejected(self):
        for patch_data in [{'predictions':[float('inf'),2]},{'predictions':['120',130]},
                           {'feature_columns':[{'name':'wrong','column_index':0}]},
                           {'horizon_index':[1]},{'feature_scores':[[.8,.2]]}]:
            data=result();data['result'].update(patch_data)
            with self.subTest(patch=patch_data),self.assertRaises(ValueError):explain.normalize(data,self.context)

    def test_unknown_directions_and_numeric_time_index_are_not_invented(self):
        data=result();data['result'].update(sign_scores=None,feature_causality=None)
        view=explain.normalize(data,self.context)
        self.assertTrue(all(feature['score'] is None for feature in view['features']))
        self.assertEqual(view['samples'][0]['directions'],[None,None])
        self.assertNotIn('timestamp',view['samples'][0])

    def test_adapted_output_keeps_service_value_without_business_unit_or_inverse_transform(self):
        data=result();source=data['result']
        source['predictions']=[8.367786407470703,8.544740676879883]
        source['predictions_norm']=[-.39311513407760135,-.0984883805631293]
        source['metadata']={'auto_adaptation':True,'regression_scale':[8.603893280029297,.6006048917770386]}
        for row in source['feature_causality']:row['prediction']=source['predictions'][row['horizon_step']]
        context={**self.context,'unit':'次/天'}
        view=explain.normalize(data,context)
        self.assertEqual(view['samples'][0]['prediction'],8.367786407470703)
        self.assertEqual(view['prediction_scale'],'unverified')
        self.assertEqual(view['prediction_label'],'解释模型输出')
        self.assertEqual(view['unit'],'')
        self.assertEqual(view['target_unit'],'次/天')
        self.assertNotIn('prediction_delta',view['samples'][0])

    def test_missing_transform_metadata_does_not_imply_original_business_scale(self):
        view=explain.normalize(result(),{**self.context,'unit':'次/天'})
        self.assertEqual(view['unit'],'')
        self.assertEqual(view['prediction_scale'],'unverified')

    def test_missing_matrix_direction_can_use_same_cell_long_table_evidence(self):
        data=result();data['result']['sign_scores']=[[None,-1],[-1,None]]
        view=explain.normalize(data,self.context)
        self.assertEqual(view['samples'][0]['directions'],[1,-1])
        self.assertAlmostEqual(view['features'][0]['score'],-.4)

    def test_one_step_keeps_single_prediction_and_original_score_contract(self):
        data=result();source=data['result'];source['horizon']=1
        for key in ['feature_scores','sign_scores','predictions','horizon_index']:source[key]=source[key][:1]
        source['feature_causality']=source['feature_causality'][:2]
        view=explain.normalize(data,self.context)
        self.assertEqual(view['step'],1)
        self.assertEqual(view['prediction'],120)
        self.assertEqual(view['timestamp'],'2026-06-03T00:00:00')
        self.assertEqual(view['features'][1]['score'],.2)
        self.assertEqual(view['features'][1]['direction'],-1)

    def test_resume_does_not_submit_and_refuses_changed_forecast_version(self):
        self.args.task_id='explain-task';cli=self.cli();cli.api_call.return_value=result()
        explain.run({},self.args,cli)
        cli.upload_file.assert_not_called()
        self.assertEqual([call.args[1] for call in cli.api_call.call_args_list],['GET'])
        self.args.result_version_id='different-version';cli=self.cli()
        with self.assertRaises(SystemExit):explain.run({},self.args,cli)
        cli.api_call.assert_not_called()

    def test_pending_task_keeps_receipt_for_resume(self):
        cli=self.cli();cli.api_call.side_effect=[{'task_id':'explain-task'},{'task_id':'explain-task','task_status':'running'}]
        with patch.object(explain.time,'monotonic',side_effect=[0,1000]),self.assertRaises(SystemExit) as error:
            explain.run({},self.args,cli)
        self.assertEqual(error.exception.code,3)
        receipt=json.loads((self.root/'out.receipt.json').read_text())
        self.assertEqual(receipt['task_id'],'explain-task')
        self.assertEqual(receipt['request']['result_version_id'],'forecast-version')
        self.assertFalse((self.root/'out.json').exists())


if __name__=='__main__':unittest.main()
