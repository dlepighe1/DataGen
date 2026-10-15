# DataGen — CMS Fill-In (AI / ML Case Study layout)

Ready-to-paste values for the Sanity **AI / ML Case Study** layout (`projectType: ai_ml_case_study`).

Every number comes from a script in `backend/benchmark/` and is recorded in
`backend/benchmark/RESULTS.md`. Nothing is invented. ⬜ marks an asset you still need to supply.

`**bold**` renders as `<strong>` in Sanity text fields. Line breaks are preserved.

---

## 1. Core

| Field           | Value                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| `title`       | DataGen: Synthetic Dataset Generator                                        |
| `slug`        | `datagen`                                                                 |
| `sortOrder`   | (next free number)                                                          |
| `category`    | AI Innovations                                                              |
| `categories`  | AI Innovations, Data Science                                                |
| `projectType` | AI / ML Case Study                                                          |
| `status`      | completed                                                                   |
| `featured`    | true                                                                        |
| `timeline`    | Jun 2025 to Jul 2026                                                        |
| `role`        | Solo: architecture, engine, benchmarks, frontend, deployment                |
| `githubUrl`   | https://github.com/dlepighe1/DataGen                                        |
| `demoUrl`     | https://datagen.pages.dev                                                   |
| `reportUrl`   | https://github.com/dlepighe1/DataGen/blob/main/backend/benchmark/RESULTS.md |

**`tags`**

```
Python
Flask
NumPy
scikit-learn
React
Tailwind CSS
OpenRouter
LLMs
Synthetic Data
TSTR Benchmark
Cloudflare Pages
Railway
```

### `description` (card hook)

```
Describe a dataset that doesn't exist, get data you can actually train on. Given nothing but a
**description** of a dataset, DataGen reaches 98.5% of real-data performance and beats a Gaussian
copula that was handed the **raw rows** — at $0.002 per run.
```

### `longDescription` (project overview)

```
DataGen turns a **description** of a dataset into the dataset itself. You state the columns, the
distributions, the class balance, and exactly how dirty you want the data, and it returns up to
**10,000 reproducible rows** plus a report that audits every knob you set.

It exists because good tabular data is usually unavailable: locked behind privacy, too scarce, or
too expensive. The alternatives all break somewhere. **GANs and copulas need the real dataset you
don't have.** **Fakers have no statistical grounding.** **An LLM writing rows directly cannot
honour a distribution at all.**

The engine is hybrid. An LLM writes only the *text* (so names match emails); NumPy synthesizes
every number, category, and quality defect locally. That split makes the tool statistically sound,
**flat-cost regardless of dataset size**, and reproducible from a single seed.
```

---

## 2. AI / ML Case Study

### 2.1 Framing

#### `problem`

```
ML teams need realistic tabular data to build and test on, and usually cannot get it. Real records
stay locked behind privacy, scarcity, and cost.

Every shortcut fails somewhere. **GAN and copula models need a real dataset to learn from**, which
is precisely what you don't have. **Rule-based fakers have no statistical grounding**: the values
look plausible and the distributions are nonsense. And **asking an LLM to write rows is
statistically unsound** — token-sampled numbers don't follow distributions, a requested missing
rate is just a sentence the model may ignore, and no single completion holds 10,000 rows.
```

#### `goal`

```
Generate statistically faithful data **from a schema alone**, with no source dataset: real
distributions, exact quality controls, fast, near-zero cost, reproducible from one seed, and
resilient enough that a provider outage never hard-fails a run.

And prove it rather than claim it. That meant benchmarking against the actual tools this competes
with, on a real messy dataset, with control arms designed to show the whole idea didn't work.
```

#### `outcome`

