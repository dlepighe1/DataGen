"""Mixed-type TSTR — Train on Synthetic, Test on Real, on a REAL messy dataset.

The tabular TSTR in `tstr_benchmark.py` uses two sklearn datasets that are 100%
numeric. DataGen's actual product generates *mixed* schemas: numbers alongside
categories. Benchmarking only the numeric path measured the least representative
part of the engine, so this module fixes that.

Dataset: **UCI Adult / Census Income** via OpenML (48,842 rows, 14 features:
6 numeric + 8 categorical, binary target, 76/24 imbalanced). Real, messy, and the
standard reference dataset for tabular synthesis. Subsampled to 10,000 rows
(stratified) so five seeds x three models x six arms stays tractable.

Because the target is imbalanced, **macro-F1 is the headline metric**, not accuracy:
a model that predicts "<=50K" for every row already scores ~76% accuracy.

Arms (all scored on the SAME real held-out split):

  real           — train on real data                             (upper bound)
  copula_real    — Gaussian copula (SDV's `copulas` + `rdt` HyperTransformer)
                   FIT ON THE REAL DATASET. The competitor, given the advantage
                   DataGen refuses to require.
  datagen_schema — per-class schema: numeric bounds + mean + std, and categorical
                   level weights. All stateable from domain knowledge.
  datagen_blind  — the same schema, every number mis-specified by ±25%
  faker_schema   — Faker: uniform numerics in the same bounds, uniform category
                   choice. Isolates what the distribution model actually adds.
  datagen_naive  — label-agnostic generation                      (meant to fail)
  shuffled       — real features, shuffled labels                 (meant to fail)

Run from backend/:  python -m benchmark.mixed_tstr_benchmark
Deps: benchmark/requirements.txt (adds copulas, rdt, faker, pandas)
"""

import json
import warnings

import numpy as np
import pandas as pd
from faker import Faker
from scipy.stats import wasserstein_distance
from sklearn.compose import ColumnTransformer
from sklearn.datasets import fetch_openml
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from copulas.multivariate import GaussianMultivariate
from copulas.univariate import GaussianUnivariate
from rdt import HyperTransformer

from generator import generate_dataset

warnings.filterwarnings("ignore")

SEEDS = [42, 43, 44, 45, 46]
SUBSAMPLE = 10_000
PCTL = (2, 98)
BLIND_NOISE = 0.25
TARGET = "class"

ARMS = ["real", "copula_real", "datagen_schema", "datagen_blind",
        "faker_schema", "datagen_naive", "shuffled"]


def _models(seed):
    return {
        "LogisticRegression": LogisticRegression(max_iter=2000),
        "RandomForest": RandomForestClassifier(n_estimators=200, random_state=seed, n_jobs=-1),
        "HistGradientBoosting": HistGradientBoostingClassifier(random_state=seed),
    }


# ─────────────────────────────────────────────
# Data
# ─────────────────────────────────────────────
def load_adult():
    frame = fetch_openml("adult", version=2, as_frame=True).frame.dropna()
    frame = frame.sample(n=SUBSAMPLE, random_state=SEEDS[0]).reset_index(drop=True)
    y = frame[TARGET].astype(str)
    X = frame.drop(columns=[TARGET])
    num_cols = [c for c in X.columns if pd.api.types.is_numeric_dtype(X[c])]
    cat_cols = [c for c in X.columns if c not in num_cols]
    X[cat_cols] = X[cat_cols].astype(str)
    return X, y, num_cols, cat_cols


# ─────────────────────────────────────────────
# Schema construction (what a user could state)
# ─────────────────────────────────────────────
def _class_schema(Xc, num_cols, cat_cols, levels):
    """Everything a domain expert could say about one class, without a dataset."""
    schema = {}
    for c in num_cols:
        v = Xc[c].to_numpy(dtype=float)
        schema[c] = {"lo": np.percentile(v, PCTL[0]), "hi": np.percentile(v, PCTL[1]),
                     "mean": v.mean(), "std": v.std()}
    for c in cat_cols:
        counts = Xc[c].value_counts(normalize=True)
        schema[c] = {"weights": np.array([counts.get(lv, 0.0) for lv in levels[c]], dtype=float)}
    return schema


def _perturb_schema(schema, num_cols, cat_cols, noise, rng):
    if noise == 0:
        return schema
    out = {}
    for c in num_cols:
        s = schema[c]
        width = max(s["hi"] - s["lo"], 1e-9)
        centre = (s["lo"] + s["hi"]) / 2 + rng.uniform(-noise, noise) * width
        width = max(width * (1 + rng.uniform(-noise, noise)), 1e-9)
        out[c] = {
            "lo": centre - width / 2,
            "hi": centre + width / 2,
            "mean": s["mean"] + rng.uniform(-noise, noise) * max(s["std"], 1e-9),
            "std": max(s["std"] * (1 + rng.uniform(-noise, noise)), 1e-9),
        }
    for c in cat_cols:
        w = schema[c]["weights"] * (1 + rng.uniform(-noise, noise, size=len(schema[c]["weights"])))
        w = np.clip(w, 0, None)
        out[c] = {"weights": w if w.sum() > 0 else np.ones_like(w)}
    return out


