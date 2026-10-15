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

    def test_defaults_to_midpoint_when_no_moments_given(self):
        rows, report = generate_dataset([num_col(numberType="decimals")], 5000, seed=7)
        assert report["columns"][0]["mean"] == pytest.approx(50, abs=2)

    def test_mean_shifts_the_distribution(self):
        col = num_col(numberType="decimals", mean=20, stdDev=5)
        rows, report = generate_dataset([col], 5000, seed=7)
        assert report["columns"][0]["mean"] == pytest.approx(20, abs=1)
        assert report["columns"][0]["std"] == pytest.approx(5, abs=1)

    def test_moments_are_echoed_in_the_report(self):
        col = num_col(numberType="decimals", mean=20, stdDev=5)
        _, report = generate_dataset([col], 100, seed=7)
        assert report["columns"][0]["requested_mean"] == 20
        assert report["columns"][0]["requested_std"] == 5

    def test_moments_still_respect_the_range(self):
        col = num_col(numberType="decimals", mean=95, stdDev=40)
        rows, _ = generate_dataset([col], 2000, seed=7)
        assert all(0 <= r["Score"] <= 100 for r in rows)


def _pearson(rows, a, b):
    xs = [r[a] for r in rows if r[a] is not None and r[b] is not None]
    ys = [r[b] for r in rows if r[a] is not None and r[b] is not None]
    import numpy as np
    return float(np.corrcoef(xs, ys)[0, 1])


class TestCorrelations:
    def cols(self):
        return [num_col("Price", numberType="decimals", minValue=0, maxValue=100,
                        mean=40, stdDev=15),
                num_col("Quantity", numberType="decimals", minValue=0, maxValue=50,
                        mean=20, stdDev=8)]

    def test_positive_correlation_is_induced(self):
        rows, _ = generate_dataset(self.cols(), 2000, seed=5,
                                   correlations=[{"a": "Price", "b": "Quantity", "rho": 0.8}])
        assert _pearson(rows, "Price", "Quantity") == pytest.approx(0.8, abs=0.08)

    def test_negative_correlation_is_induced(self):
        rows, _ = generate_dataset(self.cols(), 2000, seed=5,
                                   correlations=[{"a": "Price", "b": "Quantity", "rho": -0.6}])
        assert _pearson(rows, "Price", "Quantity") == pytest.approx(-0.6, abs=0.08)

    def test_uncorrelated_by_default(self):
        rows, _ = generate_dataset(self.cols(), 2000, seed=5)
        assert abs(_pearson(rows, "Price", "Quantity")) < 0.08

    def test_report_audits_requested_vs_actual(self):
        _, report = generate_dataset(self.cols(), 2000, seed=5,
                                     correlations=[{"a": "Price", "b": "Quantity", "rho": 0.5}])
        entry = report["correlations"][0]
        assert entry["requested_r"] == 0.5
        assert entry["actual_r"] == pytest.approx(0.5, abs=0.08)

    def test_marginals_are_untouched_by_correlation(self):
        """Rank matching permutes rows; it must not change any column's values."""
        plain, _ = generate_dataset(self.cols(), 1000, seed=5)
        corr, _ = generate_dataset(self.cols(), 1000, seed=5,
                                   correlations=[{"a": "Price", "b": "Quantity", "rho": 0.7}])
        assert sorted(r["Price"] for r in plain) == sorted(r["Price"] for r in corr)
        assert sorted(r["Quantity"] for r in plain) == sorted(r["Quantity"] for r in corr)

    def test_exactness_guarantees_survive(self):
        cols = [num_col("Price", numberType="decimals", minValue=0, maxValue=100,
                        mean=40, stdDev=15, nanPercentage=10),
                num_col("Quantity", numberType="decimals", minValue=0, maxValue=50,
                        mean=20, stdDev=8, addOutliers=True, outlierPercentage=5)]
        rows, report = generate_dataset(cols, 1000, seed=5,
                                        correlations=[{"a": "Price", "b": "Quantity", "rho": 0.6}])
        assert sum(1 for r in rows if r["Price"] is None) == 100
        assert report["columns"][1]["outliers_injected"] == 50

    def test_impossible_matrix_degrades_instead_of_crashing(self):
        cols = self.cols() + [num_col("Rating", numberType="decimals", minValue=0,
                                      maxValue=10, mean=5, stdDev=2)]
        rows, report = generate_dataset(
            cols, 500, seed=5,
            correlations=[{"a": "Price", "b": "Quantity", "rho": 0.9},
                          {"a": "Quantity", "b": "Rating", "rho": 0.9},
                          {"a": "Price", "b": "Rating", "rho": -0.9}])  # not achievable
        assert len(rows) == 500
        assert len(report["correlations"]) == 3

    def test_integer_columns_stay_integers(self):
        """Rank matching must not turn 2 into 2.0 — that exports as "2.0"."""
        cols = [num_col("Qty", numberType="integers", minValue=1, maxValue=5),
                num_col("Price", numberType="decimals", minValue=5, maxValue=50)]
        rows, _ = generate_dataset(cols, 300, seed=5,
                                   correlations=[{"a": "Qty", "b": "Price", "rho": -0.4}])
        assert all(isinstance(r["Qty"], int) for r in rows)
        assert all(isinstance(r["Price"], float) for r in rows)

    def test_unknown_columns_are_ignored(self):
        rows, report = generate_dataset(self.cols(), 200, seed=5,
                                        correlations=[{"a": "Price", "b": "Nope", "rho": 0.5}])
        assert len(rows) == 200
        assert "correlations" not in report