```
On **UCI Adult** (48,842 real rows, 6 numeric and 8 categorical columns, imbalanced), a model
trained **only** on DataGen output reaches **98.5% of real-data macro-F1**, beating a **Gaussian
copula** on the same task (96.7%).

The comparison is the interesting part. The copula was handed the **raw rows**. DataGen was handed
only a **description** — bounds, averages, spread, class balance — the kind of thing a domain expert
states from memory. Summary statistics beat full data access here, because DataGen honours the
categorical class balance **exactly** (distance from real: **0.000**) where the copula only
approximates it. Faker, given the same description, collapses to 69.4%.

It generates **10,000 rows in 0.06s** at a flat **$0.0019 per run** (~**79x cheaper** than per-row
LLM generation), survives provider outages through a **7-model fallback chain** plus an offline
engine, and reproduces byte-identically from its seed.

Two findings went against me and both were kept. The benchmark proved the engine was **no better
than a rule-based faker** until the schema could state an average. And the correlation feature I
built to close the last gap turned out to buy **almost nothing**. Both are published in the report.
```

### 2.2 Data

#### `datasetSource`

```
None for generation. DataGen synthesizes from a schema, so there is no training corpus.

Real datasets are used only to **evaluate** it: **UCI Adult** (mixed-type centerpiece), sklearn
**Breast Cancer** and **Digits** (numeric), and the public **UCI Sentiment Labelled Sentences**
corpus (NLP transfer).
```

#### `datasetSize`

```
UCI Adult: 48,842 rows, 6 numeric + 8 categorical, 76/24 imbalanced (subsampled to 10,000,
stratified). Breast Cancer 569 x 30. Digits 1,797 x 64. UCI Sentiment: 3,000 human-written
sentences.

Held out 70/30. Every arm is scored on the same real split, over **5 seeds** and **3 model
families**.
```

#### `datasetClasses`

Leave blank — the field guide's own rule for generation projects.

#### `datasetPreprocessing`

```
Synthetic training sets are built by *describing* each class (numeric bounds, mean, standard
deviation; categorical class weights) and generating from that schema. No real rows are copied.

**Macro-F1 is the headline metric on Adult, not accuracy.** Predicting "<=50K" for every row
already scores 75.6% accuracy, so accuracy would flatter every arm on the page.

Four arms exist purely to make the result falsifiable: **Faker** with identical bounds, a
**label-agnostic** arm, a **shuffled-label** arm, and a **±25% mis-specified schema** modelling a
user who is roughly, not exactly, right.
```

### 2.3 Model

#### `modelUsed`

```
**google/gemma-4-31b-it** (free tier) via OpenRouter, first in a 7-model fallback chain
(gpt-oss-120b, nemotron-3-ultra-550b, qwen3-next-80b, llama-3.3-70b, then gpt-4o-mini and
gpt-3.5-turbo as paid last resorts), with a fully offline engine underneath. The LLM handles text
only.

Evaluated with LogisticRegression, RandomForest and HistGradientBoosting, against two real
competitors: a **Gaussian copula** (SDV's `copulas` + `rdt`) and **Faker**.
```

#### `modelApproach`

```
A hybrid split by what each component is actually good at. The **LLM never emits rows**: it writes
~80 coherent text records (so a name matches its email). **NumPy synthesizes everything else**:
truncated-normal numerics centred where the schema says the mass sits, categoricals with exact
class weights, plus missing values, outliers, noise, dates and IDs.

Three alternatives were rejected for structural reasons. GAN and copula tools (SDV, CTGAN) are
statistically strong but require the real dataset you don't have. Fakers are statistically blind.
Prompting an LLM for raw CSV — what v1 did — cannot honour a distribution or an exact missing rate.

The most important design decision is the least glamorous: the schema states **where the mass
sits**, not just the bounds. Without that, "statistically faithful" quietly means "we assumed a
symmetric bell", and the benchmark proved that assumption is worth nothing.
```

#### `modelTraining`

