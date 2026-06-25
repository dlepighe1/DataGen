"""DataGen API — hybrid synthetic data generation.

Architecture:
  1. The LLM (multi-model fallback chain) generates a small pool of *coherent
     semantic records* for text/email columns only, honoring custom
     instructions. It never emits raw CSV.
  2. generator.py synthesizes every number/date/boolean/ID column with NumPy:
     exact missing percentages, real injected outliers, seeded reproducibility.
  3. If the LLM is unreachable (or no API key), curated local pools take over —
     generation never hard-fails because of an upstream model.
"""

import json
import os
import re

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix
from openai import OpenAI, APIConnectionError, APITimeoutError, APIStatusError

from generator import generate_dataset, is_text_column, MAX_ROWS, MAX_COLUMNS
from text_pools import build_local_records, expand_records
from nlp_tasks import (
    NLP_TASKS, POOL_KEYS, DEFAULT_LABELS, DEFAULT_NEGATIVE_RATIO,
    build_nlp_prompt, build_offline_pool, generate_nlp_dataset,
)

app = Flask(__name__)
app.json.sort_keys = False  # preserve column order in responses/exports
# Trust the first proxy (Railway) so rate limiting keys on the real client IP
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

CORS(app, origins=[
    "https://datagen.pages.dev",      # Cloudflare Pages
    "http://localhost:5173",          # Local dev
    "http://localhost:3000",          # Alternative local dev
])

limiter = Limiter(
    get_remote_address,
    app=app,
    storage_uri="memory://",
    headers_enabled=True,
)

# ─────────────────────────────────────────────
# Models to try in order. Falls back automatically.
# ─────────────────────────────────────────────
CANDIDATE_MODELS = [
    # ── New free-tier chain (preferred — tried first) ──
    "google/gemma-4-31b-it:free",              # Fast, clean JSON
    "openai/gpt-oss-120b:free",                # Strong open-weight fallback
    "nvidia/nemotron-3-ultra-550b-a55b:free",  # Large-scale fallback
    "qwen/qwen3-next-80b-a3b-instruct:free",   # Free fallback
    # ── Original free fallback, refreshed (llama-3.1-8b:free / mistral-7b:free retired) ──
    "meta-llama/llama-3.3-70b-instruct:free",  # Live successor to the old Llama free tier
    # ── Original paid models, kept as a representative paid last resort ──
    "openai/gpt-4o-mini",
    "openai/gpt-3.5-turbo",
]

LLM_TIMEOUT_SECONDS = 45
MAX_INSTRUCTIONS_CHARS = 600
MAX_COLUMN_NAME_CHARS = 64


@app.errorhandler(429)
def handle_rate_limit(e):
    return jsonify({
        "error": "Too many requests",
        "details": f"Rate limit exceeded ({e.description}). Please wait a moment before generating again.",
        "error_type": "rate_limited",
    }), 429


@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "DataGen API is running."}), 200


def build_semantic_prompt(text_columns, all_columns, template, custom_instructions, n_records):
    """Ask for a JSON pool of coherent text records — never raw CSV."""
    keys = [c["name"] for c in text_columns]
    type_hints = []
    for c in text_columns:
        hint = "a realistic, valid email address" if c.get("type") == "email" else "realistic text"
        type_hints.append(f'- "{c["name"]}": {hint}')

    context_cols = ", ".join(f"{c.get('name')} ({c.get('type', 'string')})" for c in all_columns)
    template_line = f'The dataset theme is "{template}".\n' if template else ""
    instructions_line = (
        f"CUSTOM INSTRUCTIONS FROM THE USER (these take priority — follow them exactly):\n"
        f"{custom_instructions.strip()}\n\n"
    ) if custom_instructions and custom_instructions.strip() else ""

    return (
        f"You generate semantic content for a synthetic dataset.\n"
        f"{template_line}"
        f"Full schema for context: {context_cols}.\n\n"
        f"{instructions_line}"
        f"Return a JSON array of exactly {n_records} objects. Each object must contain "
        f"exactly these keys: {json.dumps(keys)}.\n"
        f"Field guidance:\n" + "\n".join(type_hints) + "\n\n"
        f"Rules:\n"
        f"1. Values within one object must be mutually consistent "
        f"(e.g. an email must match that record's person name).\n"
        f"2. Make values diverse — avoid repeating across objects.\n"
        f"3. Return ONLY the JSON array. No markdown fences, no commentary."
    )