class TestDerivedColumns:
    def base(self):
        return [
            num_col("Quantity", numberType="integers", minValue=1, maxValue=5),
            num_col("UnitPrice", numberType="decimals", minValue=5, maxValue=100),
        ]

    def test_arithmetic_holds_in_every_row(self):
        cols = self.base() + [{"name": "Total", "type": "derived",
                               "formula": "Quantity * UnitPrice", "numberType": "decimals"}]
        rows, _ = generate_dataset(cols, 500, seed=9)
        for r in rows:
            assert r["Total"] == pytest.approx(r["Quantity"] * r["UnitPrice"], abs=0.01)

    def test_supports_precedence_and_parentheses(self):
        cols = self.base() + [{"name": "Out", "type": "derived",
                               "formula": "(Quantity + 2) * UnitPrice / 2",
                               "numberType": "decimals"}]
        rows, _ = generate_dataset(cols, 200, seed=9)
        for r in rows:
            assert r["Out"] == pytest.approx((r["Quantity"] + 2) * r["UnitPrice"] / 2, abs=0.01)

    def test_derived_column_keeps_declared_position(self):
        cols = [self.base()[0],
                {"name": "Total", "type": "derived", "formula": "Quantity * 2"},
                self.base()[1]]
        rows, _ = generate_dataset(cols, 10, seed=9)
        assert list(rows[0].keys()) == ["Quantity", "Total", "UnitPrice"]

    def test_derived_can_reference_another_derived(self):
        cols = self.base() + [
            {"name": "Total", "type": "derived", "formula": "Quantity * UnitPrice"},
            {"name": "WithTax", "type": "derived", "formula": "Total * 1.2"},
        ]
        rows, _ = generate_dataset(cols, 100, seed=9)
        for r in rows:
            assert r["WithTax"] == pytest.approx(r["Total"] * 1.2, abs=0.05)

    def test_missing_values_are_still_exact(self):
        cols = self.base() + [{"name": "Total", "type": "derived",
                               "formula": "Quantity * UnitPrice", "nanPercentage": 10}]
        rows, report = generate_dataset(cols, 500, seed=9)
        assert sum(1 for r in rows if r["Total"] is None) == 50
        assert report["columns"][2]["actual_missing_pct"] == 10.0

    def test_report_records_the_formula_and_sources(self):
        cols = self.base() + [{"name": "Total", "type": "derived",
                               "formula": "Quantity * UnitPrice"}]
        _, report = generate_dataset(cols, 50, seed=9)
        assert report["columns"][2]["formula"] == "Quantity * UnitPrice"
        assert report["columns"][2]["derived_from"] == ["Quantity", "UnitPrice"]

    def test_division_by_zero_becomes_a_hole_not_a_crash(self):
        cols = [num_col("Zero", numberType="integers", minValue=0, maxValue=0),
                num_col("X", numberType="integers", minValue=1, maxValue=9),
                {"name": "Bad", "type": "derived", "formula": "X / Zero"}]
        rows, report = generate_dataset(cols, 50, seed=9)
        assert all(r["Bad"] is None for r in rows)
        assert report["columns"][2]["undefined_cells"] == 50

    def test_unknown_column_is_rejected(self):
        cols = self.base() + [{"name": "T", "type": "derived", "formula": "Quantity * Ghost"}]
        with pytest.raises(ValueError, match="Ghost"):
            generate_dataset(cols, 10, seed=9)

    def test_formula_cannot_execute_code(self):
        """A formula arrives from an untrusted request body. It must never be eval()'d."""
        for hostile in ["__import__('os').system('echo pwned')",
                        "open('/etc/passwd').read()",
                        "Quantity.__class__"]:
            cols = self.base() + [{"name": "Evil", "type": "derived", "formula": hostile}]
            with pytest.raises(ValueError):
                generate_dataset(cols, 10, seed=9)


