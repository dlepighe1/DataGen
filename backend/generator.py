"""Statistical core of the hybrid generation engine.

Numbers, dates, booleans and ID columns are synthesized locally with NumPy so
that ranges, missing-value percentages, noise and outliers are *exact* and
reproducible from a seed — an LLM only ever supplies semantic text content
(see app.py / text_pools.py).
"""

import re
from datetime import date, timedelta

import numpy as np

MAX_ROWS = 10_000
MAX_COLUMNS = 50

# Baselines applied in "distorted" mode when the user did not set their own
DISTORTED_MIN_NAN_PCT = 8
DISTORTED_DEFAULT_NOISE_PCT = 5
DISTORTED_DEFAULT_OUTLIER_PCT = 4
DISTORTED_TEXT_DIRT_PCT = 12
DISTORTED_DATE_DIRT_PCT = 15
DISTORTED_BOOL_DIRT_PCT = 10


def is_id_column(name):
    """OrderID / customer_id / id — but not 'Paid'."""
    if not name:
        return False
    lowered = name.lower()
    return name.endswith("ID") or lowered.endswith("_id") or lowered == "id"


def is_text_column(col):
    """Columns whose values come from the semantic (LLM/local) record pool."""
    return col.get("type", "string") in ("string", "email") and not is_id_column(col.get("name", ""))


def _resolve_range(col):
    lo = col.get("minValue")
    hi = col.get("maxValue")
    if lo is None and hi is None:
        lo, hi = 0.0, 100.0
    elif lo is None:
        lo = float(hi) - 100.0
    elif hi is None:
        hi = float(lo) + 100.0
    lo, hi = float(lo), float(hi)
    if lo > hi:
        lo, hi = hi, lo
    return lo, hi


def _numeric_column(rng, col, n, distorted):
    lo, hi = _resolve_range(col)
    span = hi - lo
    center = (lo + hi) / 2.0

    if span == 0:
        values = np.full(n, lo)
    elif distorted:
        # Skewed mixture: mostly off-center normal, plus a uniform spread
        normal_part = rng.normal(center - span * 0.15, span / 4.0, n)
        uniform_part = rng.uniform(lo, hi, n)
        mask = rng.random(n) < 0.75
        values = np.clip(np.where(mask, normal_part, uniform_part), lo, hi)
    else:
        # Truncated bell curve across the requested range
        values = np.clip(rng.normal(center, span / 6.0, n), lo, hi)

    noise_applied = False
    noise_level = col.get("noiseLevel", 0) if col.get("addNoise") else 0
    if distorted and not noise_level:
        noise_level = DISTORTED_DEFAULT_NOISE_PCT
    if noise_level and span > 0:
        values = values + rng.normal(0, span * noise_level / 100.0, n)
        noise_applied = True

    outlier_pct = col.get("outlierPercentage", 0) if col.get("addOutliers") else 0
    if distorted and not outlier_pct:
        outlier_pct = DISTORTED_DEFAULT_OUTLIER_PCT
    n_outliers = int(round(outlier_pct / 100.0 * n))
    if n_outliers and span > 0:
        idx = rng.choice(n, size=n_outliers, replace=False)
        magnitude = span * rng.uniform(0.6, 3.0, n_outliers)
        direction = rng.choice([-1.0, 1.0], n_outliers)
        values[idx] = np.where(direction > 0, hi + magnitude, lo - magnitude)

    number_type = col.get("numberType", "integers")
    if number_type == "integers":
        out = [int(round(v)) for v in values]
    elif number_type == "decimals":
        out = [round(float(v), 2) for v in values]
    else:  # mixed
        as_int = rng.random(n) < 0.5
        out = [int(round(v)) if flag else round(float(v), 2) for v, flag in zip(values, as_int)]

    stats = {
        "requested_range": [lo, hi],
        "outliers_injected": n_outliers,
        "noise_applied": noise_applied,
    }
    return out, stats


def _date_column(rng, n, distorted):
    today = date.today()
    offsets = rng.integers(0, 731, n)
    dates = [today - timedelta(days=int(d)) for d in offsets]
    out = []
    dirty = rng.random(n) < (DISTORTED_DATE_DIRT_PCT / 100.0) if distorted else np.zeros(n, dtype=bool)
    for d, is_dirty in zip(dates, dirty):
        out.append(d.strftime("%m/%d/%Y") if is_dirty else d.isoformat())
    return out


