#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
[INPUT]: 依赖 Python 3.8+ 标准库（urllib/json/argparse/uuid/time/os/sys/re）；
         凭证取自 CLI 参数 > 环境变量 LIMIX_API_KEY / LIMIX_BASE_URL > ~/.limix/config.json
[OUTPUT]: 对外提供 limix 命令行工具，子命令：
          config / health / check / upload / classify / regress / forecast /
          task / tasks / cancel / result / download / data / api / docs / doctor
[POS]: limix-api skill 的执行核心（"手"）；SKILL.md 与 references/*.md 是教 agent 的"脑"。
       零第三方依赖；docs 子命令读取 Mintlify Markdown，无需凭证。
       文档 https://limix.mintlify.site/api/overview，2026-09-14 核对（54 主线 + 3 按需端点）。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import argparse
import json
import os
import re
import sys
import time
import uuid
import urllib.error
import urllib.parse
import urllib.request
import tempfile
import importlib.util
import importlib.metadata
import contextlib
import io
from pathlib import Path

# ============================================================
# 配置与常量
# ============================================================

DEFAULT_BASE_URL = "https://limix-api.stable-ai.cn"
DOCS_BASE_URL = "https://limix.mintlify.site"
VERSION = "1.2.0"
CONFIG_PATH = os.path.expanduser("~/.limix/config.json")
POLL_INTERVAL = 5          # 异步任务轮询间隔（秒）
DEFAULT_WAIT = 1800        # 默认最长等待（秒），与服务端 timeout_seconds 默认值对齐

# 错误码 → (是否可重试, 排查提示)。口径来自官方 error-codes-rules.md
ERROR_HINTS = {
    4004: (False, "对象不存在或不可见：核对 ID 拼写；确认资源属于当前 API Key（可用 `check` 子命令校验）；软删除资源同样返回 4004"),
    4101: (False, "鉴权失败：确认请求头为 X-API-KEY（非 Authorization: Bearer）；检查 Key 是否完整、未停用"),
    4102: (False, "权限不足：当前 Key 可能是 read_only，写操作需 read_write（用 `check` 子命令查看 api_key_permission）"),
    4103: (False, "参数错误：读 message 定位具体字段，对照 references/ 中该接口的字段表逐项核对；也可能是 cell_count 超容量上限"),
    4106: (False, "上传文件超过大小限制：拆分文件或联系管理员调整部署配置"),
    4108: (False, "HTTP 423 资源锁定：被结果或下游任务引用的数据不可删，预测完成不会解除引用；治理仅 queued/running 可取消（终态预测取消为 4600）"),
    4302: (True,  "服务端读写已接入数据文件失败：等待 1~5 秒重试（最多 3 次）；图表生成或导出失败查 4500"),
    4500: (True,  "执行失败：请求已进入运行阶段后失败，查看 error_message/sdk_error/suggestion；可短暂重试"),
    4501: (True,  "未知错误：服务端内部异常，携带 request_id 联系管理员；可短暂重试"),
    4503: (False, "能力不可用：该功能未在当前部署启用（如自然语言接口、License 离线更新）"),
    4600: (False, "任务错误：任务已到达终态（finished/failed/timeout/cancelled），取消无效"),
    4601: (True,  "同步预测运行时失败：稍后重试，或改用异步 tasks 接口"),
}

# 预测任务终态（成功终态=finished；数据接入/治理/扩展任务的成功终态是 succeeded）
INFER_TERMINAL = {"finished", "failed", "timeout", "cancelled"}


def load_config():
    """凭证优先级：CLI 参数 > 环境变量 > ~/.limix/config.json > 默认 Base URL"""
    cfg = {}
    config_error = False
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, encoding="utf-8") as f:
                cfg = json.load(f)
                if not isinstance(cfg, dict):
                    raise ValueError("配置须为 JSON 对象")
                if any(cfg.get(key) is not None and not isinstance(cfg[key], str)
                       for key in ("api_key", "base_url")):
                    raise ValueError("配置中的凭证与地址须为字符串")
        except (ValueError, OSError):
            cfg = {}
            config_error = True
            log(f"警告: {CONFIG_PATH} 解析失败，已忽略")
    return {
        "api_key": os.environ.get("LIMIX_API_KEY") or cfg.get("api_key") or "",
        "base_url": (os.environ.get("LIMIX_BASE_URL") or cfg.get("base_url") or DEFAULT_BASE_URL).rstrip("/"),
        "config_error": config_error,
    }


def log(msg):
    """进度与提示走 stderr，stdout 只留机器可读 JSON"""
    print(msg, file=sys.stderr, flush=True)


def die(msg, exit_code=1, payload=None):
    """统一错误出口：stderr 输出错误 JSON（含 hint），非零退出"""
    err = {"ok": False, "error": msg}
    if payload:
        err.update(payload)
    print(json.dumps(err, ensure_ascii=False, indent=2), file=sys.stderr)
    sys.exit(exit_code)


def emit(data):
    """成功出口：stdout 输出 JSON，exit 0 由调用方决定"""
    print(json.dumps(data, ensure_ascii=False, indent=2))


# ============================================================
# HTTP 层：请求、信封拆包、multipart、下载
# ============================================================

class ApiError(Exception):
    def __init__(self, code, message, http_status=None):
        self.code, self.message, self.http_status = code, message, http_status
        super().__init__(f"[{code}] {message}")


def _request(cfg, method, path, params=None, body=None, headers=None,
             timeout=60, raw=False, retries=0):
    """
    发起请求并拆 code/message/data 信封。
    raw=True 返回 (bytes, response_headers)，用于文件下载。
    retries 仅用于幂等 GET：网络错误与可重试错误码时退避重试。
    """
    require_production(cfg["base_url"])
    url = cfg["base_url"].rstrip("/") + path
    if params:
        qs = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
        if qs:
            url += "?" + qs
    hdrs = {"X-API-KEY": cfg["api_key"]}
    if headers:
        hdrs.update(headers)

    data = None
    if body is not None:
        if isinstance(body, (dict, list)):
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            hdrs["Content-Type"] = "application/json"
        else:
            data = body  # 预编码字节流（multipart）

    attempt = 0
    while True:
        attempt += 1
        req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                content = resp.read()
                if raw:
                    ctype = resp.headers.get("Content-Type", "")
                    # 下载接口失败时返回统一错误 JSON 而非文件流
                    if "application/json" in ctype:
                        payload = json.loads(content.decode("utf-8"))
                        if payload.get("code", 0) != 0:
                            raise ApiError(payload.get("code"), payload.get("message"), resp.status)
                    return content, dict(resp.headers)
                payload = json.loads(content.decode("utf-8"))
        except urllib.error.HTTPError as e:
            # 服务端错误码通常也带统一 JSON 信封，尽力解析
            try:
                payload = json.loads(e.read().decode("utf-8"))
            except Exception:
                payload = {"code": e.code, "message": str(e)}
            finally:
                e.close()
            if not isinstance(payload, dict):
                payload = {"code": e.code, "message": "服务端返回非标准错误响应"}
            code = payload.get("code", e.code)
            # 业务码有明确不可重试语义时优先尊重；网关无业务码时按 HTTP 状态判断。
            retryable = ERROR_HINTS.get(code, (e.code in (408, 429, 500, 502, 503, 504), ""))[0]
            if method == "GET" and retryable and attempt <= retries:
                log(f"HTTP {e.code} [{code}]，{2 * attempt}s 后重试 {attempt}/{retries} ...")
                time.sleep(2 * attempt)
                continue
            raise ApiError(code, payload.get("message", "服务端请求失败"), e.code) from None
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if method == "GET" and attempt <= retries:
                log(f"网络异常({e})，{2 * attempt}s 后重试 {attempt}/{retries} ...")
                time.sleep(2 * attempt)
                continue
            die(f"网络请求失败: {e}", exit_code=4, payload={"url": url, "hint": "检查 base_url 是否可达、网络代理设置"})

        code = payload.get("code", 0)
        if code != 0:
            retryable, _ = ERROR_HINTS.get(code, (False, ""))
            if method == "GET" and retryable and attempt <= retries:
                log(f"可重试错误 [{code}]，{2 * attempt}s 后重试 {attempt}/{retries} ...")
                time.sleep(2 * attempt)
                continue
            raise ApiError(code, payload.get("message", ""))
        return payload.get("data")


def api_call(cfg, method, path, **kw):
    """业务调用统一入口：ApiError 转带 hint 的 die"""
    try:
        return _request(cfg, method, path, **kw)
    except ApiError as e:
        retryable, hint = ERROR_HINTS.get(e.code, (False, "未知错误码，用 `api GET /v1/errors` 查询错误码目录"))
        die(f"[{e.code}] {e.message}", payload={"retryable": retryable, "hint": hint, "path": path})


def encode_multipart(file_path, fields):
    """标准库手工构造 multipart/form-data（零依赖上传的代价，约 20 行）"""
    boundary = uuid.uuid4().hex
    parts = []
    for k, v in fields.items():
        if v is None:
            continue
        parts.append(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode("utf-8"))
    filename = os.path.basename(file_path)
    with open(file_path, "rb") as f:
        content = f.read()
    parts.append(
        (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
         f"filename=\"{filename}\"\r\nContent-Type: application/octet-stream\r\n\r\n").encode("utf-8"))
    parts.append(content)
    parts.append(f"\r\n--{boundary}--\r\n".encode("utf-8"))
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def save_stream(content, resp_headers, out_path):
    """落盘下载流；未指定路径时从 Content-Disposition 提取文件名"""
    if not out_path:
        cd = resp_headers.get("Content-Disposition", "") or resp_headers.get("content-disposition", "")
        m = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)"?', cd)
        out_path = urllib.parse.unquote(m.group(1)) if m else "limix_download.bin"
    with open(out_path, "wb") as f:
        f.write(content)
    return out_path


# ============================================================
# 业务封装：上传、id/文件自动识别、任务轮询、结果下载
# ============================================================

def upload_file(cfg, file_path, sheet=None, encoding=None, delimiter=None):
    """POST /v1/data/files → data_version_id（task_status: succeeded 或 reused 均可用）"""
    body, ctype = encode_multipart(file_path, {
        "sheet_name": sheet, "encoding": encoding, "delimiter": delimiter})
    data = api_call(cfg, "POST", "/v1/data/files",
                    body=body, headers={"Content-Type": ctype}, timeout=600)
    status = data.get("task_status")
    if status not in ("succeeded", "reused"):
        die(f"上传解析失败: task_status={status}",
            payload={"data": data, "hint": "查看 parse_summary 定位失败原因（空列/重复列/多层表头等），修复后重传"})
    log(f"上传成功: {os.path.basename(file_path)} → {data['data_version_id']}"
        f" ({data.get('row_count')}行×{data.get('column_count')}列, {status})")
    return data


def resolve_data_ref(cfg, ref, kind):
    """--train/--predict 双语义：本地文件路径→自动上传；否则视为已有 data_version_id"""
    if ref and os.path.exists(ref):
        return upload_file(cfg, ref)["data_version_id"]
    log(f"{kind}: 使用已有数据版本 {ref}")
    return ref


def poll_task(cfg, task_id, wait_seconds):
    """轮询预测任务直到 is_ready=true（官方推荐判据），返回终态 data"""
    deadline = time.time() + wait_seconds
    last_status = None
    while time.time() < deadline:
        data = api_call(cfg, "GET", f"/v1/inference/tasks/{task_id}", retries=3)
        status = data.get("status")
        if status != last_status:
            log(f"任务 {task_id}: {status}")
            last_status = status
        if data.get("is_ready"):
            return data
        time.sleep(POLL_INTERVAL)
    die(f"等待超时（{wait_seconds}s），任务仍未到终态",
        exit_code=3,
        payload={"task_id": task_id,
                 "hint": f"任务仍在服务端运行，可稍后执行: limix.py task {task_id}"})


def download_result(cfg, download_id, out_path):
    """统一下载：download_id 支持 data_version_id / result_version_id / 附件 id"""
    content, headers = api_call(cfg, "GET", f"/v1/data/download/{download_id}",
                                raw=True, timeout=600, retries=3)
    path = save_stream(content, headers, out_path)
    log(f"已下载 → {path} ({len(content)} bytes)")
    return path



def _read_csv_rows(path):
    import csv
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def compute_metrics(kind, predict_path, target, result_path):
    """结果 CSV 落地后顺带算指标：卡片和报告都需要它，算不出来就返回 None，绝不影响主流程。"""
    try:
        if not predict_path or not target or not result_path:
            return None
        truth = _read_csv_rows(predict_path)
        preds = _read_csv_rows(result_path)
        if not truth or not preds:
            return None
        cols = list(preds[0].keys())
        low = {c.lower(): c for c in cols}
        pred_col = low.get(target.lower())
        if pred_col is None:
            for cand in ("pred_label", "prediction", "predict", "y_pred", "pred", "value", "forecast"):
                if cand in low:
                    pred_col = low[cand]
                    break
        if pred_col is None:
            for c in cols:
                if c.lower().startswith(target.lower()):
                    pred_col = c
                    break
        if pred_col is None:
            return None

        n = min(len(truth), len(preds))
        if kind == "classification":
            hit = 0
            for i in range(n):
                a, b = truth[i].get(target), preds[i].get(pred_col)
                if a is None or b is None:
                    continue
                if str(a).strip() == str(b).strip():
                    hit += 1
            return {"accuracy": round(hit / n, 4), "n": n}

        pairs = []
        for i in range(n):
            try:
                pairs.append((float(truth[i][target]), float(preds[i][pred_col])))
            except (KeyError, TypeError, ValueError):
                continue
        if len(pairs) < 2:
            return None
        m = len(pairs)
        ys = [a for a, _ in pairs]
        errs = [a - b for a, b in pairs]
        mean = sum(ys) / m
        sst = sum((a - mean) ** 2 for a in ys)
        sse = sum(e * e for e in errs)
        out = {
            "n": m,
            "mae": round(sum(abs(e) for e in errs) / m, 4),
            "rmse": round((sse / m) ** 0.5, 4),
        }
        if sst:
            out["r2"] = round(1 - sse / sst, 4)
        mapes = [abs((a - b) / a) for a, b in pairs if a != 0]
        if mapes:
            out["mape"] = round(sum(mapes) / len(mapes) * 100, 3)
        return out
    except Exception:
        return None


def run_inference(cfg, kind, payload, sync, no_wait, out_path, wait_seconds, metrics_ctx=None):
    """
    预测统一编排：同步 predict 或 异步 tasks+轮询；成功后可选下载结果。
    kind: classification / regression / timeseries
    """
    payload = {k: v for k, v in payload.items() if v is not None}
    if sync:
        data = api_call(cfg, "POST", f"/v1/inference/{kind}/predict",
                        body=payload, timeout=wait_seconds + 30)
    else:
        submit = api_call(cfg, "POST", f"/v1/inference/{kind}/tasks", body=payload, timeout=120)
        task_id = submit["task_id"]
        ahead = submit.get("queued_snapshot_ahead_count")
        log(f"已提交异步任务 {task_id}" + (f"（前方排队 {ahead}）" if ahead else ""))
        if no_wait:
            emit(submit)
            return
        data = poll_task(cfg, task_id, wait_seconds)

    status = data.get("status")
    if status != "finished":
        die(f"预测未成功: status={status}", exit_code=3,
            payload={"task": data,
                     "hint": "读 error_message 定位；timeout 可调高 --timeout 重提；failed 先核对目标列与数据契约"})

    result = dict(data)
    ctxm = metrics_ctx or {}
    metrics = None
    if out_path:
        result["saved_to"] = download_result(cfg, data["result_version_id"], out_path)
        metrics = compute_metrics(kind, ctxm.get("predict_path"), ctxm.get("target"), result["saved_to"])
    else:
        log(f"结果版本 {data['result_version_id']}（用 download 子命令可取 CSV）")
        # 没要输出文件时也落一份临时 CSV 算指标，算完即删：指标不能取决于用户是否传 -o
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tmp_csv = download_result(cfg, data["result_version_id"], f"{tmpdir}/result.csv")
                metrics = compute_metrics(kind, ctxm.get("predict_path"), ctxm.get("target"), tmp_csv)
        except Exception:
            metrics = None
    if metrics:
        result["metrics"] = metrics
    emit(result)


# ============================================================
# 子命令实现
# ============================================================

def require_production(base_url):
    """本分发版仅连接生产环境；旧配置显式报错，避免静默切换上传目标。"""
    if base_url.rstrip("/") != DEFAULT_BASE_URL:
        die(f"本版本仅支持生产地址 {DEFAULT_BASE_URL}；请更新 LIMIX_BASE_URL、--base-url 或 ~/.limix/config.json。", exit_code=2)


def cmd_docs(cfg, args):
    """公开文档与 API 请求隔离，不读取或发送 API Key。"""
    page = args.page.strip("/")
    if page == "index":
        page = "llms.txt"
    elif page != "llms.txt":
        if not re.fullmatch(r"[a-z0-9]+(?:[/-][a-z0-9]+)*(?:\.md)?", page):
            die("文档参数应为 index 或页面路径，例如 api/inference-classification。", exit_code=2)
        if not page.endswith(".md"):
            page += ".md"
    url = f"{DOCS_BASE_URL}/{page}"
    try:
        request = urllib.request.Request(url, headers={"Accept": "text/markdown, text/plain"})
        with urllib.request.urlopen(request, timeout=30) as response:
            content = response.read().decode("utf-8")
        if content.lstrip().lower().startswith(("<!doctype html", "<html")):
            die("文档站返回 HTML，请从 docs index 查找有效的 Markdown 页面。", exit_code=4)
        print(content)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        die(f"文档读取失败：{exc}", exit_code=4,
            payload={"url": url, "hint": "可先使用 references/ 本地速查；字段不明时不要提交请求。"})


def cmd_doctor(cfg, args):
    """自检只读取环境与服务权限，不提交数据；输出中不包含密钥或服务端原始响应。"""
    checks = []
    def add(name, status, message, hint=""):
        checks.append({"name": name, "status": status, "message": message, "hint": hint})

    minimum = (3, 8) if args.profile == "cli" else (3, 10)
    add("python", "ok" if sys.version_info[:2] >= minimum else "error",
        f"Python {sys.version_info.major}.{sys.version_info.minor}；{args.profile} 要求 {minimum[0]}.{minimum[1]}+",
        "使用满足要求的 Python 重新运行自检。")
    add("config", "error" if cfg.get("config_error") else "ok",
        "兼容配置文件格式错误" if cfg.get("config_error") else "配置可读取",
        "修正 ~/.limix/config.json 为 JSON 对象；凭证推荐使用 LIMIX_API_KEY 环境变量。")
    production = cfg["base_url"].rstrip("/") == DEFAULT_BASE_URL
    add("production_url", "ok" if production else "error",
        "生产地址正确" if production else "配置了非生产地址，业务请求将被阻止",
        f"将 LIMIX_BASE_URL / --base-url 设为 {DEFAULT_BASE_URL}，或运行 config 修正旧配置。")
    add("credential", "ok" if cfg["api_key"] else "error",
        "API Key 已配置（不显示内容）" if cfg["api_key"] else "未配置 API Key",
        "在运行本工具的同一环境设置 LIMIX_API_KEY；修改 MCP 宿主环境后重启服务。")

    dependencies = []
    if args.profile == "workflow":
        dependencies = [("matplotlib", "matplotlib", False), ("docx", "python-docx", False)]
    elif args.profile == "mcp":
        dependencies = [("mcp.server.fastmcp", "mcp[cli]>=1.2.0,<2", True), ("requests", "requests", True)]
    for module, package, required in dependencies:
        try:
            available = importlib.util.find_spec(module) is not None
            if module.startswith("mcp"):
                available = available and importlib.metadata.version("mcp").split(".")[0] == "1"
        except (ImportError, ModuleNotFoundError, ValueError, importlib.metadata.PackageNotFoundError):
            available = False
        add(f"dependency:{module}", "ok" if available else ("error" if required else "warning"),
            "可用" if available else ("缺少必需依赖或版本不兼容" if required else "可选的出图/Word 导出依赖未安装"),
            f"在当前 Python 环境安装 {package}；仅在需要对应功能时安装可选依赖。")

    output = Path(args.output_dir).expanduser().absolute()
    try:
        parent = output
        while not parent.exists():
            parent = parent.parent
        if not parent.is_dir():
            raise OSError("路径不是目录")
        with tempfile.TemporaryFile(dir=parent) as probe:
            probe.write(b"limix doctor")
            probe.flush()
        add("output_directory", "ok", "输出目录可写" if output.exists() else "输出目录尚未创建，已验证最近的父目录可写")
    except OSError:
        add("output_directory", "error", "输出路径不可写或不是目录", "通过 --output-dir 指定可写的本地目录。")

    def probe_api(name, method, path, body=None):
        try:
            with contextlib.redirect_stderr(io.StringIO()):
                data = _request(cfg, method, path, body=body, timeout=10, retries=0)
            ok = isinstance(data, dict) and (data.get("status") == "ok" if name == "health" else data.get("allowed") is True)
            add(name, "ok" if ok else "error", "检查通过" if ok else "服务或权限检查未通过",
                "检查生产服务状态与 Key 的上传权限。")
        except ApiError as exc:
            add(name, "error", f"服务返回错误码 {exc.code}", ERROR_HINTS.get(exc.code, (False, "检查网络或联系平台管理员。"))[1])
        except (SystemExit, Exception):
            add(name, "error", "网络请求失败或响应格式异常", "检查网络、代理及生产服务连通性；自检不会自动重试提交。")

    if args.offline or not production:
        for name in ("health", "access"):
            add(name, "skipped", "离线模式或地址无效，未进行线上检查")
    else:
        probe_api("health", "GET", "/v1/health")
        if cfg["api_key"]:
            probe_api("access", "POST", "/v1/access/check", {"method": "POST", "route_path": "/v1/data/files"})
        else:
            add("access", "skipped", "缺少凭证，未进行权限检查")
    ok = not any(item["status"] == "error" for item in checks)
    emit({"ok": ok, "version": VERSION, "profile": args.profile, "offline": args.offline,
          "checks": checks, "next_step": "可以开始准备数据；此自检未验证模型预测效果。" if ok and not args.offline
          else ("本地检查通过；运行不带 --offline 的 doctor 检查服务与权限。" if ok else "按 error 项的 hint 修正后重跑 doctor。")})
    if not ok:
        raise SystemExit(1)


def cmd_config(cfg, args):
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    current = {}
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, encoding="utf-8") as f:
            current = json.load(f)
    if args.api_key:
        current["api_key"] = args.api_key
    current["base_url"] = DEFAULT_BASE_URL
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(current, f, ensure_ascii=False, indent=2)
    os.chmod(CONFIG_PATH, 0o600)
    emit({"ok": True, "config_path": CONFIG_PATH,
          "base_url": current.get("base_url", DEFAULT_BASE_URL),
          "api_key_set": bool(current.get("api_key"))})


def cmd_health(cfg, args):
    emit(api_call(cfg, "GET", "/v1/health", retries=2))


def cmd_check(cfg, args):
    body = {"method": args.method, "route_path": args.route}
    if args.target_type:
        body["target_type"] = args.target_type
    if args.target_id:
        body["target_id"] = args.target_id
    emit(api_call(cfg, "POST", "/v1/access/check", body=body))


def cmd_upload(cfg, args):
    emit(upload_file(cfg, args.file, args.sheet, args.encoding, args.delimiter))


def cmd_classify(cfg, args):
    if args.oof_search and not args.task_name:
        die("--oof-search 必须同时传 --task-name（服务端按 client_id+task_name 缓存阈值）", exit_code=2)
    if args.oof_search and args.threshold is not None:
        die("--threshold 与 --oof-search 互斥（服务端约束）", exit_code=2)
    payload = {
        "train_data_version_id": resolve_data_ref(cfg, args.train, "训练集"),
        "predict_data_version_id": resolve_data_ref(cfg, args.predict, "预测集"),
        "target_column": args.target,
        "model_type": args.model,
        "binary_cls_threshold": args.threshold,
        "oof_threshold_search": True if args.oof_search else None,
        "task_name": args.task_name,
        "finetuned_result_id": args.finetuned,
        "timeout_seconds": args.timeout,
    }
    run_inference(cfg, "classification", payload, args.sync, args.no_wait, args.output, args.timeout,
                  {"predict_path": args.predict, "target": args.target})


def cmd_regress(cfg, args):
    payload = {
        "train_data_version_id": resolve_data_ref(cfg, args.train, "训练集"),
        "predict_data_version_id": resolve_data_ref(cfg, args.predict, "预测集"),
        "target_column": args.target,
        "model_type": args.model,
        "quantile": True if args.quantile else None,
        "quantile_levels": [float(x) for x in args.levels.split(",")] if args.levels else None,
        "finetuned_result_id": args.finetuned,
        "timeout_seconds": args.timeout,
    }
    run_inference(cfg, "regression", payload, args.sync, args.no_wait, args.output, args.timeout,
                  {"predict_path": args.predict, "target": args.target})


def cmd_forecast(cfg, args):
    if not args.target:
        die("时序预测必须指定 --target（col_target 目标列名）", exit_code=2)
    covariates = [c.strip() for c in args.covariates.split(",")] if args.covariates else None
    if covariates and not args.predict:
        die("传 --covariates 时必须提供 --predict（预测集需包含未来协变量，服务端约束）", exit_code=2)
    payload = {
        "train_data_version_id": resolve_data_ref(cfg, args.train, "训练集"),
        "predict_data_version_id": resolve_data_ref(cfg, args.predict, "预测集") if args.predict else None,
        "context_size": args.context,
        "horizon": args.horizon,
        "col_target": args.target,
        "col_date": args.date,
        "col_date_format": args.date_format,
        "col_covariates": covariates,
        "quantile": True if args.quantile else None,
        "quantile_levels": [float(x) for x in args.levels.split(",")] if args.levels else None,
        "distribution_point": args.point,
        "reduce_window": args.reduce_window,
        "stride": args.stride,
        "model_type": args.model,
        "finetuned_result_id": args.finetuned,
        "timeout_seconds": args.timeout,
    }
    run_inference(cfg, "timeseries", payload, args.sync, args.no_wait, args.output, args.timeout,
                  {"predict_path": getattr(args, "predict", None), "target": args.target})


def cmd_task(cfg, args):
    if args.watch:
        emit(poll_task(cfg, args.task_id, args.timeout))
    else:
        emit(api_call(cfg, "GET", f"/v1/inference/tasks/{args.task_id}", retries=2))


def cmd_tasks(cfg, args):
    params = {"task_type": args.type, "status": args.status,
              "data_version_id": args.data_version,
              "page_num": args.page, "size": args.size}
    emit(api_call(cfg, "GET", "/v1/inference/tasks", params=params, retries=2))


def cmd_cancel(cfg, args):
    emit(api_call(cfg, "POST", f"/v1/inference/tasks/{args.task_id}/cancel", body={}))


def cmd_result(cfg, args):
    emit(api_call(cfg, "GET", f"/v1/inference/results/{args.result_id}", retries=2))


def cmd_download(cfg, args):
    path = download_result(cfg, args.download_id, args.output)
    emit({"ok": True, "saved_to": path})


def cmd_data(cfg, args):
    base = {"files": "/v1/data/files", "versions": "/v1/data/versions"}[args.what]
    if args.id:
        emit(api_call(cfg, "GET", f"{base}/{args.id}", retries=2))
    else:
        params = {"page_num": args.page, "size": args.size, "filename": args.filename}
        emit(api_call(cfg, "GET", base, params=params, retries=2))


def cmd_api(cfg, args):
    """逃生舱：任意端点直调。--data/--params 支持内联 JSON 或 @file.json"""
    def parse_json_arg(s):
        if not s:
            return None
        if s.startswith("@"):
            with open(s[1:], encoding="utf-8") as f:
                return json.load(f)
        return json.loads(s)

    body = parse_json_arg(args.data)
    params = parse_json_arg(args.params)
    if args.output:  # 二进制下载模式
        content, headers = api_call(cfg, args.method, args.path, params=params,
                                    body=body, raw=True, timeout=600)
        path = save_stream(content, headers, args.output)
        emit({"ok": True, "saved_to": path})
    else:
        emit(api_call(cfg, args.method, args.path, params=params, body=body,
                      timeout=args.timeout, retries=2 if args.method == "GET" else 0))


# ============================================================
# 参数定义
# ============================================================

def add_common_infer_args(p, default_target):
    p.add_argument("--train", required=True, help="训练集：本地文件路径（自动上传）或 data_version_id")
    p.add_argument("--target", default=default_target, help=f"目标列名（默认 {default_target}）")
    p.add_argument("--model", default=None,
                   choices=["LIMIX_2M", "LIMIX_7M", "LIMIX_16M", "LIMIX_64M"],
                   help="模型规格（服务端默认 LIMIX_16M）")
    p.add_argument("--finetuned", default=None, help="微调结果 ID（finetuned_model_id）")
    p.add_argument("--sync", action="store_true", help="走同步 predict 端点（调试用，生产建议异步）")
    p.add_argument("--no-wait", action="store_true", help="异步提交后立即返回 task_id，不轮询")
    p.add_argument("--timeout", type=int, default=DEFAULT_WAIT, help="任务超时秒数，同时作为轮询等待上限（默认 1800）")
    p.add_argument("-o", "--output", default=None, help="成功后把结果 CSV 下载到该路径")


def build_parser():
    ap = argparse.ArgumentParser(
        prog="limix.py",
        description="LimiX 结构化数据基础模型 API 命令行（仅生产环境）。凭证使用 LIMIX_API_KEY；docs 无需凭证。",
        epilog=f"文档：{DOCS_BASE_URL}/api/overview；Agent 索引：{DOCS_BASE_URL}/llms.txt")
    ap.add_argument("--version", action="version", version=VERSION)
    ap.add_argument("--api-key", default=None, help="覆盖 API Key")
    ap.add_argument("--base-url", default=None, help="兼容参数，仅接受生产地址")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("docs", help="读取 Mintlify Markdown 文档，无需 API Key")
    p.add_argument("page", nargs="?", default="index", help="index 或页面路径，例如 api/imputation")
    p.set_defaults(fn=cmd_docs)

    p = sub.add_parser("doctor", help="统一自检：运行环境、凭证、生产服务、权限与输出目录")
    p.add_argument("--profile", choices=["cli", "workflow", "mcp"], default="cli")
    p.add_argument("--output-dir", default=".", help="拟使用的输出目录；探测后不留临时文件")
    p.add_argument("--offline", action="store_true", help="只检查本地环境，不连接生产服务")
    p.set_defaults(fn=cmd_doctor)

    p = sub.add_parser("config", help="写入 ~/.limix/config.json 持久化凭证")
    p.add_argument("--api-key", dest="api_key")
    p.add_argument("--base-url", dest="base_url")
    p.set_defaults(fn=cmd_config)

    p = sub.add_parser("health", help="GET /v1/health 健康检查")
    p.set_defaults(fn=cmd_health)

    p = sub.add_parser("check", help="POST /v1/access/check 校验 Key 权限/对象可见性")
    p.add_argument("--method", default="POST")
    p.add_argument("--route", default="/v1/data/files")
    p.add_argument("--target-type", default=None)
    p.add_argument("--target-id", default=None)
    p.set_defaults(fn=cmd_check)

    p = sub.add_parser("upload", help="上传数据文件 → data_version_id（csv/tsv/xls/xlsx/parquet）")
    p.add_argument("file")
    p.add_argument("--sheet", default=None, help="Excel Sheet 名（默认第一个）")
    p.add_argument("--encoding", default=None, help="CSV/TSV 编码（默认自动探测）")
    p.add_argument("--delimiter", default=None, help="CSV/TSV 分隔符（默认自动识别）")
    p.set_defaults(fn=cmd_upload)

    p = sub.add_parser("classify", help="分类预测（上传→提交→轮询→下载 一条命令）")
    add_common_infer_args(p, "label")
    p.add_argument("--predict", required=True, help="预测集：本地文件路径或 data_version_id")
    p.add_argument("--threshold", type=float, default=None, help="二分类硬标签阈值 [0,1]，与 --oof-search 互斥")
    p.add_argument("--oof-search", action="store_true", help="启用 OOF 阈值搜索（须配 --task-name）")
    p.add_argument("--task-name", default=None, help="OOF 阈值缓存名（字母数字_-，≤64 字符）")
    p.set_defaults(fn=cmd_classify)

    p = sub.add_parser("regress", help="回归预测（上传→提交→轮询→下载 一条命令）")
    add_common_infer_args(p, "y")
    p.add_argument("--predict", required=True, help="预测集：本地文件路径或 data_version_id")
    p.add_argument("--quantile", action="store_true", help="输出分位数列 + 完整分布（LIMIX_2M 不支持）")
    p.add_argument("--levels", default=None, help="分位点，逗号分隔，如 0.1,0.5,0.9（服务端默认此三档）")
    p.set_defaults(fn=cmd_regress)

    p = sub.add_parser("forecast", help="时序预测（上传→提交→轮询→下载 一条命令）")
    add_common_infer_args(p, None)
    p.add_argument("--predict", default=None, help="预测集（传 --covariates 时必填）")
    p.add_argument("--date", required=True, help="时间列名（col_date）")
    p.add_argument("--date-format", default=None, help="时间格式，如 %%Y-%%m-%%d（默认自动解析）")
    p.add_argument("--context", type=int, required=True, help="历史上下文窗口步数（context_size，≥1）")
    p.add_argument("--horizon", type=int, required=True, help="预测步长（≥1）")
    p.add_argument("--covariates", default=None, help="协变量列，逗号分隔（列名须与表头完全一致）")
    p.add_argument("--quantile", action="store_true", help="分位数预测")
    p.add_argument("--levels", default=None, help="分位点，逗号分隔；时序默认 0.1~0.9 九档")
    p.add_argument("--point", default=None, choices=["mean", "median", "mode"], help="点预测统计量（默认 mean）")
    p.add_argument("--reduce-window", type=int, default=None, help="窗口压缩参数（≥1）")
    p.add_argument("--stride", type=int, default=None, help="滑窗步长（≥1）")
    p.set_defaults(fn=cmd_forecast)

    p = sub.add_parser("task", help="查询预测任务状态")
    p.add_argument("task_id")
    p.add_argument("--watch", action="store_true", help="轮询直到终态")
    p.add_argument("--timeout", type=int, default=DEFAULT_WAIT)
    p.set_defaults(fn=cmd_task)

    p = sub.add_parser("tasks", help="预测任务历史列表")
    p.add_argument("--type", default=None, choices=["CLS", "REG", "TSF"])
    p.add_argument("--status", default=None)
    p.add_argument("--data-version", dest="data_version", default=None)
    p.add_argument("--page", type=int, default=1)
    p.add_argument("--size", type=int, default=20)
    p.set_defaults(fn=cmd_tasks)

    p = sub.add_parser("cancel", help="取消未到终态的预测任务")
    p.add_argument("task_id")
    p.set_defaults(fn=cmd_cancel)

    p = sub.add_parser("result", help="查询结果版本元信息（输出列 schema，免下载探测列名）")
    p.add_argument("result_id")
    p.set_defaults(fn=cmd_result)

    p = sub.add_parser("download", help="统一下载：data_version_id / result_version_id / 附件 id")
    p.add_argument("download_id")
    p.add_argument("-o", "--output", default=None, help="保存路径（默认取服务端文件名）")
    p.set_defaults(fn=cmd_download)

    p = sub.add_parser("data", help="数据文件/版本查询")
    p.add_argument("what", choices=["files", "versions"])
    p.add_argument("id", nargs="?", default=None, help="传 ID 查详情，不传查列表")
    p.add_argument("--filename", default=None, help="按文件名模糊筛选（仅 versions 列表）")
    p.add_argument("--page", type=int, default=1)
    p.add_argument("--size", type=int, default=50)
    p.set_defaults(fn=cmd_data)

    p = sub.add_parser("api", help="逃生舱：直调任意端点（治理/评估/可视化/因果/插补/生成/微调等）")
    p.add_argument("method", choices=["GET", "POST", "PUT", "DELETE"])
    p.add_argument("path", help="以 /v1/ 开头的端点路径")
    p.add_argument("--data", default=None, help="JSON body，内联或 @file.json")
    p.add_argument("--params", default=None, help="JSON query 参数，内联或 @file.json")
    p.add_argument("--timeout", type=int, default=120)
    p.add_argument("-o", "--output", default=None, help="按文件流下载并保存（下载类端点用）")
    p.set_defaults(fn=cmd_api)

    return ap


def main():
    # 防呆：全局旗标必须写在子命令之前，否则 argparse 会默默忽略
    argv = sys.argv[1:]
    known_cmds = {
        "config", "health", "check", "upload", "classify", "regress", "forecast",
        "task", "tasks", "cancel", "result", "download", "data", "api", "docs", "doctor",
    }
    cmd_idx = next((i for i, a in enumerate(argv) if a in known_cmds), None)
    if cmd_idx is not None and argv[cmd_idx] != "config":
        for a in argv[cmd_idx + 1 :]:
            if a in ("--base-url", "--api-key") or a.startswith("--base-url=") or a.startswith("--api-key="):
                flag = a.split("=", 1)[0]
                die(
                    f"`{flag}` 必须写在子命令之前，否则会被忽略。\n"
                    f"正确示例：\n"
                    f"  python3 limix.py --base-url https://limix-api.stable-ai.cn classify ...\n"
                    f"错误示例：\n"
                    f"  python3 limix.py classify --base-url https://...   # ← 会被忽略",
                    exit_code=2,
                )

    args = build_parser().parse_args()
    if args.cmd == "docs":
        args.fn(None, args)
        return
    cfg = load_config()
    if args.api_key:
        cfg["api_key"] = args.api_key
    if args.base_url:
        cfg["base_url"] = args.base_url.rstrip("/")
    if args.cmd == "doctor":
        args.fn(cfg, args)
        return
    if args.cmd == "config" and not args.base_url:
        cfg["base_url"] = DEFAULT_BASE_URL
    require_production(cfg["base_url"])
    if args.cmd != "config" and not cfg["api_key"]:
        die("未配置 API Key：设置环境变量 LIMIX_API_KEY，或执行 "
            "`python3 limix.py config --api-key <key> [--base-url <url>]`", exit_code=2)
    args.fn(cfg, args)


if __name__ == "__main__":
    main()
