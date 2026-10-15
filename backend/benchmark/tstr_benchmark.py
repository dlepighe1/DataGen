"""TSTR — Train on Synthetic, Test on Real (tabular).

The acid test for synthetic data: if you train a model purely on generated rows
and evaluate on *real* held-out data, how close do you get to a model trained on
real data?

Two real datasets, chosen to show both ends of the story:

  - breast_cancer (569×30, binary)    — strong univariate signal
  - digits        (1797×64, 10-class) — heavy pixel interactions

Eight training sources are evaluated on the SAME real test split:

  1. real              — train on real data                    (upper bound)
  2. copula_real       — Gaussian copula (SDV's `copulas` lib) fit per class on
                         the real training data. A competitor that is GIVEN the
                         real dataset; DataGen is not.
  3. datagen_range     — DataGen given per-class min/max only. This is what the
                         engine could express before the `mean`/`stdDev` schema
                         fields existed: bounds, but no idea where the mass sits.
  4. datagen_moments   — DataGen given per-class min/max AND mean/std. A user can
                         state these from domain knowledge ("orders average $40,
                         most land between $20 and $60") without owning a dataset.
  5. datagen_blind     — datagen_moments with a *mis-specified* schema: every
                         bound and moment perturbed by ±25%, modelling a user who
                         describes the distribution approximately, not perfectly.
  6. faker_schema      — Faker, given the SAME per-class ranges (uniform draws).
                         Isolates distribution SHAPE, holding schema info constant.
  7. datagen_naive     — label-agnostic generation; labels from the class prior
  8. shuffled          — real features, labels shuffled       (lower-bound control)

The datagen_range vs. faker_schema vs. datagen_moments contrast is the point of
this benchmark: bounds alone buy you nothing over a uniform faker, and the moments
are what actually purchase fidelity.

Every arm is repeated over N_SEEDS seeds and scored with THREE downstream models
(LogisticRegression, RandomForest, HistGradientBoosting), so results are reported
as mean ± std rather than a single lucky split.

A schema-noise sweep (0% → 50%) quantifies the honest question a user should ask:
"what do I get if my schema is only roughly right?"

Run from backend/:  python -m benchmark.tstr_benchmark
Deps: numpy, scipy, scikit-learn, copulas, faker (benchmark/requirements.txt)
"""

import json
import warnings

import numpy as np
import pandas as pd
from faker import Faker
from scipy.stats import wasserstein_distance
from sklearn.datasets import load_breast_cancer, load_digits
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from copulas.multivariate import GaussianMultivariate
from copulas.univariate import GaussianUnivariate

from generator import generate_dataset

warnings.filterwarnings("ignore")

SEEDS = [42, 43, 44, 45, 46]
PCTL = (2, 98)          # robust per-feature range (trim extreme tails)
BLIND_NOISE = 0.25      # the headline "user got the schema roughly right" arm
NOISE_SWEEP = [0.0, 0.10, 0.25, 0.50]

# "How many correlations must a user actually state?" Nobody will hand-write 435
# pairwise correlations for a 30-column schema, so the question that matters is
# whether a handful of the strongest ones recovers most of the joint structure.
CORR_SWEEP = [0, 3, 5, 10, 20, 50]

ARMS = [
    "real", "copula_real", "datagen_moments", "datagen_range", "datagen_blind",
    "faker_schema", "datagen_naive", "shuffled",
]


def _models(seed):
    return {
        "LogisticRegression": LogisticRegression(max_iter=5000),
        "RandomForest": RandomForestClassifier(n_estimators=200, random_state=seed, n_jobs=-1),
        "HistGradientBoosting": HistGradientBoostingClassifier(random_state=seed),
    }


# ─────────────────────────────────────────────
# Schema construction
# ─────────────────────────────────────────────
def _columns_from_schema(feature_names, lows, highs, means=None, stds=None):
    """Build a DataGen schema. Omitting means/stds is the bounds-only schema."""
    cols = []
    for j, name in enumerate(feature_names):
        col = {"name": name, "type": "number", "numberType": "decimals",
               "minValue": float(lows[j]), "maxValue": float(highs[j]), "nanPercentage": 0}
        if means is not None:
            col["mean"] = float(means[j])
        if stds is not None:
            col["stdDev"] = float(stds[j])
        cols.append(col)
    return cols


