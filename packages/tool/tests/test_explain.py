"""
[INPUT]: explain 模块；模拟真实异步返回与临时 CSV。
[OUTPUT]: 单样本/原值对应、时序参数拒绝、回执恢复和输出完整性验证。
[POS]: 解释业务契约测试，不调用生产 API。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import argparse
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'assets'))
import limix_explain as explain


class ExplainTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        (self.root/'train.csv').write_text('a,b,y\n1,2,3\n2,4,6\n')
        (self.root/'input.csv').write_text('a,b\n3,6\n4,8\n')
        self.args=argparse.Namespace(mode='local',data=str(self.root/'input.csv'),train=str(self.root/'train.csv'),
            target='y',features=None,task_type='regression',row=2,timeout=10,threshold=None,labels=None,
            prediction=None,model='LIMIX_16M',task_id=None,output=str(self.root/'out.json'))

    def tearDown(self):self.temp.cleanup()

    def result(self,status='succeeded'):
        return {'task_id':'task-1','task_status':status,'result_id':'result-1','result':{'explanation_mode':'local',
            'feature_names':['a','b'],'feature_scores':[[.2,.7]],'sign_scores':[[-1,1]],'predictions':[12.0],
            'sample_index':None,'risks':['仅局部归因']}}

    def test_selection_is_single_input_row(self):
        cli=Mock()
        uploads=[]
        def upload(cfg,path):
            uploads.append(Path(path).read_text(encoding='utf-8-sig'));return {'data_version_id':f'version-{len(uploads)}'}
        cli.upload_file.side_effect=upload
        cli.api_call.side_effect=[{'task_id':'task-1'},self.result()]
        cli.die.side_effect=RuntimeError
        explain.run({},self.args,cli)
        self.assertEqual(uploads[1].splitlines(),['a,b','4,8'])
        body=cli.api_call.call_args_list[0].kwargs['body']
        self.assertEqual(body['local_task_type'],'regression')
        self.assertEqual(body['feature_columns'],['a','b'])
        self.assertEqual(json.loads((self.root/'out.receipt.json').read_text())['task_id'],'task-1')
        summary=cli.emit.call_args.args[0]
        self.assertEqual(summary['explanation']['row_number'],2)
        self.assertEqual(summary['explanation']['features'][0]['name'],'b')
        self.assertEqual(summary['explanation']['samples'][0]['feature_values'],['4','8'])
        self.assertNotIn('feature_values_by_row',summary['explanation'])
        self.assertTrue((self.root/'out.csv').exists())

    def test_invalid_row_and_missing_mode_arguments_rejected(self):
        self.args.row=3
        with self.assertRaisesRegex(ValueError,'超出'):explain.validate(self.args)
        self.args.row=1;self.args.task_type=None
        with self.assertRaisesRegex(ValueError,'task-type'):explain.validate(self.args)

    def test_graph_rejects_missing_nonfinite_or_identifier_fields(self):
        self.args.mode='directed';self.args.row=None;self.args.data=str(self.root/'train.csv')
        (self.root/'train.csv').write_text('a,b,y\n1,,3\n')
        with self.assertRaisesRegex(ValueError,'有限数值'):explain.validate(self.args)
        (self.root/'train.csv').write_text('a,b,y\n1,inf,3\n')
        with self.assertRaisesRegex(ValueError,'有限数值'):explain.validate(self.args)

    def test_unaligned_result_is_rejected(self):
        result=self.result();result['result']['sample_index']=[7]
        with self.assertRaisesRegex(ValueError,'索引'):explain.normalize(result,{})
        result=self.result();result['result']['feature_scores']=[[1,2],[3,4]]
        with self.assertRaisesRegex(ValueError,'维度'):explain.normalize(result,{})

    def test_unknown_sign_does_not_invent_direction(self):
        result=self.result();result['result']['sign_scores']=None
        view=explain.normalize(result,{})
        self.assertIsNone(view['features'][0]['direction'])
        self.assertEqual(view['features'][0]['score'],.7)

    def test_prior_prediction_and_recompute_difference_remain_visible(self):
        view=explain.normalize(self.result(),{'prior_prediction':11.5})
        self.assertEqual(view['prediction_delta'],.5)

    def test_resume_does_not_upload_or_submit_and_keeps_degradation(self):
        _,_,context=explain.validate(self.args)
        (self.root/'out.receipt.json').write_text(json.dumps({'task_id':'task-1','context':context}))
        self.args.task_id='task-1';cli=Mock();cli.api_call.return_value=self.result('degraded_succeeded')
        cli.die.side_effect=RuntimeError
        explain.run({},self.args,cli)
        cli.upload_file.assert_not_called()
        self.assertEqual(cli.api_call.call_args.args[1],'GET')
        self.assertEqual(cli.emit.call_args.args[0]['task_status'],'degraded_succeeded')
        self.assertEqual(cli.emit.call_args.args[0]['explanation']['risks'],['仅局部归因'])

    def test_unknown_submission_receipt_blocks_duplicate_post(self):
        (self.root/'out.receipt.json').write_text(json.dumps({'task_id':None,'context':{}}))
        cli=Mock();cli.die.side_effect=lambda *a,**k: (_ for _ in ()).throw(SystemExit(2))
        with self.assertRaises(SystemExit):explain.run({},self.args,cli)
        cli.api_call.assert_not_called();cli.upload_file.assert_not_called()

    def test_prediction_file_wrong_row_count_rejected(self):
        p=self.root/'prediction.csv';p.write_text('pred_label\n10\n');self.args.prediction=str(p)
        with self.assertRaisesRegex(ValueError,'行数'):explain.validate(self.args)

    def test_resume_refuses_changed_source_before_network(self):
        self.args.task_id='task-1'
        _,_,context=explain.validate(self.args)
        (self.root/'out.receipt.json').write_text(json.dumps({'task_id':'task-1','context':context}))
        (self.root/'input.csv').write_text('a,b\n3,6\n5,10\n')
        cli=Mock();cli.die.side_effect=lambda *a,**k: (_ for _ in ()).throw(SystemExit(2))
        with self.assertRaises(SystemExit):explain.run({},self.args,cli)
        cli.api_call.assert_not_called();cli.upload_file.assert_not_called()

    def test_graph_unknown_edge_is_rejected(self):
        result={'result':{'explanation_mode':'directed','variable_names':['x','y'],'edges':[{'source':'z','target':'y','weight':.9}]}}
        with self.assertRaisesRegex(ValueError,'变量集合'):explain.normalize(result,{})


    def test_resume_without_receipt_cannot_bind_old_task_to_new_rows(self):
        self.args.task_id='task-1'
        cli=Mock();cli.die.side_effect=lambda *a,**k: (_ for _ in ()).throw(SystemExit(2))
        with self.assertRaises(SystemExit):explain.run({},self.args,cli)
        cli.api_call.assert_not_called();cli.upload_file.assert_not_called()
        self.assertFalse((self.root/'out.receipt.json').exists())

    def test_lost_submission_response_can_recover_only_matching_source(self):
        _,_,context=explain.validate(self.args)
        request={'explanation_mode':'local','local_task_type':'regression','train_data_version_id':'train-v',
                 'explain_data_version_id':'input-v','target_column':'y','feature_columns':['a','b'],'model_type':'LIMIX_16M'}
        receipt=self.root/'out.receipt.json'
        record={'task_id':None,'context':context,'request':request}
        receipt.write_text(json.dumps(record));self.args.task_id='task-1'
        actual=self.result();actual['task_type']='explanation';actual['result'].update(request)
        actual['result']['explain_data_version_id']='wrong-source'
        cli=Mock();cli.die.side_effect=lambda *a,**k: (_ for _ in ()).throw(SystemExit(2));cli.api_call.return_value=actual
        with self.assertRaises(SystemExit):explain.run({},self.args,cli)
        self.assertIsNone(json.loads(receipt.read_text())['task_id'])
        self.assertFalse((self.root/'out.json').exists())
        actual['result']['explain_data_version_id']='input-v'
        explain.run({},self.args,cli)
        self.assertEqual(json.loads(receipt.read_text())['task_id'],'task-1')
        cli.upload_file.assert_not_called()
        self.assertTrue(all(call.args[1]=='GET' for call in cli.api_call.call_args_list))

if __name__=='__main__':unittest.main()
