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


def _resolve_moments(col, lo, hi):
    """Where the mass sits, and how spread it is.

    Without `mean`/`stdDev` the bell is centred on the midpoint of the range with
    a span/6 spread — a symmetric-bell assumption that is wrong for any skewed
    column, and measurably so (see benchmark/RESULTS.md). Supplying the moments
    is how a schema describes a distribution rather than just its bounds.
    """
    span = hi - lo
    mean = col.get("mean")
    std = col.get("stdDev")
    center = float(mean) if mean is not None else (lo + hi) / 2.0
    spread = float(std) if std is not None else span / 6.0
    return min(max(center, lo), hi), max(spread, 1e-9)


def _numeric_column(rng, col, n, distorted):
    lo, hi = _resolve_range(col)
    span = hi - lo
    center, spread = _resolve_moments(col, lo, hi)

    if span == 0:
        values = np.full(n, lo)
    elif distorted:
        # Skewed mixture: mostly off-center normal, plus a uniform spread
        normal_part = rng.normal(center - span * 0.15, max(spread * 1.5, span / 4.0), n)
        uniform_part = rng.uniform(lo, hi, n)
        mask = rng.random(n) < 0.75
        values = np.clip(np.where(mask, normal_part, uniform_part), lo, hi)
    else:
        # Truncated bell curve, centred where the schema says the mass sits
        values = np.clip(rng.normal(center, spread, n), lo, hi)

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
    if col.get("mean") is not None:
        stats["requested_mean"] = round(float(col["mean"]), 2)
    if col.get("stdDev") is not None:
        stats["requested_std"] = round(float(col["stdDev"]), 2)
    return out, stats


def _exact_counts(weights, n):
    """Split n into per-category counts matching `weights` as closely as integers allow.

    Largest-remainder apportionment, so the counts sum to exactly n and the
    requested balance is honoured to the row rather than approached in expectation.
    """
    w = np.asarray(weights, dtype=float)
    w = w / w.sum() if w.sum() > 0 else np.full(len(w), 1.0 / len(w))
    raw = w * n
    counts = np.floor(raw).astype(int)
    remainder = n - int(counts.sum())
    if remainder > 0:
        order = np.argsort(-(raw - counts))
        counts[order[:remainder]] += 1
    return counts


def _categorical_column(rng, col, n, distorted):
    """A label column with an exact, user-specified class balance."""
    cats = [str(c) for c in (col.get("categories") or []) if str(c).strip()]
    if not cats:
        return [None] * n, {}

    weights = col.get("categoryWeights")
    if not weights or len(weights) != len(cats):
        weights = [1.0] * len(cats)

    counts = _exact_counts(weights, n)
    values = [cat for cat, k in zip(cats, counts) for _ in range(int(k))]
    rng.shuffle(values)

    if distorted:
        dirty = rng.random(n) < (DISTORTED_TEXT_DIRT_PCT / 100.0)
        values = [_mangle_text(rng, v) if d else v for v, d in zip(values, dirty)]

    requested = {c: round(float(w) / float(sum(weights)) * 100, 1)
                 for c, w in zip(cats, weights)}
    stats = {
        "categories": cats,
        "requested_distribution_pct": requested,
        "actual_counts": {c: int(k) for c, k in zip(cats, counts)},
    }
    return values, stats


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


class FormulaError(ValueError):
    """A derived column's formula could not be parsed or evaluated."""


_TOKEN_RE = re.compile(r"\s*(?:(\d+\.?\d*)|([A-Za-z_][A-Za-z0-9_]*)|(.))")


def _tokenize(formula):
    tokens = []
    for number, name, symbol in _TOKEN_RE.findall(formula):
        if number:
            tokens.append(("num", float(number)))
        elif name:
            tokens.append(("col", name))
        elif symbol.strip():
            if symbol not in "+-*/()":
                raise FormulaError(f"Unsupported character '{symbol}' in formula.")
            tokens.append(("op", symbol))
    return tokens