def _perturb(lows, highs, means, stds, noise, rng):
    """Model a user who describes the distribution approximately.

    Bounds are shifted off-centre and re-scaled by up to ±`noise`; the stated
    mean and std are knocked about by the same factor. noise=0 is exact.
    """
    if noise == 0:
        return lows, highs, means, stds
    width = np.maximum(highs - lows, 1e-9)
    centre = (lows + highs) / 2 + rng.uniform(-noise, noise, size=lows.shape) * width
    width = np.maximum(width * (1 + rng.uniform(-noise, noise, size=width.shape)), 1e-9)
    lo, hi = centre - width / 2, centre + width / 2

    p_mean = means + rng.uniform(-noise, noise, size=means.shape) * np.maximum(stds, 1e-9)
    p_std = np.maximum(stds * (1 + rng.uniform(-noise, noise, size=stds.shape)), 1e-9)
    return lo, hi, p_mean, p_std


def _class_schema(Xtr, ytr, cls):
    """Everything a user could state about this class, from domain knowledge."""
    Xc = Xtr[ytr == cls]
    return (np.percentile(Xc, PCTL[0], axis=0),
            np.percentile(Xc, PCTL[1], axis=0),
            Xc.mean(axis=0),
            Xc.std(axis=0),
            len(Xc))


def _synth_matrix(columns, n, seed):
    rows, _ = generate_dataset(columns, n, distribution_type="balanced", seed=seed)
    names = [c["name"] for c in columns]
    return np.array([[r[name] for name in names] for r in rows], dtype=float)


# ─────────────────────────────────────────────
# Training sources
# ─────────────────────────────────────────────
def top_pairs(Xtr, k):
    """The k strongest pairwise correlations — the ones a domain expert would name first."""
    if k <= 0:
        return []
    corr = np.nan_to_num(np.corrcoef(Xtr, rowvar=False))
    rows, cols = np.triu_indices(Xtr.shape[1], k=1)
    strongest = np.argsort(-np.abs(corr[rows, cols]))[:k]
    return [(int(rows[i]), int(cols[i])) for i in strongest]


def _correlations_for_class(Xc, feature_names, pairs):
    """The rho a user would state for each named pair, for this class."""
    if not pairs:
        return []
    corr = np.nan_to_num(np.corrcoef(Xc, rowvar=False))
    return [{"a": feature_names[i], "b": feature_names[j], "rho": float(corr[i, j])}
            for i, j in pairs]


def make_datagen(Xtr, ytr, feature_names, seed, noise=0.0, moments=True, pairs=None):
    """One DataGen schema per class.

    moments=False gives the engine bounds only (the pre-`mean`/`stdDev` schema).
    `pairs` are the column pairs whose correlation the user chose to state.
    `noise` mis-specifies everything the user stated.
    """
    rng = np.random.default_rng(seed)
    X_parts, y_parts = [], []
    for cls in np.unique(ytr):
        Xc = Xtr[ytr == cls]
        lo, hi, mu, sd, n = _class_schema(Xtr, ytr, cls)
        lo, hi, mu, sd = _perturb(lo, hi, mu, sd, noise, rng)
        cols = (_columns_from_schema(feature_names, lo, hi, mu, sd) if moments
                else _columns_from_schema(feature_names, lo, hi))
        correlations = _correlations_for_class(Xc, feature_names, pairs or [])
        rows, _ = generate_dataset(cols, n, distribution_type="balanced",
                                   seed=seed + int(cls), correlations=correlations)
        X_parts.append(np.array([[r[c["name"]] for c in cols] for r in rows], dtype=float))
        y_parts.append(np.full(n, cls))
    return np.vstack(X_parts), np.concatenate(y_parts)


def make_faker(Xtr, ytr, feature_names, seed):
    """Faker, handed the SAME per-class bounds DataGen gets.

    Faker has no statistical model, so values are uniform inside the range. This
    isolates distribution *shape*: same bounds, no distribution.
    """
    fake = Faker()
    Faker.seed(seed)
    X_parts, y_parts = [], []
    for cls in np.unique(ytr):
        lo, hi, _, _, n = _class_schema(Xtr, ytr, cls)
        Xs = np.array([
            [fake.pyfloat(min_value=float(lo[j]), max_value=float(max(hi[j], lo[j] + 1e-6)))
             for j in range(len(feature_names))]
            for _ in range(n)
        ], dtype=float)
        X_parts.append(Xs)
        y_parts.append(np.full(n, cls))
    return np.vstack(X_parts), np.concatenate(y_parts)


