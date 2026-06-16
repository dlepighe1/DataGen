"""Tests for the statistical generation engine and local semantic pools.

Run from backend/:  python -m pytest test_generator.py -v
"""

import re

import pytest

from generator import generate_dataset, is_id_column, is_text_column
from text_pools import build_local_records, expand_records


def num_col(name="Score", **overrides):
    col = {"name": name, "type": "number", "numberType": "integers",
           "minValue": 0, "maxValue": 100, "nanPercentage": 0}
    col.update(overrides)
    return col


class TestIdDetection:
    def test_id_suffixes(self):
        assert is_id_column("OrderID")
        assert is_id_column("customer_id")
        assert is_id_column("id")

    def test_paid_is_not_an_id(self):
        assert not is_id_column("Paid")
        assert not is_id_column("Grid")


class TestNumericColumns:
    def test_respects_range_without_noise_or_outliers(self):
        rows, _ = generate_dataset([num_col()], 500, seed=42)
        values = [r["Score"] for r in rows]
        assert all(0 <= v <= 100 for v in values)

    def test_integer_type(self):
        rows, _ = generate_dataset([num_col()], 200, seed=1)
        assert all(isinstance(r["Score"], int) for r in rows)

    def test_decimal_type(self):
        rows, _ = generate_dataset([num_col(numberType="decimals")], 200, seed=1)
        assert all(isinstance(r["Score"], float) for r in rows)

    def test_outliers_injected_outside_range(self):
        col = num_col(addOutliers=True, outlierPercentage=10)
        rows, report = generate_dataset([col], 1000, seed=7)
        values = [r["Score"] for r in rows]
        outside = [v for v in values if v < 0 or v > 100]
        assert report["columns"][0]["outliers_injected"] == 100
        assert len(outside) == 100


class TestMissingValues:
    def test_exact_missing_percentage(self):
        col = num_col(nanPercentage=20)
        rows, report = generate_dataset([col], 1000, seed=3)
        missing = sum(1 for r in rows if r["Score"] is None)
        assert missing == 200
        assert report["columns"][0]["actual_missing_pct"] == 20.0

    def test_zero_missing_by_default(self):
        rows, _ = generate_dataset([num_col()], 300, seed=3)
        assert all(r["Score"] is not None for r in rows)


class TestReproducibility:
    def test_same_seed_same_table(self):
        cols = [num_col(), {"name": "VisitDate", "type": "date"}, {"name": "Flag", "type": "boolean"}]
        rows_a, _ = generate_dataset(cols, 100, seed=123)
        rows_b, _ = generate_dataset(cols, 100, seed=123)
        assert rows_a == rows_b

    def test_different_seed_different_table(self):
        rows_a, _ = generate_dataset([num_col()], 100, seed=1)
        rows_b, _ = generate_dataset([num_col()], 100, seed=2)
        assert rows_a != rows_b

    def test_seed_reported_when_auto_generated(self):
        _, report = generate_dataset([num_col()], 10)
        assert isinstance(report["seed"], int)


class TestIdAndDateColumns:
    def test_ids_are_unique(self):
        rows, _ = generate_dataset([{"name": "OrderID", "type": "string"}], 5000, seed=9)
        ids = [r["OrderID"] for r in rows]
        assert len(set(ids)) == 5000

    def test_dates_are_iso_when_balanced(self):
        rows, _ = generate_dataset([{"name": "Date", "type": "date"}], 200, seed=4)
        assert all(re.fullmatch(r"\d{4}-\d{2}-\d{2}", r["Date"]) for r in rows)


class TestDistortedMode:
    def test_distorted_injects_missing_values(self):
        rows, report = generate_dataset([num_col()], 500, distribution_type="distorted", seed=5)
        assert report["columns"][0]["actual_missing_pct"] >= 8.0

    def test_distorted_dirties_some_dates(self):
        rows, _ = generate_dataset([{"name": "Date", "type": "date"}], 500,
                                   distribution_type="distorted", seed=5)
        non_iso = [r["Date"] for r in rows
                   if r["Date"] is not None and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", r["Date"])]
        assert len(non_iso) > 0


class TestTextPools:
    TEXT_COLS = [
        {"name": "CustomerName", "type": "string"},
        {"name": "Email", "type": "email"},
        {"name": "PaymentMethod", "type": "string"},
    ]

    def test_email_matches_name_in_record(self):
        records = build_local_records(self.TEXT_COLS, 40, seed=11)
        for rec in records:
            first = rec["CustomerName"].split()[0].lower()
            assert first in rec["Email"].split("@")[0]

    def test_known_column_uses_curated_bank(self):
        records = build_local_records(self.TEXT_COLS, 40, seed=11)
        methods = {r["PaymentMethod"] for r in records}
        assert methods <= {"Credit Card", "Debit Card", "PayPal", "Apple Pay", "Bank Transfer", "Cash"}

    def test_expansion_increases_identity_diversity(self):
        records = build_local_records(self.TEXT_COLS, 30, seed=11)
        expanded = expand_records(records, self.TEXT_COLS, 1000, seed=11)
        assert len(expanded) == 1000
        assert len({r["CustomerName"] for r in expanded}) > 100

    def test_rows_keep_name_email_coherence_after_assembly(self):
        records = build_local_records(self.TEXT_COLS, 40, seed=11)
        rows, _ = generate_dataset(self.TEXT_COLS, 300, seed=11, text_records=records)
        for r in rows:
            if r["CustomerName"] and r["Email"]:
                first = r["CustomerName"].split()[0].lower()
                assert first in r["Email"].split("@")[0]


class TestScale:
    def test_ten_thousand_rows(self):
        cols = [
            {"name": "OrderID", "type": "string"},
            num_col("Quantity", minValue=1, maxValue=5),
            num_col("UnitPrice", numberType="decimals", minValue=5, maxValue=500, nanPercentage=10),
            {"name": "OrderDate", "type": "date"},
            {"name": "IsFirstPurchase", "type": "boolean"},
        ]
        rows, report = generate_dataset(cols, 10_000, seed=99)
        assert len(rows) == 10_000
        assert report["rows_delivered"] == 10_000
