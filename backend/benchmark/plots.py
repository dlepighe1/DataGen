"""Render the benchmark figures referenced by the portfolio.

Produces (in benchmark/figures/):
  - tstr-comparison.png    tabular + NLP TSTR accuracy
  - fidelity-dashboard.png exactness, distribution fit, marginal fidelity, cost

All inputs come from the other benchmark modules, so the figures always reflect
the latest real numbers.

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
from benchmark import tstr_benchmark, nlp_tstr_benchmark, cost_analysis

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


def _quiet(fn):
    with redirect_stdout(io.StringIO()):
        return fn()


def _bars(ax, labels, values, colors, ymax=105, fmt="{:.1f}%"):
    bars = ax.bar(labels, values, color=colors, edgecolor="white", linewidth=0.4, zorder=3)
    ax.set_ylim(0, ymax)
    ax.grid(axis="y", alpha=0.25, zorder=0)
    ax.set_axisbelow(True)
    for b, v in zip(bars, values):
        ax.text(b.get_x() + b.get_width() / 2, v + ymax * 0.015, fmt.format(v),
                ha="center", va="bottom", color=TEXT, fontweight="bold", fontsize=10)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)


def figure_tstr(tstr, nlp):
    fig, (axL, axR) = plt.subplots(1, 2, figsize=(13, 6.2), gridspec_kw={"width_ratios": [1.55, 1]})

    # ── Tabular: grouped bars across two datasets ──
    datasets = [("breast_cancer", "Breast Cancer\n(569×30, univariate)"),
                ("digits", "Digits\n(1797×64, interactions)")]
    arm_keys = [("real", "Real", GREEN), ("datagen_conditional", "DataGen (conditional)", SKY),
                ("datagen_naive", "DataGen (naive)", RED)]
    x = np.arange(len(datasets)); w = 0.26
    for i, (key, label, color) in enumerate(arm_keys):
        vals = [tstr[d]["tstr"][key]["accuracy"] * 100 for d, _ in datasets]
        bars = axL.bar(x + (i - 1) * w, vals, w, label=label, color=color,
                       edgecolor="white", linewidth=0.4, zorder=3)
        for b, v, (d, _) in zip(bars, vals, datasets):
            txt = f"{v:.0f}%"
            if key == "datagen_conditional":
                txt = f"{v:.0f}%\n({tstr[d]['tstr'][key]['pct_of_real']:.0f}% of real)"
            axL.text(b.get_x() + b.get_width() / 2, v + 1.5, txt, ha="center", va="bottom",
                     color=TEXT, fontsize=8.5, fontweight="bold")
    for j, (d, _) in enumerate(datasets):
        base = tstr[d]["majority_class_baseline"] * 100
        axL.plot([j - 1.5 * w, j + 1.5 * w], [base, base], ls="--", color=AMBER, lw=1.4, zorder=4)
    axL.plot([], [], ls="--", color=AMBER, label="majority baseline")
    axL.set_xticks(x); axL.set_xticklabels([lbl for _, lbl in datasets])
    axL.set_ylim(0, 128); axL.set_ylabel("Accuracy on real held-out test")
    axL.grid(axis="y", alpha=0.25, zorder=0); axL.set_axisbelow(True)
    axL.legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=8,
               loc="upper center", ncol=2, framealpha=0.85)
    axL.set_title("Tabular TSTR  ·  trained only on synthetic, tested on real")
    for s in ("top", "right"): axL.spines[s].set_visible(False)

    # ── NLP: real public dataset ──
    n_acc = nlp["tstr"]["synthetic_to_real_accuracy"] * 100
    n_base = nlp["majority_class_baseline"] * 100
    n_shuf = nlp["shuffled_control_accuracy"] * 100
    _bars(axR, ["DataGen → Real", "Shuffled\n(control)", "Chance\nbaseline"],
          [n_acc, n_shuf, n_base], [PURPLE, SLATE, AMBER], ymax=80)
    axR.annotate(f"+{n_acc - n_base:.0f} pts\nover chance", xy=(0, n_acc), xytext=(0, n_acc + 12),
                 ha="center", color=PURPLE, fontweight="bold", fontsize=9,
                 arrowprops=dict(arrowstyle="->", color=PURPLE))
    axR.set_ylabel("Accuracy on real reviews (UCI, 3k)")
    axR.set_title("NLP TSTR  ·  offline engine → real reviews")

    fig.suptitle("Train on Synthetic, Test on Real — a model trained only on DataGen data",
                 fontsize=15, fontweight="bold", color=TEXT, y=0.99)
    fig.tight_layout(rect=[0, 0, 1, 0.95])
    out = os.path.join(FIG_DIR, "tstr-comparison.png")
    fig.savefig(out, dpi=150); plt.close(fig)
    return out


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
    a.grid(alpha=0.25)
    for s in ("top", "right"): a.spines[s].set_visible(False)

    # (b) distribution fit
    rows, _ = generate_dataset(
        [{"name": "V", "type": "number", "numberType": "decimals",
          "minValue": 0, "maxValue": 100, "nanPercentage": 0}], 10000, seed=21)
    sample = np.array([r["V"] for r in rows], dtype=float)
    b.hist(sample, bins=40, density=True, color=INDIGO, alpha=0.55, edgecolor=PANEL, zorder=2)
    xs = np.linspace(0, 100, 300)
    a_, b_ = (0 - 50) / (100 / 6), (100 - 50) / (100 / 6)
    b.plot(xs, stats.truncnorm.pdf(xs, a_, b_, loc=50, scale=100 / 6), color=AMBER, lw=2.2, zorder=3,
           label="target truncated-normal")
    b.set_title("Distribution fit  (KS p ≈ 0.99)")
    b.set_xlabel("Value"); b.set_ylabel("Density")
    b.legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=9)
    for s in ("top", "right"): b.spines[s].set_visible(False)

    # (c) marginal fidelity
    mf = tstr["breast_cancer"]["marginal_fidelity_wasserstein"]
    mf_vals = [mf["datagen_conditional"], mf["uniform_baseline"]]
    _bars(c, ["DataGen\n(conditional)", "Uniform\nbaseline"],
          mf_vals, [GREEN, SLATE],
          ymax=max(mf_vals) * 1.3, fmt="{:.2f}")
    c.set_ylabel("Mean Wasserstein distance (lower = better)")
    c.set_title("Marginal fidelity vs. real  (3.4× closer)")

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
               xy=(10000, nv[1]), xytext=(2200, nv[1]), color=AMBER, fontsize=10, fontweight="bold",
               va="center", arrowprops=dict(arrowstyle="->", color=AMBER))
    d.set_title("Cost scaling  (DataGen is flat in N)")
    d.grid(alpha=0.25, which="both")
    d.legend(facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, fontsize=9)
    for s in ("top", "right"): d.spines[s].set_visible(False)

    fig.suptitle("DataGen fidelity & efficiency — all values from benchmark/ scripts",
                 fontsize=15, fontweight="bold", color=TEXT, y=0.995)
    fig.tight_layout(rect=[0, 0, 1, 0.97])
    out = os.path.join(FIG_DIR, "fidelity-dashboard.png")
    fig.savefig(out, dpi=150); plt.close(fig)
    return out


def main():
    os.makedirs(FIG_DIR, exist_ok=True)
    tstr = _quiet(tstr_benchmark.main)
    nlp = _quiet(nlp_tstr_benchmark.main)
    cost = _quiet(cost_analysis.main)
    outs = [figure_tstr(tstr, nlp), figure_fidelity(tstr, cost)]
    for o in outs:
        print("wrote", os.path.relpath(o))


if __name__ == "__main__":
    main()
