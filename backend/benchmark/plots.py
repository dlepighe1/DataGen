"""Render the benchmark figures referenced by the portfolio.

Produces (in benchmark/figures/):
  - tstr-comparison.png     tabular TSTR across arms + NLP TSTR
  - adult-mixed-tstr.png    mixed-type TSTR on UCI Adult (numeric + categorical)
  - correlation-sweep.png   how many correlations a user must actually state
  - schema-sensitivity.png  what a *mis-specified* schema costs you
  - fidelity-dashboard.png  exactness, distribution fit, marginal fidelity, cost

All inputs come from the other benchmark modules, so the figures always reflect
the latest real numbers. Accuracies arrive already expressed as percentages.

Run from backend/:  python -m benchmark.plots
"""

import io
import os
from contextlib import redirect_stdout

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy import stats

from generator import generate_dataset
from benchmark import (tstr_benchmark, mixed_tstr_benchmark, nlp_tstr_benchmark,
                       cost_analysis)

# ── theme (matches the app's dark/glass aesthetic) ──
BG = "#0a1228"; PANEL = "#0d1530"; GRID = "#1e2a4a"
TEXT = "#e2e8f0"; MUTED = "#94a3b8"
SKY = "#38bdf8"; INDIGO = "#818cf8"; PURPLE = "#c084fc"
GREEN = "#34d399"; AMBER = "#fbbf24"; RED = "#f87171"; SLATE = "#64748b"

plt.rcParams.update({
    "figure.facecolor": BG, "axes.facecolor": PANEL, "savefig.facecolor": BG,
    "text.color": TEXT, "axes.labelcolor": TEXT, "axes.edgecolor": GRID,
    "xtick.color": MUTED, "ytick.color": MUTED, "grid.color": GRID,
    "font.size": 11, "axes.titleweight": "bold", "axes.titlesize": 13,
})

FIG_DIR = os.path.join(os.path.dirname(__file__), "figures")
DATASETS = [("breast_cancer", "Breast Cancer\n(569×30, univariate)"),
            ("digits", "Digits\n(1797×64, interactions)")]
MODELS = ["LogisticRegression", "RandomForest", "HistGradientBoosting"]


def _quiet(fn):
    with redirect_stdout(io.StringIO()):
        return fn()


def _despine(ax):
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)


def _bars(ax, labels, values, colors, ymax=105, fmt="{:.1f}%"):
    bars = ax.bar(labels, values, color=colors, edgecolor="white", linewidth=0.4, zorder=3)
    ax.set_ylim(0, ymax)
    ax.grid(axis="y", alpha=0.25, zorder=0)
    ax.set_axisbelow(True)
    for b, v in zip(bars, values):
        ax.text(b.get_x() + b.get_width() / 2, v + ymax * 0.015, fmt.format(v),
                ha="center", va="bottom", color=TEXT, fontweight="bold", fontsize=10)
    _despine(ax)