def parse_record_pool(raw_text, text_columns):
    """Robustly extract a list of dicts from model output and normalize keys."""
    text = raw_text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON array in model output.")
    records = json.loads(text[start:end + 1])
    if not isinstance(records, list):
        raise ValueError("Model output is not a JSON array.")

    expected = {c["name"].strip().lower(): c["name"] for c in text_columns}
    normalized = []
    for item in records:
        if not isinstance(item, dict):
            continue
        rec = {}
        for k, v in item.items():
            canonical = expected.get(str(k).strip().lower())
            if canonical is not None and v is not None:
                rec[canonical] = str(v)
        if len(rec) == len(expected):
            normalized.append(rec)
    if len(normalized) < 5:
        raise ValueError(f"Only {len(normalized)} usable records in model output.")
    return normalized


def fetch_record_pool(client, prompt, pseudo_columns):
    """Try each model in order. Returns (records, model_used) or (None, None)."""
    for model in CANDIDATE_MODELS:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=1.0,
                timeout=LLM_TIMEOUT_SECONDS,
            )
            content = response.choices[0].message.content or ""
            records = parse_record_pool(content, pseudo_columns)
            app.logger.info(f"Semantic pool from '{model}': {len(records)} records")
            return records, model
        except APITimeoutError:
            app.logger.warning(f"Model '{model}' timed out after {LLM_TIMEOUT_SECONDS}s.")
            continue
        except APIConnectionError as e:
            app.logger.warning(f"Connection error calling '{model}': {e}")
            break  # API unreachable — no point trying other models
        except APIStatusError as e:
            app.logger.warning(f"Model '{model}' returned HTTP {e.status_code}.")
            if e.status_code in (401, 403):
                break  # Bad key — other models will fail identically
            continue
        except (ValueError, json.JSONDecodeError) as e:
            app.logger.warning(f"Unusable output from '{model}': {e}")
            continue
        except Exception as e:
            app.logger.warning(f"Unexpected error with model '{model}': {e}")
            continue
    return None, None


def validate_payload(payload):
    """Returns (error_message, None) or (None, cleaned_config)."""
    columns = payload.get("columns")
    if not isinstance(columns, list) or not columns:
        return "Please add at least one column before generating.", None
    if len(columns) > MAX_COLUMNS:
        return f"A maximum of {MAX_COLUMNS} columns is supported.", None

    seen = set()
    for col in columns:
        name = str(col.get("name", "")).strip()
        if not name:
            return "Every column needs a non-empty name.", None
        if len(name) > MAX_COLUMN_NAME_CHARS:
            return f"Column name '{name[:20]}…' is too long (max {MAX_COLUMN_NAME_CHARS} characters).", None
        if name.lower() in seen:
            return f"Duplicate column name: '{name}'.", None
        seen.add(name.lower())
        col["name"] = name

    try:
        row_count = int(payload.get("rowCount", 100))
    except (TypeError, ValueError):
        return "Row count must be a whole number.", None
    if not (1 <= row_count <= MAX_ROWS):
        return f"Row count must be between 1 and {MAX_ROWS:,}.", None

    seed = payload.get("seed")
    if seed is not None and seed != "":
        try:
            seed = int(seed) % (2**31)
        except (TypeError, ValueError):
            return "Seed must be a whole number.", None
    else:
        seed = None

    custom_instructions = str(payload.get("customInstructions") or "")[:MAX_INSTRUCTIONS_CHARS]
    distribution = payload.get("distributionType", "balanced")
    if distribution not in ("balanced", "distorted"):
        distribution = "balanced"

    return None, {
        "columns": columns,
        "row_count": row_count,
        "seed": seed,
        "custom_instructions": custom_instructions,
        "distribution": distribution,
        "template": str(payload.get("template") or "")[:64],
    }


@app.route('/api/generate', methods=['POST'])
@limiter.limit("10 per minute;60 per hour;200 per day")
def generate_table():
    payload = request.get_json(silent=True) or {}
    error, config = validate_payload(payload)
    if error:
        return jsonify({"error": "Invalid request", "details": error, "error_type": "validation"}), 400

    columns = config["columns"]
    row_count = config["row_count"]
    seed = config["seed"]
    text_columns = [c for c in columns if is_text_column(c)]

    # ── 1. Semantic text pool: LLM first, curated local pools as fallback ──
    records, model_used = None, None
    engine = "statistical"
    if text_columns:
        api_key = os.environ.get("OPENROUTER_API_KEY")
        n_records = min(80, max(20, row_count))
        if api_key:
            client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)
            prompt = build_semantic_prompt(
                text_columns, columns, config["template"], config["custom_instructions"], n_records,
            )
            records, model_used = fetch_record_pool(client, prompt, text_columns)
        if records:
            engine = "hybrid"
        else:
            records = build_local_records(text_columns, n_records, seed)
            engine = "local"
        # Recombine identities so large row counts don't recycle 80 names
        records = expand_records(records, text_columns, min(row_count, 1500), seed)

    # ── 2. Statistical assembly: exact NaN %, outliers, seeded ──
    try:
        table, report = generate_dataset(
            columns, row_count,
            distribution_type=config["distribution"],
            seed=seed,
            text_records=records,
        )
    except Exception as e:
        app.logger.exception("Generation failed")
        return jsonify({
            "error": "Unexpected error during generation",
            "details": str(e),
            "error_type": "unknown",
        }), 500

    report["engine"] = engine
    report["model_used"] = model_used
    report["custom_instructions_applied"] = bool(
        config["custom_instructions"].strip() and engine == "hybrid"
    )
    return jsonify({"status": "ok", "table": table, "report": report}), 200


