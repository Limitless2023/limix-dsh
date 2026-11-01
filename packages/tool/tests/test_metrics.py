"""
[INPUT]: 包内 CLI、指标模块与临时 CSV；API 与下载用替身隔离。
[OUTPUT]: unittest 回归检查，不调用生产 API。
[POS]: 工具包指标可信度与无 -o 路径的验收。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""
import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "assets"))
import limix
from limix_metrics import compute_metrics


class MetricsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.truth = Path(self.tmp.name) / "truth.csv"
        self.result = Path(self.tmp.name) / "result.csv"

    def metrics(self, truth, result, kind="regression", target="price"):
        self.truth.write_text(truth)
        self.result.write_text(result)
        return compute_metrics(kind, self.truth, target, self.result)

    def test_prediction_beats_echoed_truth(self):
        m = self.metrics("price\n10\n20\n30\n", "price,pred_label\n10,12\n20,18\n30,33\n")
        self.assertEqual(m, {"n": 3, "mae": 2.3333, "rmse": 2.3805, "r2": .915, "mape": 13.333})

    def test_truth_alone_is_not_prediction(self):
        self.assertIsNone(self.metrics("price\n10\n20\n", "price\n10\n20\n"))

    def test_no_ground_truth(self):
        for kind in ("regression", "classification"):
            self.assertIsNone(self.metrics("feature\n1\n2\n", "pred_label\n10\n20\n", kind))

    def test_row_count_must_match(self):
        self.assertIsNone(self.metrics("price\n10\n20\n", "pred_label\n10\n"))

    def test_classification_uses_valid_labels(self):
        m = self.metrics("label\nyes\nno\n\"\"\n", "label,pred_label\nyes,yes\nno,yes\n,yes\n", "classification", "label")
        self.assertEqual(m, {"accuracy": .5, "n": 2})

    def test_timeseries_prefixed_prediction(self):
        m = self.metrics("sales\n10\n20\n", "sales,pred_sales\n10,11\n20,18\n", "timeseries", "sales")
        self.assertEqual(m["mape"], 10)
        self.assertEqual(m["mae"], 1.5)

    def test_zero_and_nonfinite(self):
        m = self.metrics("price\n0\n10\nNaN\n", "pred_label\n1\n9\nInfinity\n")
        self.assertEqual(m["n"], 2)
        self.assertEqual(m["mape"], 10)

    def test_timeseries_rejects_misaligned_dates(self):
        self.truth.write_text("date,sales\n2025-01-01,10\n2025-01-02,20\n")
        self.result.write_text("date,pred_sales\n2025-01-02,10\n2025-01-01,20\n")
        self.assertIsNone(compute_metrics("timeseries", self.truth, "sales", self.result, "date"))

    def test_forecast_truth_stays_local(self):
        self.truth.write_text("date,sales\n2025-01-01,10\n2025-01-02,20\n")
        args = limix.build_parser().parse_args([
            "forecast", "--train", "history.csv", "--target", "sales", "--date", "date",
            "--context", "7", "--horizon", "2", "--truth", str(self.truth)])
        with patch.object(limix, "resolve_data_ref", return_value="history-version") as upload, \
             patch.object(limix, "run_inference") as run:
            limix.cmd_forecast({}, args)
        upload.assert_called_once_with({}, "history.csv", "训练集")
        self.assertIsNone(run.call_args.args[2]["predict_data_version_id"])
        self.assertNotIn(str(self.truth), json.dumps(run.call_args.args[2]))
        self.assertEqual(run.call_args.args[-1]["predict_path"], str(self.truth))

    def test_invalid_truth_fails_before_upload(self):
        self.truth.write_text("sales\n10\n")
        args = limix.build_parser().parse_args([
            "forecast", "--train", "history.csv", "--target", "sales", "--date", "date",
            "--context", "7", "--horizon", "2", "--truth", str(self.truth)])
        error = io.StringIO()
        with patch.object(limix, "resolve_data_ref") as upload, contextlib.redirect_stderr(error):
            with self.assertRaises(SystemExit) as stopped:
                limix.cmd_forecast({}, args)
        upload.assert_not_called()
        self.assertEqual(stopped.exception.code, 2)
        self.assertIn("date", json.loads(error.getvalue())["error"])

    def test_future_covariates_without_truth_do_not_attempt_baseline_evaluation(self):
        self.truth.write_text("date,promo\n2026-11-01,0\n2026-11-02,1\n")
        self.result.write_text("date,pred_sales\n2026-11-01,600\n2026-11-02,700\n")
        output = io.StringIO()
        with patch.object(limix, "api_call", return_value={"task_id": "test"}), \
             patch.object(limix, "poll_task", return_value={"status": "finished", "result_version_id": "test"}), \
             patch.object(limix, "download_result", return_value=str(self.result)), \
             patch.object(limix, "seasonal_baseline") as baseline, contextlib.redirect_stdout(output):
            limix.run_inference({}, "timeseries", {}, False, False, str(self.result), 10,
                                {"train": "history.csv", "predict_path": str(self.truth), "target": "sales", "date": "date"})
        baseline.assert_not_called()
        result = json.loads(output.getvalue())
        self.assertEqual(result['status'], 'finished')
        self.assertNotIn('baseline_evaluation', result)
        self.assertNotIn('metrics', result)

    def test_without_output_downloads_and_cleans_temporary_csv(self):
        self.truth.write_text("price\n10\n20\n")
        paths = []
        def download(_cfg, _id, out):
            paths.append(Path(out))
            Path(out).write_text("price,pred_label\n10,11\n20,18\n")
            return out
        output = io.StringIO()
        with patch.object(limix, "api_call", return_value={"task_id": "test"}), \
             patch.object(limix, "poll_task", return_value={"status": "finished", "result_version_id": "test"}), \
             patch.object(limix, "download_result", side_effect=download), \
             contextlib.redirect_stdout(output):
            limix.run_inference({}, "regression", {}, False, False, None, 10,
                                {"predict_path": str(self.truth), "target": "price"})
        self.assertEqual(json.loads(output.getvalue())["metrics"]["mae"], 1.5)
        self.assertFalse(paths[0].exists())


if __name__ == "__main__":
    unittest.main()
