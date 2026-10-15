# DataGen: Synthetic Dataset Generator

**Schema-first synthetic data for ML practice, prototyping, and data-cleaning education.**
Define your columns, dial in *exactly* how dirty you want the data (missing values, noise, outliers), and export up to **10,000 reproducible rows** as CSV, JSON, or TXT.

🌐 **Live demo:** [datagen.pages.dev](https://datagen.pages.dev)

---

## Why DataGen?

Most synthetic-data tools fall into two camps:

| Approach | Strength | Limitation |
|---|---|---|
| **GAN/copula models** (SDV, CTGAN) | Statistically faithful | Require a *real* dataset to learn from |
| **Rule-based fakers** (Faker, Mockaroo) | Fast, deterministic | No semantic understanding of *your* domain |

DataGen targets the gap with **zero-shot, schema-first generation**: you describe a dataset that doesn't exist yet ("vintage vinyl record orders from Chicago customers") and get statistically sound rows out. It's built for students and educators who need *deliberately imperfect* data to practice cleaning, imputation, and outlier detection, with knobs that real datasets simply don't come with.

## The Hybrid Engine

Early versions asked an LLM to emit raw CSV. That's statistically unsound: token-sampled numbers don't follow distributions, requested missing-value percentages are just sentences the model may ignore, and one chat completion physically can't hold 10,000 rows. The current engine splits the work by what each component is actually good at:

```
                       ┌──────────────────────────────────────────┐
 column schema  ─────► │  LLM (semantic layer)                    │
 custom instructions   │  Gemma 4 31B → GPT-OSS → Nemotron →      │
                       │  Qwen → Llama 3.3 → GPT-4o-mini (paid)   │
                       │  Generates a small pool of COHERENT      │
                       │  text records (name ⇄ email match),      │
                       │  honoring custom instructions.           │
                       │  Offline fallback: curated local pools.  │
                       └───────────────────┬──────────────────────┘
                                           │ ~80 records, expanded to
                                           │ ~1,500 unique identities
                       ┌───────────────────▼──────────────────────┐
                       │  NumPy (statistical core)                │
                       │  • numbers: truncated normal, centred    │
                       │    on the schema's mean/std if given     │
                       │  • missing values: EXACT requested %     │
                       │  • outliers: exact count, out-of-range   │
                       │  • noise: Gaussian, % of column span     │
                       │  • dates, booleans, unique IDs           │
                       │  • fully seeded → reproducible           │
                       └───────────────────┬──────────────────────┘
                                           ▼
                          table + data quality report (JSON)
```

The LLM **never emits rows**. It only produces a pool of semantically coherent text records; every number, date, boolean, ID, missing cell, and outlier is synthesized locally. As a result, 10K rows take about a second, parameters are enforced exactly, and the same seed always returns the same dataset.

### Data quality report

Every generation returns a verification report covering requested vs. actual missing %, requested vs. actual ranges, unique counts, injected outliers, the seed, and which engine/model produced the text. The UI renders it under the preview table, so you don't have to trust the generator: you can audit it.

### NLP task datasets

Beyond tabular data, DataGen generates ready-to-train NLP datasets (`POST /api/nlp/generate`):

| Task | Columns | Trick |
|---|---|---|
| **Search & retrieval** | Query, Passage, Relevance | Negatives derived by mismatching pool items, with the exact pos/neg ratio you choose |
| **Text classification** | Text, Label | Custom label sets; *exact* class balance (or skewed + 5% label noise in distorted mode) |
| **Question answering** | Context, Question, Answer | Extractive answers guaranteed to appear in the context |
| **Paraphrase pairs** | Sentence1, Sentence2, IsParaphrase | Positives from the LLM, negatives by combinatorial mismatch |

The LLM writes a pool of unique domain examples (your custom instructions set the domain); ratios, balance, and label noise are enforced exactly and reproducibly by the statistical layer.

## Features

- **7 dataset templates**: e-commerce, healthcare, finance, education, sports, gaming, and marketing, plus fully manual schemas (text, number, email, date, boolean, categorical, formula)
- **Describe a distribution, not just a range**: optional `mean` / `stdDev` per numeric column, exact class weights per categorical column, and optional pairwise correlations
- **Formula columns**: `TotalAmount = Quantity * UnitPrice` holds exactly in every row — an arithmetic identity, not a statistical tendency (parsed safely; never `eval`'d)
- **Fit from a sample**: hand it a CSV you already have and it drafts the whole schema (types, ranges, averages, class balance, strongest relationships). The file is parsed **in your browser and never uploaded** — only the *description* of your data is used, never the data
- **4 NLP task types**: classification, semantic retrieval, QA, and paraphrase pairs with controllable class balance and negative ratios
- **Deliberately dirty data**: per-column sliders for missing %, Gaussian noise, and outliers, plus a global "distorted" mode that mangles text casing, mixes date formats, and dirties booleans for cleaning practice
- **Custom instructions**: free-text steering of semantic content, passed verbatim to the LLM ("all patients are pediatric", "merchants are coffee shops")
- **Seeded reproducibility**: share a seed and schema, and anyone can regenerate your exact dataset
- **Resilient backend**: a 7-model fallback chain (free-tier models first, paid models as last resort) with status-code-aware retries, typed error taxonomy, matching recovery UI states, and a fully offline local engine when no model is reachable
- **Rate limiting**: per-IP limits (10/min, 60/hr, 200/day) protect the free tier
- **3 export formats**: RFC-4180-safe CSV, JSON, and TXT

## Tech Stack

**Frontend:** React 19 · Vite · Tailwind CSS 4 · Radix UI · GSAP, deployed on Cloudflare Pages
**Backend:** Flask · NumPy · Flask-Limiter · OpenAI SDK (via OpenRouter) · Gunicorn, deployed on Railway

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
# Optional. Without it, the offline semantic engine is used:
export OPENROUTER_API_KEY=sk-or-...
python app.py            # serves on http://localhost:8000
```

### Frontend

```bash
npm install
npm run dev              # serves on http://localhost:5173
```

The frontend reads `VITE_API_URL` (defaults to `http://localhost:8000`).

### Tests

```bash
cd backend
python -m pytest -v
```

Covers exact missing-value percentages, range adherence, outlier injection counts, seed reproducibility, ID uniqueness, name and email coherence, and 10K-row generation.

## API

`POST /api/generate`

```jsonc
{
  "rowCount": 1000,                  // 1 to 10000
  "seed": 42,                        // optional, omit for random
  "distributionType": "balanced",    // or "distorted"
  "customInstructions": "All customers are from Chicago",
  "columns": [
    { "name": "CustomerName", "type": "string" },
    { "name": "Email", "type": "email" },
    { "name": "UnitPrice", "type": "number", "numberType": "decimals",
      "minValue": 5, "maxValue": 500,
      "mean": 40, "stdDev": 25,        // optional: where the mass actually sits
      "nanPercentage": 10,
      "addOutliers": true, "outlierPercentage": 5 }
  ]
}
```

`mean` and `stdDev` are optional and are the highest-leverage fields in the schema.
Without them the engine centres a bell on the midpoint of `[minValue, maxValue]`,
which is wrong for any skewed column and measurably costs downstream accuracy
(see `RESULTS.md` §3). You do not need a dataset to supply them — "orders average
$40, most land between $20 and $60" is something you already know.

**Categorical columns** take an exact class balance:

```jsonc
{ "name": "Tier", "type": "categorical",
  "categories": ["bronze", "silver", "gold"],
  "categoryWeights": [0.6, 0.3, 0.1] }   // honoured to the row, not in expectation
```

**Formula columns** compute a value exactly, per row, from the numeric columns above them:

```jsonc
{ "name": "TotalAmount", "type": "derived", "numberType": "decimals",
  "formula": "Quantity * UnitPrice" }   // holds in every row, not on average
```

Supports `+ - * / ( )` over numeric columns and literals, and a formula may reference an
earlier formula column. It is parsed by a hand-written recursive-descent parser, never
`eval`'d — a formula arrives in an untrusted request body. A mistyped formula returns a
`validation` error naming the unknown column; a division by zero leaves the cell blank
rather than failing the run.

**Correlations** are optional and stated per pair, alongside `columns`:

```jsonc
"correlations": [ { "a": "UnitPrice", "b": "Quantity", "rho": -0.3 } ]
```

They are induced by Iman-Conover rank matching, which *reorders* rows rather than
rewriting values — so exact missing counts, exact outlier counts and range adherence
all survive untouched. An impossible set of correlations degrades to the nearest
achievable one instead of failing. The quality report audits requested vs. achieved r.
Note the honest finding in `RESULTS.md` §4: correlations make rows more *plausible*,
but they do **not** meaningfully improve a downstream classifier.

Returns `{ status, table, report }` where `report` is the quality audit. Errors carry a typed `error_type` (`validation`, `rate_limited`, `connection`, `model_unavailable`, `config`, `unknown`) that the UI maps to specific recovery states.

## Benchmarks

Four reproducible benchmarks live in `backend/benchmark/` (deps:
`pip install -r backend/benchmark/requirements.txt`). All numbers in
[`benchmark/RESULTS.md`](backend/benchmark/RESULTS.md) come straight from these
scripts — nothing is hand-written.

```bash
cd backend
python -m benchmark.fidelity_benchmark     # exactness, distribution fit, reproducibility, throughput
python -m benchmark.mixed_tstr_benchmark   # UCI Adult: mixed numeric + categorical TSTR
python -m benchmark.tstr_benchmark         # numeric TSTR + the correlation sweep
python -m benchmark.nlp_tstr_benchmark     # NLP TSTR: synthetic sentiment -> real reviews
python -m benchmark.cost_analysis          # hybrid vs. naive LLM-emits-rows cost
python -m benchmark.plots                  # render figures/
```

Every arm runs over **5 seeds** and **3 model families** (LogisticRegression,
RandomForest, HistGradientBoosting), reported as mean ± std, against two real
competitors: a **Gaussian copula** (SDV's `copulas` + `rdt`) *fit on the real dataset*,
and **Faker** given the identical bounds.

- **Mixed-type TSTR on UCI Adult — the centerpiece.** 48,842 real rows, 6 numeric +
  8 categorical, 76/24 imbalanced. Trained **only** on DataGen output and tested on a
  real held-out split, DataGen reaches **98.5% of real-data macro-F1**, *beating* a
  **Gaussian copula that was fit on the real dataset* (96.7%) — because DataGen honours
  the categorical class weights **exactly** (total-variation distance **0.000**) while
  the copula's Gaussian treatment of categories is lossy. **Faker**, handed the same
  bounds, collapses to 69.4%. See `RESULTS.md` §2.
- **The benchmark falsified an earlier claim, and the engine changed because of it.**
  On *purely numeric* data with *bounds only*, DataGen was statistically
  indistinguishable from Faker (89.4% vs. 89.9%), because the bell was always centred
  on the midpoint of the range. Letting the schema state `mean` / `stdDev` — which a
  user knows without owning a dataset — moved marginal fidelity from **0.52 to 0.14**
  and rescued the tree models on Digits from **36.6% to 88.6%**. `RESULTS.md` §3.
- **Correlations: an honest negative result.** The schema can now state pairwise
  correlations, induced by Iman-Conover rank matching (marginals unchanged, so every
  exactness guarantee survives). Measured, they buy **1–2 points at best, and nothing
  for linear models** — because for a classifier the signal lives in the
  class-conditional marginals, not in within-class correlations. State them for
  *plausible rows*, not for a better classifier. `RESULTS.md` §4.
- **Schema sensitivity.** Univariate data forgives a vague schema (50% wrong still
  trains a 93.7% classifier); interaction-heavy data does not (a ±10% error halves
  gradient-boosting accuracy). `figures/schema-sensitivity.png`.
- **NLP TSTR (real public dataset).** Trained only on DataGen synthetic sentiment
  and tested on the real **UCI Sentiment Labelled Sentences** (3,000 human-written
  reviews), a TF-IDF + LogisticRegression scores **60.4%** vs. a 50% chance baseline
  from the no-LLM **offline** engine — an honest cross-domain lower bound. Swapping in
  an **LLM-generated pool** (the free OpenRouter chain — gemma-4-31b — domain-matched,
  400 examples) lifts it to **67.5%** (**+7.1 pts**), the text-transfer ceiling. Class
  balance (750/750) and label noise (exactly 5%) are exact.
- **Parameter fidelity.** 0 cells of error on requested missing %; exact outlier
  counts with 100% landing out of range; 100% range adherence over 40K values;
  KS p≈0.99 against the target distribution; byte-identical reproduction across
  seeds; 10K rows in 0.06 s.
- **Cost.** Confining the LLM to semantics makes generation **flat-cost in N**:
  ~$0.0019 per run regardless of size, vs. a naive LLM-emits-every-row approach at
  ~$0.15 for 10K rows (**~79× cheaper**, and no 16-call chunking around the token
  limit). Priced at a representative paid model; on DataGen's free-tier chain the real
  cost is effectively zero.

## Roadmap

- [x] TSTR benchmark (train on synthetic, test on real) — see `backend/benchmark/`
- [x] Competitor baselines (Gaussian copula, Faker) and multi-model, multi-seed evaluation
- [x] Distribution moments in the schema (`mean` / `stdDev`) — the fix the benchmark forced
- [x] Categorical columns with exact class weights
- [x] Mixed-type benchmark on a real dataset (UCI Adult) — the data the product actually makes
- [x] Stated correlations (Iman-Conover), plus the sweep that showed they don't buy accuracy
- [x] Surface `mean` / `stdDev`, category weights and correlations in the UI
- [x] Deterministic constraints via **formula columns** (`TotalAmount = Quantity * UnitPrice`),
      which stated correlations approximate but cannot express exactly
- [x] **Fit-from-sample**: point DataGen at a CSV you already have and it drafts the schema.
      Parsed **in the browser** — the file is never uploaded. Schema-first stays the default;
      the sample only *writes the schema*, and the engine still generates from the schema alone.
- [ ] **Privacy metrics** (distance-to-closest-record, membership inference) — the one axis
      where a schema-first generator should beat a copula outright, currently unmeasured
- [ ] A regression TSTR task (all three tabular benchmarks are classification)
- [ ] Streaming generation for >10K rows
