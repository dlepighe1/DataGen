# DataGen Benchmark Results

Four benchmarks evaluate the engine: **parameter fidelity** (does it deliver exactly
what was asked?), **tabular TSTR** and **NLP TSTR** (is the data useful for downstream
ML — train on synthetic, test on real?), and a **cost model** (how does it compare to
asking an LLM to emit every row?). All numbers below are produced by the scripts in
this folder; nothing is hand-written.

```
python -m benchmark.fidelity_benchmark
python -m benchmark.tstr_benchmark
python -m benchmark.nlp_tstr_benchmark
python -m benchmark.cost_analysis
python -m benchmark.plots            # renders figures/ from the above
```

Benchmark deps: `pip install -r benchmark/requirements.txt`
(numpy, scipy, scikit-learn, matplotlib). Figures: `figures/tstr-comparison.png`,
`figures/fidelity-dashboard.png`.

---

## 1. Parameter fidelity & reproducibility

| Property | Result |
|---|---|
| Missing-value exactness (5 configs, up to 10K rows) | **0** cells of error — requested % == actual count, every time |
| Outlier injection (4 configs) | **0** count error; **100%** of injected outliers land outside the requested range |
| Range adherence (40,000 values, 4 columns) | **100.00%** in range |
| Distributional fidelity (10K rows vs. target truncated-normal) | KS = **0.0044**, p = **0.99** — indistinguishable from the intended distribution |
| Seed reproducibility | same seed → **byte-identical** table; different seed → differs |
| Throughput (statistical core) | **~119,000 rows/sec** (10K rows in **0.084 s**) |

**Takeaway:** every knob DataGen exposes (missing %, outliers, range, distribution
shape) is honoured exactly and reproducibly, at scale. This is the core guarantee
that an LLM emitting raw CSV cannot make.

---

## 2. Tabular TSTR — Train on Synthetic, Test on Real

Two real datasets, chosen to show both ends of the story. Model: LogisticRegression
(standardised); each arm is evaluated on the **same real held-out test split (30%)**.

**(a) sklearn Breast Cancer** (569 × 30, binary) — strong univariate signal.
Majority baseline = **62.6%**.

| Training source | Accuracy | Macro-F1 | % of real |
|---|---|---|---|
| Real data (upper bound) | 98.8% | 0.988 | 100% |
| **DataGen — class-conditional schema** | **89.5%** | **0.879** | **90.5%** |
| DataGen — naive (label-agnostic) | 24.6% | 0.241 | 24.9% |
| Shuffled labels (control) | 68.4% | 0.559 | 69.2% |

**(b) sklearn Digits** (1797 × 64, 10-class) — heavy pixel interactions.
Majority baseline = **10.2%**.

| Training source | Accuracy | Macro-F1 | % of real |
|---|---|---|---|
| Real data (upper bound) | 98.2% | 0.981 | 100% |
| **DataGen — class-conditional schema** | **73.9%** | **0.726** | **75.3%** |
| DataGen — naive (label-agnostic) | 14.8% | 0.120 | 15.1% |
| Shuffled labels (control) | 7.8% | 0.078 | 7.9% |

**Marginal-distribution fidelity** (mean per-feature Wasserstein distance,
normalised; lower = better) on Breast Cancer: DataGen **0.51** vs. uniform-range
baseline **1.73** — real marginals reproduced **~3.4× more faithfully**.

### Interpretation (the honest read)

- **Used as intended, schema-first generation transfers.** Describe each class's
  per-feature ranges and a model trained *only* on synthetic rows reaches **90.5%
  of real-data accuracy** on Breast Cancer — far above the 62.6% baseline.
- **The gap widens exactly where you'd expect.** On Digits, where the signal lives
  in *pixel-to-pixel interactions*, independent-column generation drops to **75.3%
  of real**. That contrast is the point: DataGen reproduces marginals faithfully but
  not joint structure, so it shines on univariate-driven problems and degrades
  gracefully (not catastrophically) on interaction-heavy ones.
- **The naive arms are meant to fail, and they do (24.9% / 15.1%).** Label-agnostic
  columns with random labels carry no signal — quantifying *why* a schema-first tool
  needs you to describe the distribution you want.
- This is the boundary that motivates the **inter-column-constraints** roadmap item,
  and it positions DataGen against copula/GAN tools (which need a real dataset to
  learn joint structure; DataGen needs only a schema).

**Headline:** *Trained only on DataGen data, a classifier reaches 90.5% of real-data
accuracy on a univariate-friendly dataset and 75.3% on an interaction-heavy one,
matching real marginals 3.4× better than uniform sampling.*

---

## 3. NLP TSTR — synthetic sentiment → real public reviews

Train a TF-IDF + LogisticRegression classifier **only** on DataGen's NLP
classification output (1,500 synthetic product-review sentiment rows), then test on
the real, public **UCI Sentiment Labelled Sentences** corpus (3,000 human-written
amazon / imdb / yelp sentences, binary). The model never sees a real sentence in
training. We report two arms: the **offline** engine (always available, no API key)
as a lower bound, and an **LLM pool** (the free OpenRouter chain — gemma-4-31b — with
a domain-matched prompt and a 400-example pool) as the ceiling. Chance baseline = **50%**.

| Training source | Accuracy | Macro-F1 |
|---|---|---|
| DataGen **offline** engine → real reviews (UCI) | **60.4%** | **0.60** |
| DataGen **LLM pool** (gemma-4-31b, domain-matched) → real reviews | **67.5%** | **0.68** |
| Shuffled-label control (offline) | 54.8% | — |
| Chance baseline | 50.0% | — |

**Control checks (exactness of the NLP knobs):** balanced mode produced exactly
750 / 750 per class; distorted mode produced the intended skew (947 / 553) with
exactly **75 label flips = 5%** label noise.

**Takeaway (honest):** even the **offline fallback** engine — templated text, no LLM —
produces sentiment that transfers to real, unseen, cross-domain reviews **above
chance** (+10 pts), and its balance / label-noise controls are exact. Pointing the
same pipeline at an **LLM-generated pool** (the free OpenRouter chain — gemma-4-31b —
with a domain-matched prompt and a 400-example pool) lifts transfer to **67.5%, +7.1
points** over the offline engine, confirming the higher text-transfer ceiling when the
domain is described well. The offline number stays the reproducible, key-free lower
bound (run without an `OPENROUTER_API_KEY`); the LLM ceiling is measured by setting the
key. The tabular TSTR above remains the rigorous, fully-offline centerpiece.

---

## 4. Cost model — hybrid vs. naive "LLM emits every row"

DataGen calls the LLM **once** per generation, for a ≤80-record pool of text
columns; NumPy expands that into N structured rows for free. A naive approach emits
every row as tokens. Token counts are estimated at ~4 chars/token from real samples
and priced at published **GPT-4o-mini** rates ($0.15 / $0.60 per 1M in/out) as a
representative paid model — DataGen's own generation now runs on free-tier
OpenRouter models, so this is a conservative what-if baseline.

| Rows | DataGen | Naive LLM | Naive calls needed | DataGen cheaper |
|---|---|---|---|---|
| 1,000 | $0.0019 | $0.0149 | 2 | **8×** |
| 10,000 | $0.0019 | $0.1485 | 16 | **79×** |

**Takeaway:** DataGen's cost is **flat in N** (one small call), while the naive
approach grows linearly *and* needs ~16 chunked calls past the 16K-token completion
limit at 10K rows — so it is not only ~79× more expensive but also slower and more
failure-prone. This is the architectural payoff of confining the LLM to semantics.