def cat_col(name="Tier", **overrides):
    col = {"name": name, "type": "categorical",
           "categories": ["bronze", "silver", "gold"], "nanPercentage": 0}
    col.update(overrides)
    return col


class TestCategoricalColumns:
    def test_only_emits_declared_categories(self):
        rows, _ = generate_dataset([cat_col()], 300, seed=3)
        assert {r["Tier"] for r in rows} <= {"bronze", "silver", "gold"}

    def test_uniform_balance_by_default(self):
        rows, _ = generate_dataset([cat_col()], 300, seed=3)
        counts = {c: [r["Tier"] for r in rows].count(c) for c in ("bronze", "silver", "gold")}
        assert counts == {"bronze": 100, "silver": 100, "gold": 100}

    def test_weights_are_honoured_exactly(self):
        col = cat_col(categoryWeights=[0.5, 0.3, 0.2])
        rows, _ = generate_dataset([col], 1000, seed=3)
        values = [r["Tier"] for r in rows]
        assert values.count("bronze") == 500
        assert values.count("silver") == 300
        assert values.count("gold") == 200

    def test_weights_sum_to_row_count_when_they_do_not_divide_evenly(self):
        col = cat_col(categoryWeights=[1, 1, 1])
        rows, _ = generate_dataset([col], 100, seed=3)
        values = [r["Tier"] for r in rows]
        assert sum(values.count(c) for c in ("bronze", "silver", "gold")) == 100

    def test_report_records_requested_and_actual_balance(self):
        col = cat_col(categoryWeights=[0.5, 0.3, 0.2])
        _, report = generate_dataset([col], 1000, seed=3)
        col_report = report["columns"][0]
        assert col_report["actual_counts"] == {"bronze": 500, "silver": 300, "gold": 200}
        assert col_report["requested_distribution_pct"]["bronze"] == 50.0

    def test_missing_values_still_exact_on_categoricals(self):
        col = cat_col(nanPercentage=10)
        rows, report = generate_dataset([col], 500, seed=3)
        assert sum(1 for r in rows if r["Tier"] is None) == 50
        assert report["columns"][0]["actual_missing_pct"] == 10.0

    def test_reproducible_from_seed(self):
        a, _ = generate_dataset([cat_col()], 200, seed=11)
        b, _ = generate_dataset([cat_col()], 200, seed=11)
        assert a == b

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
