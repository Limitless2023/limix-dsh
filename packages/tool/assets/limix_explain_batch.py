"""
[INPUT]: 局部解释矩阵、请求行号、原始特征与可选原预测；不调用网络。
[OUTPUT]: 严格校验的样本对应、逐行贡献与带正负的平均贡献。
[POS]: explain 的批量契约；缺索引且缺样本时拒绝猜测对应关系。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import math
import re


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def select_rows(row, selection, count):
    if row is not None and selection is not None:
        raise ValueError('--row 和 --rows 不能同时使用')
    if selection is None:
        selected = [row if row is not None else 1]
    elif selection == 'all':
        selected = list(range(1, count + 1))
    else:
        selected = []
        for part in selection.split(','):
            if not re.fullmatch(r'\d+(?:-\d+)?', part.strip()):
                raise ValueError('--rows 须为 all、1-10 或 1,3,5-8')
            bounds = [int(n) for n in part.split('-')]
            if bounds[0] < 1 or bounds[-1] > count or bounds[0] > bounds[-1]:
                raise ValueError('--rows 超出待解释数据行数，或范围倒序')
            selected.extend(range(bounds[0], bounds[-1]+1))
    if not selected or any(not 1 <= n <= count for n in selected):
        raise ValueError('--row 超出待解释数据行数')
    if len(set(selected)) != len(selected):
        raise ValueError('--rows 包含重复行号')
    return selected


def summarize_features(names, samples, labels):
    """平均 abs(score) × direction；未知方向不补零，也不混入不同分母。"""
    features=[]
    for i,name in enumerate(names):
        values=[0 if sample['scores'][i] == 0 else
                abs(sample['scores'][i])*sample['directions'][i]
                if sample['directions'][i] is not None else None for sample in samples]
        score=sum(values)/len(values) if values and all(v is not None for v in values) else None
        features.append({'name':name,'label':labels.get(name,name),'score':score,
                         'direction':None if score is None else (1 if score>0 else -1 if score<0 else 0)})
    features.sort(key=lambda f:(f['score'] is not None,abs(f['score'] or 0)),reverse=True)
    return features


def normalize_local(result, context):
    names, scores, signs = (result.get(x) for x in ('feature_names','feature_scores','sign_scores'))
    requested = context.get('row_numbers') or [context.get('row_number') or 1]
    if not isinstance(names,list) or not names or not all(isinstance(n,str) for n in names) or len(names)!=len(set(names)):
        raise ValueError('局部解释返回无效特征名')
    if context.get('feature_names') and set(names) != set(context['feature_names']):
        raise ValueError('局部解释特征与请求不一致')
    if not isinstance(scores,list) or not scores or any(not isinstance(s,list) or len(s)!=len(names) or not all(finite(v) for v in s) for s in scores):
        raise ValueError('局部解释返回的样本数或特征维度不一致')
    count = len(scores)
    indices = result.get('sample_index')
    if indices is None:
        if count != len(requested):
            raise ValueError('局部解释维度不一致：未返回样本索引且样本数不足，无法确定原始行号')
        indices = list(range(count))
        mapping = 'input_order'
    else:
        if not isinstance(indices,list) or len(indices)!=count or any(type(i) is not int or not 0<=i<len(requested) for i in indices) or len(set(indices))!=count:
            raise ValueError('局部解释样本索引重复或与输入不一致')
        mapping = 'sample_index'
    predictions = result.get('predictions')
    if not isinstance(predictions,list) or len(predictions)!=count or any(not (finite(p) or isinstance(p,str)) for p in predictions):
        raise ValueError('局部解释预测未与样本对齐')
    if signs is not None and (not isinstance(signs,list) or len(signs)!=count or any(not isinstance(s,list) or len(s)!=len(names) or not all(v is None or finite(v) for v in s) for s in signs)):
        raise ValueError('局部解释方向矩阵与贡献维度不一致')
    samples=[]
    for i,index in enumerate(indices):
        prior = (context.get('prior_predictions') or {}).get(str(requested[index]), context.get('prior_prediction'))
        item={'row_number':requested[index], 'prediction':predictions[i], 'scores':scores[i],
              'directions': [None if v is None else 1 if v>0 else -1 if v<0 else 0 for v in signs[i]] if signs is not None else [None]*len(names)}
        source = context.get('feature_values_by_row',{}).get(str(requested[index]))
        if source is not None:
            item['feature_values']=[source.get(name) for name in names]
        if prior is not None:item['prior_prediction']=prior
        if context.get('task_type') != 'classification' and finite(prior) and finite(predictions[i]):item['prediction_delta']=predictions[i]-prior
        samples.append(item)
    features=summarize_features(names,samples,context.get('labels',{}))
    view={'feature_names':names,'features':features,'samples':samples,'requested_count':len(requested),
          'explained_count':count,'mapping':mapping,'missing_rows':[n for i,n in enumerate(requested) if i not in indices]}
    if len(requested)==1:
        sample=samples[0]; view.update({k:v for k,v in sample.items() if k not in ['scores','directions']})
        view['features']=[{'name':name,'label':context.get('labels',{}).get(name,name),'score':scores[0][i],
                           'direction':sample['directions'][i]} for i,name in enumerate(names)]
        view['features'].sort(key=lambda f:abs(f['score']),reverse=True)
    return view


def contribution_rows(view):
    if 'samples' not in view:
        for f in view['features']:
            yield {'sample_row':view.get('row_number'),'feature':f['name'],'label':f['label'],
                   'score':f['score'],'direction':f['direction'],'explanation_prediction':view['prediction']}
        return
    for sample in view['samples']:
        for i,name in enumerate(view['feature_names']):
            score=sample['scores'][i];direction=sample['directions'][i]
            row={'sample_row':sample['row_number'],'feature':name,'label':view.get('labels',{}).get(name,name),
                 'score':score,'direction':direction,'explanation_prediction':sample['prediction'],
                 'signed_score':0 if score==0 else abs(score)*direction if direction is not None else None,
                 'feature_value':sample.get('feature_values',[None]*len(view['feature_names']))[i]}
            if view.get('task_type') == 'timeseries':
                row.update({'forecast_step':sample.get('step'),'timestamp':sample.get('timestamp')})
            yield row
