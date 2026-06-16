"""Tests for the NLP dataset engine.

Run from backend/:  python -m pytest test_nlp.py -v
"""

from nlp_tasks import build_offline_pool, generate_nlp_dataset, DEFAULT_LABELS


def make(task, n=400, seed=7, distorted=False, labels=None, negative_ratio=0.5, pool_size=80):
    labels = labels or DEFAULT_LABELS
    pool = build_offline_pool(task, pool_size, labels, seed)
    return generate_nlp_dataset(task, n, distorted=distorted, seed=seed, pool=pool,
                                labels=labels, negative_ratio=negative_ratio)


class TestClassification:
    def test_exact_class_balance_when_balanced(self):
        rows, report = make("classification", n=300)
        counts = report["label_distribution"]
        assert sorted(counts.values()) == [100, 100, 100]

    def test_skewed_distribution_when_distorted(self):
        rows, report = make("classification", n=300, distorted=True)
        counts = list(report["label_distribution"].values())
        assert max(counts) > min(counts)

    def test_custom_labels(self):
        rows, report = make("classification", labels=["spam", "ham"])
        assert set(report["label_distribution"].keys()) == {"spam", "ham"}

    def test_label_noise_only_when_distorted(self):
        _, clean = make("classification", n=500)
        _, noisy = make("classification", n=500, distorted=True)
        assert clean["label_noise_flips"] == 0
        assert noisy["label_noise_flips"] == 25  # exactly 5% of 500


class TestRetrieval:
    def test_exact_negative_ratio(self):
        rows, report = make("retrieval", n=400, negative_ratio=0.5)
        negatives = [r for r in rows if r["Relevance"] == 0]
        assert len(negatives) == 200
        assert report["negative_pairs"] == 200

    def test_negative_passage_comes_from_different_pool_item(self):
        rows, _ = make("retrieval", n=400)
        for r in rows:
            if r["Relevance"] == 0:
                assert r["QueryID"][2:] != r["PassageID"][2:]
            else:
                assert r["QueryID"][2:] == r["PassageID"][2:]

    def test_columns(self):
        rows, _ = make("retrieval", n=10)
        assert list(rows[0].keys()) == ["QueryID", "Query", "PassageID", "Passage", "Relevance"]


class TestQA:
    def test_answer_appears_in_context(self):
        rows, _ = make("qa", n=200)
        for r in rows:
            assert r["Answer"] in r["Context"]


class TestPairs:
    def test_exact_negative_ratio(self):
        rows, _ = make("pairs", n=300, negative_ratio=0.3)
        assert sum(1 for r in rows if r["IsParaphrase"] == 0) == 90

    def test_positives_use_matching_pool_item(self):
        pool = build_offline_pool("pairs", 50, DEFAULT_LABELS, 3)
        rows, _ = generate_nlp_dataset("pairs", 200, seed=3, pool=pool, negative_ratio=0.5)
        pos_map = {p["sentence1"]: p["sentence2"] for p in pool}
        for r in rows:
            if r["IsParaphrase"] == 1:
                assert pos_map[r["Sentence1"]] == r["Sentence2"]


class TestGeneral:
    def test_seed_reproducibility(self):
        rows_a, _ = make("retrieval", n=100, seed=42)
        rows_b, _ = make("retrieval", n=100, seed=42)
        assert rows_a == rows_b

    def test_offline_pools_are_unique(self):
        for task in ("classification", "retrieval", "qa", "pairs"):
            pool = build_offline_pool(task, 100, DEFAULT_LABELS, 1)
            first_key = list(pool[0].keys())[0]
            values = [p[first_key] for p in pool]
            assert len(set(values)) == len(values), f"{task} pool has duplicates"

    def test_ten_thousand_rows(self):
        rows, report = make("retrieval", n=10_000)
        assert len(rows) == 10_000
        assert report["unique_pool_size"] >= 60

    def test_report_column_summaries(self):
        _, report = make("qa", n=50)
        names = [c["name"] for c in report["columns"]]
        assert names == ["ContextID", "Context", "Question", "Answer"]
        assert all(c["avg_chars"] > 0 for c in report["columns"])
