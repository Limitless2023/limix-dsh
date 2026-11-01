"""
[INPUT]: 官方时序 local 结果：预测步矩阵、特征 catalog、feature_causality 长表。
[OUTPUT]: 与表格共用的样本视图，附预测步、服务时间、原参数及未确认的输出尺度。
[POS]: 纯数据适配；核对长表与矩阵，不猜时间单位、样本位置或预测值逆变换。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import math
from limix_explain_batch import finite, normalize_local, summarize_features


def normalize_timeseries(result, context):
    if result.get('local_task_type') != 'timeseries' or result.get('graph_type') != 'local_timeseries':
        raise ValueError('返回结果不是时序局部解释')
    version=result.get('result_version_id')
    if not isinstance(version,str) or not version or version != context.get('result_version_id'):
        raise ValueError('时序解释引用的预测版本与请求不一致')
    target=result.get('col_target') or result.get('target_column')
    if not isinstance(target,str) or not target:
        raise ValueError('时序解释缺少原预测目标列')
    if result.get('target_column') and result['target_column'] != target:
        raise ValueError('时序解释目标列不一致')
    horizon=result.get('horizon')
    if type(horizon) is not int or horizon<1:
        raise ValueError('时序解释预测步数无效')
    predictions=result.get('predictions')
    if not isinstance(predictions,list) or not all(finite(value) for value in predictions):
        raise ValueError('时序解释预测必须为有限数值')
    labels={str(k):str(v) for k,v in context.get('labels',{}).items()}
    view=normalize_local(result,{'row_numbers':list(range(1,horizon+1)),'labels':labels})
    names=view['feature_names']
    catalog=result.get('feature_columns')
    if catalog is not None:
        if (not isinstance(catalog,list) or len(catalog)!=len(names) or
            any(not isinstance(item,dict) or item.get('name')!=name or item.get('column_index')!=i
                for i,(name,item) in enumerate(zip(names,catalog)))):
            raise ValueError('时序特征目录与矩阵不一致')
    samples={sample['row_number']-1:sample for sample in view['samples']}
    times=_validate_long_table(result.get('feature_causality'),samples,names,horizon)
    # 方向矩阵缺值时可用同一单元格的长表方向补全；仍不根据分数正负猜方向。
    if horizon>1:
        view['features']=summarize_features(names,view['samples'],labels)
    else:
        for feature in view['features']:
            feature['direction']=view['samples'][0]['directions'][names.index(feature['name'])]
    index=result.get('horizon_index')
    # 官方 horizon_index 可能为纳秒整数；只采用明确的字符串时间，不猜单位。
    if index is not None:
        if not isinstance(index,list) or len(index)!=horizon:
            raise ValueError('时序时间索引长度与预测步数不一致')
        if not times and all(isinstance(value,str) and value for value in index):
            times={i:value for i,value in enumerate(index)}
    for step,sample in samples.items():
        sample['step']=step+1
        if step in times:sample['timestamp']=times[step]
    view.update({'task_type':'timeseries','target':target,
                 'target_label':str(context.get('target_label') or labels.get(target,target)),
                 'input_rows':horizon,'horizon':horizon,'col_date':result.get('col_date'),
                 'context_size':result.get('context_size'),'result_version_id':version,
                 'source_task_id':result.get('source_task_id'),'labels':labels})
    # 实际返回可能处于自适应变换空间；regression_scale 仅能解释 norm→predictions，
    # 官方未提供可核验的业务尺度逆变换契约，因此保留原值并清除业务单位。
    view.update({'prediction_scale':'unverified','prediction_label':'解释模型输出',
                 'unit':'','target_unit':str(context.get('unit') or '')})
    if view['mapping']=='input_order':view['mapping']='forecast_steps'
    if catalog is not None:view['feature_catalog']=catalog
    if horizon==1:
        view['step']=1
        if 0 in times:view['timestamp']=times[0]
    return view


def _validate_long_table(table,samples,names,horizon):
    """真实服务字段 horizon_step/feature_index 均从 0 起。"""
    if table is None:return {}
    if not isinstance(table,list) or not table:
        raise ValueError('时序贡献长表为空或格式无效')
    seen=set();times={};name_indices={name:i for i,name in enumerate(names)}
    for row in table:
        if not isinstance(row,dict):raise ValueError('时序贡献长表行无效')
        step=row.get('horizon_step');name=row.get('feature_name');column=row.get('feature_index')
        if type(step) is not int or not 0<=step<horizon or name not in name_indices or type(column) is not int or column!=name_indices[name]:
            raise ValueError('时序贡献长表预测步或特征索引无效')
        key=(step,column)
        if key in seen:raise ValueError('时序贡献长表存在重复的预测步和特征')
        seen.add(key)
        sample=samples.get(step)
        if sample is None:raise ValueError('时序贡献长表与矩阵的预测步不一致')
        score=row.get('causal_score')
        if not finite(score) or not math.isclose(score,sample['scores'][column],rel_tol=1e-9,abs_tol=1e-12):
            raise ValueError('时序贡献长表分数与矩阵不一致')
        sign=row.get('sign_score')
        if sign is not None:
            if not finite(sign):raise ValueError('时序贡献长表方向无效')
            direction=1 if sign>0 else -1 if sign<0 else 0
            if sample['directions'][column] is not None and direction!=sample['directions'][column]:
                raise ValueError('时序贡献长表方向与矩阵不一致')
            sample['directions'][column]=direction
        prediction=row.get('prediction')
        if prediction is not None and (not finite(prediction) or not math.isclose(prediction,sample['prediction'],rel_tol=1e-9,abs_tol=1e-12)):
            raise ValueError('时序贡献长表预测值与矩阵不一致')
        timestamp=row.get('timestamp')
        if timestamp is not None:
            if not isinstance(timestamp,str) or not timestamp or (step in times and times[step]!=timestamp):
                raise ValueError('同一预测步的时间标签不一致')
            times[step]=timestamp
    if len(seen)!=len(samples)*len(names):
        raise ValueError('时序贡献长表缺少预测步或特征')
    return times
