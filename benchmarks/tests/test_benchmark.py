"""固定评估与续跑的边界测试。

[INPUT]: benchmark 编排层、离线报告层和纯本地假 HTTP 服务。
[OUTPUT]: 防泄漏、完整指标、未知提交不重复和安全离线报告断言。
[POS]: benchmarks 回归测试；不使用真实 API 或凭据。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import argparse
import importlib.util
import json
import os
import sys
import tempfile
import types
import unittest
from unittest import mock
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'packages/tool/assets'))
import limix_benchmark as bench
import limix_benchmark_report as report

spec = importlib.util.spec_from_file_location('prepare',ROOT/'benchmarks/prepare.py')
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class FakeCLI:
    def __init__(self,unknown=False):
        self.posts = 0
        self.unknown = unknown

    def api_call(self,cfg,method,path,**kwargs):
        if method == 'POST':
            self.posts += 1
            if self.unknown:
                raise TimeoutError('connection lost after submit')
            return {'task_id':'verified-task'}
        return {'status':'finished','is_ready':True,'result_version_id':'result'}

    def download_result(self,cfg,id,path):
        Path(path).write_text('pred_label\n4\n5\n')


class BenchmarkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.deps = bench.dependencies(['BASELINE'])

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root/'train.csv').write_text('x,y\n1,2\n2,3\n3,4\n')
        (self.root/'predict.csv').write_text('x\n4\n5\n')
        (self.root/'truth.csv').write_text('y\n4\n6\n')
        self.entry = {'id':'test','name':'测试','task_type':'regression','target':'y',
                      'train':'train.csv','predict':'predict.csv','truth':'truth.csv','split':'fixed'}
        self.manifest = self.root/'manifest.json'
        bench.save_json(self.manifest,{'datasets':[self.entry]})

    def tearDown(self):
        self.tmp.cleanup()

    def case(self):
        return bench.load_cases(self.manifest,None,self.deps)[0]

    def test_target_and_overlap_are_rejected_before_upload(self):
        (self.root/'predict.csv').write_text('x,y\n4,4\n5,6\n')
        with self.assertRaisesRegex(ValueError,'移除目标'):
            self.case()
        (self.root/'predict.csv').write_text('x\n1\n5\n')
        with self.assertRaisesRegex(ValueError,'相同输入特征'):
            self.case()

    def test_mismatched_truth_is_rejected(self):
        (self.root/'truth.csv').write_text('y\n4\n')
        with self.assertRaisesRegex(ValueError,'行数不符'):
            self.case()

    def test_duplicate_csv_headers_are_rejected(self):
        (self.root/'train.csv').write_text('x,x,y\n1,1,2\n2,2,3\n3,3,4\n')
        with self.assertRaisesRegex(ValueError,'表头为空或重复'):
            self.case()

    def test_equivalent_numeric_rows_cannot_bypass_overlap_check(self):
        (self.root/'predict.csv').write_text('x\n1.0\n5.25\n')
        with self.assertRaisesRegex(ValueError,'相同输入特征'):
            self.case()

    def test_metrics_known_values_and_no_partial_credit(self):
        result = bench.score('regression',[4,6],[4,5],self.deps)
        self.assertEqual(result['mae'],0.5)
        self.assertAlmostEqual(result['rmse'],2**-0.5)
        self.assertEqual(result['r2'],0.5)
        with self.assertRaises(ValueError):
            bench.score('regression',[4,6],[4],self.deps)
        with self.assertRaises(ValueError):
            bench.score('regression',[4,6],[4,float('nan')],self.deps)

    def test_class_labels_compare_numeric_csv_forms(self):
        result = bench.score('classification',['0','1','1'],[0.0,1.0,0.0],self.deps)
        self.assertAlmostEqual(result['accuracy'],2/3)
        with self.assertRaises(ValueError):
            bench.score('classification',[0,1],[0,None],self.deps)

    def test_nonfinite_or_unknown_class_predictions_are_rejected(self):
        for value in (float('inf'),float('-inf'),'Infinity','-inf','nan'):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError,'非有限'):
                bench.score('classification',[0,1],[0,value],self.deps)
        with self.assertRaisesRegex(ValueError,'训练集没有'):
            bench.score('classification',[0,1],[0,2],self.deps,allowed_classes=[0,1])

    def args(self,output='results.json',models='BASELINE,LIMIX_7M'):
        return argparse.Namespace(manifest=str(self.manifest),datasets=None,models=models,
                                  seed=42,timeout=1,python=None,output=str(self.root/output))

    def test_ambiguous_output_is_rejected_before_dependencies(self):
        for name in ('results.csv','results.html','results.JSON','bare'):
            with self.subTest(name=name), mock.patch.object(bench,'dependencies',side_effect=AssertionError('too late')):
                with self.assertRaisesRegex(ValueError,'.json'):
                    bench.execute({},self.args(output=name),None)
                self.assertFalse((self.root/name).exists())

    def assert_path_conflict_without_side_effects(self,output,extra=()):
        protected=[self.manifest,self.root/'train.csv',self.root/'predict.csv',self.root/'truth.csv',*extra]
        before={str(path):bench.file_hash(path) for path in protected if path.is_file()}
        cli=mock.Mock()
        with mock.patch.object(bench,'dependencies',side_effect=AssertionError('冲突必须在计算前发现')):
            with self.assertRaisesRegex(ValueError,'冲突'):
                bench.execute({},self.args(output=output),cli)
        self.assertEqual(before,{path:bench.file_hash(path) for path in before})
        cli.upload_file.assert_not_called()
        cli.api_call.assert_not_called()

    def test_output_sidecars_cannot_overwrite_any_input(self):
        for filename in ('train.json','predict.json','truth.json','manifest.json'):
            with self.subTest(filename=filename):
                self.assert_path_conflict_without_side_effects(filename)
                self.assertFalse((self.root/(filename+'.lock')).exists())

    def test_html_temp_lock_and_optional_input_conflicts(self):
        for filename in ('result.html','result.json.tmp','result.json.lock'):
            source=self.root/filename
            source.write_text('x,y\n1,2\n2,3\n')
            bench.save_json(self.manifest,{'datasets':[{**self.entry,'train':filename}]})
            with self.subTest(filename=filename):
                self.assert_path_conflict_without_side_effects('result.json',extra=[source])
            source.unlink()
        split=self.root/'result.csv'
        split.write_text('original split indexes\n1,2,3')
        bench.save_json(self.manifest,{'datasets':[{**self.entry,'split':'result.csv'}]})
        self.assert_path_conflict_without_side_effects('result.json',extra=[split])
        bench.save_json(self.manifest,{'split_path':'result.csv','datasets':[self.entry]})
        self.assert_path_conflict_without_side_effects('result.json',extra=[split])

    def test_input_inside_receipt_directory_is_protected(self):
        folder=self.root/'results/test/BASELINE'
        folder.mkdir(parents=True)
        source=folder/'predictions.csv'
        source.write_text((self.root/'train.csv').read_text())
        bench.save_json(self.manifest,{'datasets':[{**self.entry,'train':str(source.relative_to(self.root))}]})
        self.assert_path_conflict_without_side_effects('results.json',extra=[source])

    def test_output_cannot_descend_through_input_file(self):
        self.assert_path_conflict_without_side_effects('train.csv/results.json')

    def test_symlinks_cannot_hide_file_or_directory_conflicts(self):
        if sys.platform=='win32':self.skipTest('软链接实测依赖本机权限')
        sidecar=self.root/'results.csv'
        sidecar.symlink_to(self.root/'train.csv')
        self.assert_path_conflict_without_side_effects('results.json')
        sidecar.unlink()
        root_alias=self.root/'results'
        root_alias.symlink_to(self.root,target_is_directory=True)
        self.assert_path_conflict_without_side_effects('results.json')
        root_alias.unlink()
        folder=self.root/'results/test'
        folder.mkdir(parents=True)
        (folder/'BASELINE').symlink_to(self.root,target_is_directory=True)
        self.assert_path_conflict_without_side_effects('results.json')
        (folder/'BASELINE').unlink()
        (self.root/'alias').symlink_to(self.root,target_is_directory=True)
        self.assert_path_conflict_without_side_effects('alias/train.json')

    def test_hardlink_sidecar_cannot_overwrite_input(self):
        sidecar=self.root/'results.csv'
        os.link(self.root/'train.csv',sidecar)
        self.assert_path_conflict_without_side_effects('results.json')

    def test_case_insensitive_receipt_ancestor_is_protected(self):
        folder=self.root/'RESULTS/test'
        folder.mkdir(parents=True)
        if not (self.root/'results').exists():
            self.skipTest('当前文件系统区分大小写')
        source=folder/'train.csv'
        source.write_text((self.root/'train.csv').read_text())
        bench.save_json(self.manifest,{'datasets':[{**self.entry,'train':'RESULTS/test/train.csv'}]})
        self.assert_path_conflict_without_side_effects('results.json',extra=[source])

    def test_independent_output_preserves_input_hashes(self):
        protected=[self.manifest,self.root/'train.csv',self.root/'predict.csv',self.root/'truth.csv']
        before={str(path):bench.file_hash(path) for path in protected}
        result=bench.execute({},self.args(output='out/results.json',models='BASELINE'),None)
        self.assertEqual(result['status'],'succeeded')
        self.assertEqual(before,{path:bench.file_hash(path) for path in before})

    def test_upload_failure_preserves_summary_and_other_cases(self):
        second={**self.entry,'id':'second','train':'second_train.csv',
                'predict':'second_predict.csv','truth':'second_truth.csv'}
        for kind in ('train','predict','truth'):
            (self.root/f'second_{kind}.csv').write_text((self.root/f'{kind}.csv').read_text())
        bench.save_json(self.manifest,{'datasets':[self.entry,second]})
        class UploadCLI(FakeCLI):
            emitted=None
            def upload_file(self,cfg,path):
                if not Path(path).name.startswith('second_'):
                    raise SystemExit(4)
                return {'data_version_id':Path(path).stem}
            def log(self,*a):pass
            def emit(self,value):self.emitted=value
            def die(self,*a,**k):raise AssertionError('业务失败不应丢弃合法汇总')
        cli=UploadCLI()
        bench.run({},self.args(),cli)
        result=cli.emitted
        self.assertEqual(result['status'],'partial')
        self.assertEqual(len(result['runs']),4)
        self.assertEqual([r['status'] for r in result['runs'] if r['model']=='BASELINE'],['succeeded','succeeded'])
        failed=next(r for r in result['runs'] if r['dataset_id']=='test' and r['model']=='LIMIX_7M')
        self.assertEqual((failed['status'],failed['stage']),('failed','upload'))
        saved=json.loads(Path(result['saved_to']).read_text())
        saved_failed=next(r for r in saved['runs'] if r['dataset_id']=='test' and r['model']=='LIMIX_7M')
        self.assertTrue(Path(saved_failed['receipt_path']).exists())
        self.assertEqual(cli.posts,1)
        for path in result['artifacts'].values():self.assertTrue(Path(path).exists())
        # 未知上传续跑不调用第一次失败的上传器；完成的第二例也直接复用。
        with mock.patch.object(cli,'upload_file',side_effect=AssertionError('不得重复上传')):
            bench.run({},self.args(),cli)
        self.assertEqual(cli.posts,1)

    def test_windows_lock_uses_single_byte_and_releases(self):
        calls=[]
        stub=types.SimpleNamespace(LK_NBLCK=1,LK_UNLCK=2,locking=lambda fd,op,n:calls.append((op,n)))
        with (self.root/'win.lock').open('a+b') as handle, mock.patch.dict(sys.modules,{'msvcrt':stub}):
            release=bench.acquire_file_lock(handle,windows=True)
            self.assertEqual((self.root/'win.lock').read_bytes(),b'\0')
            release()
        self.assertEqual(calls,[(1,1),(2,1)])

    def test_posix_lock_excludes_concurrent_writer(self):
        if sys.platform=='win32':self.skipTest('POSIX 实测')
        with bench.output_lock(self.root/'locked.json'):
            with self.assertRaisesRegex(ValueError,'锁'):
                with bench.output_lock(self.root/'locked.json'):pass

    def test_successful_remote_resume_does_not_resubmit(self):
        cli = FakeCLI()
        folder = self.root/'run'
        uploads = {'train':{'data_version_id':'t'},'predict':{'data_version_id':'p'}}
        first = bench.remote_run(self.case(),'LIMIX_7M',folder,42,self.deps,{},cli,uploads,10)
        second = bench.remote_run(self.case(),'LIMIX_7M',folder,42,self.deps,{},cli,uploads,10)
        self.assertEqual(first['status'],'succeeded')
        self.assertEqual(second['metrics'],first['metrics'])
        self.assertEqual(cli.posts,1)

    def test_unknown_submit_is_preserved_without_duplicate(self):
        cli = FakeCLI(unknown=True)
        folder = self.root/'run'
        uploads = {'train':{'data_version_id':'t'},'predict':{'data_version_id':'p'}}
        first = bench.remote_run(self.case(),'LIMIX_16M',folder,42,self.deps,{},cli,uploads,10)
        second = bench.remote_run(self.case(),'LIMIX_16M',folder,42,self.deps,{},cli,uploads,10)
        self.assertEqual(first['status'],'pending')
        self.assertIn('未自动重提',second['error'])
        self.assertEqual(cli.posts,1)

    def test_changed_input_cannot_reuse_receipt(self):
        folder = self.root/'run'
        bench.local_run(self.case(),'BASELINE',folder,42,self.deps)
        (self.root/'truth.csv').write_text('y\n4\n7\n')
        with self.assertRaisesRegex(ValueError,'输入或配置变化'):
            bench.local_run(self.case(),'BASELINE',folder,42,self.deps)

    def test_group_split_keeps_duplicates_together(self):
        pd = self.deps['pd']
        frame = pd.DataFrame({'x':[1,1,2,3,4,5,6,7,8,9],'y':range(10)})
        case = {'task_type':'regression','target':'y'}
        a,b,_ = prepare.fixed_split(frame,case,42)
        self.assertFalse(set(frame.iloc[a].x) & set(frame.iloc[b].x))
        self.assertEqual((a,b),prepare.fixed_split(frame,case,42)[:2])

    def test_report_drops_paths_and_escapes_script(self):
        summary = {'created_at':'now','status':'succeeded','seed':42,'methodology':{},'versions':{},
                   'datasets':[{'id':'x','name':'</script><script>alert(1)</script>','source_url':'https://example.org'}],
                   'runs':[{'dataset_id':'x','model':'BASELINE','status':'succeeded',
                            'receipt_path':'/Users/private/key','request':{'api_key':'secret'},'metrics':{'mae':1}}]}
        path = self.root/'report.html'
        report.write_report(summary,path)
        html = path.read_text()
        self.assertNotIn('/Users/private',html)
        self.assertNotIn('secret',html)
        self.assertNotIn('</script><script>alert(1)',html)
        self.assertIn('\\u003c/script',html)

    def test_source_protocol_and_license_are_not_invented(self):
        for url in ('javascript:alert(1)','data:text/html,test','file:///tmp/a','//example.org','https://user:pass@example.org'):
            self.assertIsNone(report.safe_source_url(url))
        self.assertEqual(report.safe_source_url('https://example.org/data'),'https://example.org/data')
        d=report.public_dataset({'id':'internal','source_name':'内部实验','source_url':'javascript:alert(1)'})
        self.assertIsNone(d['source_url'])
        self.assertIsNone(d['license'])
        self.assertNotIn('UCI 数据来源',report.HTML)
        self.assertNotIn('CC BY 4.0',report.HTML)

    def test_optional_dependencies_load_after_parser(self):
        parser = argparse.ArgumentParser()
        bench.add_parser(parser.add_subparsers(),None)
        parsed = parser.parse_args(['benchmark','--manifest','m.json','-o','r.json'])
        self.assertEqual(parsed.seed,42)


if __name__ == '__main__':
    unittest.main()