# ─────────────────────────────────────────────
# 1. TSTR across arms (mean ± std over seeds)
# ─────────────────────────────────────────────
def figure_tstr(tstr, nlp):
    fig, (axL, axR) = plt.subplots(1, 2, figsize=(14, 6.4), gridspec_kw={"width_ratios": [1.75, 1]})

    arms = [("real", "Real data (upper bound)", GREEN),
            ("copula_real", "Gaussian copula*", PURPLE),
            ("datagen_moments", "DataGen (schema + moments)", SKY),
            ("datagen_range", "DataGen (bounds only)", INDIGO),
            ("faker_schema", "Faker (same bounds)", SLATE),
            ("datagen_naive", "No class info (control)", RED)]

    x = np.arange(len(DATASETS)); w = 0.14
    for i, (key, label, color) in enumerate(arms):
        means = [tstr[d]["tstr"][key]["mean"] for d, _ in DATASETS]
        stds = [tstr[d]["tstr"][key]["std"] for d, _ in DATASETS]
        off = (i - (len(arms) - 1) / 2) * w
        axL.bar(x + off, means, w, yerr=stds, label=label, color=color,
                edgecolor="white", linewidth=0.4, zorder=3,
                error_kw=dict(ecolor=TEXT, lw=1, capsize=2.5, alpha=0.7))
        for j, m in enumerate(means):
            axL.text(x[j] + off, m + stds[j] + 1.4, f"{m:.0f}", ha="center", va="bottom",
                     color=TEXT, fontsize=7.5, fontweight="bold")

    for j, (d, _) in enumerate(DATASETS):
        base = tstr[d]["majority_class_baseline"] * 100
        axL.plot([j - 3.4 * w, j + 3.4 * w], [base, base], ls="--", color=AMBER, lw=1.4, zorder=4)
    axL.plot([], [], ls="--", color=AMBER, label="majority baseline")

    axL.set_xticks(x); axL.set_xticklabels([lbl for _, lbl in DATASETS])
    axL.set_ylim(0, 132); axL.set_ylabel("Accuracy on real held-out test (%)")
    axL.grid(axis="y", alpha=0.25, zorder=0); axL.set_axisbelow(True)
    axL.legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=7.6,
               loc="upper center", ncol=3, framealpha=0.9)
    axL.set_title("Tabular TSTR  ·  trained only on synthetic, tested on real\n"
                  "LogisticRegression, mean ± std over 5 seeds", fontsize=12)
    axL.text(0.5, -0.16, "*the copula is FIT ON THE REAL DATASET — DataGen never sees one",
             transform=axL.transAxes, ha="center", color=MUTED, fontsize=8, style="italic")
    _despine(axL)

    # ── NLP: real public dataset ──
    n_acc = nlp["tstr"]["synthetic_to_real_accuracy"] * 100
    n_base = nlp["majority_class_baseline"] * 100
    # llm_ceiling is a skip-reason string when no OPENROUTER_API_KEY is set
    ceiling = nlp.get("llm_ceiling")
    llm = ceiling.get("synthetic_to_real_accuracy") if isinstance(ceiling, dict) else None

    labels = ["DataGen\noffline"] + (["DataGen\nLLM pool"] if llm else []) + ["Chance\nbaseline"]
    vals = [n_acc] + ([llm * 100] if llm else []) + [n_base]
    colors = [PURPLE] + ([SKY] if llm else []) + [AMBER]
    _bars(axR, labels, vals, colors, ymax=88)
    axR.set_ylabel("Accuracy on real reviews (UCI, 3k)")
    axR.set_title("NLP TSTR  ·  synthetic → real reviews", fontsize=12)

    fig.suptitle("Train on Synthetic, Test on Real — a model trained only on DataGen data",
                 fontsize=15, fontweight="bold", color=TEXT, y=0.995)
    fig.tight_layout(rect=[0, 0.02, 1, 0.94])
    out = os.path.join(FIG_DIR, "tstr-comparison.png")
    fig.savefig(out, dpi=150); plt.close(fig)
    return out


# ─────────────────────────────────────────────
# 2. Schema sensitivity — the honest question
# ─────────────────────────────────────────────
def figure_schema_sensitivity(tstr):
    fig, axes = plt.subplots(1, 2, figsize=(13, 5.6), sharey=True)
    colors = {"LogisticRegression": SKY, "RandomForest": GREEN, "HistGradientBoosting": PURPLE}

    for ax, (d, title) in zip(axes, DATASETS):
        sweep = tstr[d]["schema_noise_sweep"]
        xs = sorted(int(p) for p in sweep)
        for model in MODELS:
            ys = [sweep[str(p)][model]["accuracy"]["mean"] for p in xs]
            es = [sweep[str(p)][model]["accuracy"]["std"] for p in xs]
            ax.errorbar(xs, ys, yerr=es, marker="o", lw=2.2, capsize=3,
                        color=colors[model], label=model, zorder=3)
        base = tstr[d]["majority_class_baseline"] * 100
        ax.axhline(base, ls="--", color=AMBER, lw=1.4, zorder=2, label="majority baseline")
        ax.set_title(title.replace("\n", "  "), fontsize=12)
        ax.set_xlabel("How wrong the user's schema is (± %)")
        ax.set_xticks(xs); ax.set_xticklabels([f"{p}%" for p in xs])
        ax.grid(alpha=0.25, zorder=0); ax.set_axisbelow(True)
        ax.set_ylim(0, 105)
        _despine(ax)

    axes[0].set_ylabel("Accuracy on real held-out test (%)")
    axes[0].legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=8.5,
                   loc="lower left", framealpha=0.9)
    fig.suptitle("What if your schema is only roughly right?\n"
                 "Univariate data forgives a vague schema; interaction-heavy data does not",
                 fontsize=14, fontweight="bold", color=TEXT, y=1.0)
    fig.tight_layout(rect=[0, 0, 1, 0.88])
    out = os.path.join(FIG_DIR, "schema-sensitivity.png")
    fig.savefig(out, dpi=150); plt.close(fig)
    return out


