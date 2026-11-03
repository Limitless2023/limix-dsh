"""
[INPUT]: CLI HTTP/上传函数、limix_explain_graph 图契约；本地 CSV 或时序预测结果版本、字段字典与原预测文件。
[OUTPUT]: explain 子命令；所有模式保存 JSON/CSV/.view.json，供结果卡和报告复用。
[POS]: 扩展任务编排；与预测状态分离，提交回执支持超时续查。stderr 进度行由 agent 的 pipeline-stage 解析，改格式须同步。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import csv
import hashlib
import json
import math
import tempfile
import time
from pathlib import Path
from limix_explain_batch import select_rows, normalize_local, contribution_rows
from limix_explain_timeseries import normalize_timeseries
from limix_explain_input import prepare_features, stratified_rows, numeric
from limix_explain_graph import graph_fields, graph_input, compare

TERMINAL = {'succeeded', 'degraded_succeeded', 'partially_succeeded', 'failed', 'timeout', 'cancelled'}
SUCCESS = {'succeeded', 'degraded_succeeded', 'partially_succeeded'}


def add_parser(sub, cli):
    p = sub.add_parser('explain', help='局部预测归因或全局关系图；上传→解释→保存 JSON/CSV')
    p.add_argument('--mode', choices=['local', 'directed', 'undirected'], required=True)
    p.add_argument('--data', help='表格待解释 CSV；图模式须含目标列；时序不传')
    p.add_argument('--train', help='局部解释的参考 CSV，含目标列')
    p.add_argument('--target', help='表格目标列；时序沿用原预测目标，不传')
    p.add_argument('--task-type', choices=['regression', 'classification', 'timeseries'], help='local 必填')
    p.add_argument('--result-version-id', help='时序 local 必填：已完成时序预测的结果版本 ID')
    selection = p.add_mutually_exclusive_group()
    selection.add_argument('--row', type=int, help='local 解释输入第几行（1 起，不含表头）；默认第 1 行')
    selection.add_argument('--rows', help='local 批量行号：1-10、1,3,5-8 或 all；与 --row 互斥')
    selection.add_argument('--sample-count', type=int, help='按预测类别确定性抽样；仅分类 local，须 --prediction；不替代显式行号')
    p.add_argument('--sample-seed', type=int, default=42, help='分组抽样随机种子，默认42')
    p.add_argument('--features', help='显式特征，逗号分隔；默认排除目标与已识别标识列，可显式覆盖')
    p.add_argument('--labels', help='可选 JSON：fields 字段中文名映射、target_label、unit')
    p.add_argument('--prediction', help='可选原预测 CSV，用同一行的 pred_label 对比解释时预测')
    p.add_argument('--model', choices=['LIMIX_2M','LIMIX_7M','LIMIX_16M','LIMIX_64M'], help='表格默认 LIMIX_16M；时序沿用原模型，不传')
    p.add_argument('--threshold', type=float, help='directed 边阈值 [0,1]；默认使用服务端标定')
    p.add_argument('--task-id', help='续查已提交的解释任务，绝不重新提交')
    p.add_argument('--timeout', type=int, default=480, help='本地等待秒数；超时保留任务回执')
    p.add_argument('-o', '--output', required=True, help='原始解释 JSON 保存路径；旁边另存 CSV 和回执')
    p.add_argument('--compare-left', help='本地比较：左组成功的 .view.json')
    p.add_argument('--compare-right', help='本地比较：右组成功的 .view.json')
    p.add_argument('--left-label', default='场景 A')
    p.add_argument('--right-label', default='场景 B')
    p.add_argument('--group-description', help='两组分组规则；比较必填')
    p.set_defaults(fn=lambda cfg, args: run(cfg, args, cli))


def read_csv(path):
    with open(path, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames or []
        if not columns or len(columns) != len(set(columns)):
            raise ValueError('CSV 表头为空或重复')
        rows = list(reader)
    if not rows or any(None in r or any(v is None for v in r.values()) for r in rows):
        raise ValueError('CSV 没有数据，或行列数不一致')
    return columns, rows


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def save_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')


def validate(args):
    if args.timeout < 1:
        raise ValueError('--timeout 必须大于 0')
    if args.threshold is not None and (args.mode != 'directed' or not 0 <= args.threshold <= 1):
        raise ValueError('--threshold 仅用于 directed，范围为 [0,1]')
    labels = json.loads(Path(args.labels).read_text(encoding='utf-8-sig')) if args.labels else {}
    if not isinstance(labels, dict) or not isinstance(labels.get('fields', {}), dict):
        raise ValueError('字段字典须为 JSON 对象，fields 为字段名映射')
    if args.task_type == 'timeseries':
        version = getattr(args,'result_version_id',None)
        if args.mode != 'local' or not isinstance(version,str) or not version.strip():
            raise ValueError('时序解释必须使用 --mode local --task-type timeseries --result-version-id 已完成预测版本')
        for key in ['data','train','target','features','row','rows','prediction','model','sample_count']:
            if getattr(args,key,None) is not None:
                raise ValueError(f'时序解释沿用原预测参数，不接受 --{key.replace("_","-")}')
        signature={'mode':'local','task_type':'timeseries','result_version_id':version,
                   'files':{'labels':hashlib.sha256(Path(args.labels).read_bytes()).hexdigest()} if args.labels else {}}
        return [],[],{'task_type':'timeseries','result_version_id':version,'labels':labels.get('fields',{}),
                      'target_label':labels.get('target_label'),'unit':str(labels.get('unit','')),'signature':signature}
    if getattr(args,'result_version_id',None) is not None:
        raise ValueError('--result-version-id 仅用于时序 local 解释')
    if not args.data or not args.target:
        raise ValueError('表格解释必须提供 --data 与 --target')
    columns, rows = read_csv(args.data)
    train_rows = read_csv(args.train)[1] if args.mode == 'local' and args.train else None
    features, excluded = prepare_features(columns, rows, args.target, args.features, train_rows)
    if args.mode == 'local':
        if not args.train or not args.task_type:
            raise ValueError('local 必须提供 --train 与 --task-type')
        train_columns, _ = read_csv(args.train)
        if any(x not in train_columns for x in features + [args.target]):
            raise ValueError('参考数据缺少特征或目标列')
        selected = select_rows(args.row, getattr(args, 'rows', None), len(rows))
        if getattr(args, 'sample_count', None) is not None:
            if args.task_type != 'classification' or not args.prediction:
                raise ValueError('--sample-count 仅用于分类，须提供同一输入的 --prediction')
            if args.row is not None or getattr(args, 'rows', None) is not None: raise ValueError('抽样与显式行号不能同时使用')
            _, sampled_predictions = read_csv(args.prediction)
            if len(sampled_predictions) != len(rows): raise ValueError('原预测与待解释数据行数不一致')
            selected = stratified_rows(sampled_predictions, args.sample_count, getattr(args, 'sample_seed', 42))
        for i,row in enumerate(train_rows or []):
            value = row.get(args.target)
            if value is None or not value.strip() or (args.task_type == 'regression' and not numeric(value)):
                raise ValueError(f'参考数据第 {i+1} 行目标值无效')
    else:
        selected = []
        if getattr(args, 'rows', None) is not None or args.row is not None or getattr(args, 'sample_count', None) is not None:
            raise ValueError('--row/--rows 仅用于 local')
        if args.target not in columns:
            raise ValueError('关系图输入必须包含目标列')
        for i, row in enumerate(rows):
            for name in features + [args.target]:
                try:
                    if not math.isfinite(float(row[name])): raise ValueError()
                except (ValueError, TypeError):
                    raise ValueError(f'第 {i+1} 行的 {name} 不是完整有限数值；请先修复数据') from None
    label_map = {k: str(v) for k,v in labels.get('fields', {}).items() if k in features + [args.target]}
    prior = {}
    if args.prediction:
        if args.mode != 'local': raise ValueError('--prediction 仅用于 local')
        _, predictions = read_csv(args.prediction)
        if len(predictions) != len(rows): raise ValueError('原预测与待解释数据行数不一致')
        # 有原特征时逐行核对，拒绝把不同文件的同一行号误绑定。
        for source, predicted in zip(rows, predictions):
            for name in excluded:
                if name in predicted and source[name] != predicted[name]:
                    raise ValueError('原预测文件的样本 ID 与输入顺序不一致')
            for name in features:
                if name in predicted and source[name] != predicted[name]:
                    try:
                        if not math.isclose(float(source[name]), float(predicted[name]), rel_tol=1e-5, abs_tol=1e-7): raise ValueError()
                    except (ValueError, TypeError): raise ValueError('原预测文件的特征与输入不一致') from None
        for n in selected:
            value = predictions[n-1]['pred_label']
            if args.task_type == 'regression':
                value = float(value)
                if not math.isfinite(value): raise ValueError('原预测不是有限数值')
            prior[str(n)] = value
    signature = {'mode':args.mode,'target':args.target,'features':features,'rows':selected,
        'task_type':args.task_type,'model':args.model or 'LIMIX_16M','threshold':args.threshold,
        'files':{key:hashlib.sha256(Path(value).read_bytes()).hexdigest() for key in ['data','train','prediction','labels'] if (value:=getattr(args,key,None))}}
    return rows, features, {'target': args.target, 'target_label': str(labels.get('target_label', args.target)),
        'unit': str(labels.get('unit', '')), 'labels': label_map, 'row_numbers': selected,
        'row_number': selected[0] if len(selected)==1 else None, 'feature_names':features,
        'excluded_identifiers': excluded, 'sample_ids': {str(n): {c: rows[n-1][c] for c in excluded} for n in selected},
        'selection_method': 'predicted_class_stratified' if getattr(args, 'sample_count', None) else ('all' if len(selected)==len(rows) else 'explicit_rows'),
        'selection_seed': getattr(args, 'sample_seed', 42) if getattr(args, 'sample_count', None) else None,
        'prior_predictions': prior, 'input_rows': len(rows),'signature':signature,'task_type':args.task_type if args.mode=='local' else None,
        'feature_values_by_row':{str(n):{name:rows[n-1][name] if rows[n-1][name] != '' else None for name in features} for n in selected}}


def normalize(data, context):
    result = data.get('result') or {}
    mode = result.get('explanation_mode')
    view = {'mode': mode, **context, 'risks': result.get('risks') or []}
    view.pop('signature',None)
    view.pop('feature_values_by_row',None)
    if context.get('signature',{}).get('mode',mode) != mode:
        raise ValueError('解释模式与请求不一致')
    if context.get('target') and result.get('target_column') and context['target'] != result['target_column']:
        raise ValueError('解释结果的目标列与请求不一致')
    if mode == 'local':
        task_type=context.get('task_type')
        if task_type and result.get('local_task_type') and task_type != result['local_task_type']:
            raise ValueError('局部解释任务类型与请求不一致')
        if task_type == 'timeseries':
            view.update(normalize_timeseries(result,context))
        else:
            if result.get('local_task_type') == 'timeseries':raise ValueError('时序解释缺少原预测版本上下文')
            view.update(normalize_local(result,context))
    elif mode in ('directed', 'undirected'):
        names = result.get('variable_names'); edges = result.get('edges')
        if not isinstance(names, list) or not names or not all(isinstance(x,str) for x in names) or len(names)!=len(set(names)) or not isinstance(edges, list):
            raise ValueError('关系图缺少变量或边列表')
        if any(not isinstance(e, dict) or e.get('source') not in names or e.get('target') not in names or not finite(e.get('weight')) for e in edges):
            raise ValueError('关系图边与变量集合不一致')
        if context.get('feature_names') and set(names) != set(context['feature_names']+[context['target']]):
            raise ValueError('关系图变量与请求不一致')
        view.update({'nodes': names, 'edges': edges, **graph_fields(result,names)})
    else:raise ValueError('未识别的解释模式')
    return view


def export_csv(path, view):
    if view['mode'] == 'local':
        rows = contribution_rows(view)
        fields = ['sample_row','feature','label','score','direction','explanation_prediction','signed_score','feature_value']
        if view.get('task_type') == 'timeseries':fields += ['forecast_step','timestamp']
    else:
        fields = ['source','target','weight']
        rows = [{k:e[k] for k in fields} for e in view['edges']]
    with path.open('w', encoding='utf-8-sig', newline='') as f:
        writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(rows)


def verify_recovered_task(data, request, task_id):
    """提交响应丢失时，只有结果来源与原请求逐项吻合才能绑定任务。"""
    if data.get('task_id') != task_id or data.get('task_type') != 'explanation':
        raise ValueError('续查任务身份不匹配；保留原回执，不能改用新文件重提')
    result = data.get('result') or {}
    for key in ['explanation_mode','local_task_type','train_data_version_id',
                'explain_data_version_id','target_column','feature_columns','model_type','result_version_id']:
        if key in request and result.get(key) != request[key]:
            raise ValueError(f'续查结果的 {key} 与原请求不一致或未返回，无法核验任务归属')
    source = request.get('source_ref')
    if source and (data.get('source_type') != source['source_type'] or data.get('source_id') != source['source_id']):
        raise ValueError('续查结果的数据来源与原请求不一致')
    if 'threshold' in request and result.get('metadata',{}).get('threshold') != request['threshold']:
        raise ValueError('续查结果的阈值与原请求不一致')


def run(cfg, args, cli):
    if getattr(args,'compare_left',None) or getattr(args,'compare_right',None):
        return compare(args,cli)
    output = Path(args.output).resolve()
    if output.suffix.lower() != '.json' or not output.parent.is_dir():
        cli.die('输出须为已有目录中的 .json 文件', exit_code=2)
    receipt = output.with_suffix('.receipt.json')
    try:
        rows, features, context = validate(args)
        recovering = None
        if receipt.exists():
            prior = json.loads(receipt.read_text())
            if not args.task_id or (prior.get('task_id') and args.task_id != prior['task_id']):
                cli.die('输出已有任务回执；请带原 --task-id 续查。提交响应未知时先查找并核对原任务，不要重提', payload={'task_id':prior.get('task_id')})
            if not prior.get('task_id'):
                if not prior.get('request'):
                    raise ValueError('原回执缺少请求信息，不能核验恢复任务')
                recovering = prior
            if prior['context'].get('signature') and prior['context']['signature'] != context['signature']:
                raise ValueError('续查输入文件或参数已变化；请恢复原输入，防止样本错配')
            context = prior['context']
        elif any(path.exists() for path in [output,output.with_suffix('.csv'),output.with_suffix('.view.json')]):
            cli.die('输出文件已存在，请使用新文件名', exit_code=2)
        if args.task_id:
            task_id = args.task_id
            if not receipt.exists():
                if not (args.mode == 'local' and args.task_type == 'timeseries'):
                    raise ValueError('表格或关系解释续查需要原输出旁的 .receipt.json，不能把历史任务绑定到未核验的本地数据')
                save_json(receipt, {'task_id':task_id,'context':context,'resumed':True})
        else:
            if args.mode == 'local' and args.task_type == 'timeseries':
                body={'explanation_mode':'local','local_task_type':'timeseries','result_version_id':args.result_version_id}
            elif args.mode == 'local':
                train = cli.upload_file(cfg,args.train)['data_version_id']
                with tempfile.TemporaryDirectory() as temp:
                    selected=Path(temp)/'explain-row.csv'
                    with selected.open('w', encoding='utf-8-sig', newline='') as f:
                        writer=csv.DictWriter(f,fieldnames=features);writer.writeheader()
                        writer.writerows({k:rows[n-1][k] for k in features} for n in context['row_numbers'])
                    source=cli.upload_file(cfg,str(selected))['data_version_id']
                body={'explanation_mode':'local','local_task_type':args.task_type,'train_data_version_id':train,
                    'explain_data_version_id':source,'target_column':args.target,'feature_columns':features,'model_type':args.model or 'LIMIX_16M'}
            else:
                source=cli.upload_file(cfg,args.data)['data_version_id']
                body={'explanation_mode':args.mode,'source_ref':{'source_type':'data_version','source_id':source},
                    'target_column':args.target,'feature_columns':features}
                if args.mode=='undirected':body['model_type']=args.model or 'LIMIX_16M'
                if args.threshold is not None:body['threshold']=args.threshold
            # 在 POST 前落盘，未知响应时已有请求证据，禁止重复提交。
            record={'request':body,'context':context,'task_id':None};save_json(receipt,record)
            submitted=cli.api_call(cfg,'POST','/v1/extensions/explanations/tasks',body=body,timeout=120)
            task_id=submitted['task_id'];record.update({'task_id':task_id,'submission':submitted});save_json(receipt,record)
        cli.log(f'续查解释任务 {task_id}' if args.task_id else f'解释任务 {task_id}；回执 {receipt}')
        deadline=time.monotonic()+args.timeout
        reported=None
        while True:
            data=cli.api_call(cfg,'GET',f'/v1/extensions/tasks/{task_id}',retries=2)
            status=data.get('task_status')
            # 只记状态变化：stderr 会进入模型上下文，不能每次轮询都写一行。
            if status!=reported:
                cli.log(f'任务 {task_id}: {status}');reported=status
            if status in TERMINAL:break
            if time.monotonic() >= deadline:
                cli.die('解释仍在运行，保留回执，可用 --task-id 续查',exit_code=3,payload={'task_id':task_id,'task_status':status,'receipt':str(receipt)})
            time.sleep(min(5,max(0,deadline-time.monotonic())))
        if recovering:
            verify_recovered_task(data,recovering['request'],task_id)
            recovering['task_id']=task_id
            recovering['recovered']=True
            save_json(receipt,recovering)
        save_json(output,data)
        if status not in SUCCESS:
            cli.die(data.get('error_message') or f'解释未完成：{status}',exit_code=3,payload={'task_id':task_id,'task_status':status,'saved_to':str(output)})
        view=normalize(data,context)
        view['task_status']=status
        view['source_task_id']=task_id
        if view['mode']!='local':
            view.update(graph_input(rows,view['nodes']))
            view['source_sha256']=context['signature']['files']['data']
        csv_path=output.with_suffix('.csv');export_csv(csv_path,view)
        cli.log(f'已保存解释 → {output}')
        detail_path=output.with_suffix('.view.json');save_json(detail_path,view)
        if view['mode']!='local':
            view={k:v for k,v in view.items() if k not in ['graph_samples']}
        if view.get('requested_count',1)>1:
            view={k:v for k,v in view.items() if k not in ['samples','prior_predictions','row_numbers']}
        view['detail_path']=str(detail_path)
        cli.emit({'task_id':task_id,'task_status':status,'result_id':data.get('result_id'),'model_type':(data.get('result') or {}).get('model_type'),
            'saved_to':str(output),'csv_path':str(csv_path),'explanation':view})
    except (ValueError, OSError, KeyError, TypeError) as e:
        cli.die(str(e),exit_code=2,payload={'saved_to':str(output) if output.exists() else None})