def _columns_from_schema(schema, num_cols, cat_cols, levels):
    cols = []
    for c in num_cols:
        s = schema[c]
        cols.append({"name": c, "type": "number", "numberType": "decimals",
                     "minValue": float(s["lo"]), "maxValue": float(s["hi"]),
                     "mean": float(s["mean"]), "stdDev": float(s["std"]),
                     "nanPercentage": 0})
    for c in cat_cols:
        cols.append({"name": c, "type": "categorical", "categories": list(levels[c]),
                     "categoryWeights": [float(w) for w in schema[c]["weights"]],
                     "nanPercentage": 0})
    return cols


# ─────────────────────────────────────────────
# Training sources
# ─────────────────────────────────────────────
def make_datagen(Xtr, ytr, num_cols, cat_cols, levels, seed, noise=0.0, class_aware=True):
    rng = np.random.default_rng(seed)
    parts, labels = [], []
    classes = sorted(ytr.unique())
    for i, cls in enumerate(classes):
        Xc = Xtr[ytr == cls] if class_aware else Xtr
        n = int((ytr == cls).sum())
        schema = _perturb_schema(_class_schema(Xc, num_cols, cat_cols, levels),
                                 num_cols, cat_cols, noise, rng)
        cols = _columns_from_schema(schema, num_cols, cat_cols, levels)
        rows, _ = generate_dataset(cols, n, seed=seed + i)
        parts.append(pd.DataFrame(rows)[list(Xtr.columns)])
        labels.append(pd.Series([cls] * n))
    return pd.concat(parts, ignore_index=True), pd.concat(labels, ignore_index=True)


def make_naive(Xtr, ytr, num_cols, cat_cols, levels, seed):
    """Label-agnostic: one schema for the whole table, labels from the class prior."""
    X, _ = make_datagen(Xtr, ytr, num_cols, cat_cols, levels, seed, class_aware=False)
    rng = np.random.default_rng(seed)
    priors = ytr.value_counts(normalize=True)
    y = pd.Series(rng.choice(priors.index.to_numpy(), size=len(X), p=priors.to_numpy()))
    return X, y


def make_faker(Xtr, ytr, num_cols, cat_cols, levels, seed):
    """Faker: uniform inside the same bounds, uniform over the same categories."""
    fake = Faker()
    Faker.seed(seed)
    parts, labels = [], []
    for i, cls in enumerate(sorted(ytr.unique())):
        Xc = Xtr[ytr == cls]
        n = len(Xc)
        data = {}
        for c in num_cols:
            v = Xc[c].to_numpy(dtype=float)
            lo, hi = np.percentile(v, PCTL[0]), np.percentile(v, PCTL[1])
            hi = max(hi, lo + 1e-6)
            data[c] = [fake.pyfloat(min_value=float(lo), max_value=float(hi)) for _ in range(n)]
        for c in cat_cols:
            data[c] = [fake.random_element(elements=list(levels[c])) for _ in range(n)]
        parts.append(pd.DataFrame(data)[list(Xtr.columns)])
        labels.append(pd.Series([cls] * n))
    return pd.concat(parts, ignore_index=True), pd.concat(labels, ignore_index=True)


def make_copula(Xtr, ytr, seed):
    """Gaussian copula fit per class ON THE REAL DATA.

    rdt's HyperTransformer handles the categorical columns exactly as SDV's
    GaussianCopulaSynthesizer does, so this is a faithful competitor and not a
    strawman built out of ordinal codes.
    """
    np.random.seed(seed)
    parts, labels = [], []
    for cls in sorted(ytr.unique()):
        Xc = Xtr[ytr == cls].reset_index(drop=True)
        ht = HyperTransformer()
        ht.detect_initial_config(Xc)
        ht.fit(Xc)
        transformed = ht.transform(Xc).astype(float)
        transformed += np.random.default_rng(seed).normal(0, 1e-6, size=transformed.shape)

        model = GaussianMultivariate(distribution=GaussianUnivariate)
        model.fit(transformed)
        sampled = model.sample(len(Xc))[transformed.columns]
        out = ht.reverse_transform(sampled)[list(Xtr.columns)]
        parts.append(out)
        labels.append(pd.Series([cls] * len(Xc)))
    return pd.concat(parts, ignore_index=True), pd.concat(labels, ignore_index=True)


def build_arms(Xtr, ytr, num_cols, cat_cols, levels, seed):
    return {
        "real":           (Xtr, ytr),
        "copula_real":    make_copula(Xtr, ytr, seed),
        "datagen_schema": make_datagen(Xtr, ytr, num_cols, cat_cols, levels, seed),
        "datagen_blind":  make_datagen(Xtr, ytr, num_cols, cat_cols, levels, seed,
                                       noise=BLIND_NOISE),
        "faker_schema":   make_faker(Xtr, ytr, num_cols, cat_cols, levels, seed),
        "datagen_naive":  make_naive(Xtr, ytr, num_cols, cat_cols, levels, seed),
        "shuffled":       (Xtr, pd.Series(np.random.default_rng(seed).permutation(ytr.to_numpy()))),
    }


