# DataGen Benchmark Results

Five benchmarks evaluate the engine: **parameter fidelity** (does it deliver exactly
what was asked?), **mixed-type TSTR** on a real messy dataset, **numeric TSTR** on two
sklearn datasets, **NLP TSTR**, and a **cost model**. All numbers below are produced by
the scripts in this folder; nothing is hand-written.

```
python -m benchmark.fidelity_benchmark
python -m benchmark.mixed_tstr_benchmark   # UCI Adult: numeric + categorical
python -m benchmark.tstr_benchmark         # numeric: + correlation sweep
python -m benchmark.nlp_tstr_benchmark
python -m benchmark.cost_analysis
python -m benchmark.plots                  # renders figures/ from the above
```

Benchmark deps: `pip install -r benchmark/requirements.txt`
(numpy, scipy, scikit-learn, matplotlib, **copulas**, **rdt**, **faker**, pandas).

**Methodology, up front.** Every tabular arm runs over **5 seeds** and is scored with
**3 downstream model families** (LogisticRegression, RandomForest,
HistGradientBoosting), reported as mean ± std. A single seed and a single linear model
would have hidden several of the findings below — including one that disproved a claim
this project used to make.

**Two competitors are included, and one is deliberately given an unfair advantage.** A
**Gaussian copula** (SDV's `copulas` + `rdt`, which is how SDV's own
GaussianCopulaSynthesizer handles categoricals) is **fit on the real dataset**. DataGen
never sees one. **Faker** is handed the identical bounds, which isolates what the
distribution model actually contributes.

---

## 1. Parameter fidelity & reproducibility

| Property | Result |
|---|---|
| Missing-value exactness (5 configs, up to 10K rows) | **0** cells of error — requested % == actual count, every time |
| Outlier injection (4 configs) | **0** count error; **100%** of injected outliers land outside the requested range |
| Range adherence (40,000 values, 4 columns) | **100.00%** in range |
| Distributional fidelity (10K rows vs. target truncated-normal) | KS = **0.0044**, p = **0.99** — indistinguishable from the intended distribution |
| Seed reproducibility | same seed → **byte-identical** table; different seed → differs |
| Throughput (statistical core) | 10K rows in **0.058 s** (~173K rows/sec; hardware-dependent) |

**Takeaway:** every knob DataGen exposes (missing %, outliers, range, distribution
shape) is honoured exactly and reproducibly, at scale. This is the core guarantee
that an LLM emitting raw CSV cannot make.

---

## 2. Mixed-type TSTR — UCI Adult (the centerpiece)

`python -m benchmark.mixed_tstr_benchmark` · figure: `figures/adult-mixed-tstr.png`

**Why this benchmark exists.** The numeric benchmarks in §3 use sklearn datasets that are
100% numeric, while DataGen's actual product generates *mixed* schemas — numbers next to
categories. Benchmarking only the numeric path measured the least representative part of
the engine. This section fixes that, and it is now the headline result.

**Dataset:** UCI Adult / Census Income via OpenML. 48,842 rows, **6 numeric + 8
categorical** features, binary target, **76/24 imbalanced**. Subsampled to 10,000 rows
(stratified) so five seeds x three models stays tractable.

**Metric: macro-F1, not accuracy.** The target is imbalanced — predicting "<=50K" for
every row already scores 75.6% accuracy. Reporting accuracy here would flatter every arm.

| Training source | LogisticRegression | RandomForest | HistGradientBoosting |
|---|---|---|---|
| Real data (upper bound) | 77.8 | 78.4 | 79.6 |
| Gaussian copula *(fit on real data)* | 75.2 (96.7%) | 73.9 (94.3%) | 71.2 (89.4%) |
| **DataGen — schema (moments + category weights)** | **76.6 (98.5%)** | **75.9 (96.9%)** | **75.0 (94.2%)** |
| DataGen — schema off by ±25% | 68.7 (88.4%) | 48.9 (62.4%) | 40.6 (51.0%) |
| Faker — same bounds | 54.0 (69.4%) | 67.1 (85.5%) | 67.3 (84.5%) |
| DataGen — naive (control) | 43.1 (55.5%) | 43.2 (55.1%) | 43.9 (55.2%) |
| Shuffled labels (control) | 43.2 (55.5%) | 45.2 (57.6%) | 44.2 (55.5%) |