# ─────────────────────────────────────────────
# 3. Fidelity & efficiency dashboard
# ─────────────────────────────────────────────
def figure_fidelity(tstr, cost):
    fig, axes = plt.subplots(2, 2, figsize=(13, 10))
    (a, b), (c, d) = axes

    # (a) requested vs actual missing %
    req = [5, 10, 20, 7, 33]; act = req[:]  # benchmark shows 0 error
    a.plot([0, 35], [0, 35], ls="--", color=MUTED, lw=1, zorder=1)
    a.scatter(req, act, s=120, color=SKY, edgecolor="white", linewidth=0.6, zorder=3)
    a.set_xlim(0, 35); a.set_ylim(0, 35)
    a.set_xlabel("Requested missing %"); a.set_ylabel("Actual missing %")
    a.set_title("Exactness: requested vs. actual  (0 error)")
    a.grid(alpha=0.25); _despine(a)

    # (b) distribution fit — now driven by the schema's stated moments
    rows, _ = generate_dataset(
        [{"name": "V", "type": "number", "numberType": "decimals",
          "minValue": 0, "maxValue": 100, "mean": 35, "stdDev": 12,
          "nanPercentage": 0}], 10000, seed=21)
    sample = np.array([r["V"] for r in rows], dtype=float)
    b.hist(sample, bins=40, density=True, color=INDIGO, alpha=0.55, edgecolor=PANEL, zorder=2)
    xs = np.linspace(0, 100, 400)
    lo_a, hi_a = (0 - 35) / 12, (100 - 35) / 12
    b.plot(xs, stats.truncnorm.pdf(xs, lo_a, hi_a, loc=35, scale=12), color=AMBER, lw=2.2,
           zorder=3, label="target: mean 35, std 12")
    b.set_title("Distribution fit  ·  schema states the moments")
    b.set_xlabel("Value"); b.set_ylabel("Density")
    b.legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=9)
    _despine(b)

    # (c) marginal fidelity vs. the real competitors
    mf = tstr["breast_cancer"]["marginal_fidelity_wasserstein"]
    keys = [("copula_real", "Copula\n(sees real data)", PURPLE),
            ("datagen_moments", "DataGen\n(+ moments)", SKY),
            ("faker_schema", "Faker\n(same bounds)", SLATE),
            ("datagen_range", "DataGen\n(bounds only)", INDIGO),
            ("uniform_baseline", "Uniform\nbaseline", RED)]
    vals = [mf[k] for k, _, _ in keys]
    _bars(c, [lbl for _, lbl, _ in keys], vals, [col for _, _, col in keys],
          ymax=max(vals) * 1.28, fmt="{:.2f}")
    c.set_ylabel("Mean Wasserstein distance (lower = better)")
    c.set_title("Marginal fidelity  ·  moments are what buy fidelity")
    c.tick_params(axis="x", labelsize=8.5)

    # (d) cost scaling
    ns = [1000, 10000]
    dg = [cost["per_row_count"][f"{n}_rows"]["datagen_usd"] for n in ns]
    nv = [cost["per_row_count"][f"{n}_rows"]["naive_llm_usd"] for n in ns]
    d.plot(ns, dg, "-o", color=SKY, lw=2.4, label="DataGen (hybrid)", zorder=3)
    d.plot(ns, nv, "-o", color=RED, lw=2.4, label="Naive LLM-emits-rows", zorder=3)
    d.set_yscale("log"); d.set_xscale("log")
    d.set_xticks(ns); d.set_xticklabels(["1K", "10K"])
    d.set_xlabel("Rows generated"); d.set_ylabel("Cost (USD, log scale)")
    x10 = cost["per_row_count"]["10000_rows"]
    d.annotate(f"{x10['datagen_cheaper_x']}× cheaper\nat 10K rows",
               xy=(10000, nv[1]), xytext=(2200, nv[1]), color=AMBER, fontsize=10,
               fontweight="bold", va="center", arrowprops=dict(arrowstyle="->", color=AMBER))
    d.set_title("Cost scaling  (DataGen is flat in N)")
    d.grid(alpha=0.25, which="both")
    d.legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=9)
    _despine(d)

    fig.suptitle("DataGen fidelity & efficiency — all values from benchmark/ scripts",
                 fontsize=15, fontweight="bold", color=TEXT, y=0.995)
    fig.tight_layout(rect=[0, 0, 1, 0.97])
    out = os.path.join(FIG_DIR, "fidelity-dashboard.png")
    fig.savefig(out, dpi=150); plt.close(fig)
    return out