def make_copula(Xtr, ytr, feature_names, seed):
    """Gaussian copula (SDV's `copulas`) fit per class ON THE REAL DATA.

    This is the competitor DataGen is positioned against, and it is deliberately
    given the advantage DataGen refuses to require: access to the real dataset.
    """
    np.random.seed(seed)
    X_parts, y_parts = [], []
    for cls in np.unique(ytr):
        Xc = Xtr[ytr == cls]
        # constant columns are singular for a Gaussian copula; jitter them
        jitter = np.random.default_rng(seed).normal(0, 1e-6, size=Xc.shape)
        df = pd.DataFrame(Xc + jitter, columns=feature_names)
        model = GaussianMultivariate(distribution=GaussianUnivariate)
        model.fit(df)
        Xs = model.sample(len(Xc))[feature_names].to_numpy(dtype=float)
        Xs = np.nan_to_num(Xs, nan=0.0, posinf=0.0, neginf=0.0)
        X_parts.append(Xs)
        y_parts.append(np.full(len(Xc), cls))
    return np.vstack(X_parts), np.concatenate(y_parts)


def make_naive(Xtr, ytr, feature_names, seed):
    """Label-agnostic generation; labels drawn from the class prior only."""
    lo = np.percentile(Xtr, PCTL[0], axis=0)
    hi = np.percentile(Xtr, PCTL[1], axis=0)
    cols = _columns_from_schema(feature_names, lo, hi, Xtr.mean(axis=0), Xtr.std(axis=0))
    Xs = _synth_matrix(cols, len(Xtr), seed)
    rng = np.random.default_rng(seed)
    classes, counts = np.unique(ytr, return_counts=True)
    return Xs, rng.choice(classes, size=len(Xs), p=counts / counts.sum())


def build_arms(Xtr, ytr, feature_names, seed):
    return {
        "real":            (Xtr, ytr),
        "copula_real":     make_copula(Xtr, ytr, feature_names, seed),
        "datagen_moments": make_datagen(Xtr, ytr, feature_names, seed, noise=0.0),
        "datagen_range":   make_datagen(Xtr, ytr, feature_names, seed, moments=False),
        "datagen_blind":   make_datagen(Xtr, ytr, feature_names, seed, noise=BLIND_NOISE),
        "faker_schema":    make_faker(Xtr, ytr, feature_names, seed),
        "datagen_naive":   make_naive(Xtr, ytr, feature_names, seed),
        "shuffled":        (Xtr, np.random.default_rng(seed).permutation(ytr)),
    }


# ─────────────────────────────────────────────
# Evaluation
# ─────────────────────────────────────────────
def evaluate(Xtr, ytr, Xte, yte, seed):
    scaler = StandardScaler().fit(Xtr)
    Xtr_s, Xte_s = scaler.transform(Xtr), scaler.transform(Xte)
    out = {}
    for name, clf in _models(seed).items():
        clf.fit(Xtr_s, ytr)
        pred = clf.predict(Xte_s)
        out[name] = {
            "accuracy": float(accuracy_score(yte, pred)),
            "f1": float(f1_score(yte, pred, average="macro")),
        }
    return out


def marginal_fidelity(X_real, X_synth):
    """Mean per-feature Wasserstein distance, normalised by real feature std."""
    dists = []
    for j in range(X_real.shape[1]):
        scale = X_real[:, j].std() or 1.0
        dists.append(wasserstein_distance(X_real[:, j], X_synth[:, j]) / scale)
    return round(float(np.mean(dists)), 4)


def joint_fidelity(X_real, X_synth):
    """Mean absolute error over the correlation matrix — how well joint structure is
    reproduced, as opposed to the per-column marginals."""
    real = np.nan_to_num(np.corrcoef(X_real, rowvar=False))
    synth = np.nan_to_num(np.corrcoef(X_synth, rowvar=False))
    upper = np.triu_indices(real.shape[0], k=1)
    return round(float(np.mean(np.abs(real[upper] - synth[upper]))), 4)


def _agg(values):
    return {"mean": round(float(np.mean(values)) * 100, 2),
            "std": round(float(np.std(values)) * 100, 2)}