```
No model is trained. The LLM is called **once per generation** (45s timeout, ≤80-record pool), with
status-code-aware retries walking the fallback chain and a typed error taxonomy mapped to UI
recovery states. Per-IP rate limits (10/min, 60/hr, 200/day) protect the free tier. If no model is
reachable, the offline engine takes over and the run still completes.

Numeric work is pure NumPy: **10,000 rows in 0.06s**, so cost and latency do not scale with row
count.
```

#### `modelEvaluation`

```
**Train on synthetic, test on real**, over **5 seeds** and **3 model families**, always on the same
real held-out split, always against a stated baseline.

**UCI Adult** (macro-F1, share of real): DataGen **98.5 / 96.9 / 94.2%**. Gaussian copula *fitted on
the real data*: **96.7 / 94.3 / 89.4%**. Faker: **69.4 / 85.5 / 84.5%**. Controls: ~55%.

**Numeric sets**: **94.6 / 98.3 / 95.1%** of real accuracy on Breast Cancer, **90.5 / 91.2 / 89.5%**
on Digits.

**Fidelity**: categorical distance from real **0.000** (copula: 0.085; Faker: 0.502).

**Parameter exactness**: 0 cells of error on requested missing %, exact outlier counts, 100% range
adherence over 40,000 values, KS p = 0.99 against the target, byte-identical output across seeds.

**Known limits, stated up front.** The schema handed to DataGen is computed from the training split,
so it represents a user who describes their data *accurately*. The ±25% arm is the proxy for a user
who guesses; a fully blind end-to-end test is not yet run. Privacy is argued structurally but not
yet measured. All three tabular benchmarks are classification.
```

#### `pipelineSteps`

```
Schema Input
LLM Semantic Pool
NumPy Synthesis
Quality Controls
Validation Report
Export
```

### 2.4 Results

#### `resultsMetrics` — numeric tiles

| label                       | value     | unit             | description (popover)                                                                                                                                                                                                                                                     |
| --------------------------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Of real-data performance    | `98.5`  | `%`            | Macro-F1 on UCI Adult, trained**only** on DataGen output. Beats a **Gaussian copula that was given the raw rows** (96.7%), while DataGen was given only a description of them. It honours categorical class balance exactly; the copula only approximates it. |
| Categorical fidelity        | `0.000` | `distance`     | Total-variation distance between requested and generated class balance. Not "approximately zero" — exactly zero. Copula: 0.085. Faker: 0.502.                                                                                                                            |
| Tree-model accuracy rescued | `88.6`  | `%`            | RandomForest on Digits, up from**36.6%** once the schema could state a mean and spread. The biggest result in the project, and it came from a benchmark that failed.                                                                                                |
| Cheaper than per-row LLM    | `79`    | `×`           | Flat $0.0019 per run vs. ~$0.1485 for 10K rows emitted token by token, which also needs 16 chunked calls.                                                                                                                                                                 |
| Generation speed            | `0.06`  | `s / 10K rows` | The LLM never touches per-row generation, so speed and cost stay flat as the dataset grows.                                                                                                                                                                               |

#### `resultsMetrics` — qualitative Highlights

Leave `value` and `unit` empty so these render as Highlights cards.

| label                   | textValue                                | description                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cost per run            | `$0.0019, flat`                        | Per run, not per row. Cost does not grow with dataset size.                                                                                                                                                                                                                                                               |
| Reproducibility         | `Seed to byte-identical output`        | Same seed, same table, every time. Non-negotiable for experiments you intend to defend.                                                                                                                                                                                                                                   |
| Privacy by construction | `The sample never leaves your browser` | Fit-from-sample parses your CSV client-side and sends only the*description* of your data. There is no upload endpoint and nothing is stored.                                                                                                                                                                            |
| What didn't work        | `Correlations bought almost nothing`   | I built stated correlations to close the joint-structure gap. Measured: 1-2 points for tree models, nothing for linear ones — because for a classifier the signal lives in the class-conditional marginals, not within-class correlations. Kept the feature (it makes rows plausible), kept the finding, published both. |
| Where it's weakest      | `Schema quality is data quality`       | A schema that is 25% wrong drops gradient boosting on Adult from 75.0 to 40.6 macro-F1, barely above a shuffled-label control. A vague schema buys vague data. There is no free lunch.                                                                                                                                    |