# ─────────────────────────────────────────────
# Evaluation
# ─────────────────────────────────────────────
def evaluate(Xtr, ytr, Xte, yte, num_cols, cat_cols, seed, positive):
    pre = ColumnTransformer([
        ("num", StandardScaler(), num_cols),
        # dense: HistGradientBoosting rejects sparse input
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
    ])
    out = {}
    for name, clf in _models(seed).items():
        pipe = Pipeline([("pre", pre), ("clf", clf)])
        pipe.fit(Xtr, ytr)
        pred = pipe.predict(Xte)
        res = {
            "accuracy": float(accuracy_score(yte, pred)),
            "macro_f1": float(f1_score(yte, pred, average="macro")),
        }
        try:
            proba = pipe.predict_proba(Xte)[:, list(pipe.classes_).index(positive)]
            res["roc_auc"] = float(roc_auc_score((yte == positive).astype(int), proba))
        except (ValueError, IndexError):
            res["roc_auc"] = float("nan")
        out[name] = res
    return out


def fidelity(real, synth, num_cols, cat_cols):
    """Numeric: mean normalised Wasserstein. Categorical: mean total-variation distance."""
    w = []
    for c in num_cols:
        r = real[c].to_numpy(dtype=float)
        s = pd.to_numeric(synth[c], errors="coerce").fillna(r.mean()).to_numpy(dtype=float)
        w.append(wasserstein_distance(r, s) / (r.std() or 1.0))
    tv = []
    for c in cat_cols:
        rp = real[c].astype(str).value_counts(normalize=True)
        sp = synth[c].astype(str).value_counts(normalize=True)
        levels = set(rp.index) | set(sp.index)
        tv.append(0.5 * sum(abs(rp.get(lv, 0.0) - sp.get(lv, 0.0)) for lv in levels))
    return {"numeric_wasserstein": round(float(np.mean(w)), 4),
            "categorical_tv_distance": round(float(np.mean(tv)), 4)}


def _agg(values, scale=100):
    return {"mean": round(float(np.mean(values)) * scale, 2),
            "std": round(float(np.std(values)) * scale, 2)}


def main():
    X, y, num_cols, cat_cols = load_adult()
    levels = {c: sorted(X[c].unique()) for c in cat_cols}
    positive = sorted(y.unique())[-1]  # ">50K"

    Xtr, Xte, ytr, yte = train_test_split(
        X, y, test_size=0.3, random_state=SEEDS[0], stratify=y)
    majority = float(yte.value_counts(normalize=True).max())

    metrics = {a: {m: {k: [] for k in ("accuracy", "macro_f1", "roc_auc")}
                   for m in _models(0)} for a in ARMS}
    fid = {a: [] for a in ARMS if a not in ("real", "shuffled")}

    for seed in SEEDS:
        arms = build_arms(Xtr, ytr, num_cols, cat_cols, levels, seed)
        for arm, (Xa, ya) in arms.items():
            for model, res in evaluate(Xa, ya, Xte, yte, num_cols, cat_cols, seed, positive).items():
                for k, v in res.items():
                    metrics[arm][model][k].append(v)
            if arm in fid:
                fid[arm].append(fidelity(Xtr, Xa, num_cols, cat_cols))

    real_f1 = {m: float(np.mean(metrics["real"][m]["macro_f1"])) for m in _models(0)}

    by_model = {}
    for model in _models(0):
        by_model[model] = {}
        for arm in ARMS:
            d = metrics[arm][model]
            by_model[model][arm] = {
                "accuracy": _agg(d["accuracy"]),
                "macro_f1": _agg(d["macro_f1"]),
                "roc_auc": _agg(d["roc_auc"]),
                "pct_of_real_f1": round(float(np.mean(d["macro_f1"])) / real_f1[model] * 100, 1),
            }

    results = {
        "dataset": "UCI Adult (OpenML), subsampled",
        "shape": [len(X), X.shape[1]],
        "numeric_columns": len(num_cols),
        "categorical_columns": len(cat_cols),
        "class_balance": {k: round(v, 3) for k, v in y.value_counts(normalize=True).items()},
        "majority_class_baseline": round(majority, 4),
        "headline_metric": "macro_f1 (target is 76/24 imbalanced — accuracy flatters)",
        "seeds": SEEDS,
        "models": list(_models(0)),
        "primary_model": "LogisticRegression",
        "tstr": by_model["LogisticRegression"],
        "by_model": by_model,
        "fidelity": {
            arm: {
                "numeric_wasserstein": round(
                    float(np.mean([f["numeric_wasserstein"] for f in runs])), 4),
                "categorical_tv_distance": round(
                    float(np.mean([f["categorical_tv_distance"] for f in runs])), 4),
            }
            for arm, runs in fid.items()
        },
    }
    print(json.dumps(results, indent=2))
    return results


if __name__ == "__main__":
    main()