Macro-F1, mean over 5 seeds; (%) is the share of real-data macro-F1.

**Fidelity** (lower is better):

| Arm | Numeric (Wasserstein) | Categorical (total-variation distance) |
|---|---|---|
| **DataGen — schema** | **0.244** | **0.000** |
| Gaussian copula *(fit on real data)* | 0.321 | 0.085 |
| Faker — same bounds | 0.923 | 0.502 |

### Interpretation

**DataGen beats the copula on the dataset that looks like real work — and the copula was
handed the real data.** 98.5% vs. 96.7% of real macro-F1 on LogisticRegression, and the
margin widens on the tree models. The reason is the categorical columns: DataGen's class
weights are honoured *exactly* (TV distance **0.000**, not approximately zero), while the
copula's Gaussian treatment of categorical levels is lossy. Eight of the fourteen columns
are categorical, so that exactness compounds.

**Faker collapses here, and this is the vindication the numeric benchmark denied.** In §3
you will see Faker tie DataGen on purely numeric data. On mixed-type data it falls to
54.0 macro-F1 against DataGen's 76.6, because a uniform draw over category levels destroys
the class balance that carries the signal.

**The ±25% arm is the honest warning.** Get the schema roughly wrong and gradient boosting
falls from 75.0 to 40.6, barely above the shuffled-label control. Schema quality *is*
data quality. There is no free lunch here.

---

## 3. Numeric TSTR — Train on Synthetic, Test on Real

Two sklearn datasets, chosen to show both ends of the story. Each arm is evaluated on the
**same real held-out test split (30%)**, over 5 seeds, with 3 model families.

**The arms.** Two of them are competitors, and one of them is deliberately given an
advantage DataGen refuses to require:

| Arm | What it gets |
|---|---|
| `real` | The real training data. Upper bound. |
| `copula_real` | A **Gaussian copula** (SDV's `copulas` library) **fit on the real dataset**. The tool DataGen is positioned against — and it sees data DataGen never does. |
| `datagen_moments` | A schema stating each class's **bounds + mean + std**. A user can state these from domain knowledge; no dataset needed. |
| `datagen_range` | A schema stating **bounds only**. This is all the engine could express before the `mean`/`stdDev` fields existed. |
| `datagen_blind` | `datagen_moments` with every number **mis-specified by ±25%** — a user who is roughly, not exactly, right. |
| `faker_schema` | **Faker**, handed the same bounds (uniform draws). Isolates distribution *shape*, holding schema information constant. |
| `datagen_naive` | Label-agnostic generation. Meant to fail. |
| `shuffled` | Real features, shuffled labels. Meant to fail. |

### (a) sklearn Breast Cancer (569 × 30, binary) — strong univariate signal
Majority baseline = **62.6%**. Accuracy, mean ± std over 5 seeds:

| Training source | LogisticRegression | RandomForest | HistGradientBoosting | Marginal fidelity ↓ |
|---|---|---|---|---|
| Real data (upper bound) | 98.8 ± 0.0 | 94.0 ± 0.2 | 95.9 ± 0.0 | — |
| Gaussian copula *(sees real data)* | 95.9 ± 1.3 | 92.9 ± 1.2 | 94.5 ± 1.1 | **0.156** |
| **DataGen — bounds + moments** | **93.5 ± 0.2** | **92.4 ± 0.5** | **91.2 ± 0.4** | **0.215** |
| DataGen — bounds only | 89.4 ± 0.4 | 90.6 ± 0.4 | 90.6 ± 1.6 | 0.516 |
| Faker — same bounds | 89.9 ± 1.1 | 93.2 ± 0.6 | 92.2 ± 0.7 | 0.430 |
| DataGen — naive (control) | 55.4 ± 11.9 | 62.0 ± 5.7 | 47.7 ± 12.7 | — |
| Shuffled labels (control) | 63.7 ± 3.2 | 59.3 ± 4.0 | 58.6 ± 2.2 | — |
| Uniform baseline | — | — | — | 1.737 |

With moments, DataGen reaches **94.6% / 98.3% / 95.1%** of real-data accuracy across the
three models.

### (b) sklearn Digits (1797 × 64, 10-class) — heavy pixel interactions
Majority baseline = **10.2%**.

| Training source | LogisticRegression | RandomForest | HistGradientBoosting | Marginal fidelity ↓ |
|---|---|---|---|---|
| Real data (upper bound) | 98.2 ± 0.0 | 97.2 ± 0.3 | 95.9 ± 0.0 | — |
| Gaussian copula *(sees real data)* | 95.0 ± 0.6 | 91.0 ± 0.9 | 76.8 ± 2.6 | 0.235 |
| **DataGen — bounds + moments** | **88.8 ± 0.5** | **88.6 ± 1.0** | **85.8 ± 0.8** | **0.139** |
| DataGen — bounds only | 74.7 ± 2.5 | 36.6 ± 2.4 | 31.7 ± 7.6 | 0.520 |
| Faker — same bounds | 75.1 ± 2.4 | 36.7 ± 2.9 | 34.3 ± 3.0 | 0.392 |
| DataGen — naive (control) | 10.2 ± 4.5 | 10.5 ± 3.9 | 11.9 ± 3.0 | — |
| Shuffled labels (control) | 9.4 ± 2.5 | 9.3 ± 1.1 | 9.3 ± 0.9 | — |
| Uniform baseline | — | — | — | 2.629 |

With moments, DataGen reaches **90.5% / 91.2% / 89.5%** of real-data accuracy.

### Interpretation (the honest read)

**1. Bounds alone buy you nothing over a rule-based faker.** Look at the
`datagen_range` and `faker_schema` rows: 89.4 vs. 89.9, 74.7 vs. 75.1, 36.6 vs. 36.7.
They are the same to within noise. A truncated normal centred on the midpoint of
`[min, max]` is *an assumption*, and for skewed real features it is the wrong one —
Faker's uniform draws even land **closer** to the real marginals (0.430 vs. 0.516).
This benchmark falsified DataGen's own "statistically faithful" claim as it stood, and
that is why the `mean` / `stdDev` schema fields now exist.

**2. Stating the moments is what actually purchases fidelity.** Adding mean and std to
the schema — information a user has without owning a dataset — moves marginal fidelity
from 0.516 to **0.215** on Breast Cancer and from 0.520 to **0.139** on Digits, the
latter beating even the copula that was handed the real data. Downstream, it rescues
the tree models completely: RandomForest on Digits goes from **36.6% to 88.6%**.

**3. A single linear model was hiding a collapse.** With bounds only, LogisticRegression
scores 74.7% on Digits while RandomForest scores 36.6%. Linear models are forgiving of
independent-column synthetic data; tree ensembles are not. Reporting one model would
have overstated the result by nearly 40 points.

**4. The naive and shuffled arms are meant to fail, and they do.** They are what make
the headline numbers mean something.

**5. The copula is still ahead, and it should be.** It is fit on the real dataset. The
claim DataGen can defend is narrower and more useful: *within a few points of a copula,
without ever seeing a real row.*

**Headline:** *With a schema that states bounds and moments, a model trained only on
DataGen data reaches **89–98% of real-data accuracy** across three model families and
two datasets — without DataGen ever seeing a real row.*

---

## 4. Correlations — how many must a user actually state?

`figure: figures/correlation-sweep.png`

DataGen generates columns independently. The schema can now state pairwise correlations
(`{"a": "Price", "b": "Quantity", "rho": -0.3}`), induced by **Iman-Conover rank matching**
so that the marginals are left bit-for-bit unchanged and every exactness guarantee in §1
survives. Correlations are stated from domain knowledge; no dataset is required.

Nobody will hand-write 435 pairwise correlations for a 30-column schema. So the question
that matters is whether stating a *handful* of the strongest ones recovers the joint
structure. We state the top-k by |r| and sweep k.

**Breast Cancer** (435 possible pairs; the copula, fit on real data, reaches a
joint-structure error of **0.033**):

| Correlations stated | % of pairs | Joint-structure error ↓ | LR | RF | HGB |
|---|---|---|---|---|---|
| 0 | 0.0% | 0.206 | 93.5 | 92.4 | 91.2 |
| 3 | 0.7% | 0.203 | 93.2 | 92.8 | 92.2 |
| 5 | 1.1% | 0.202 | 92.6 | 92.9 | 92.4 |
| 10 | 2.3% | 0.198 | 92.0 | 93.0 | **93.1** |
| 20 | 4.6% | 0.188 | 91.9 | 92.6 | 92.0 |
| 50 | 11.5% | **0.170** | 92.9 | 92.8 | 93.0 |

**Digits** (2,016 possible pairs; copula joint error **0.022**):

| Correlations stated | % of pairs | Joint-structure error ↓ | LR | RF | HGB |
|---|---|---|---|---|---|
| 0 | 0.0% | 0.063 | 88.8 | 88.6 | 85.8 |
| 5 | 0.2% | 0.062 | 89.0 | 88.7 | 86.1 |
| 10 | 0.5% | 0.062 | 89.1 | 88.9 | 86.3 |
| 50 | 2.5% | **0.058** | 90.0 | 89.3 | 86.1 |

### The honest answer: correlations barely help, and here is why

This is a **negative result**, and it is reported because it is true.

**Stating correlations does not meaningfully recover joint structure.** On Breast Cancer,
stating 50 correlations (11.5% of all pairs) moves the joint-structure error from 0.206 to
0.170 — still **five times worse than the copula's 0.033**. Downstream accuracy moves by
1 to 2 points for the tree models and is *slightly negative* for LogisticRegression.
Diminishing returns are immediate, not gradual.

**Why: for a classifier, the signal lives in the class-conditional marginals, not in the
within-class correlations.** Once you have told DataGen where each class's mass sits (§3,
the moments), you have already given it nearly everything a classifier can use. The
correlations between features *within* a class carry little additional discriminative
information, which is also why the copula's own advantage over DataGen is modest, and why
it actually **loses** to DataGen on Digits + HistGradientBoosting (76.8 vs. 85.8).