#### `resultImages`

All five live in `backend/benchmark/figures/`, regenerated by `python -m benchmark.plots`.

| title                               | image                              | caption                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A description beats the raw data    | `figures/adult-mixed-tstr.png`   | The headline, on the data the product actually generates: 6 numeric and 8 categorical columns. The copula was given the real rows; DataGen was given only a description of them, and still wins. The right panel shows why: DataGen reproduces class balance exactly, at a distance of 0.000.            |
| The feature that didn't work        | `figures/correlation-sweep.png`  | An honest negative result. I built stated correlations to recover joint structure, then measured whether they do. They barely move accuracy, and the joint-structure error plateaus far above the copula's dashed line. The y-axis is deliberately wide so a 1-point wobble can't masquerade as a trend. |
| What a vague schema costs you       | `figures/schema-sensitivity.png` | Univariate data forgives a schema that is 50% wrong; interaction-heavy data collapses at ±10%. The rule this gives a user: the vaguer your schema, the simpler the model your data can support.                                                                                                         |
| The finding that changed the engine | `figures/tstr-comparison.png`    | On numeric data with bounds only, DataGen ties Faker. Stating the distribution's mean and spread is the entire difference between a statistical generator and a random-number generator.                                                                                                                 |
| Every knob, audited                 | `figures/fidelity-dashboard.png` | Zero error on requested missing %, exact outlier counts, 100% range adherence over 40,000 values, KS p = 0.99 against the target. Cost stays flat as row count grows.                                                                                                                                    |

### 2.5 Reflection

#### `challengesSolutions`

| challenge                                                                                                                                                                                                                                         | solution                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The benchmark disproved the core claim.** With only min/max bounds, DataGen scored 89.4% against Faker's 89.9%. "Statistically faithful" really meant "we assumed a symmetric bell", which sits in the wrong place for any skewed column. | Let the schema state the**distribution's mean and spread** — something a user knows without owning a dataset ("orders average $40"). Marginal fidelity went from **0.52 to 0.14**; RandomForest on Digits went from **36.6% to 88.6%**. The benchmark found the bug in the pitch, and the fix followed.                                                              |
| **The benchmark measured the wrong thing.** Both datasets were 100% numeric while the product generates numbers *and* categories. The least representative path through the engine was the only one being tested.                         | Add**UCI Adult** and build exact categorical class weights to support it. DataGen now **beats a copula fitted on the real data**, and Faker collapses. The credibility hole closed and a genuine strength appeared.                                                                                                                                                         |
| One model and one seed were hiding a collapse: LogisticRegression reported 74.7% on Digits while RandomForest sat at 36.6%.                                                                                                                       | Evaluate every arm over**5 seeds and 3 model families**, reporting mean ± std. Linear models are forgiving of independent-column synthetic data; tree ensembles are not, and only the trees told the truth.                                                                                                                                                                      |
| Columns were generated independently, so a statistical correlation could never express an exact business rule like`Total = Quantity × Price`.                                                                                                  | Two separate mechanisms, because they are two separate problems.**Correlations** (Iman-Conover rank matching, which reorders rows without touching values, so every exactness guarantee survives) for statistical association. **Formula columns** for arithmetic identities that must hold in *every* row. Then measure both: correlations barely helped, and I said so. |
| Fit-from-sample risked destroying the product's whole premise: upload a dataset and it is no longer dataset-free.                                                                                                                                 | Parse the CSV**entirely in the browser** and send only the derived statistics. There is no upload endpoint and nothing is stored. The sample *writes the schema*; the engine still generates from the schema alone. The convenience is added without the dependency, or the privacy surface.                                                                                    |
| A free-tier provider outage would take the whole tool down.                                                                                                                                                                                       | A**7-model fallback chain** with status-code-aware retries, a typed error taxonomy mapped to UI recovery states, and a fully offline engine, so a run degrades instead of dying.                                                                                                                                                                                                  |

