"""固定拆分的多模型实测。

[INPUT]: 训练/预测/独立真值 manifest；cli 的 HTTP 层；可取消的独立计算环境。
[OUTPUT]: add_parser；stdout 紧凑摘要、完整 JSON/CSV/HTML、输入保护与可恢复回执。
[POS]: tool assets 的可选 benchmark 编排层；重依赖仅在调用时加载。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import argparse
import csv
import hashlib
import json
import os
import platform
import re
import signal
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

MODELS = ('LIMIX_7M', 'LIMIX_16M', 'XGBoost', 'BASELINE')
XGB_PARAMS = dict(n_estimators=200, max_depth=4, learning_rate=0.05,
                  subsample=1.0, colsample_bytree=1.0, n_jobs=2, tree_method='hist')
SCHEMA_VERSION = 1


def add_parser(sub, cli):
    parser = sub.add_parser('benchmark', help='同一训练/测试拆分比较 LimiX 与本地基线，自动保存回执')
    arguments(parser)
    parser.set_defaults(fn=lambda cfg, args: run(cfg, args, cli))


def arguments(parser):
    parser.add_argument('--manifest', required=True, help='datasets 数组；每项含 id/name/task_type/target/train/predict/truth')
    parser.add_argument('--datasets', help='数据集 id，逗号分隔；默认全部表格任务')
    parser.add_argument('--models', default=','.join(MODELS), help='LIMIX_7M,LIMIX_16M,XGBoost,BASELINE')
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--timeout', type=int, default=1800, help='每次等待秒数；超时续跑复用 task_id')
    parser.add_argument('--python', help='可选：已安装 benchmark 依赖的 Python 可执行文件')
    parser.add_argument('-o', '--output', required=True, help='必须以 .json 结尾；旁边保存 CSV/HTML 和逐模型回执')


def utcnow():
    return datetime.now(timezone.utc).isoformat()


def remote_elapsed(record):
    """续跑仍保留首次提交到完成的墙钟时间，包含等待期间的离线间隔。"""
    return max(0.0,(datetime.now(timezone.utc)-datetime.fromisoformat(record['started_at'])).total_seconds())


def save_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    temp.replace(path)


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def output_path(value):
    path = Path(value).expanduser().resolve()
    if path.suffix != '.json' or path.is_dir():
        raise ValueError('--output 必须是 .json 文件路径，例如 results.json；不能使用 CSV、HTML 或目录')
    return path


def overlapping_paths(first,second):
    """真实路径的祖先关系与硬链接都构成冲突，不能仅比较路径字符串。"""
    if first==second or first in second.parents or second in first.parents:
        return True
    first_exists,second_exists=first.exists(),second.exists()
    if first_exists and second_exists and os.path.samefile(first,second):
        return True
    # macOS/Windows 可保留不同大小写字符串，却指向同一祖先目录。
    if first_exists and (first.is_dir() or not second_exists):
        if any(parent.exists() and os.path.samefile(first,parent) for parent in second.parents):
            return True
    if second_exists and (second.is_dir() or not first_exists):
        if any(parent.exists() and os.path.samefile(second,parent) for parent in first.parents):
            return True
    return False


def validate_output_plan(manifest_path,output,models,selected=None):
    """只读预检全部写入路径；在锁文件、计算和上传产生副作用前保护输入。"""
    manifest=Path(manifest_path).expanduser().resolve()
    source=json.loads(manifest.read_text(encoding='utf-8'))
    entries=source.get('datasets',[])
    if not isinstance(entries,list) or not entries or not all(isinstance(e,dict) for e in entries):
        raise ValueError('manifest.datasets 必须是非空对象数组')
    protected={manifest}
    # split 常为说明文字；只有它指向现存文件时才作为输入路径。
    optional={'labels','split','source','schema','input_files'}
    def collect_input_fields(record):
        for key,value in record.items():
            required=key in ('train','predict','truth')
            if not (required or key in optional or key.endswith(('_path','_file'))):
                continue
            values=list(value.values()) if key=='input_files' and isinstance(value,dict) else value if key=='input_files' and isinstance(value,list) else [value]
            for item in values:
                if not isinstance(item,str) or not item.strip():
                    if required:
                        raise ValueError(f'{key} 必须是文件路径')
                    continue
                if re.match(r'^https?://',item,re.I):
                    continue
                candidate=(manifest.parent/Path(item).expanduser()).resolve()
                if key in ('split','source','schema') and not candidate.exists():
                    continue
                protected.add(candidate)
    collect_input_fields(source)
    for entry in entries:
        collect_input_fields(entry)
        if not isinstance(entry.get('id'),str) or not re.fullmatch(r'[A-Za-z0-9_-]+',entry['id']):
            raise ValueError('数据集 id 只能包含字母、数字、下划线、连字符')
    root=output.with_suffix('')
    files=[output,output.with_suffix('.csv'),output.with_suffix('.html'),
           Path(str(output)+'.tmp'),Path(str(output)+'.lock')]
    directories=[root]
    for entry in entries:
        if selected and entry['id'] not in selected:
            continue
        if not selected and entry.get('task_type')=='timeseries':
            continue
        folder=root/entry['id']
        directories.append(folder)
        files.extend([folder/'uploads.json',folder/'uploads.json.tmp'])
        for model in models:
            model_folder=folder/model
            directories.append(model_folder)
            files.extend(model_folder/name for name in ('receipt.json','receipt.json.tmp','predictions.csv','service-predictions.csv'))
    resolved_files=[p.resolve() for p in files]
    resolved_dirs=[p.resolve() for p in directories]
    for writer in resolved_files+resolved_dirs:
        for reader in protected:
            if overlapping_paths(writer,reader):
                raise ValueError(f'输出与输入路径冲突：{writer} ↔ {reader}；请使用独立的结果目录')
    for index,path in enumerate(resolved_files):
        if path.is_dir() or any(overlapping_paths(path,other) for other in resolved_files[index+1:]):
            raise ValueError(f'输出路径互相冲突或指向目录：{path}')
    if any(path.exists() and not path.is_dir() for path in resolved_dirs):
        raise ValueError('回执目录与已有文件冲突；请使用独立的结果目录')
    return source


def acquire_file_lock(handle, windows=None):
    """POSIX 用 flock；Windows 锁定第一个字节。返回对应解锁动作。"""
    if windows is None:
        windows = os.name == 'nt'
    try:
        if windows:
            import msvcrt
            handle.seek(0,os.SEEK_END)
            if handle.tell() == 0:
                handle.write(b'\0')
                handle.flush()
            handle.seek(0)
            msvcrt.locking(handle.fileno(),msvcrt.LK_NBLCK,1)
            def unlock():
                handle.seek(0)
                msvcrt.locking(handle.fileno(),msvcrt.LK_UNLCK,1)
        else:
            import fcntl
            fcntl.flock(handle,fcntl.LOCK_EX|fcntl.LOCK_NB)
            def unlock():
                fcntl.flock(handle,fcntl.LOCK_UN)
    except (BlockingIOError,OSError) as exc:
        raise ValueError('无法获取结果文件锁；请确认没有另一任务写入同一路径，并检查目录权限') from exc
    return unlock


@contextmanager
def output_lock(output):
    """进程退出释放文件锁，避免并发续跑重复提交。"""
    path = Path(str(output) + '.lock')
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a+b') as handle:
        unlock = acquire_file_lock(handle)
        try:
            yield
        finally:
            unlock()


def dependencies(models):
    try:
        import numpy as np
        import pandas as pd
        import sklearn
        from sklearn import metrics
        xgb = None
        if 'XGBoost' in models:
            import xgboost as xgb
    except ImportError as exc:
        raise ValueError('benchmark 缺少依赖。请在独立环境安装 numpy pandas scikit-learn xgboost，'
                         '再指定 --python /path/to/venv/bin/python；基础预测和解释无需这些依赖。') from exc
    versions = {'python':platform.python_version(), 'numpy':np.__version__,
                'pandas':pd.__version__, 'scikit_learn':sklearn.__version__}
    if xgb:
        versions['xgboost'] = xgb.__version__
    return {'np':np, 'pd':pd, 'metrics':metrics, 'xgb':xgb, 'versions':versions}


def load_cases(manifest_path, selected, deps,source=None):
    path = Path(manifest_path).resolve()
    if source is None:
        source = json.loads(path.read_text(encoding='utf-8'))
    cases = source.get('datasets', [])
    ids = [c.get('id') for c in cases]
    if not cases or len(set(ids)) != len(ids):
        raise ValueError('manifest.datasets 必须非空，id 必须唯一')
    if selected and set(selected) - set(ids):
        raise ValueError('未知数据集：' + ','.join(set(selected) - set(ids)))
    prepared = []
    pd, np = deps['pd'], deps['np']
    for entry in cases:
        if selected and entry['id'] not in selected:
            continue
        if entry.get('task_type') == 'timeseries' and not selected:
            continue
        if entry.get('task_type') not in ('regression', 'classification'):
            raise ValueError('benchmark 当前只比较表格回归和分类；时序请使用 forecast')
        if not re.fullmatch(r'[A-Za-z0-9_-]+', entry['id']):
            raise ValueError('数据集 id 只能包含字母、数字、下划线、连字符')
        paths = {key:(path.parent / Path(entry[key]).expanduser()).resolve() for key in ('train', 'predict', 'truth')}
        for csv_path in paths.values():
            with csv_path.open(encoding='utf-8-sig',newline='') as handle:
                headers = next(csv.reader(handle),[])
            if not headers or any(not c.strip() for c in headers) or len(set(headers)) != len(headers):
                raise ValueError(f'{entry["id"]}: CSV 表头为空或重复')
        frames = {key:pd.read_csv(value) for key,value in paths.items()}
        train, predict, truth = (frames[k] for k in ('train', 'predict', 'truth'))
        target = entry['target']
        if target not in train or target not in truth or target in predict:
            raise ValueError(f'{entry["id"]}: train/truth 须含目标，predict 须移除目标')
        features = [c for c in train if c != target]
        if not features or list(predict) != features:
            raise ValueError(f'{entry["id"]}: 预测特征和训练特征的列名、顺序必须相同')
        if len(predict) != len(truth) or len(predict) < 2 or len(train) < 2:
            raise ValueError(f'{entry["id"]}: 测试/真值行数不符或样本不足')
        for frame in frames.values():
            if frame.isna().any().any() or not np.isfinite(frame.select_dtypes(include='number')).all().all():
                raise ValueError(f'{entry["id"]}: 缺失或非有限值须在训练集内拟定预处理')
        # tuple 保持列边界；数值 1 与 1.0 相等，不受 CSV 小数格式影响。
        group_train = set(train[features].itertuples(index=False,name=None))
        if group_train.intersection(predict.itertuples(index=False,name=None)):
            raise ValueError(f'{entry["id"]}: 训练/测试存在相同输入特征，请按组拆分避免泄漏')
        for col in features:
            if train[col].dtype.kind not in 'iufb':
                if set(predict[col]) - set(train[col]):
                    raise ValueError(f'{entry["id"]}: {col} 有训练集未见类别，先明确一致编码规则')
        if entry['task_type'] == 'classification':
            for value in list(train[target])+list(truth[target]):
                class_label(value)
            if len(set(train[target])) < 2 or set(truth[target]) - set(train[target]):
                raise ValueError('分类训练集必须包含所有测试类别')
        else:
            pd.to_numeric(train[target], errors='raise')
            pd.to_numeric(truth[target], errors='raise')
        signature = {'files':{k:file_hash(v) for k,v in paths.items()}, 'target':target,
                     'task_type':entry['task_type'], 'features':features}
        meta = {k:entry.get(k) for k in ('id','name','task_type','target','unit','split','source_url','source_name','license','license_url','citation')}
        meta.update(train_rows=len(train), test_rows=len(predict), feature_count=len(features),
                    fingerprint=fingerprint(signature))
        prepared.append({'meta':meta, 'paths':paths, 'frames':frames, 'features':features,
                         'fingerprint':meta['fingerprint']})
    if not prepared:
        raise ValueError('没有可评测的表格数据集')
    return prepared


def class_label(value):
    """规范数值标签，拒绝 NaN/Infinity；真实文本类别保持原值。"""
    try:
        number = float(value)
    except (ValueError,TypeError):
        return str(value)
    if not (-float('inf') < number < float('inf')):
        raise ValueError('分类真实值或预测值含非有限数，不计算指标')
    return str(int(number)) if number.is_integer() else str(number)


def score(kind, truth, prediction, deps, allowed_classes=None):
    np, metrics = deps['np'], deps['metrics']
    if len(truth) != len(prediction):
        raise ValueError('预测数量与真值不符，不计算部分样本指标')
    if deps['pd'].isna(prediction).any() or deps['pd'].isna(truth).any():
        raise ValueError('真实值或预测值缺失，不计算部分样本指标')
    if kind == 'classification':
        # 数值类别统一规范，避免 CSV 中 1 和 1.0 被误判为不同类。
        y, p = [class_label(x) for x in truth], [class_label(x) for x in prediction]
        if allowed_classes is not None and set(p)-{class_label(x) for x in allowed_classes}:
            raise ValueError('分类预测包含训练集没有的类别，不计算指标')
        return {'accuracy':float(metrics.accuracy_score(y,p)),
                'balanced_accuracy':float(metrics.balanced_accuracy_score(y,p)),
                'f1_macro':float(metrics.f1_score(y,p,average='macro',zero_division=0))}
    y, p = np.asarray(truth,dtype=float), np.asarray(prediction,dtype=float)
    if not np.isfinite(y).all() or not np.isfinite(p).all():
        raise ValueError('真实值或预测值含非有限数，不计算指标')
    result = {'mae':float(metrics.mean_absolute_error(y,p)),
              'rmse':float(np.sqrt(metrics.mean_squared_error(y,p)))}
    if np.var(y) > 0:
        result['r2'] = float(metrics.r2_score(y,p))
    return result


def base_record(case, model, folder, seed, deps):
    sig = {'dataset':case['fingerprint'], 'model':model, 'seed':seed}
    if model == 'XGBoost':
        sig.update(params=XGB_PARAMS, versions=deps['versions'])
    return {'dataset_id':case['meta']['id'], 'model':model, 'status':'pending',
            'fingerprint':fingerprint(sig), 'started_at':utcnow(), 'seed':seed,
            'receipt_path':str(folder / 'receipt.json'), 'versions':deps['versions']}


def existing_record(base):
    path = Path(base['receipt_path'])
    if not path.exists():
        return None
    saved = json.loads(path.read_text())
    if saved.get('fingerprint') != base['fingerprint']:
        raise ValueError(f'{base["dataset_id"]}/{base["model"]}: 输入或配置变化，请使用新的输出路径')
    return saved


def finish_predictions(case, record, prediction, folder, deps, elapsed):
    truth = case['frames']['truth'][case['meta']['target']]
    allowed = case['frames']['train'][case['meta']['target']].tolist()
    metrics = score(case['meta']['task_type'], truth.tolist(), prediction, deps,allowed_classes=allowed)
    records = deps['pd'].DataFrame({'sample':range(1,len(truth)+1), 'truth':truth, 'prediction':prediction})
    if case['meta']['task_type'] == 'regression':
        records['error'] = records['prediction'].astype(float) - records['truth'].astype(float)
        records['absolute_error'] = records['error'].abs()
    out = folder / 'predictions.csv'
    records.to_csv(out,index=False)
    record.update(status='succeeded', metrics=metrics, elapsed_seconds=elapsed,
                  finished_at=utcnow(), predictions_path=str(out), predictions_sha256=file_hash(out),
                  samples=json.loads(records.to_json(orient='records')),
                  alignment='严格核对数量后按预测输入顺序；独立真值只在本地读取')
    save_json(record['receipt_path'],record)
    return record


def local_run(case, model, folder, seed, deps):
    folder.mkdir(parents=True,exist_ok=True)
    record = base_record(case,model,folder,seed,deps)
    prior = existing_record(record)
    if prior and prior.get('status') == 'succeeded':
        if file_hash(prior['predictions_path']) != prior['predictions_sha256']:
            raise ValueError('缓存预测文件已变化，停止复用')
        return prior
    started = time.monotonic()
    train, predict = (case['frames'][k] for k in ('train','predict'))
    target, kind = case['meta']['target'], case['meta']['task_type']
    if model == 'BASELINE':
        value = train[target].mode().iloc[0] if kind == 'classification' else train[target].mean()
        prediction = [value] * len(predict)
        record['parameters'] = {'strategy':'majority' if kind == 'classification' else 'mean'}
    else:
        from sklearn.preprocessing import LabelEncoder
        # 类别列只在训练集拟合；测试列重排到相同空间。
        xtrain = deps['pd'].get_dummies(train[case['features']], dtype=float)
        xtest = deps['pd'].get_dummies(predict, dtype=float).reindex(columns=xtrain.columns, fill_value=0)
        params = {**XGB_PARAMS, 'random_state':seed}
        if kind == 'classification':
            encoder = LabelEncoder().fit(train[target])
            estimator = deps['xgb'].XGBClassifier(**params)
            estimator.fit(xtrain, encoder.transform(train[target]))
            prediction = encoder.inverse_transform(estimator.predict(xtest)).tolist()
        else:
            estimator = deps['xgb'].XGBRegressor(**params)
            estimator.fit(xtrain,train[target])
            prediction = estimator.predict(xtest).tolist()
        record['parameters'] = params
    return finish_predictions(case,record,prediction,folder,deps,time.monotonic()-started)


def upload_once(case, folder, cfg, cli):
    path = folder / 'uploads.json'
    if path.exists():
        saved = json.loads(path.read_text())
        if saved['fingerprint'] != case['fingerprint']:
            raise ValueError('上传回执与当前输入不符，请使用新输出路径')
    else:
        saved = {'fingerprint':case['fingerprint']}
    for key in ('train','predict'):
        if isinstance(saved.get(key),dict) and saved[key].get('data_version_id'):
            continue
        if saved.get(key) == 'submission_unknown':
            raise ValueError(f'{key} 上次上传结果未知；请先查服务记录，不能自动重复上传')
        saved[key] = 'submission_unknown'
        save_json(path,saved)
        receipt = cli.upload_file(cfg,str(case['paths'][key]))
        saved[key] = {k:receipt.get(k) for k in ('data_version_id','task_status','row_count','column_count')}
        save_json(path,saved)
    return saved


def remote_run(case, model, folder, seed, deps, cfg, cli, uploads, timeout):
    folder.mkdir(parents=True,exist_ok=True)
    base = base_record(case,model,folder,seed,deps)
    prior = existing_record(base)
    record = prior or base
    if record.get('status') == 'succeeded':
        if file_hash(record['predictions_path']) != record['predictions_sha256']:
            raise ValueError('缓存预测文件已变化，停止复用')
        return record
    if record.get('status') == 'failed' and record.get('stage') == 'terminal':
        return record
    if record.get('stage') == 'submission_unknown' and not record.get('task_id'):
        record.update(status='pending',error='提交结果未知。请先核对服务任务；未自动重提。')
        return record
    try:
        if not record.get('task_id'):
            payload = {'train_data_version_id':uploads['train']['data_version_id'],
                       'predict_data_version_id':uploads['predict']['data_version_id'],
                       'target_column':case['meta']['target'], 'model_type':model,
                       'timeout_seconds':min(timeout,1800)}
            record.update(stage='submission_unknown',request=payload,status='pending')
            save_json(record['receipt_path'],record)
            submit = cli.api_call(cfg,'POST',f'/v1/inference/{case["meta"]["task_type"]}/tasks',body=payload,timeout=120)
            record.update(task_id=submit['task_id'],submission=submit,stage='poll')
            save_json(record['receipt_path'],record)
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            state = cli.api_call(cfg,'GET',f'/v1/inference/tasks/{record["task_id"]}',retries=2)
            record.update(service_status=state.get('status'),last_checked_at=utcnow())
            save_json(record['receipt_path'],record)
            if state.get('is_ready') or state.get('status') in ('finished','failed','timeout','cancelled'):
                record['service_result'] = state
                if state.get('status') != 'finished':
                    record.update(status='failed',stage='terminal',error=state.get('error_message') or str(state.get('status')),
                                  elapsed_seconds=remote_elapsed(record),finished_at=utcnow())
                    save_json(record['receipt_path'],record)
                    return record
                record.update(result_version_id=state['result_version_id'],stage='download')
                save_json(record['receipt_path'],record)
                raw = folder / 'service-predictions.csv'
                cli.download_result(cfg,state['result_version_id'],str(raw))
                frame = deps['pd'].read_csv(raw)
                if 'pred_label' not in frame or len(frame) != len(case['frames']['predict']):
                    raise ValueError('服务预测列或数量与输入不符，停止评估')
                # 服务若保留输入字段，额外验证顺序，避免同数量错位。
                for col in case['features']:
                    if col in frame:
                        expected = case['frames']['predict'][col]
                        if expected.dtype.kind in 'iufb':
                            same = deps['np'].allclose(frame[col],expected,rtol=1e-7,atol=1e-9)
                        else:
                            same = frame[col].astype(str).tolist() == expected.astype(str).tolist()
                        if not same:
                            raise ValueError(f'结果输入列 {col} 顺序不符，停止评估')
                record['raw_predictions_path'] = str(raw)
                return finish_predictions(case,record,frame['pred_label'].tolist(),folder,deps,
                                          remote_elapsed(record))
            time.sleep(3)
        record.update(status='pending',error='本地等待超时，服务任务保留；同一命令续查不重复提交')
    except (Exception,SystemExit) as exc:
        record.update(status='pending' if record.get('stage') in ('submission_unknown','poll') else 'failed',
                      error=f'{type(exc).__name__}: {exc}')
    record['elapsed_seconds'] = remote_elapsed(record)
    save_json(record['receipt_path'],record)
    return record


def write_summary(output, summary):
    from limix_benchmark_report import write_report
    output = output_path(output)
    summary['artifacts'] = {'json':str(output), 'csv':str(output.with_suffix('.csv')), 'html':str(output.with_suffix('.html'))}
    summary.update(saved_to=summary['artifacts']['json'],csv_path=summary['artifacts']['csv'],
                   report_path=summary['artifacts']['html'])
    success = sum(r['status'] == 'succeeded' for r in summary['runs'])
    pending = any(r['status'] == 'pending' for r in summary['runs'])
    summary['status'] = 'pending' if pending else ('succeeded' if success == len(summary['runs']) else ('partial' if success else 'failed'))
    summary['updated_at'] = utcnow()
    save_json(output,summary)
    columns = ['dataset_id','model','status','mae','rmse','r2','accuracy','balanced_accuracy','f1_macro','elapsed_seconds','error']
    with output.with_suffix('.csv').open('w',newline='',encoding='utf-8-sig') as handle:
        writer = csv.DictWriter(handle,fieldnames=columns,extrasaction='ignore')
        writer.writeheader()
        for run in summary['runs']:
            writer.writerow({**run,**run.get('metrics',{})})
    write_report(summary,output.with_suffix('.html'))


def execute(cfg,args,cli):
    output = output_path(args.output)
    models = list(dict.fromkeys(x.strip() for x in args.models.split(',') if x.strip()))
    if not models or set(models)-set(MODELS):
        raise ValueError('models 仅支持 ' + ','.join(MODELS))
    if args.timeout < 1 or not 0 <= args.seed < 2**32:
        raise ValueError('timeout 必须正整数；seed 必须在 [0, 2^32)')
    selected=args.datasets.split(',') if args.datasets else None
    source=validate_output_plan(args.manifest,output,models,selected)
    deps = dependencies(models)
    cases = load_cases(args.manifest,selected,deps,source=source)
    root = output.with_suffix('')
    summary = {'schema_version':SCHEMA_VERSION,'kind':'benchmark','created_at':utcnow(),'seed':args.seed,
               'datasets':[c['meta'] for c in cases],'runs':[],
               'methodology':{'split':'各模型共用固定训练、测试与独立真值；不按分数调整拆分',
                              'tuning':'XGBoost 固定参数，无超参数搜索；LimiX 不微调，分类阈值默认',
                              'timing':'远端为提交、排队、轮询和下载耗时，上传不计；本地为训练与预测耗时，非硬件速度比较',
                              'randomness':'seed 固定数据拆分与本地模型；LimiX API 不暴露推理随机种子',
                              'scope':'单次留出评估，不代表跨行业普适排名'},
               'versions':deps['versions']}
    with output_lock(output):
        remote = []
        for case in cases:
            folder = root / case['meta']['id']
            folder.mkdir(parents=True,exist_ok=True)
            for model in models:
                if model.startswith('LIMIX_'):
                    remote.append((case,model,folder/model))
                else:
                    try:
                        result = local_run(case,model,folder/model,args.seed,deps)
                    except Exception as exc:
                        result = {'dataset_id':case['meta']['id'],'model':model,'status':'failed','error':str(exc)}
                    summary['runs'].append(result)
        # 上传前就保存已完成结果及全部远端占位；一个案例失败不能吞掉整批结果。
        remote_records = {}
        for case,model,folder in remote:
            base = base_record(case,model,folder,args.seed,deps)
            record = existing_record(base) or base
            remote_records[(case['meta']['id'],model)] = record
            summary['runs'].append(record)
        write_summary(output,summary)
        def needs_upload(case,model):
            record = remote_records[(case['meta']['id'],model)]
            return not (record.get('task_id') or record['status']=='succeeded'
                        or record.get('stage') in ('submission_unknown','terminal'))
        uploads, blocked = {},set()
        for case,_,_ in remote:
            case_id = case['meta']['id']
            if case_id in uploads or case_id in blocked:
                continue
            if not any(c['meta']['id']==case_id and needs_upload(c,m) for c,m,_ in remote):
                continue
            try:
                uploads[case_id] = upload_once(case,root/case_id,cfg,cli)
            except (Exception,SystemExit) as exc:
                blocked.add(case_id)
                for c,model,folder in remote:
                    if c['meta']['id']!=case_id or not needs_upload(c,model):
                        continue
                    record = remote_records[(case_id,model)]
                    record.update(status='failed',stage='upload',finished_at=utcnow(),
                                  error=f'上传未完成：{type(exc).__name__}: {exc}；未提交预测。上传结果未知时不会自动重传。')
                    save_json(record['receipt_path'],record)
                write_summary(output,summary)
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = {executor.submit(remote_run,c,m,f,args.seed,deps,cfg,cli,uploads.get(c['meta']['id'],{}),args.timeout):(c,m)
                       for c,m,f in remote if not (c['meta']['id'] in blocked and needs_upload(c,m))}
            for future in as_completed(futures):
                case,model = futures[future]
                try:
                    record = future.result()
                except Exception as exc:
                    record = {'dataset_id':case['meta']['id'],'model':model,'status':'failed','error':str(exc)}
                summary['runs'] = [record if r['dataset_id'] == case['meta']['id'] and r['model'] == model else r for r in summary['runs']]
                write_summary(output,summary)
                cli.log(f'benchmark {case["meta"]["id"]}/{model}: {record["status"]}')
        write_summary(output,summary)
    return summary


def stop_process_tree(process):
    """只终止本次委派的进程组；不触碰宿主或其他比较任务。"""
    if os.name == 'nt':
        subprocess.run(['taskkill','/PID',str(process.pid),'/T','/F'],capture_output=True,timeout=5)
    else:
        try:
            os.killpg(process.pid,signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            process.wait(timeout=0.3)
        except subprocess.TimeoutExpired:
            pass
        # leader 已退出时，仍须清理忽略 TERM 的孙进程。
        try:
            os.killpg(process.pid,signal.SIGKILL)
        except ProcessLookupError:
            pass
    process.communicate(timeout=5)


def delegated_process(command,env):
    """宿主取消会传到独立环境；处理启动期间信号，避免留下孤儿进程。"""
    cancelled = [None]
    def cancel(signum,_frame):
        cancelled[0] = signum
    previous = {sig:signal.signal(sig,cancel) for sig in (signal.SIGTERM,signal.SIGINT)}
    process = None
    try:
        options = {'start_new_session':True} if os.name!='nt' else {'creationflags':subprocess.CREATE_NEW_PROCESS_GROUP}
        process = subprocess.Popen(command,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,**options)
        while True:
            if cancelled[0] is not None:
                stop_process_tree(process)
                raise SystemExit(128+cancelled[0])
            try:
                stdout,stderr = process.communicate(timeout=0.2)
                if cancelled[0] is not None:
                    stop_process_tree(process)
                    raise SystemExit(128+cancelled[0])
                return subprocess.CompletedProcess(command,process.returncode,stdout,stderr)
            except subprocess.TimeoutExpired:
                continue
    except BaseException:
        if process is not None and process.poll() is None:
            stop_process_tree(process)
        raise
    finally:
        for sig,handler in previous.items():
            signal.signal(sig,handler)


def tool_summary(result):
    """工具通道只传绘图字段；逐样本数据与服务回执仍由原件下载提供。"""
    summary = {key:result[key] for key in (
        'schema_version','kind','status','seed','created_at','updated_at',
        'saved_to','csv_path','report_path','artifacts') if key in result}
    summary['datasets'] = [{key:dataset[key] for key in (
        'id','name','task_type','target','unit','train_rows','test_rows','feature_count',
        'split','source_name','source_url','license','license_url','citation')
        if key in dataset} for dataset in result['datasets']]
    summary['runs'] = [{key:record[key] for key in (
        'dataset_id','model','status','metrics','elapsed_seconds','stage','error')
        if key in record} for record in result['runs']]
    return summary


def run(cfg,args,cli):
    # 不解引用 symlink：两个 venv 可指向同一解释器，却有不同 site-packages。
    if args.python and os.path.abspath(args.python) != os.path.abspath(sys.executable):
        command = [args.python,str(Path(__file__).resolve()),'--manifest',args.manifest,'--models',args.models,
                   '--seed',str(args.seed),'--timeout',str(args.timeout),'-o',args.output]
        if args.datasets:
            command.extend(['--datasets',args.datasets])
        env = os.environ.copy()
        if cfg.get('api_key'):
            env['LIMIX_API_KEY'] = cfg['api_key']
        env['LIMIX_BASE_URL'] = cfg['base_url']
        try:
            completed = delegated_process(command,env)
        except OSError as exc:
            cli.die(f'无法启动 benchmark 独立 Python：{exc}',exit_code=2)
            return
        if completed.stderr:
            print(completed.stderr,file=sys.stderr,end='')
        if completed.stdout:
            print(completed.stdout,end='')
        if completed.returncode:
            raise SystemExit(completed.returncode)
        return
    try:
        result = execute(cfg,args,cli)
        cli.emit(tool_summary(result))
    except (ValueError,OSError,KeyError,json.JSONDecodeError) as exc:
        cli.die(f'benchmark 未完成：{exc}',exit_code=2)


if __name__ == '__main__':
    import limix
    parser = argparse.ArgumentParser()
    arguments(parser)
    config = limix.load_config()
    limix.require_production(config['base_url'])
    run(config,parser.parse_args(),limix)
