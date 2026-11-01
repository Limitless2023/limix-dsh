"""
[INPUT]: 待解释及参考 CSV 行、显式特征和可选原预测。
[OUTPUT]: 特征预检、标识列记录、确定性分组抽样；不改写输入、不调用 API。
[POS]: explain 的提交前检查；避免服务收到标识文本或缺失数值后才失败。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import math
import random
import re


def numeric(value):
    try: return value is not None and str(value).strip() != '' and math.isfinite(float(value))
    except (TypeError, ValueError): return False


def identifier(name, rows):
    values = [r.get(name, '') for r in rows]
    if not re.fullmatch(r'(?:id|(?:sample|row|record|experiment|material)[_-]?id|样本(?:编号|ID)|编号)', name, re.I): return False
    if len(values) < 2 or any(not v for v in values) or len(set(values)) != len(values): return False
    # 名称只是候选信号，还须值唯一且为标识文本或连续整数。
    if all(not numeric(v) for v in values): return True
    if all(numeric(v) and float(v).is_integer() for v in values):
        numbers = [int(float(v)) for v in values]
        return all(b-a == 1 for a,b in zip(numbers,numbers[1:]))
    return False


def prepare_features(columns, rows, target, explicit, train_rows=None):
    excluded = [] if explicit else [c for c in columns if c != target and identifier(c, rows) and (not train_rows or identifier(c, train_rows))]
    features = [s.strip() for s in explicit.split(',')] if explicit else [c for c in columns if c != target and c not in excluded]
    if not features or len(features) != len(set(features)) or any(c not in columns or c == target for c in features):
        raise ValueError('特征列为空、重复、不存在或包含目标列')
    for label, source in [('待解释', rows), ('参考', train_rows or [])]:
        for i,row in enumerate(source):
            for name in features:
                if name not in row: raise ValueError(f'{label}数据缺少特征 {name}')
                if not numeric(row[name]):
                    raise ValueError(f'{label}数据第 {i+1} 行的 {name} 不是有限数值；解释接口要求数值特征。标识列请用 --features 排除，业务分类特征请使用与预测一致的编码，不会自动删除或填补。')
    return features, excluded


def stratified_rows(predictions, count, seed=42):
    if not isinstance(count, int) or not 1 <= count <= len(predictions):
        raise ValueError('--sample-count 须在 1 与输入行数之间')
    groups = {}
    for i,row in enumerate(predictions,1):
        label=row.get('pred_label')
        if label is None or not str(label).strip(): raise ValueError('分组抽样需要每行的 pred_label')
        groups.setdefault(str(label),[]).append(i)
    if count < len(groups): raise ValueError('--sample-count 小于预测类别数，不能覆盖每个类别')
    rng=random.Random(seed)
    buckets=[groups[k][:] for k in sorted(groups)]
    for bucket in buckets:rng.shuffle(bucket)
    selected=[]
    while len(selected)<count:
        for bucket in buckets:
            if bucket and len(selected)<count:selected.append(bucket.pop())
    return sorted(selected)