def _evaluate_formula(formula, series, n):
    """Evaluate an arithmetic formula over already-generated columns.

    A hand-written recursive-descent parser over + - * / and parentheses. Deliberately
    NOT eval(): a formula arrives from an untrusted request body, and eval() on that is
    remote code execution. The grammar here can only ever produce arithmetic.
    """
    tokens = _tokenize(formula)
    if not tokens:
        raise FormulaError("Formula is empty.")
    pos = 0

    def peek():
        return tokens[pos] if pos < len(tokens) else (None, None)

    def expression():
        nonlocal pos
        value = term()
        while peek() == ("op", "+") or peek() == ("op", "-"):
            _, symbol = tokens[pos]; pos += 1
            value = value + term() if symbol == "+" else value - term()
        return value

    def term():
        nonlocal pos
        value = factor()
        while peek() == ("op", "*") or peek() == ("op", "/"):
            _, symbol = tokens[pos]; pos += 1
            right = factor()
            if symbol == "*":
                value = value * right
            else:
                with np.errstate(divide="ignore", invalid="ignore"):
                    value = value / right
        return value

    def factor():
        nonlocal pos
        kind, value = peek()
        if kind == "op" and value == "-":
            pos += 1
            return -factor()
        if kind == "op" and value == "(":
            pos += 1
            inner = expression()
            if peek() != ("op", ")"):
                raise FormulaError("Unbalanced parentheses in formula.")
            pos += 1
            return inner
        if kind == "num":
            pos += 1
            return np.full(n, value, dtype=float)
        if kind == "col":
            pos += 1
            if value not in series:
                raise FormulaError(
                    f"Formula refers to '{value}', which is not a numeric column defined above it.")
            return series[value].astype(float)
        raise FormulaError("Could not parse formula.")

    result = expression()
    if pos != len(tokens):
        raise FormulaError("Unexpected trailing characters in formula.")
    return np.asarray(result, dtype=float)


def _derived_column(col, series, n):
    """A column computed exactly from other columns, row by row.

    This is what stated correlations cannot do: `Total = Quantity * UnitPrice` is an
    arithmetic identity that must hold in every single row, not a statistical tendency.
    """
    formula = str(col.get("formula") or "").strip()
    if not formula:
        raise FormulaError("Derived columns need a formula.")

    values = _evaluate_formula(formula, series, n)
    finite = np.isfinite(values)

    number_type = col.get("numberType", "decimals")
    out = []
    for value, ok in zip(values, finite):
        if not ok:                      # division by zero etc. -> a hole, not a crash
            out.append(None)
        elif number_type == "integers":
            out.append(int(round(float(value))))
        else:
            out.append(round(float(value), 2))

    referenced = [name for _, name in
                  ((kind, tok) for kind, tok in _tokenize(formula) if kind == "col")]
    stats = {
        "formula": formula,
        "derived_from": sorted(set(referenced)),
        "undefined_cells": int((~finite).sum()),
    }
    return out, stats


def _nearest_correlation_matrix(matrix):
    """Project a user-stated matrix onto the nearest valid correlation matrix.

    Users state correlations pairwise and can easily describe an impossible set
    (A and B both strongly positive with C, but negative with each other). Rather
    than reject the schema, clip the negative eigenvalues away and renormalise —
    the request degrades to the closest achievable structure instead of failing.
    """
    sym = (matrix + matrix.T) / 2.0
    values, vectors = np.linalg.eigh(sym)
    values = np.clip(values, 1e-8, None)
    rebuilt = vectors @ np.diag(values) @ vectors.T
    scale = np.sqrt(np.diag(rebuilt))
    rebuilt = rebuilt / np.outer(scale, scale)
    np.fill_diagonal(rebuilt, 1.0)
    return rebuilt


def _apply_correlations(rng, column_values, correlations, numeric_names, n):
    """Induce the requested correlations via Iman-Conover rank matching.

    Each numeric column is *reordered*, never rewritten: the multiset of values is
    untouched, so exact missing counts, exact outlier counts and range adherence all
    survive intact. Only the pairing between rows changes. That buys joint structure
    without giving up a single one of the engine's exactness guarantees.

    Returns the achieved Pearson r per requested pair, so the report can be audited.
    """
    usable = [c for c in correlations
              if c.get("a") in numeric_names and c.get("b") in numeric_names
              and c.get("a") != c.get("b")]
    if not usable or n < 2:
        return []

    names = sorted({c["a"] for c in usable} | {c["b"] for c in usable})
    index = {name: i for i, name in enumerate(names)}
    target = np.eye(len(names))
    for c in usable:
        rho = float(np.clip(c.get("rho", 0.0), -0.99, 0.99))
        i, j = index[c["a"]], index[c["b"]]
        target[i, j] = target[j, i] = rho

    reference = rng.multivariate_normal(
        np.zeros(len(names)), _nearest_correlation_matrix(target), size=n)

    for name in names:
        # Sort the original Python values, not a float view of them — otherwise an
        # integer column silently comes back as 2.0 and exports as "2.0".
        ordered = sorted(column_values[name])
        ranks = np.argsort(np.argsort(reference[:, index[name]]))
        column_values[name] = [ordered[i] for i in ranks]

    achieved = []
    for c in usable:
        a = np.asarray(column_values[c["a"]], dtype=float)
        b = np.asarray(column_values[c["b"]], dtype=float)
        r = float(np.corrcoef(a, b)[0, 1]) if a.std() and b.std() else 0.0
        achieved.append({"columns": [c["a"], c["b"]],
                         "requested_r": round(float(c.get("rho", 0.0)), 3),
                         "actual_r": round(r, 3)})
    return achieved