def _bool_column(rng, n, distorted):
    values = rng.random(n) < 0.5
    out = [bool(v) for v in values]
    if distorted:
        dirty_variants = ["TRUE", "FALSE", "yes", "no", "1", "0"]
        dirty = rng.random(n) < (DISTORTED_BOOL_DIRT_PCT / 100.0)
        for i in range(n):
            if dirty[i]:
                out[i] = dirty_variants[int(rng.integers(0, len(dirty_variants)))]
    return out


def _id_column(rng, name, n):
    letters = "".join(ch for ch in re.sub(r"(?i)_?id$", "", name) if ch.isalpha())
    prefix = (letters[:3].upper() or "ID")
    start = int(rng.integers(10_000, 90_000))
    return [f"{prefix}-{start + i:06d}" for i in range(n)]


def _mangle_text(rng, value):
    choice = int(rng.integers(0, 4))
    if choice == 0:
        return value.upper()
    if choice == 1:
        return value.lower()
    if choice == 2:
        return f"  {value}"
    return f"{value}  "


def _text_column(rng, name, n, record_indices, records, distorted):
    values = []
    for idx in record_indices:
        record = records[int(idx) % len(records)]
        values.append(str(record.get(name, f"{name} {int(idx) + 1}")))
    if distorted:
        dirty = rng.random(n) < (DISTORTED_TEXT_DIRT_PCT / 100.0)
        values = [_mangle_text(rng, v) if d else v for v, d in zip(values, dirty)]
    return values


def _apply_missing(rng, values, nan_pct, n):
    """Blank out an exact share of cells. Returns (values, actual_count)."""
    k = int(round(nan_pct / 100.0 * n))
    if k <= 0:
        return values, 0
    idx = set(int(i) for i in rng.choice(n, size=min(k, n), replace=False))
    return [None if i in idx else v for i, v in enumerate(values)], min(k, n)


def generate_dataset(columns, row_count, distribution_type="balanced", seed=None, text_records=None):
    """Assemble the full table. Returns (rows, quality_report).

    text_records: list of dicts keyed by text-column name; values within one
    record are mutually coherent (e.g. email matches name). Rows pick a random
    record index shared across all text columns to preserve that coherence.
    """
    n = int(row_count)
    distorted = distribution_type == "distorted"
    if seed is None:
        seed = int(np.random.SeedSequence().entropy % (2**31))
    rng = np.random.default_rng(seed)

    # One shared record index per row keeps name/email/etc. consistent
    record_indices = rng.integers(0, max(len(text_records or []), 1), n)

    column_values = {}
    column_reports = []

    for col in columns:
        name = col.get("name", "").strip()
        col_type = col.get("type", "string")
        col_report = {"name": name, "type": col_type}
        numeric_stats = {}

        if col_type == "number":
            values, numeric_stats = _numeric_column(rng, col, n, distorted)
        elif col_type == "date":
            values = _date_column(rng, n, distorted)
        elif col_type == "boolean":
            values = _bool_column(rng, n, distorted)
        elif is_id_column(name):
            values = _id_column(rng, name, n)
        else:
            values = _text_column(rng, name, n, record_indices, text_records or [{}], distorted)

        nan_pct = col.get("nanPercentage", 0) or 0
        if distorted and nan_pct < DISTORTED_MIN_NAN_PCT:
            nan_pct = DISTORTED_MIN_NAN_PCT
        values, missing_count = _apply_missing(rng, values, nan_pct, n)

        present = [v for v in values if v is not None]
        col_report.update({
            "requested_missing_pct": round(nan_pct, 1),
            "actual_missing_pct": round(missing_count / n * 100.0, 1) if n else 0,
            "unique_values": len(set(map(str, present))),
        })
        if col_type == "number":
            numbers = [v for v in present if isinstance(v, (int, float))]
            if numbers:
                col_report["actual_range"] = [round(min(numbers), 2), round(max(numbers), 2)]
                col_report["mean"] = round(float(np.mean(numbers)), 2)
                col_report["std"] = round(float(np.std(numbers)), 2)
            col_report.update(numeric_stats)

        column_reports.append(col_report)
        column_values[name] = values

    rows = [
        {name: column_values[name][i] for name in column_values}
        for i in range(n)
    ]

    report = {
        "rows_requested": n,
        "rows_delivered": len(rows),
        "seed": seed,
        "distribution": distribution_type,
        "columns": column_reports,
    }
    return rows, report
