"""Parameter-fidelity & reproducibility benchmark for the DataGen engine.

Measures the guarantees DataGen actually makes about its output, with real
numbers (no mocking): exact missing %, exact outlier counts, range adherence,
distributional shape, seed reproducibility, and throughput.

Run from backend/:  python -m benchmark.fidelity_benchmark
Depends only on numpy + scipy (already in the project env).
"""

import json
import time

import numpy as np
from scipy import stats

from generator import generate_dataset


def _num_col(name, lo, hi, number_type="decimals", **extra):
    col = {"name": name, "type": "number", "numberType": number_type,
           "minValue": lo, "maxValue": hi, "nanPercentage": 0}
    col.update(extra)
    return col


# ───────────────────────── 1. Missing-value exactness ─────────────────────────

def bench_missing_exactness():
    cases = [(1_000, 5), (1_000, 10), (1_000, 20), (5_000, 7), (10_000, 33)]
    errors = []
    for n, pct in cases:
        col = _num_col("V", 0, 100, nanPercentage=pct)
        rows, report = generate_dataset([col], n, seed=42)
        actual = sum(1 for r in rows if r["V"] is None)
        requested = round(pct / 100 * n)
        errors.append(abs(actual - requested))
    return {
        "cases": len(cases),
        "max_cell_error": int(max(errors)),
        "mean_cell_error": round(float(np.mean(errors)), 3),
    }


# ───────────────────────── 2. Outlier-count exactness ─────────────────────────

def bench_outlier_exactness():
    cases = [(1_000, 5), (2_000, 10), (5_000, 3), (10_000, 8)]
    count_errors, leak = [], 0
    for n, pct in cases:
        col = _num_col("V", 0, 100, addOutliers=True, outlierPercentage=pct)
        rows, report = generate_dataset([col], n, seed=7)
        vals = [r["V"] for r in rows if r["V"] is not None]
        outside = sum(1 for v in vals if v < 0 or v > 100)
        expected = round(pct / 100 * n)
        count_errors.append(abs(report["columns"][0]["outliers_injected"] - expected))
        # every injected outlier must actually fall outside the requested range
        if outside != report["columns"][0]["outliers_injected"]:
            leak += 1
    return {
        "cases": len(cases),
        "max_count_error": int(max(count_errors)),
        "out_of_range_mismatches": leak,
    }


# ───────────────────────── 3. Range adherence (no outliers) ────────────────────

def bench_range_adherence():
    specs = [("A", -50, 50), ("B", 0, 1), ("C", 100, 10_000), ("D", 3.0, 7.0)]
    cols = [_num_col(n, lo, hi) for n, lo, hi in specs]
    rows, _ = generate_dataset(cols, 10_000, seed=11)
    inside = total = 0
    for n, lo, hi in specs:
        for r in rows:
            v = r[n]
            if v is None:
                continue
            total += 1
            if lo <= v <= hi:
                inside += 1
    return {"values_checked": total, "in_range_pct": round(inside / total * 100, 4)}


# ───────────────────────── 4. Distributional fidelity (KS test) ────────────────

def bench_distribution():
    """Balanced numeric columns target a truncated normal centred on the range
    midpoint with sigma = span/6. Confirm the realised sample matches that with a
    Kolmogorov–Smirnov test against the truncated-normal CDF."""
    lo, hi = 0.0, 100.0
    n = 10_000
    col = _num_col("V", lo, hi, number_type="decimals")
    rows, _ = generate_dataset([col], n, seed=21)
    sample = np.array([r["V"] for r in rows if r["V"] is not None], dtype=float)

    center = (lo + hi) / 2
    sigma = (hi - lo) / 6
    a, b = (lo - center) / sigma, (hi - center) / sigma  # truncation bounds
    ks_stat, p_value = stats.kstest(
        sample, lambda x: stats.truncnorm.cdf(x, a, b, loc=center, scale=sigma)
    )
    return {
        "n": int(sample.size),
        "ks_statistic": round(float(ks_stat), 4),
        "p_value": round(float(p_value), 4),
        "sample_mean": round(float(sample.mean()), 2),
        "target_mean": center,
    }


# ───────────────────────── 5. Seed reproducibility ─────────────────────────────

def bench_reproducibility():
    cols = [
        {"name": "OrderID", "type": "string"},
        _num_col("Price", 5, 500),
        {"name": "Date", "type": "date"},
        {"name": "Flag", "type": "boolean"},
    ]
    a, _ = generate_dataset(cols, 2_000, seed=123)
    b, _ = generate_dataset(cols, 2_000, seed=123)
    c, _ = generate_dataset(cols, 2_000, seed=124)
    identical = json.dumps(a) == json.dumps(b)
    differs = json.dumps(a) != json.dumps(c)
    return {"same_seed_identical": identical, "diff_seed_differs": differs}


# ───────────────────────── 6. Throughput ───────────────────────────────────────

def bench_throughput():
    cols = [
        {"name": "OrderID", "type": "string"},
        _num_col("Quantity", 1, 5, "integers"),
        _num_col("UnitPrice", 5, 500, nanPercentage=10),
        {"name": "OrderDate", "type": "date"},
        {"name": "IsFirstPurchase", "type": "boolean"},
    ]
    results = {}
    for n in (1_000, 10_000):
        t0 = time.perf_counter()
        generate_dataset(cols, n, seed=99)
        dt = time.perf_counter() - t0
        results[f"{n}_rows_seconds"] = round(dt, 3)
        results[f"{n}_rows_per_sec"] = int(n / dt)
    return results


def main():
    suite = {
        "missing_value_exactness": bench_missing_exactness(),
        "outlier_count_exactness": bench_outlier_exactness(),
        "range_adherence": bench_range_adherence(),
        "distributional_fidelity": bench_distribution(),
        "reproducibility": bench_reproducibility(),
        "throughput": bench_throughput(),
    }
    print(json.dumps(suite, indent=2))
    return suite


if __name__ == "__main__":
    main()