**So why keep the feature?** Because TSTR accuracy is not the only thing synthetic data is
for. Correlations matter when you need individual rows to be *plausible* — a demo, a test
fixture, a UI screenshot where a high `Quantity` should not sit next to a high `UnitPrice`
if your business says otherwise. The engine can now express that, and the quality report
audits requested vs. achieved r. What the benchmark says is only this: **do not state
correlations expecting a better classifier.** State them when you want realistic rows.

**The moments were the lever. The correlations were not.** That is worth knowing, and it
is the kind of thing you only find out by measuring instead of assuming.

---

## 5. Schema sensitivity — what if the user is only roughly right?

The numbers above assume an accurate schema. Real users guess. `datagen_blind` and the
sweep in `figures/schema-sensitivity.png` perturb **every stated bound, mean and std**
by up to ±N% and re-measure. Accuracy, mean over 5 seeds:

| Schema error | Breast Cancer (LR / RF / HGB) | Digits (LR / RF / HGB) |
|---|---|---|
| exact (0%) | 93.5 / 92.4 / 91.2 | 88.8 / 88.6 / 85.8 |
| ±10% | 93.5 / 92.0 / 89.9 | 88.5 / 62.8 / 42.7 |
| ±25% | 93.5 / 89.8 / 86.0 | 86.6 / 58.9 / 38.8 |
| ±50% | 93.7 / 89.6 / 85.5 | 79.8 / 52.7 / 38.6 |