#### `keyInsights`

| title                                              | description                                                                                                                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A benchmark that can't embarrass you is decoration | The Faker arm was added expecting a victory lap. It tied. That single negative result produced the most valuable feature in the project.                                   |
| Benchmark what you ship, not what is convenient    | Two clean numeric datasets flattered the engine and tested the path nobody uses. A real mixed-type dataset revealed both the weakness and the genuine strength.            |
| Bounds are not a distribution                      | Min and max say where values*can't* be, not where they *are*. Until the schema could state a mean, "statistically faithful" was an assumption wearing a lab coat.      |
| The obvious fix is often not the real one          | Correlations looked like the answer to the joint-structure gap. They weren't. Building the feature and measuring it honestly was worth more than shipping it and assuming. |
| Know which competitor you are allowed to lose to   | A copula fitted on real data*should* win on joint structure, and on numeric data it does. On mixed-type data, exactness beats fitting. Both facts belong in the report.  |

#### `whatILearned`

Edit before publishing — recruiters read this field closest.

```
I set out to prove DataGen worked and ended up disproving parts of it, twice.

Adding a Faker arm was meant to be a victory lap: a rule-based faker with no statistical model,
handed the same schema. It tied with my engine. That exposed that my "statistically faithful"
generation was really a bell curve parked at the midpoint of whatever range you typed — the wrong
shape for any skewed column. Letting the schema carry a mean and a spread took RandomForest on the
hardest dataset from 36.6% to 88.6%.

The second lesson was harder. Both my benchmark datasets were entirely numeric while the product's
whole point is mixed schemas, so I was grading the engine on the one path nobody uses. Adding UCI
Adult changed the story completely: DataGen beat a Gaussian copula that had been fitted on the real
data, because it reproduces class balance exactly where the copula only approximates. That strength
had been hiding behind a convenient benchmark.

Then I built correlations to close the last gap, measured them, and found they bought almost
nothing. I kept the feature and published the negative result. That is the part of this project I
would defend hardest: a benchmark you are willing to lose to is the only kind worth running.

What I would do differently: build the adversarial baselines and the realistic dataset first, not
last. I would have found all of this in week one instead of after writing the marketing copy.
```

#### `nextSteps`

```
Privacy metrics (distance-to-closest-record, membership inference) — the largest thing still unmeasured, and the one axis where a schema-first generator should beat a copula outright
A regression benchmark, since all three tabular benchmarks are classification and the correlation finding is a claim about classifiers
CTGAN and TVAE as deeper competitor baselines
Streaming generation beyond 10,000 rows
```

---

## 3. Extras

**`highlightMetrics`** — the three numbers a reader should leave with.

| label                                                         | value    | unit   | textValue          |
| ------------------------------------------------------------- | -------- | ------ | ------------------ |
| Of real-data performance (beats a copula fitted on real data) | `98.5` | `%`  |                    |
| Categorical fidelity                                          |          |        | `0.000 — exact` |
| Cheaper than per-row LLM                                      | `79`   | `×` |                    |

**Leave empty:** `impact`, `result` (performance belongs in `resultsMetrics`; don't repeat numbers
across three arrays) and `keyInsightsShared` (`keyInsights` has the better shape — don't fill both).

---

## Before you publish

1. **`image` (hero):** `adult-mixed-tstr.png`. Strongest, most legible claim you have.
2. **`gallery`:** ⬜ screenshots of the schema builder and the quality report. `gallery` only renders
   when `demoUrl` is set, and yours is.
3. Delete any ⬜ you can't fill. Empty sections hide cleanly; half-written ones look worse than absent.
4. **Keep both negative results.** They are the most credible thing on the page and the clearest
   signal that the numbers next to them can be trusted.
