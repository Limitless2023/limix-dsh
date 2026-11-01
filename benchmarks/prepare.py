"""公开案例的可复现准备层。

[INPUT]: UCI 官方压缩原件、datasets.json 和 pandas/sklearn。
[OUTPUT]: 固定拆分 CSV、独立真值、字段字典、来源回执和 benchmark manifest。
[POS]: benchmarks 数据入口；不读取凭证，不提交模型任务。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import argparse
import hashlib
import io
import json
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sklearn.model_selection import GroupShuffleSplit, StratifiedGroupKFold

ROOT = Path(__file__).resolve().parent


def write_json(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_frame(case, folder):
    raw = folder / 'raw.zip'
    if not raw.exists():
        request = urllib.request.Request(case['download_url'], headers={'User-Agent': 'LimiX-public-benchmark/1.0'})
        with urllib.request.urlopen(request, timeout=120) as response:
            content = response.read()
        raw.write_bytes(content)
    prior = folder / 'provenance.json'
    if digest(raw) != case['raw_sha256']:
        raise ValueError(f'{case["id"]}: 下载原件与固定 manifest 哈希不符')
    if prior.exists() and json.loads(prior.read_text())['raw_sha256'] != digest(raw):
        raise ValueError(f'{case["id"]}: 原件哈希已变化，停止覆盖固定拆分')
    with zipfile.ZipFile(raw) as archive:
        names = archive.namelist()
        def read(suffix):
            return io.BytesIO(archive.read(next(n for n in names if n.endswith(suffix))))
        if case['id'] == 'concrete':
            frame = pd.read_excel(read('Concrete_Data.xls'))
            frame.columns = list(case['fields'])
        elif case['id'] == 'wine_quality':
            frame = pd.read_csv(read('winequality-red.csv'), sep=';')
            frame.columns = [c.replace(' ', '_') for c in frame.columns]
            frame['quality_pass'] = (frame.pop('quality') >= 6).astype(int)
        elif case['id'] == 'energy_efficiency':
            frame = pd.read_excel(read('ENB2012_data.xlsx')).dropna(how='all')
            frame = frame.iloc[:, :9]
            frame.columns = list(case['fields'])
        else:
            frame = pd.read_csv(read('day.csv'))[list(case['fields'])].sort_values('dteday')
    return frame, digest(raw)


def fixed_split(frame, case, seed):
    if case['task_type'] == 'timeseries':
        cut = len(frame) - case['forecast']['horizon']
        return list(range(cut)), list(range(cut, len(frame))), '按日期最后 14 天留出；context=90；horizon=14'
    features = frame.drop(columns=[case['target']])
    groups = features.astype(str).agg('|'.join, axis=1)
    if case['task_type'] == 'classification':
        splitter = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=seed)
        train, test = next(splitter.split(features, frame[case['target']], groups))
        description = 'StratifiedGroupKFold 5 折中的第一折；相同输入特征属于同一组'
    else:
        splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=seed)
        train, test = next(splitter.split(features, groups=groups))
        description = 'GroupShuffleSplit 80/20；相同输入特征属于同一组'
    assert not set(groups.iloc[train]) & set(groups.iloc[test])
    return sorted(map(int, train)), sorted(map(int, test)), description


def prepare(output):
    catalog = json.loads((ROOT / 'datasets.json').read_text())
    output.mkdir(parents=True, exist_ok=True)
    prepared = []
    for case in catalog['datasets']:
        folder = output / case['id']
        folder.mkdir(exist_ok=True)
        frame, sha = load_frame(case, folder)
        if len(frame) != case['expected_rows']:
            raise ValueError(f'{case["id"]}: 行数与固定 manifest 不符')
        if frame.isna().any().any():
            raise ValueError(f'{case["id"]}: 输入缺失，须明确预处理后再建基准')
        train, test, split = fixed_split(frame, case, catalog['seed'])
        frame.to_csv(folder / 'source.csv', index=False)
        frame.iloc[train].to_csv(folder / 'train.csv', index=False)
        frame.iloc[test].drop(columns=[case['target']]).to_csv(folder / 'predict.csv', index=False)
        truth_cols = [case['target']]
        if case['task_type'] == 'timeseries':
            truth_cols.insert(0, case['forecast']['date'])
        frame.iloc[test][truth_cols].to_csv(folder / 'truth.csv', index=False)
        write_json(folder / 'labels.json', {'fields':case['fields'], 'target_label':case['fields'][case['target']], 'unit':case['unit']})
        write_json(folder / 'split.json', {'seed':catalog['seed'], 'method':split, 'index_base':0,
                                         'train_source_rows':train, 'test_source_rows':test})
        write_json(folder / 'provenance.json', {**case, 'license':catalog['license'],
                    'license_url':catalog['license_url'], 'retrieved_at':datetime.now(timezone.utc).isoformat(),
                    'raw_sha256':sha, 'source_rows':len(frame), 'train_rows':len(train), 'test_rows':len(test),
                    'files_sha256':{p.name:digest(p) for p in folder.glob('*.csv')}})
        explanation = '先解释前 10 行；全量解释覆盖全部测试行，不按结果挑选。'
        if case['task_type'] == 'timeseries':
            explanation = '解释已完成预测的全部 14 个未来时间点；沿用同一 context/horizon/协变量。'
        lines = [f'# {case["name"]}', '', case['business'], '',
                 f'来源：{case["source_url"]}', f'署名：{case["citation"]}',
                 f'许可：{catalog["license"]}；{catalog["license_url"]}', '',
                 f'总行数 {len(frame)}；训练 {len(train)}；测试 {len(test)}。',
                 f'拆分：{split}；seed={catalog["seed"]}。', '',
                 'train.csv 含目标；predict.csv 不含目标；truth.csv 只供本地指标计算。',
                 'split.json 保存原始 0 起行索引，评估严格使用 predict.csv 的输入顺序。', '',
                 '## 字段', '', *[f'- `{key}`：{label}' for key,label in case['fields'].items()], '',
                 '## 演示', '', case['prompt'], '', explanation, '', case['boundary'], '',
                 '使用相同拆分对比模型；未对超参数或分类阈值搜索。解释分数不表示干预收益。']
        (folder / 'README.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
        prepared.append({**case, 'source_name':'UCI Machine Learning Repository',
                         'license':catalog['license'], 'license_url':catalog['license_url'],
                         'train':f'{case["id"]}/train.csv', 'predict':f'{case["id"]}/predict.csv',
                         'truth':f'{case["id"]}/truth.csv', 'labels':f'{case["id"]}/labels.json',
                         'split':split, 'seed':catalog['seed'], 'train_rows':len(train), 'test_rows':len(test)})
        print(f'{case["id"]}: {len(train)} train / {len(test)} test')
    write_json(output / 'manifest.json', {'schema_version':1, 'seed':catalog['seed'], 'datasets':prepared})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='下载并固定公开数据拆分，不调用模型')
    parser.add_argument('--output', type=Path, required=True)
    prepare(parser.parse_args().output.resolve())