def validate_nlp_payload(payload):
    """Returns (error_message, None) or (None, cleaned_config)."""
    task = str(payload.get("task") or "")
    if task not in NLP_TASKS:
        return f"Unknown NLP task '{task}'. Choose one of: {', '.join(NLP_TASKS)}.", None

    try:
        row_count = int(payload.get("rowCount", 100))
    except (TypeError, ValueError):
        return "Row count must be a whole number.", None
    if not (1 <= row_count <= MAX_ROWS):
        return f"Row count must be between 1 and {MAX_ROWS:,}.", None

    seed = payload.get("seed")
    if seed is not None and seed != "":
        try:
            seed = int(seed) % (2**31)
        except (TypeError, ValueError):
            return "Seed must be a whole number.", None
    else:
        seed = None

    labels = payload.get("labels") or DEFAULT_LABELS
    if isinstance(labels, str):
        labels = [p.strip() for p in labels.split(",")]
    labels = [str(lb).strip() for lb in labels if str(lb).strip()]
    deduped, seen = [], set()
    for lb in labels:
        if lb.lower() not in seen:
            seen.add(lb.lower())
            deduped.append(lb[:24])
    labels = deduped
    if task == "classification" and not (2 <= len(labels) <= 6):
        return "Classification needs between 2 and 6 distinct labels.", None

    try:
        negative_ratio = float(payload.get("negativeRatio", DEFAULT_NEGATIVE_RATIO))
    except (TypeError, ValueError):
        negative_ratio = DEFAULT_NEGATIVE_RATIO
    negative_ratio = min(max(negative_ratio, 0.1), 0.9)

    return None, {
        "task": task,
        "row_count": row_count,
        "seed": seed,
        "labels": labels,
        "negative_ratio": negative_ratio,
        "custom_instructions": str(payload.get("customInstructions") or "")[:MAX_INSTRUCTIONS_CHARS],
        "distorted": payload.get("distributionType", "balanced") == "distorted",
    }


@app.route('/api/nlp/generate', methods=['POST'])
@limiter.limit("10 per minute;60 per hour;200 per day")
def generate_nlp_table():
    payload = request.get_json(silent=True) or {}
    error, config = validate_nlp_payload(payload)
    if error:
        return jsonify({"error": "Invalid request", "details": error, "error_type": "validation"}), 400

    task = config["task"]
    row_count = config["row_count"]
    seed = config["seed"]

    # ── 1. Example pool: LLM first, offline template banks as fallback ──
    pool, model_used = None, None
    api_key = os.environ.get("OPENROUTER_API_KEY")
    n_pool = min(60, max(20, row_count // 4))
    if api_key:
        client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)
        prompt = build_nlp_prompt(task, n_pool, config["labels"], config["custom_instructions"])
        pseudo_columns = [{"name": k} for k in POOL_KEYS[task]]
        pool, model_used = fetch_record_pool(client, prompt, pseudo_columns)
    engine = "hybrid" if pool else "local"
    if not pool:
        pool = build_offline_pool(task, max(n_pool, min(row_count, 600)), config["labels"], seed)

    # ── 2. Assembly: exact class balance, negative ratio, label noise ──
    try:
        table, report = generate_nlp_dataset(
            task, row_count,
            distorted=config["distorted"],
            seed=seed,
            pool=pool,
            labels=config["labels"],
            negative_ratio=config["negative_ratio"],
        )
    except Exception as e:
        app.logger.exception("NLP generation failed")
        return jsonify({
            "error": "Unexpected error during generation",
            "details": str(e),
            "error_type": "unknown",
        }), 500

    report["engine"] = engine
    report["model_used"] = model_used
    report["custom_instructions_applied"] = bool(
        config["custom_instructions"].strip() and engine == "hybrid"
    )
    return jsonify({"status": "ok", "table": table, "report": report}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