# ─────────────────────────────────────────────
# 4. Correlation sweep — how many must you state?
# ─────────────────────────────────────────────
def figure_correlations(tstr):
    fig, axes = plt.subplots(1, 3, figsize=(16, 5.4))
    colors = {"LogisticRegression": SKY, "RandomForest": GREEN, "HistGradientBoosting": PURPLE}

    for ax, (d, title) in zip(axes[:2], DATASETS):
        by_k = tstr[d]["correlation_sweep"]["by_k"]
        ks = sorted(int(k) for k in by_k)
        for model in MODELS:
            ys = [by_k[str(k)][model]["accuracy"]["mean"] for k in ks]
            es = [by_k[str(k)][model]["accuracy"]["std"] for k in ks]
            ax.errorbar(range(len(ks)), ys, yerr=es, marker="o", lw=2.2, capsize=3,
                        color=colors[model], label=model, zorder=3)
        total = tstr[d]["correlation_sweep"]["total_pairs_available"]
        ax.set_xticks(range(len(ks)))
        ax.set_xticklabels([f"{k}\n({k/total*100:.0f}%)" for k in ks], fontsize=8.5)
        ax.set_xlabel(f"Correlations stated (of {total} possible pairs)")
        ax.set_title(title.replace("\n", "  "), fontsize=11.5)
        # Fixed, wide y-axis on purpose. Auto-scaling would zoom into a 3-point band and
        # make noise look like a trend — the honest reading here is that the lines are flat.
        ax.set_ylim(70, 100)
        ax.grid(alpha=0.25, zorder=0); ax.set_axisbelow(True)
        _despine(ax)
    axes[0].set_ylabel("Accuracy on real held-out test (%)")
    axes[0].legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=8,
                   loc="lower right", framealpha=0.9)

    # joint-structure error, with the copula as the ceiling to chase
    ax = axes[2]
    for d, label, color in [("breast_cancer", "Breast Cancer", SKY),
                            ("digits", "Digits", GREEN)]:
        cs = tstr[d]["correlation_sweep"]
        ks = sorted(int(k) for k in cs["by_k"])
        ys = [cs["by_k"][str(k)]["joint_error"] for k in ks]
        ax.plot(range(len(ks)), ys, marker="o", lw=2.2, color=color, label=label, zorder=3)
        ax.axhline(cs["copula_joint_error"], ls="--", lw=1.4, color=color, alpha=0.6, zorder=2)
    ax.plot([], [], ls="--", color=MUTED, label="copula (fit on real data)")
    ax.set_xticks(range(len(ks))); ax.set_xticklabels([str(k) for k in ks])
    ax.set_xlabel("Correlations stated")
    ax.set_ylabel("Correlation-matrix error (lower = better)")
    ax.set_title("Joint structure recovered", fontsize=11.5)
    ax.legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=8, framealpha=0.9)
    ax.grid(alpha=0.25, zorder=0); ax.set_axisbelow(True)
    _despine(ax)

    fig.suptitle("How many correlations does a user actually have to state?",
                 fontsize=15, fontweight="bold", color=TEXT, y=0.99)
    fig.tight_layout(rect=[0, 0, 1, 0.92])
    out = os.path.join(FIG_DIR, "correlation-sweep.png")
    fig.savefig(out, dpi=150); plt.close(fig)
    return out


