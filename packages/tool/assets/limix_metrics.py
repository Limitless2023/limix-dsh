"""
[INPUT]: 评估 CSV 的目标列、结果 CSV 的显式预测列；只用 Python 标准库。
[OUTPUT]: inference_metrics_context 校验本地真值；compute_metrics 返回指标。
[POS]: limix.py 的指标计算层；禁止用结果中的原始目标列代替预测列。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import csv
import math


def _read_csv_rows(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def inference_metrics_context(args):
    """独立真值仅交给本地指标层；在任何上传之前检查文件与列。"""
    truth = getattr(args, "truth", None)
    date = getattr(args, "date", None)
    if truth:
        rows = _read_csv_rows(truth)
        required = [args.target] + ([date] if date else [])
        if not rows or any(col not in rows[0] for col in required):
            raise ValueError("真实值文件须包含 " + ", ".join(required))
    return {"predict_path": truth or getattr(args, "predict", None),
            "target": args.target, "date": date}


def compute_metrics(kind, predict_path, target, result_path, date_column=None):
    """按结果行序对齐真值；行数不一致或缺少明确列时不报指标。"""
    try:
        if not predict_path or not target or not result_path:
            return None
        truth = _read_csv_rows(predict_path)
        preds = _read_csv_rows(result_path)
        if not truth or len(truth) != len(preds) or target not in truth[0]:
            return None
        if kind == "timeseries" and date_column:
            dates = [r.get(date_column, "").strip() for r in truth]
            if any(not d for d in dates) or dates != [r.get(date_column, "").strip() for r in preds]:
                return None
        columns = {c.lower(): c for c in preds[0] if c}
        # 表格任务返回 pred_label；时序返回 pred_<target>。
        candidates = ((f"pred_{target}", "pred_label") if kind == "timeseries"
                      else ("pred_label", f"pred_{target}"))
        pred_col = next((columns[c.lower()] for c in candidates
                         if c.lower() != target.lower() and c.lower() in columns), None)
        if pred_col is None:
            return None
        pairs = [(a.get(target), b.get(pred_col)) for a, b in zip(truth, preds)]
        pairs = [(a, b) for a, b in pairs
                 if a is not None and b is not None and a.strip() and b.strip()]
        if kind == "classification":
            if not pairs:
                return None
            return {"accuracy": round(sum(a.strip() == b.strip() for a, b in pairs)
                                      / len(pairs), 4), "n": len(pairs)}

        numeric = []
        for a, b in pairs:
            try:
                a, b = float(a), float(b)
                if math.isfinite(a) and math.isfinite(b):
                    numeric.append((a, b))
            except ValueError:
                continue
        if len(numeric) < 2:
            return None
        n = len(numeric)
        mean = sum(a for a, _ in numeric) / n
        sst = sum((a - mean) ** 2 for a, _ in numeric)
        sse = sum((a - b) ** 2 for a, b in numeric)
        out = {"n": n, "mae": round(sum(abs(a - b) for a, b in numeric) / n, 4),
               "rmse": round((sse / n) ** 0.5, 4)}
        if sst:
            out["r2"] = round(1 - sse / sst, 4)
        mapes = [abs((a - b) / a) for a, b in numeric if a != 0]
        if mapes:
            out["mape"] = round(sum(mapes) / len(mapes) * 100, 3)
        return out
    except (OSError, UnicodeError, csv.Error):
        return None
