"""NLP TSTR — train on synthetic sentiment, test on a REAL public dataset.

Train a text classifier ONLY on DataGen's NLP classification output (synthetic
product-review sentiment, offline engine), then test it on the real, public
**UCI Sentiment Labelled Sentences** corpus (3,000 human-written amazon / imdb /
yelp sentences, binary labels). The model never sees a real sentence during
training, so this measures genuine transfer.

The dataset is downloaded once and cached under benchmark/.data/. If the network
is unavailable, the script falls back to a small built-in set of human-written
reviews so it still runs (clearly flagged in the output).

Run from backend/:  python -m benchmark.nlp_tstr_benchmark
Depends on scikit-learn (already in the project env).
"""

import io
import json
import os
import urllib.request
import zipfile

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.pipeline import make_pipeline

from nlp_tasks import build_offline_pool, generate_nlp_dataset

SEED = 42
LABELS = ["positive", "negative"]
DATA_DIR = os.path.join(os.path.dirname(__file__), ".data")
UCI_URL = ("https://archive.ics.uci.edu/ml/machine-learning-databases/"
           "00331/sentiment%20labelled%20sentences.zip")

# Offline fallback: human-written reviews (only used if the download fails).
_FALLBACK = [
    ("This blender is fantastic, easily worth every cent.", "positive"),
    ("Absolutely love these running shoes, so comfortable.", "positive"),
    ("The headphones work perfectly and the sound is great.", "positive"),
    ("Brilliant little camera, I would recommend it to anyone.", "positive"),
    ("The desk lamp broke on the second day, terrible quality.", "negative"),
    ("Cheap plastic that fell apart almost immediately.", "negative"),
    ("My tablet stopped working after a week, total waste.", "negative"),
    ("Flimsy build and overpriced, I regret buying it.", "negative"),
]


def load_real_test():
    """Return (texts, labels, source). UCI corpus if reachable, else fallback."""
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        zpath = os.path.join(DATA_DIR, "uci_sentiment.zip")
        if not os.path.exists(zpath):
            urllib.request.urlretrieve(UCI_URL, zpath)
        texts, labels = [], []
        with zipfile.ZipFile(zpath) as z:
            for fname in z.namelist():
                if fname.endswith("_labelled.txt"):
                    for line in io.TextIOWrapper(z.open(fname), encoding="utf-8", errors="ignore"):
                        line = line.strip()
                        if not line or "\t" not in line:
                            continue
                        text, _, lab = line.rpartition("\t")
                        lab = lab.strip()
                        if lab in ("0", "1"):
                            texts.append(text.strip())
                            labels.append("positive" if lab == "1" else "negative")
        if len(texts) >= 100:
            return texts, labels, f"UCI Sentiment Labelled Sentences ({len(texts)} real sentences)"
    except Exception as e:  # noqa: BLE001 — any network/parse failure → fallback
        print(f"[warn] UCI download failed ({e.__class__.__name__}); using built-in fallback set.")
    return ([t for t, _ in _FALLBACK], [l for _, l in _FALLBACK],
            f"built-in human-written fallback ({len(_FALLBACK)} sentences)")


def datagen_training_set(n_rows, distorted=False, seed=SEED):
    pool = build_offline_pool("classification", 400, LABELS, seed)
    rows, report = generate_nlp_dataset(
        "classification", n_rows, distorted=distorted, seed=seed, pool=pool, labels=LABELS,
    )
    return [r["Text"] for r in rows], [r["Label"] for r in rows], report


def _fit(X, y):
    clf = make_pipeline(
        TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True),
        LogisticRegression(max_iter=2000, C=4.0),
    )
    clf.fit(X, y)
    return clf


def main():
    rng = np.random.default_rng(SEED)
    X_real, y_real, source = load_real_test()

    # Train purely on DataGen synthetic sentiment
    X_train, y_train, train_report = datagen_training_set(1500, distorted=False)
    pred = _fit(X_train, y_train).predict(X_real)

    # Controls
    _, counts = np.unique(y_real, return_counts=True)
    majority = float(counts.max() / counts.sum())
    pred_ctrl = _fit(X_train, list(rng.permutation(y_train))).predict(X_real)
    _, _, distorted_report = datagen_training_set(1500, distorted=True)

    report = {
        "task": "classification (sentiment, binary)",
        "train": "DataGen synthetic, 1500 rows (offline engine)",
        "test": source,
        "model": "TF-IDF (1-2gram) + LogisticRegression",
        "majority_class_baseline": round(majority, 4),
        "tstr": {
            "synthetic_to_real_accuracy": round(float(accuracy_score(y_real, pred)), 4),
            "synthetic_to_real_macro_f1": round(float(f1_score(y_real, pred, average="macro")), 4),
        },
        "shuffled_control_accuracy": round(float(accuracy_score(y_real, pred_ctrl)), 4),
        "controls": {
            "balanced_class_distribution": train_report["label_distribution"],
            "distorted_class_distribution": distorted_report["label_distribution"],
            "distorted_label_noise_flips": distorted_report["label_noise_flips"],
        },
    }
    print(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    main()
