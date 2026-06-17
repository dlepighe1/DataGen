"""TSTR — Train on Synthetic, Test on Real (tabular).

The acid test for synthetic data: if you train a model purely on generated rows
and evaluate on *real* held-out data, how close do you get to a model trained on
real data?

We run two real datasets to show both where DataGen shines and where its
independent-column assumption costs accuracy:

  - breast_cancer (569×30, binary)   — strong univariate signal; DataGen excels
  - digits        (1797×64, 10-class)— heavy pixel interactions; the gap widens

For each, four training sources are evaluated on the SAME real test split:

  1. real                  — train on real data            (upper bound)
  2. datagen_conditional   — schema-first generation where each class's per-
                             feature ranges come from the real training data
                             (DataGen used as intended: describe the distribution)
  3. datagen_naive         — label-agnostic generation, labels by class prior only
  4. shuffled              — real features, labels shuffled (lower-bound control)

We also report marginal-distribution fidelity (mean per-feature Wasserstein
distance, normalised) to separate "matches the marginals" from "carries the joint
feature-target structure".

Run from backend/:  python -m benchmark.tstr_benchmark
Depends on numpy, scipy, scikit-learn (already in the project env).
"""

import json

import numpy as np
from scipy.stats import wasserstein_distance
from sklearn.datasets import load_breast_cancer, load_digits
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from generator import generate_dataset

SEED = 42
PCTL = (2, 98)  # robust per-feature range (trim extreme tails before describing)


def _columns_from_ranges(feature_names, lows, highs):
    return [
        {"name": name, "type": "number", "numberType": "decimals",
         "minValue": float(lo), "maxValue": float(hi), "nanPercentage": 0}
        for name, lo, hi in zip(feature_names, lows, highs)
    ]


def _synth_matrix(columns, n, seed):
    rows, _ = generate_dataset(columns, n, distribution_type="balanced", seed=seed)
    names = [c["name"] for c in columns]
    return np.array([[r[name] for name in names] for r in rows], dtype=float)


def make_conditional_synthetic(Xtr, ytr, feature_names, seed):
    """One DataGen schema per class, ranges read from that class's real data."""
    X_parts, y_parts = [], []
    for cls in np.unique(ytr):
        Xc = Xtr[ytr == cls]
        lo = np.percentile(Xc, PCTL[0], axis=0)
        hi = np.percentile(Xc, PCTL[1], axis=0)
        cols = _columns_from_ranges(feature_names, lo, hi)
        Xs = _synth_matrix(cols, len(Xc), seed + int(cls))
        X_parts.append(Xs)
        y_parts.append(np.full(len(Xc), cls))
    return np.vstack(X_parts), np.concatenate(y_parts)


def make_naive_synthetic(Xtr, ytr, feature_names, seed):
    """Label-agnostic generation; labels drawn from the class prior only."""
    lo = np.percentile(Xtr, PCTL[0], axis=0)
    hi = np.percentile(Xtr, PCTL[1], axis=0)
    cols = _columns_from_ranges(feature_names, lo, hi)
    Xs = _synth_matrix(cols, len(Xtr), seed)
    rng = np.random.default_rng(seed)
    classes, counts = np.unique(ytr, return_counts=True)
    ys = rng.choice(classes, size=len(Xs), p=counts / counts.sum())
    return Xs, ys


def evaluate(Xtr, ytr, Xte, yte):
    scaler = StandardScaler().fit(Xtr)
    clf = LogisticRegression(max_iter=5000)
    clf.fit(scaler.transform(Xtr), ytr)
    pred = clf.predict(scaler.transform(Xte))
    return {
        "accuracy": round(float(accuracy_score(yte, pred)), 4),
        "f1": round(float(f1_score(yte, pred, average="macro")), 4),
        "n_train": int(len(Xtr)),
    }


def marginal_fidelity(X_real, X_synth):
    """Mean per-feature Wasserstein distance, normalised by the real feature std,
    so 0 == identical marginals."""
    dists = []
    for j in range(X_real.shape[1]):
        scale = X_real[:, j].std() or 1.0
        dists.append(wasserstein_distance(X_real[:, j], X_synth[:, j]) / scale)
    return round(float(np.mean(dists)), 4)


def run_dataset(name, X, y, feature_names, note):
    Xtr, Xte, ytr, yte = train_test_split(
        X, y, test_size=0.3, random_state=SEED, stratify=y
    )
    majority = float(max(np.bincount(yte)) / len(yte))

    Xc, yc = make_conditional_synthetic(Xtr, ytr, feature_names, SEED)
    Xn, yn = make_naive_synthetic(Xtr, ytr, feature_names, SEED)
    y_shuf = np.random.default_rng(SEED).permutation(ytr)

    arms = {
        "real":                evaluate(Xtr, ytr, Xte, yte),
        "datagen_conditional": evaluate(Xc, yc, Xte, yte),
        "datagen_naive":       evaluate(Xn, yn, Xte, yte),
        "shuffled":            evaluate(Xtr, y_shuf, Xte, yte),
    }
    real_acc = arms["real"]["accuracy"]
    for res in arms.values():
        res["pct_of_real"] = round(res["accuracy"] / real_acc * 100, 1)

    return {
        "dataset": name,
        "note": note,
        "shape": list(X.shape),
        "classes": int(len(np.unique(y))),
        "majority_class_baseline": round(majority, 4),
        "model": "LogisticRegression (standardised)",
        "tstr": arms,
        "marginal_fidelity_wasserstein": {
            "datagen_conditional": marginal_fidelity(Xtr, Xc),
            "uniform_baseline": marginal_fidelity(
                Xtr, np.random.default_rng(SEED).uniform(Xtr.min(0), Xtr.max(0), size=Xc.shape)
            ),
        },
    }


def main():
    bc = load_breast_cancer()
    dg = load_digits()
    results = {
        "breast_cancer": run_dataset(
            "breast_cancer", bc.data, bc.target, list(bc.feature_names),
            "strong univariate signal — DataGen excels"),
        "digits": run_dataset(
            "digits", dg.data, dg.target, [f"px{i}" for i in range(dg.data.shape[1])],
            "heavy pixel interactions — independent columns cost accuracy"),
    }
    print(json.dumps(results, indent=2))
    return results


if __name__ == "__main__":
    main()
