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
                       │  • numbers: truncated normal in range    │
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

- **7 dataset templates**: e-commerce, healthcare, finance, education, sports, gaming, and marketing, plus fully manual schemas (text, number, email, date, boolean)
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
      "minValue": 5, "maxValue": 500, "nanPercentage": 10,
      "addOutliers": true, "outlierPercentage": 5 }
  ]
}
```

Returns `{ status, table, report }` where `report` is the quality audit. Errors carry a typed `error_type` (`validation`, `rate_limited`, `connection`, `model_unavailable`, `config`, `unknown`) that the UI maps to specific recovery states.

## Benchmarks

Four reproducible benchmarks live in `backend/benchmark/` (deps:
`pip install -r backend/benchmark/requirements.txt`). All numbers in
[`benchmark/RESULTS.md`](backend/benchmark/RESULTS.md) come straight from these
scripts — nothing is hand-written.

```bash
cd backend
python -m benchmark.fidelity_benchmark   # exactness, distribution fit, reproducibility, throughput
python -m benchmark.tstr_benchmark       # tabular Train on Synthetic, Test on Real
python -m benchmark.nlp_tstr_benchmark   # NLP TSTR: synthetic sentiment -> real reviews
python -m benchmark.cost_analysis        # hybrid vs. naive LLM-emits-rows cost
python -m benchmark.plots                # render figures/
```

- **Tabular TSTR (Train on Synthetic, Test on Real), two datasets.** A
  `LogisticRegression` trained **only** on DataGen synthetic data, tested on real
  held-out splits: **90.5% of real-data accuracy** on Breast Cancer (89.5% vs.
  98.8%, univariate-friendly) and **75.3%** on Digits (73.9% vs. 98.2%,
  interaction-heavy) — both far above baseline. Naive label-agnostic generation
  collapses (24.9% / 15.1%), isolating the value of describing the distribution.
  Marginal fidelity (mean per-feature Wasserstein) is **0.51 vs. 1.73** for uniform
  sampling — ~3.4× closer to real. The Breast-Cancer→Digits drop is exactly the
  joint-structure gap that motivates the inter-column-constraints roadmap item.
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
  seeds; ~119K rows/sec.
- **Cost.** Confining the LLM to semantics makes generation **flat-cost in N**:
  ~$0.0019 per run regardless of size, vs. a naive LLM-emits-every-row approach at
  ~$0.15 for 10K rows (**~79× cheaper**, and no 16-call chunking around the token
  limit). Priced at a representative paid model; on DataGen's free-tier chain the real
  cost is effectively zero.

## Roadmap

- [x] TSTR benchmark (train on synthetic, test on real) — see `backend/benchmark/`
- [ ] Inter-column constraints (e.g. `TotalAmount = Quantity × UnitPrice`)
- [ ] Categorical distribution controls (class weights for label columns)
- [ ] Streaming generation for >10K rows