**Takeaway:** univariate-driven data is remarkably forgiving — a schema that is 50%
wrong still trains a 93.7% classifier on Breast Cancer. Interaction-heavy data is not:
on Digits, a mere ±10% error collapses HistGradientBoosting from 85.8% to 42.7%.

**The practical rule this gives a user:** the vaguer your schema, the more your data can
only support simple, univariate-driven models. Precision in the schema is what buys you
the right to train anything more complex on the output.

---

## 6. NLP TSTR — synthetic sentiment → real public reviews

Train a TF-IDF + LogisticRegression classifier **only** on DataGen's NLP
classification output (1,500 synthetic product-review sentiment rows), then test on
the real, public **UCI Sentiment Labelled Sentences** corpus (3,000 human-written
amazon / imdb / yelp sentences, binary). The model never sees a real sentence in
training. Chance baseline = **50%**.

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
produces sentiment that transfers to real, unseen, cross-domain reviews above chance
(+10 pts). Pointing the same pipeline at an **LLM-generated pool** lifts transfer to
**67.5%, +7.1 points**. The offline number is the reproducible, key-free lower bound
(run without an `OPENROUTER_API_KEY`); the LLM ceiling requires the key, and
`benchmark.plots` only draws that bar when one is set. The tabular TSTR above remains
the rigorous, fully-offline centerpiece.

---

## 7. Cost model — hybrid vs. naive "LLM emits every row"

DataGen calls the LLM **once** per generation, for a ≤80-record pool of text
columns; NumPy expands that into N structured rows for free. A naive approach emits
every row as tokens. Token counts are estimated at ~4 chars/token from real samples
and priced at published **GPT-4o-mini** rates ($0.15 / $0.60 per 1M in/out) as a
representative paid model — DataGen's own generation runs on free-tier OpenRouter
models, so this is a conservative what-if baseline, not a measured invoice.

| Rows | DataGen | Naive LLM | Naive calls needed | DataGen cheaper |
|---|---|---|---|---|
| 1,000 | $0.0019 | $0.0149 | 2 | **8×** |
| 10,000 | $0.0019 | $0.1485 | 16 | **79×** |

**Takeaway:** DataGen's cost is **flat in N** (one small call), while the naive
approach grows linearly *and* needs ~16 chunked calls past the 16K-token completion
limit at 10K rows — so it is not only ~79× more expensive but also slower and more
failure-prone. This is the architectural payoff of confining the LLM to semantics.

---

## What these benchmarks do not yet cover

Stated plainly, because a benchmark that hides its own blind spots is worth less than one
that names them.

- **Privacy.** No distance-to-closest-record or membership-inference measurement. DataGen
  never sees real data, so the risk is structurally low, but "low by construction" is an
  argument, not a measurement. This is the largest remaining gap, and it is the one axis
  where DataGen should *beat* a copula outright, since a copula fit on real records can
  memorise them and DataGen cannot leak what it never saw.
- **The schemas are derived from the real data.** Every DataGen arm is handed a schema
  computed from the training split (per-class bounds, moments, category weights). A real
  user would *state* those numbers from domain knowledge and get them somewhat wrong. The
  ±25% arm and the sensitivity sweep in §5 are the honest proxy for that, but the truly
  blind end-to-end case — describe a dataset you have never seen, then measure — is not
  yet benchmarked. It is the number that would most fully honour the product's promise.
- **Deterministic constraints.** `Total = Quantity × UnitPrice` is not expressible. Stated
  correlations (§4) induce statistical association, not exact arithmetic relationships.
- **Regression targets.** All three tabular benchmarks are classification. §4's conclusion
  (that within-class correlations add little) is a claim about *classifiers* and may not
  hold for regression, where joint structure plausibly matters more.
- **Deep synthesizers.** CTGAN and TVAE are not benchmarked, only the Gaussian copula.
