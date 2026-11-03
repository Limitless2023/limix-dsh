"""
[INPUT]: forecast 参数与本地 CSV；识别常用分隔符及 UTF 编码 BOM。
[OUTPUT]: 上传前预检、请求参数构建与结果时间摘要；未知范围不外推。
[POS]: limix.py 的时序分支；不发网络请求、不修改用户数据。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import csv
import codecs
import logging
import math
from datetime import datetime, timezone
from pathlib import Path


def local_rows(ref, label):
    path = Path(ref) if ref else None
    if not path or not path.is_file() or path.suffix.lower() != '.csv':
        return None
    with path.open('rb') as f:
        prefix = f.read(4)
    encoding = ('utf-32' if prefix.startswith((codecs.BOM_UTF32_LE, codecs.BOM_UTF32_BE))
                else 'utf-16' if prefix.startswith((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE))
                else 'utf-8-sig')
    try:
        with path.open(encoding=encoding, newline='') as f:
            sample = f.read(4096)
            f.seek(0)
            dialect = csv.excel
            for probe in [sample, sample.splitlines()[0] if sample else '']:
                try:
                    dialect = csv.Sniffer().sniff(probe, delimiters=',;\t|')
                    break
                except csv.Error:
                    continue
            reader = csv.DictReader(f, dialect=dialect)
            fields = reader.fieldnames or []
            if len(set(fields)) != len(fields):
                raise ValueError(f'{label}列名重复')
            rows = list(reader)
    except UnicodeDecodeError:
        logging.getLogger(__name__).warning('%s编码无法在本地确认；交服务端自动识别并校验内容', label)
        return None
    if not rows or any(None in row or any(v is None for v in row.values()) for row in rows):
        raise ValueError(f'{label}为空或 CSV 列数不一致')
    return fields, rows


def dates(rows, col, fmt, label):
    result = []
    for row in rows:
        value = row[col]
        try:
            time = datetime.strptime(value, fmt) if fmt else datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError as exc:
            raise ValueError(f'{label}日期无法解析：{value}；请指定 --date-format') from exc
        result.append(time.replace(tzinfo=timezone.utc) if time.tzinfo is None else time.astimezone(timezone.utc))
    if any(b <= a for a, b in zip(result, result[1:])):
        raise ValueError(f'{label}日期须严格递增，不能重复或乱序')
    return result


def preflight(args):
    if not args.target or not args.date or args.target == args.date:
        raise ValueError('时序须指定不同的 --target 目标列和 --date 日期列')
    if args.context < 1 or args.horizon < 1:
        raise ValueError('--context 和 --horizon 须为正整数')
    cov = [c.strip() for c in args.covariates.split(',')] if args.covariates else []
    if len(set(cov)) != len(cov) or any(not c or c in [args.target, args.date] for c in cov):
        raise ValueError('--covariates 须为不重复的特征列，不能含日期列、目标列或空列名')
    if cov and not args.predict:
        raise ValueError('传 --covariates 时必须提供 --predict，含未来日期和全部协变量')
    train = local_rows(args.train, '训练集')
    predict = local_rows(args.predict, '预测集')
    train_dates = None
    for item, label, required in [(train, '训练集', [args.date, args.target] + cov), (predict, '预测集', [args.date] + cov)]:
        if item:
            fields, rows = item
            missing = [c for c in required if c not in fields]
            if missing:
                raise ValueError(f'{label}缺少列：{", ".join(missing)}')
            if any(not str(row[c]).strip() for row in rows for c in required):
                raise ValueError(f'{label}必需列存在缺失值')
    if predict and not cov and predict[0] == [args.date]:
        raise ValueError('无协变量时不要上传仅日期列的预测表；省略 --predict，按 --horizon 外推')
    if train:
        train_dates = dates(train[1], args.date, args.date_format, '训练集')
        if len(train[1]) < args.context:
            raise ValueError('训练行数少于 --context；请按实际可用历史设置窗口')
        try:
            if any(not math.isfinite(float(r[args.target])) for r in train[1]):
                raise ValueError()
        except ValueError as exc:
            raise ValueError('训练目标列须为有限数值') from exc
    if predict:
        if len(predict[1]) < args.horizon:
            raise ValueError('预测集不足 --horizon 行，不能缺少未来协变量')
        future_dates = dates(predict[1], args.date, args.date_format, '预测集')
        if train_dates and future_dates[0] <= train_dates[-1]:
            raise ValueError('预测日期须晚于训练末日，不能混入历史或未来真值')
    if args.levels:
        levels = [float(v) for v in args.levels.split(',')]
        if not args.quantile or not levels or levels != sorted(set(levels)) or any(not math.isfinite(v) or not .1 <= v <= .9 or round(v * 10) / 10 != v for v in levels):
            raise ValueError('--levels 须配合 --quantile，使用递增且不重复的 0.1–0.9 分位点')
    return cov or None


def forecast_payload(args, resolve):
    cov = preflight(args)
    return {
        'train_data_version_id': resolve(args.train, '训练集'),
        'predict_data_version_id': resolve(args.predict, '预测集') if args.predict else None,
        'context_size': args.context, 'horizon': args.horizon,
        'col_target': args.target, 'col_date': args.date, 'col_date_format': args.date_format,
        'col_covariates': cov, 'quantile': True if args.quantile else None,
        'quantile_levels': [float(x) for x in args.levels.split(',')] if args.levels else None,
        'distribution_point': args.point, 'reduce_window': args.reduce_window, 'stride': args.stride,
        'model_type': args.model, 'finetuned_result_id': args.finetuned, 'timeout_seconds': args.timeout,
    }


def forecast_summary(context, payload, result_path, metrics):
    """时间证据绑定单次任务；预测日期只读结果，不按历史末日推算。"""
    from limix_metrics import _read_csv_rows

    column, target = context.get('date'), context.get('target')
    summary = {'target': target, 'date_column': column,
               'requested_context': payload.get('context_size'),
               'requested_horizon': payload.get('horizon'),
               'training': {'status': 'unavailable'},
               'prediction': {'status': 'unavailable'},
               'evaluation': {'status': 'unavailable'},
               'largest_errors': []}

    def scope(rows, fmt=None):
        if not rows or not column or any(not row.get(column) for row in rows):
            raise ValueError('日期缺失')
        try:
            dates(rows, column, None, '时间摘要')
        except ValueError:
            if not fmt:
                raise
            dates(rows, column, fmt, '时间摘要')
        return {'status': 'verified', 'start': rows[0][column],
                'end': rows[-1][column], 'rows': len(rows)}

    try:
        train = local_rows(context.get('train'), '训练集')
        if train:
            summary['training'] = dict(scope(train[1], payload.get('col_date_format')),
                                       source=str(context['train']), scope='uploaded_history')
    except (OSError, ValueError, KeyError, csv.Error) as exc:
        summary['training']['reason'] = str(exc)
    try:
        predicted = _read_csv_rows(result_path)
        summary['prediction'] = scope(predicted, payload.get('col_date_format'))
    except (OSError, UnicodeError, ValueError, KeyError, csv.Error) as exc:
        summary['prediction']['reason'] = str(exc)
        return summary
    if not metrics:
        summary['evaluation']['reason'] = '没有可用的对齐真值指标；不推断评估范围或逐日误差'
        return summary
    try:
        truth = _read_csv_rows(context['predict_path'])
        if len(truth) != len(predicted) or [r.get(column) for r in truth] != [r.get(column) for r in predicted]:
            raise ValueError('真值与预测日期未逐行对齐')
        columns = {c.lower(): c for c in predicted[0] if c}
        pred_col = next((columns[c.lower()] for c in (f'pred_{target}', 'pred_label')
                         if c.lower() != target.lower() and c.lower() in columns), None)
        if not pred_col:
            raise ValueError('缺少明确预测列')
        paired, errors = [], []
        for actual, prediction in zip(truth, predicted):
            try:
                a, b = float(actual[target]), float(prediction[pred_col])
            except (ValueError, TypeError):
                continue
            if not (math.isfinite(a) and math.isfinite(b)):
                continue
            paired.append(actual)
            errors.append({'date': actual[column], 'actual': a, 'prediction': b,
                           'error': round(b-a, 6), 'absolute_error': round(abs(b-a), 6)})
        if len(paired) != metrics.get('n'):
            raise ValueError('有效配对数量与评估指标不一致')
        summary['evaluation'] = dict(scope(paired, payload.get('col_date_format')),
                                     source=str(context['predict_path']),
                                     dates=[r[column] for r in paired],
                                     coverage='full' if len(paired) == len(predicted) else 'partial')
        summary['largest_errors'] = sorted(errors, key=lambda e: -e['absolute_error'])[:3]
    except (OSError, UnicodeError, ValueError, KeyError, TypeError, csv.Error) as exc:
        summary['evaluation'] = {'status': 'unavailable', 'reason': str(exc)}
    return summary