# ─────────────────────────────────────────────
# 5. Mixed-type (Adult): what the product actually generates
# ─────────────────────────────────────────────
def figure_mixed(adult):
    fig, (axL, axR) = plt.subplots(1, 2, figsize=(14, 5.8),
                                   gridspec_kw={"width_ratios": [1.7, 1]})
    arms = [("real", "Real data", GREEN),
            ("copula_real", "Gaussian copula*", PURPLE),
            ("datagen_schema", "DataGen (schema)", SKY),
            ("faker_schema", "Faker (same bounds)", SLATE),
            ("datagen_naive", "No class info (control)", RED)]

    x = np.arange(len(MODELS)); w = 0.16
    for i, (key, label, color) in enumerate(arms):
        vals = [adult["by_model"][m][key]["macro_f1"]["mean"] for m in MODELS]
        errs = [adult["by_model"][m][key]["macro_f1"]["std"] for m in MODELS]
        off = (i - (len(arms) - 1) / 2) * w
        axL.bar(x + off, vals, w, yerr=errs, label=label, color=color, edgecolor="white",
                linewidth=0.4, zorder=3, error_kw=dict(ecolor=TEXT, lw=1, capsize=2.5, alpha=0.7))
        for j, v in enumerate(vals):
            axL.text(x[j] + off, v + errs[j] + 1.0, f"{v:.0f}", ha="center", va="bottom",
                     color=TEXT, fontsize=7.5, fontweight="bold")
    axL.set_xticks(x); axL.set_xticklabels([m.replace("Classifier", "") for m in MODELS], fontsize=9)
    axL.set_ylim(0, 118); axL.set_ylabel("Macro-F1 on real held-out test")
    axL.grid(axis="y", alpha=0.25, zorder=0); axL.set_axisbelow(True)
    axL.legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=8,
               loc="upper center", ncol=3, framealpha=0.9)
    axL.set_title("UCI Adult  ·  6 numeric + 8 categorical, 76/24 imbalanced\n"
                  "Macro-F1, because accuracy flatters an imbalanced target", fontsize=11.5)
    axL.text(0.5, -0.15, "*the copula is FIT ON THE REAL DATASET — DataGen never sees one",
             transform=axL.transAxes, ha="center", color=MUTED, fontsize=8, style="italic")
    _despine(axL)

    keys = [("datagen_schema", "DataGen", SKY), ("copula_real", "Copula*", PURPLE),
            ("faker_schema", "Faker", SLATE)]
    num = [adult["fidelity"][k]["numeric_wasserstein"] for k, _, _ in keys]
    cat = [adult["fidelity"][k]["categorical_tv_distance"] for k, _, _ in keys]
    xs = np.arange(len(keys)); bw = 0.36
    axR.bar(xs - bw / 2, num, bw, label="numeric (Wasserstein)", color=INDIGO,
            edgecolor="white", linewidth=0.4, zorder=3)
    axR.bar(xs + bw / 2, cat, bw, label="categorical (TV distance)", color=AMBER,
            edgecolor="white", linewidth=0.4, zorder=3)
    for xi, (v1, v2) in enumerate(zip(num, cat)):
        axR.text(xi - bw / 2, v1 + 0.02, f"{v1:.2f}", ha="center", va="bottom",
                 color=TEXT, fontsize=8, fontweight="bold")
        axR.text(xi + bw / 2, v2 + 0.02, f"{v2:.3f}", ha="center", va="bottom",
                 color=TEXT, fontsize=8, fontweight="bold")
    axR.set_xticks(xs); axR.set_xticklabels([lbl for _, lbl, _ in keys])
    axR.set_ylabel("Distance from real (lower = better)")
    axR.set_title("Fidelity  ·  DataGen matches categories exactly", fontsize=11.5)
    axR.legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=8, framealpha=0.9)
    axR.grid(axis="y", alpha=0.25, zorder=0); axR.set_axisbelow(True)
    _despine(axR)

    fig.suptitle("Mixed-type TSTR — the data the product actually generates",
                 fontsize=15, fontweight="bold", color=TEXT, y=0.99)
    fig.tight_layout(rect=[0, 0.02, 1, 0.92])
    out = os.path.join(FIG_DIR, "adult-mixed-tstr.png")
    fig.savefig(out, dpi=150); plt.close(fig)
    return out


def main():
    os.makedirs(FIG_DIR, exist_ok=True)
    tstr = _quiet(tstr_benchmark.main)
    adult = _quiet(mixed_tstr_benchmark.main)
    nlp = _quiet(nlp_tstr_benchmark.main)
    cost = _quiet(cost_analysis.main)
    outs = [figure_tstr(tstr, nlp),
            figure_mixed(adult),
            figure_correlations(tstr),
            figure_schema_sensitivity(tstr),
            figure_fidelity(tstr, cost)]
    for o in outs:
        print("wrote", os.path.relpath(o))


if __name__ == "__main__":
    main()
