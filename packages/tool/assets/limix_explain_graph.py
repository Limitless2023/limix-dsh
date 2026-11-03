"""[INPUT]: 成功关系结果、数值输入与两份已保存视图。
[OUTPUT]: 完整关系矩阵、抽样原值与共同阈值比较；比较回执仅含文件路径与 SHA256，矩阵与原值落本地详情。
[POS]: explain 的图数据契约；比较核对服务返回的模型与处理口径，并保护已有输出。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import csv
import hashlib
import json
import math
from pathlib import Path

def finite(v):
    return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)

def graph_fields(result, names):
    weights=result.get('edge_weights')
    if weights is None:return {}
    if not isinstance(weights,list) or len(weights)!=len(names) or any(not isinstance(r,list) or len(r)!=len(names) or not all(finite(v) for v in r) for r in weights):
        raise ValueError('关系分数矩阵与变量数量不一致')
    threshold=(result.get('metadata') or {}).get('threshold')
    metadata=result.get('metadata') or {}
    return {'graph_weights':weights,'graph_threshold':threshold if finite(threshold) else None,
            **{k:v for k,v in {'model_type':result.get('model_type'),
               'graph_backend':metadata.get('backend'),'graph_standardize':metadata.get('standardize')}.items() if v is not None}}

def graph_input(rows, names):
    # 原值仅用于本地可视化，超过2000行时等距抽样并明确标记数量。
    indices=list(range(len(rows))) if len(rows)<=2000 else [i*(len(rows)-1)//1999 for i in range(2000)]
    return {'graph_sample_names':names,'graph_samples':[[float(rows[i][n]) for n in names] for i in indices],
            'graph_sample_count':len(indices),'input_rows':len(rows)}

def read_view(path):
    value=json.loads(Path(path).read_text(encoding='utf-8-sig'))
    if value.get('task_status')!='succeeded' or value.get('mode')!='directed' or value.get('comparison'):
        raise ValueError('场景比较只接受成功的有向解释 .view.json；失败、降级或嵌套比较不可使用')
    names=value.get('nodes')
    if not isinstance(names,list) or not names or not all(isinstance(n,str) for n in names) or len(set(names))!=len(names):raise ValueError('变量名称无效')
    graph_fields({'edge_weights':value.get('graph_weights')},names)
    if not value.get('graph_weights'):raise ValueError('旧结果未保存完整矩阵；请用原回执续查生成视图，不要重提任务')
    return value

def compare(args, cli):
    created=[]
    try:
        if not args.compare_left or not args.compare_right or args.mode!='directed':raise ValueError('须提供 --mode directed、--compare-left 与 --compare-right')
        if args.threshold is None or not finite(args.threshold) or not 0<=args.threshold<=1:raise ValueError('比较须显式指定共同 --threshold [0,1]')
        left=read_view(args.compare_left);right=read_view(args.compare_right)
        if left['target']!=right['target'] or set(left['nodes'])!=set(right['nodes']):raise ValueError('两组目标与变量集合必须一致')
        if not left.get('model_type') or not right.get('model_type'):raise ValueError('结果缺少服务返回的模型标识；请用原回执续查生成视图，不要重提任务')
        for key in ['model_type','graph_backend','graph_standardize']:
            if left.get(key)!=right.get(key):raise ValueError(f'两组模型与处理口径必须一致：{key}')
        if not args.group_description:raise ValueError('请用 --group-description 说明分组规则')
        output=Path(args.output).resolve();paths=[output,output.with_suffix('.view.json'),output.with_suffix('.csv')]
        if output.suffix.lower()!='.json' or not output.parent.is_dir() or len(set(paths))!=3:raise ValueError('输出须为已有目录中的独立 .json 路径')
        if any(p.exists() for p in paths):raise ValueError('输出已存在；请换新路径，禁止覆盖输入或历史结果')
        names=left['nodes'];records=[]
        for i,a in enumerate(names):
            for j,b in enumerate(names):
                if i==j:continue
                x=left['graph_weights'][i][j];y=right['graph_weights'][right['nodes'].index(a)][right['nodes'].index(b)]
                la=x>0 and x>=args.threshold;rb=y>0 and y>=args.threshold
                if la or rb:records.append({'source':a,'target':b,'left_weight':x,'right_weight':y,'left_present':la,'right_present':rb})
        def brief(v,label):return {k:v[k] for k in ['mode','target','model_type','graph_backend','graph_standardize','nodes','graph_weights','edges','labels','input_rows','source_task_id','source_sha256','graph_sample_names','graph_samples','graph_sample_count'] if k in v}|{'label':label}
        view={'mode':'directed','target':left['target'],'target_label':'场景关系对比','labels':left.get('labels',{}),'nodes':names,'edges':[],
              'task_status':'succeeded','comparison':{'left':brief(left,args.left_label),'right':brief(right,args.right_label),'threshold':args.threshold,'description':args.group_description,'records':records}}
        for p in paths[:2]:
            with p.open('x',encoding='utf-8') as f:
                created.append(p)
                f.write(json.dumps(view,ensure_ascii=False,allow_nan=False,indent=2))
        with paths[2].open('x',encoding='utf-8-sig',newline='') as f:
            created.append(paths[2])
            w=csv.DictWriter(f,fieldnames=['source','target','left_weight','right_weight','left_present','right_present']);w.writeheader();w.writerows(records)
        # 回执仅传文件身份，避免矩阵随变量数增长而被宿主截断。
        descriptor={k:view[k] for k in ['mode','target','target_label','task_status']}
        descriptor.update(detail_path=str(paths[1]),detail_sha256=hashlib.sha256(paths[1].read_bytes()).hexdigest())
        cli.emit({'operation':'local_relationship_comparison','task_status':'succeeded','saved_to':str(output),'csv_path':str(paths[2]),'explanation':descriptor})
    except (OSError,ValueError,KeyError,TypeError) as e:
        for path in created:path.unlink(missing_ok=True)
        cli.die(str(e),exit_code=2)