def run_dataset(name, X, y, feature_names, note):
    Xtr, Xte, ytr, yte = train_test_split(
        X, y, test_size=0.3, random_state=SEEDS[0], stratify=y
    )
    majority = float(max(np.bincount(yte)) / len(yte))

    # accuracy[arm][model] = [acc per seed]; same for f1
    acc = {a: {m: [] for m in _models(0)} for a in ARMS}
    f1s = {a: {m: [] for m in _models(0)} for a in ARMS}
    sweep = {f"{int(p*100)}": {m: [] for m in _models(0)} for p in NOISE_SWEEP}
    corr_sweep = {str(k): {m: [] for m in _models(0)} for k in CORR_SWEEP}
    corr_fidelity = {str(k): [] for k in CORR_SWEEP}
    copula_joint = []
    fidelity = {k: [] for k in
                ("datagen_moments", "datagen_range", "copula_real", "faker_schema", "uniform_baseline")}
    n_train = {}

    n_features = Xtr.shape[1]
    total_pairs = n_features * (n_features - 1) // 2

    for seed in SEEDS:
        arms = build_arms(Xtr, ytr, feature_names, seed)
        for arm, (Xa, ya) in arms.items():
            n_train[arm] = int(len(Xa))
            for model, res in evaluate(Xa, ya, Xte, yte, seed).items():
                acc[arm][model].append(res["accuracy"])
                f1s[arm][model].append(res["f1"])

        # schema-noise sweep (how wrong can the user's schema be?)
        for p in NOISE_SWEEP:
            Xp, yp = make_datagen(Xtr, ytr, feature_names, seed, noise=p)
            for model, res in evaluate(Xp, yp, Xte, yte, seed).items():
                sweep[f"{int(p*100)}"][model].append(res["accuracy"])

        # correlation sweep (how many correlations must the user state?)
        for k in CORR_SWEEP:
            pairs = top_pairs(Xtr, k)
            Xk, yk = make_datagen(Xtr, ytr, feature_names, seed, pairs=pairs)
            for model, res in evaluate(Xk, yk, Xte, yte, seed).items():
                corr_sweep[str(k)][model].append(res["accuracy"])
            corr_fidelity[str(k)].append(joint_fidelity(Xtr, Xk))

        # marginal fidelity vs. the real training marginals
        rng = np.random.default_rng(seed)
        for arm in ("datagen_moments", "datagen_range", "copula_real", "faker_schema"):
            fidelity[arm].append(marginal_fidelity(Xtr, arms[arm][0]))
        fidelity["uniform_baseline"].append(marginal_fidelity(
            Xtr, rng.uniform(Xtr.min(0), Xtr.max(0), size=arms["datagen_moments"][0].shape)))

        # the copula's joint error is the ceiling the correlation sweep is chasing
        copula_joint.append(joint_fidelity(Xtr, arms["copula_real"][0]))

    real_mean = {m: float(np.mean(acc["real"][m])) for m in _models(0)}

    by_model = {}
    for model in _models(0):
        by_model[model] = {}
        for arm in ARMS:
            a = _agg(acc[arm][model])
            a["f1"] = round(float(np.mean(f1s[arm][model])), 3)
            a["pct_of_real"] = round(float(np.mean(acc[arm][model])) / real_mean[model] * 100, 1)
            a["n_train"] = n_train[arm]
            by_model[model][arm] = a

    return {
        "dataset": name,
        "note": note,
        "shape": list(X.shape),
        "classes": int(len(np.unique(y))),
        "majority_class_baseline": round(majority, 4),
        "seeds": SEEDS,
        "primary_model": "LogisticRegression",
        "tstr": by_model["LogisticRegression"],   # headline numbers
        "by_model": by_model,
        "schema_noise_sweep": {
            p: {
                model: {
                    "accuracy": _agg(v[model]),
                    "pct_of_real": round(float(np.mean(v[model])) / real_mean[model] * 100, 1),
                }
                for model in _models(0)
            }
            for p, v in sweep.items()
        },
        "correlation_sweep": {
            "total_pairs_available": total_pairs,
            "copula_joint_error": round(float(np.mean(copula_joint)), 4),
            "by_k": {
                k: {
                    "pairs_stated": int(k),
                    "pct_of_pairs": round(int(k) / total_pairs * 100, 1),
                    "joint_error": round(float(np.mean(corr_fidelity[k])), 4),
                    **{
                        model: {
                            "accuracy": _agg(v[model]),
                            "pct_of_real": round(
                                float(np.mean(v[model])) / real_mean[model] * 100, 1),
                        }
                        for model in _models(0)
                    },
                }
                for k, v in corr_sweep.items()
            },
        },
        "marginal_fidelity_wasserstein": {
            k: round(float(np.mean(v)), 4) for k, v in fidelity.items()
        },
    }


def main():
    bc = load_breast_cancer()
    dg = load_digits()
    results = {
        "config": {
            "seeds": SEEDS,
            "models": list(_models(0)),
            "blind_schema_noise": BLIND_NOISE,
            "schema_noise_sweep": NOISE_SWEEP,
            "test_split": 0.3,
        },
        "breast_cancer": run_dataset(
            "breast_cancer", bc.data, bc.target, list(bc.feature_names),
            "strong univariate signal"),
        "digits": run_dataset(
            "digits", dg.data, dg.target, [f"px{i}" for i in range(dg.data.shape[1])],
            "heavy pixel interactions — independent columns cost accuracy"),
    }
    print(json.dumps(results, indent=2))
    return results


if __name__ == "__main__":
    main()
