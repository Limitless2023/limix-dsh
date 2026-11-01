"""
[INPUT]: 批量解释契约与模拟部分结果。
[OUTPUT]: 行号/原值对齐、错位拒绝、带符号平均与未知方向、完整导出验证。
[POS]: 防止批量结果误标为完整或把其他样本的解释绑定到当前行。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import csv
import copy
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'assets'))
from limix_explain_batch import select_rows,normalize_local,summarize_features
from limix_explain import export_csv

class BatchTests(unittest.TestCase):
    def setUp(self):
        self.result={'feature_names':['a','b'],'feature_scores':[[.8,-.2],[-.4,.6]],
            'sign_scores':[[1,-1],[-1,1]],'predictions':[12,16],'sample_index':None}
        self.context={'row_numbers':[3,9],'feature_names':['a','b'],'prior_predictions':{'3':11,'9':15}}

    def test_selection_keeps_explicit_order_and_rejects_overlap(self):
        self.assertEqual(select_rows(None,'9,1-3',10),[9,1,2,3])
        self.assertEqual(select_rows(None,'all',63),list(range(1,64)))
        for selection in ['1,1','1-3,3-4','0','-1','3-1','1-11','1,','']:
            with self.subTest(selection=selection),self.assertRaises(ValueError):select_rows(None,selection,10)
        with self.assertRaises(ValueError):select_rows(1,'all',10)

    def test_full_result_without_indices_preserves_rows_and_signed_average(self):
        view=normalize_local(self.result,self.context)
        self.assertEqual(view['mapping'],'input_order')
        self.assertEqual([s['row_number'] for s in view['samples']],[3,9])
        self.assertAlmostEqual(view['features'][0]['score'],.2)
        self.assertAlmostEqual(view['features'][1]['score'],.2)
        self.assertEqual(view['samples'][1]['prediction_delta'],1)
        self.assertEqual(view['features'][0]['direction'],1)

    def test_signed_average_cancels_opposites_and_sorts_by_magnitude(self):
        self.result['feature_scores']=[[.8,.2],[.8,.6]]
        self.result['sign_scores']=[[1,-1],[-1,-1]]
        features=normalize_local(self.result,self.context)['features']
        self.assertEqual(features[0]['name'],'b')
        self.assertAlmostEqual(features[0]['score'],-.4)
        self.assertEqual(features[0]['direction'],-1)
        self.assertEqual(features[1]['score'],0)

    def test_unknown_direction_does_not_turn_into_neutral_or_change_denominator(self):
        samples=[{'scores':[1,0,2],'directions':[1,None,1]},
                 {'scores':[1,0,2],'directions':[None,None,-1]}]
        features={f['name']:f for f in summarize_features(['unknown','zero','balanced'],samples,{})}
        self.assertIsNone(features['unknown']['score'])
        self.assertIsNone(features['unknown']['direction'])
        self.assertEqual(features['zero']['score'],0)
        self.assertEqual(features['balanced']['score'],0)

    def test_reordered_indices_map_predictions_to_original_rows(self):
        self.result['sample_index']=[1,0]
        view=normalize_local(self.result,self.context)
        self.assertEqual([s['row_number'] for s in view['samples']],[9,3])
        self.assertEqual(view['samples'][0]['prediction_delta'],-3)

    def test_raw_feature_values_follow_reordered_samples_and_columns(self):
        self.context['feature_values_by_row']={'3':{'a':'3','b':'6'},'9':{'a':'9','b':None}}
        self.result.update(sample_index=[1,0],feature_names=['b','a'])
        view=normalize_local(self.result,self.context)
        self.assertEqual(view['feature_names'],['b','a'])
        self.assertEqual(view['samples'][0]['feature_values'],[None,'9'])
        self.assertEqual(view['samples'][1]['feature_values'],['6','3'])

    def test_partial_with_indices_reports_missing_rows(self):
        for name in ['feature_scores','sign_scores','predictions']:self.result[name]=self.result[name][:1]
        self.result['sample_index']=[1]
        view=normalize_local(self.result,self.context)
        self.assertEqual(view['missing_rows'],[3])
        self.assertEqual(view['explained_count'],1)
        self.assertEqual(view['requested_count'],2)

    def test_partial_without_indices_refuses_to_guess(self):
        self.result['feature_scores']=self.result['feature_scores'][:1]
        with self.assertRaisesRegex(ValueError,'无法确定'):normalize_local(self.result,self.context)

    def test_duplicate_indices_sign_shape_and_nonfinite_predictions_rejected(self):
        for patch in [{'sample_index':[0,0]},{'sample_index':[0,2]},{'sample_index':[True,1]},
                      {'sign_scores':[[1,1]]},{'predictions':[float('nan'),2]},
                      {'feature_names':['a','a']},{'feature_names':['a','unknown']}]:
            with self.subTest(patch=patch),self.assertRaises(ValueError):normalize_local({**self.result,**patch},self.context)

    def test_classification_and_missing_directions(self):
        self.result.update(predictions=['pass','fail'],sign_scores=None)
        self.context['prior_predictions']={'3':'fail','9':'fail'}
        view=normalize_local(self.result,self.context)
        self.assertEqual(view['samples'][0]['directions'],[None,None])
        self.assertNotIn('prediction_delta',view['samples'][0])
        self.assertTrue(all(feature['score'] is None for feature in view['features']))

    def test_partial_direction_matrix_keeps_unknown_mean_unavailable(self):
        self.result['sign_scores']=[[1,None],[-1,1]]
        view=normalize_local(self.result,self.context)
        features={f['name']:f for f in view['features']}
        self.assertAlmostEqual(features['a']['score'],.2)
        self.assertIsNone(features['b']['score'])
        self.assertIsNone(view['samples'][0]['directions'][1])

    def test_csv_exports_every_sample_and_feature(self):
        view={'mode':'local',**self.context,**normalize_local(self.result,self.context)}
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'contribution.csv';export_csv(path,view)
            with path.open(encoding='utf-8-sig') as f:rows=list(csv.DictReader(f))
        self.assertEqual(len(rows),4)
        self.assertEqual([r['sample_row'] for r in rows],['3','3','9','9'])
        self.assertEqual(rows[-1]['score'],'0.6')

if __name__=='__main__':unittest.main()