def generate_dataset(columns, row_count, distribution_type="balanced", seed=None,
                     text_records=None, correlations=None):
    """Assemble the full table. Returns (rows, quality_report).

    text_records: list of dicts keyed by text-column name; values within one
    record are mutually coherent (e.g. email matches name). Rows pick a random
    record index shared across all text columns to preserve that coherence.

    correlations: optional [{"a": col, "b": col, "rho": 0.4}, ...] between numeric
    columns. Stated by the user from domain knowledge — no source dataset needed.
    """
    n = int(row_count)
    distorted = distribution_type == "distorted"
    if seed is None:
        seed = int(np.random.SeedSequence().entropy % (2**31))
    rng = np.random.default_rng(seed)

    # One shared record index per row keeps name/email/etc. consistent
    record_indices = rng.integers(0, max(len(text_records or []), 1), n)

    column_values = {}
    column_stats = {}
    numeric_names = []
    derived_columns = []

    # Pass 1 — synthesize each column independently
    for col in columns:
        name = col.get("name", "").strip()
        col_type = col.get("type", "string")
        stats = {}

        if col_type == "derived":
            derived_columns.append(col)      # needs its sources first; see pass 3
            continue
        if col_type == "number":
            values, stats = _numeric_column(rng, col, n, distorted)
            numeric_names.append(name)
        elif col_type == "categorical":
            values, stats = _categorical_column(rng, col, n, distorted)
        elif col_type == "date":
            values = _date_column(rng, n, distorted)
        elif col_type == "boolean":
            values = _bool_column(rng, n, distorted)
        elif is_id_column(name):
            values = _id_column(rng, name, n)
        else:
            values = _text_column(rng, name, n, record_indices, text_records or [{}], distorted)

        column_values[name] = values
        column_stats[name] = stats

    # Pass 2 — pair the rows up so the requested joint structure holds.
    # This is a permutation per column, so every per-column guarantee is preserved.
    correlation_report = _apply_correlations(
        rng, column_values, correlations or [], numeric_names, n)

    # Pass 3 — derived columns, computed from the FINAL row values.
    # After correlations, so the arithmetic holds on the rows as they will actually be
    # delivered. Before missing values, and deliberately not re-blanked when a source cell
    # is later blanked: the value did exist, the record just lost that field. That keeps
    # each column's missing % exactly as requested, and it leaves the relationship
    # recoverable — Quantity can be imputed from Total / UnitPrice, which is exactly the
    # exercise this tool exists to set up.
    for col in derived_columns:
        name = col.get("name", "").strip()
        series = {key: np.asarray(values, dtype=float)
                  for key, values in column_values.items() if key in numeric_names}
        values, stats = _derived_column(col, series, n)
        column_values[name] = values
        column_stats[name] = stats
        numeric_names.append(name)       # a derived column can feed the next one

    # Pass 4 — blank cells and report
    column_reports = []
    for col in columns:
        name = col.get("name", "").strip()
        col_type = col.get("type", "string")
        col_report = {"name": name, "type": col_type}
        numeric_stats = column_stats[name]

        nan_pct = col.get("nanPercentage", 0) or 0
        if distorted and nan_pct < DISTORTED_MIN_NAN_PCT:
            nan_pct = DISTORTED_MIN_NAN_PCT
        values, missing_count = _apply_missing(rng, column_values[name], nan_pct, n)
        column_values[name] = values

        present = [v for v in values if v is not None]
        col_report.update({
            "requested_missing_pct": round(nan_pct, 1),
            "actual_missing_pct": round(missing_count / n * 100.0, 1) if n else 0,
            "unique_values": len(set(map(str, present))),
        })
        if col_type in ("number", "derived"):
            numbers = [v for v in present if isinstance(v, (int, float))]
            if numbers:
                col_report["actual_range"] = [round(min(numbers), 2), round(max(numbers), 2)]
                col_report["mean"] = round(float(np.mean(numbers)), 2)
                col_report["std"] = round(float(np.std(numbers)), 2)
            col_report.update(numeric_stats)
        elif col_type == "categorical":
            col_report.update(numeric_stats)
            if present:
                col_report["actual_distribution_pct"] = {
                    c: round(present.count(c) / len(present) * 100, 1)
                    for c in dict.fromkeys(map(str, present))
                }

        column_reports.append(col_report)

    # Declared order, not generation order — derived columns are produced last but must
    # appear where the user put them.
    ordered = [c.get("name", "").strip() for c in columns
               if c.get("name", "").strip() in column_values]
    rows = [{name: column_values[name][i] for name in ordered} for i in range(n)]

    report = {
        "rows_requested": n,
        "rows_delivered": len(rows),
        "seed": seed,
        "distribution": distribution_type,
        "columns": column_reports,
    }
    if correlation_report:
        report["correlations"] = correlation_report
    return rows, report
