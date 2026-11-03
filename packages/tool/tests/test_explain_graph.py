"""[INPUT]: 图矩阵、比较参数与临时文件。
[OUTPUT]: 错位、失败输入、覆盖保护和不同变量顺序的比较验证。
[POS]: 关系比较契约测试。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import hashlib,json,sys,tempfile,unittest
from unittest.mock import patch
from pathlib import Path
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'assets'))
from limix_explain_graph import compare,graph_fields,graph_input
class CLI:
 def emit(self,v):self.result=v
 def die(self,m,**kw):raise ValueError(m)
class GraphTests(unittest.TestCase):
 def test_matrix_shape_and_sample_cap(self):
  with self.assertRaises(ValueError):graph_fields({'edge_weights':[[1]]},['a','b'])
  self.assertEqual(len(graph_input([{'a':i} for i in range(3000)],['a'])['graph_samples']),2000)
 def test_comparison_order_and_protection(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp);l={'mode':'directed','model_type':'LIMIX_16M','task_status':'succeeded','target':'b','nodes':['a','b'],'graph_weights':[[0,.9],[.1,0]],'edges':[],'input_rows':10,'graph_sample_names':['a','b'],'graph_samples':[[1,2]],'graph_sample_count':1}
   r={**l,'nodes':['b','a'],'graph_weights':[[0,.2],[.7,0]]}
   for name,v in [('l',l),('r',r)]: (p/f'{name}.json').write_text(json.dumps(v))
   args=SimpleNamespace(compare_left=str(p/'l.json'),compare_right=str(p/'r.json'),mode='directed',threshold=.8,group_description='条件 A/B',left_label='A',right_label='B',output=str(p/'out.json'))
   cli=CLI();compare(args,cli);record=json.loads((p/'out.view.json').read_text())['comparison']['records'][0]
   self.assertEqual((record['source'],record['target'],record['left_weight'],record['right_weight']),('a','b',.9,.7));self.assertFalse(record['right_present'])
   self.assertNotIn('comparison',cli.result['explanation']);self.assertLess(len(json.dumps(cli.result)),1500)
   self.assertEqual(cli.result['explanation']['detail_sha256'],hashlib.sha256((p/'out.view.json').read_bytes()).hexdigest())
   self.assertEqual(json.loads((p/'out.view.json').read_text())['comparison']['left']['graph_samples'],[[1,2]])
   with self.assertRaises(ValueError):compare(args,cli)
   args.output=str(p/'l.json')
   with self.assertRaises(ValueError):compare(args,cli)
   self.assertEqual(json.loads((p/'l.json').read_text()),l)
   r['task_status']='failed';(p/'r.json').write_text(json.dumps(r));args.output=str(p/'other.json')
   with self.assertRaises(ValueError):compare(args,cli)
 def test_model_identity_and_partial_write_cleanup(self):
  fields=graph_fields({'edge_weights':[[0,.9],[0,0]],'model_type':'LIMIX_16M','metadata':{'backend':'cdfm','standardize':True,'checkpoint':'private'}},['a','b'])
  self.assertEqual(fields['model_type'],'LIMIX_16M');self.assertNotIn('checkpoint',fields)
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp);v={'mode':'directed','task_status':'succeeded','target':'b','nodes':['a','b'],**fields}
   (p/'l.json').write_text(json.dumps(v))
   args=SimpleNamespace(compare_left=str(p/'l.json'),compare_right=str(p/'r.json'),mode='directed',threshold=.8,group_description='A/B',left_label='A',right_label='B',output=str(p/'out.json'))
   for changes in [{'model_type':None},{'model_type':'LIMIX_7M'},{'graph_standardize':False}]:
    (p/'r.json').write_text(json.dumps(v|changes))
    with self.assertRaises(ValueError):compare(args,CLI())
    self.assertFalse((p/'out.json').exists())
   (p/'r.json').write_text(json.dumps(v))
   original=Path.open
   def fail_csv(path,*a,**kw):
    if path.name=='out.csv':raise OSError('disk write failure')
    return original(path,*a,**kw)
   with patch.object(Path,'open',fail_csv):
    with self.assertRaises(ValueError):compare(args,CLI())
   self.assertFalse((p/'out.json').exists());self.assertFalse((p/'out.view.json').exists())
   self.assertEqual(json.loads((p/'l.json').read_text()),v)
if __name__=='__main__':unittest.main()
