"""NLP task datasets — classification, retrieval, QA, paraphrase pairs.

Same hybrid philosophy as the tabular engine: the LLM (when available)
produces a small pool of unique semantic examples; everything measurable —
class balance, negative-pair ratio, label noise, reproducibility — is
enforced exactly and locally. Negative retrieval/paraphrase pairs are derived
by mismatching pool items, so a 60-example pool supports thousands of rows.
"""

import json

import numpy as np

from generator import _mangle_text
from text_pools import FIRST_NAMES, LAST_NAMES

NLP_TASKS = ("classification", "retrieval", "qa", "pairs")

DEFAULT_LABELS = ["positive", "negative", "neutral"]
DEFAULT_NEGATIVE_RATIO = 0.5
LABEL_NOISE_PCT_DISTORTED = 5
TEXT_DIRT_PCT_DISTORTED = 12

POOL_KEYS = {
    "classification": ["text", "label"],
    "retrieval": ["query", "passage"],
    "qa": ["context", "question", "answer"],
    "pairs": ["sentence1", "sentence2"],
}

OUTPUT_COLUMNS = {
    "classification": ["TextID", "Text", "Label"],
    "retrieval": ["QueryID", "Query", "PassageID", "Passage", "Relevance"],
    "qa": ["ContextID", "Context", "Question", "Answer"],
    "pairs": ["PairID", "Sentence1", "Sentence2", "IsParaphrase"],
}


# ─────────────────────────────────────────────
# LLM prompt per task (pool generation only)
# ─────────────────────────────────────────────

def build_nlp_prompt(task, n_records, labels, custom_instructions):
    domain = (custom_instructions or "").strip() or "everyday consumer products, services, and topics"
    common = (
        f"You generate examples for a synthetic NLP dataset.\n"
        f"Domain / context (follow exactly): {domain}\n\n"
        f"Return a JSON array of exactly {n_records} objects. "
        f"Each object must contain exactly these keys: {json.dumps(POOL_KEYS[task])}.\n"
    )
    if task == "classification":
        body = (
            f"Each object: \"text\" is a short user-written text (1–3 sentences, varied tone "
            f"and length), \"label\" is its correct class.\n"
            f"Allowed labels (use these exact strings): {json.dumps(labels)}.\n"
            f"Distribute labels roughly evenly and make the texts genuinely distinguishable by label."
        )
    elif task == "retrieval":
        body = (
            "Each object: \"query\" is a realistic search query (3–8 words), "
            "\"passage\" is a 2–4 sentence passage that DIRECTLY and specifically answers that query. "
            "Make query/passage topics diverse so passages from different objects do NOT answer each other's queries."
        )
    elif task == "qa":
        body = (
            "Each object: \"context\" is a 2–4 sentence informative passage, "
            "\"question\" is answerable from that context alone, "
            "\"answer\" is the short answer span (a few words) taken from the context."
        )
    else:  # pairs
        body = (
            "Each object: \"sentence1\" and \"sentence2\" are PARAPHRASES — same meaning, "
            "clearly different wording. Topics must vary across objects so sentences from "
            "different objects are NOT paraphrases of each other."
        )
    return (
        common + body +
        "\n\nRules:\n1. Values must be unique across objects — no repeats.\n"
        "2. Return ONLY the JSON array. No markdown fences, no commentary."
    )


# ─────────────────────────────────────────────
# Offline pool builders (no LLM required)
# ─────────────────────────────────────────────

_ITEMS = [
    "wireless earbuds", "air fryer", "yoga mat", "standing desk", "espresso machine",
    "mechanical keyboard", "robot vacuum", "fitness tracker", "bluetooth speaker",
    "electric kettle", "office chair", "webcam", "portable charger", "smart bulb", "backpack",
    "blender", "running shoes", "desk lamp", "tablet", "headphones", "coffee grinder",
    "mattress", "monitor", "phone case", "water bottle", "vacuum cleaner", "microwave",
    "laptop stand", "gaming mouse", "smart watch", "toaster", "hair dryer",
]
_ATTRS = [
    "long battery life", "a compact design", "noise cancellation", "fast charging",
    "an affordable price", "excellent build quality", "quiet operation", "easy setup",
    "a two-year warranty", "energy efficiency",
]
_AUDIENCES = ["students", "commuters", "home offices", "beginners", "frequent travelers", "small apartments"]

_PASSAGE_TEMPLATES = [
    "The {item} offers {attr} and {attr2}, making it a strong choice for {aud}. Reviewers consistently highlight how well it performs in daily use.",
    "If you need a {item} with {attr}, this model stands out thanks to its {attr2}. It has become especially popular among {aud}.",
    "This {item} combines {attr} with {attr2}. Independent tests rank it among the best options for {aud} this year.",
]
_QUERY_TEMPLATES = [
    "best {item} for {aud}",
    "{item} with {attr}",
    "is the {item} good for {aud}",
    "{item} {attr} review",
]

_POS_CLAUSES = [
    "it exceeded all my expectations", "the quality is outstanding",
    "setup took two minutes and it works flawlessly", "it is worth every penny",
    "I would recommend it to anyone", "it performs even better than advertised",
    "I absolutely love it", "this is the best purchase I have made all year",
    "it works perfectly and feels premium", "I am extremely happy with it",
    "fantastic value and great quality", "it is excellent and well worth the money",
    "highly recommended, five stars", "it is amazing and easy to use",
    "the design is beautiful and it runs great", "I am impressed by how well it works",
    "wonderful product, exactly what I needed", "it is reliable and superbly built",
    "genuinely delighted with this", "great battery life and a comfortable feel",
]
_NEG_CLAUSES = [
    "it stopped working after a week", "the build quality feels cheap",
    "customer support never replied to me", "save your money and look elsewhere",
    "the advertised features simply do not work", "returning it was the best decision",
    "it broke almost immediately", "this is a complete waste of money",
    "I am very disappointed with it", "the worst purchase I have ever made",
    "it is poorly made and overpriced", "it feels flimsy and unreliable",
    "do not buy this, it is terrible", "it arrived damaged and barely functions",
    "the quality is awful and it failed fast", "I regret buying it",
    "it is frustrating and constantly malfunctions", "horrible experience overall",
    "cheaply built and not worth it", "it died after a few days of light use",
]
_NEU_CLAUSES = [
    "it does the job, nothing more", "performance is about average for the price",
    "it is okay but there are similar options", "delivery was on time and packaging was standard",
    "it matches the description, neither great nor bad", "results so far are mixed",
    "it is fine, nothing special", "it works as expected, no surprises",
    "decent enough but unremarkable", "it is alright for the price",
    "average product, does what it says", "not bad, not great, just acceptable",
    "it is reasonable but could be better", "it is a fairly standard option",
    "it serves its purpose without standing out", "middling quality overall",
]
_SENTIMENT_BANKS = {"positive": _POS_CLAUSES, "negative": _NEG_CLAUSES, "neutral": _NEU_CLAUSES}

# Varied framings so generated reviews don't all share one rigid template.
_CLASSIFICATION_TEMPLATES = [
    "I bought the {item} last month and {clause}.",
    "{clause_cap}.",
    "I got the {item} and {clause}.",
    "After using the {item} for a while, {clause}.",
    "Honestly, {clause}.",
    "My {item} review: {clause}.",
    "Overall, {clause}.",
    "Just tried the {item} — {clause}.",
]

_COMPANIES = [
    "Northwind Labs", "Bluepeak Systems", "Halcyon Goods", "Vertex Dynamics",
    "Brightline Co", "Summit Forge", "Quill & Crane", "Atlas Grove",
]
_ROLES = ["chief executive officer", "head of design", "lead engineer", "marketing director", "chief data scientist"]
_LANDMARKS = ["Harbor Museum", "Old Mill Bridge", "Glasshouse Gardens", "Clocktower Market", "Riverside Observatory"]
_CITIES = ["Chicago", "Austin", "Seattle", "Denver", "Atlanta", "Boston", "Portland", "Nashville"]
_SEASONS = ["spring", "summer", "autumn", "winter"]

_PAIR_TEMPLATES = [
    ("How do I reset my {item}?", "What is the procedure to restore my {item} to factory settings?"),
    ("The {item} arrived two days early.", "My {item} was delivered ahead of schedule."),
    ("Does the {item} come with a warranty?", "Is a warranty included with the {item}?"),
    ("The battery of the {item} lasts all day.", "The {item}'s battery easily gets through a full day."),
    ("I can't connect the {item} to my phone.", "The {item} won't pair with my smartphone."),
    ("Where can I buy replacement parts for the {item}?", "What's the best place to get spare parts for the {item}?"),
    ("The {item} is too loud at night.", "At night, the noise from the {item} is excessive."),
    ("Setting up the {item} took only five minutes.", "The {item} was up and running within five minutes."),
]


def _pick(rng, bank):
    return bank[int(rng.integers(0, len(bank)))]


def _offline_classification(rng, n, labels):
    pool, seen = [], set()
    known = {lb: _SENTIMENT_BANKS[lb.lower()] for lb in labels if lb.lower() in _SENTIMENT_BANKS}
    for _ in range(n * 8):
        if len(pool) >= n:
            break
        label = _pick(rng, labels)
        item = _pick(rng, _ITEMS)
        if label in known:
            clause = _pick(rng, known[label])
            template = _pick(rng, _CLASSIFICATION_TEMPLATES)
            text = template.format(item=item, clause=clause, clause_cap=clause[:1].upper() + clause[1:])
        else:
            # Custom labels need the AI engine for real semantics; keep fallback honest but usable
            text = f"A customer comment about the {item}, annotated as '{label}' by reviewers: overall it {_pick(rng, _NEU_CLAUSES)}."
        if text not in seen:
            seen.add(text)
            pool.append({"text": text, "label": label})
    return pool


def _offline_retrieval(rng, n):
    pool, seen = [], set()
    for _ in range(n * 4):
        if len(pool) >= n:
            break
        item, aud = _pick(rng, _ITEMS), _pick(rng, _AUDIENCES)
        attr = _pick(rng, _ATTRS)
        attr2 = _pick(rng, [a for a in _ATTRS if a != attr])
        passage = _pick(rng, _PASSAGE_TEMPLATES).format(item=item, attr=attr, attr2=attr2, aud=aud)
        query = _pick(rng, _QUERY_TEMPLATES).format(item=item, attr=attr, aud=aud)
        if query not in seen and passage not in seen:
            seen.update((query, passage))
            pool.append({"query": query, "passage": passage})
    return pool


def _offline_qa(rng, n):
    pool, seen = [], set()
    for _ in range(n * 4):
        if len(pool) >= n:
            break
        kind = int(rng.integers(0, 3))
        if kind == 0:
            name = f"{_pick(rng, FIRST_NAMES)} {_pick(rng, LAST_NAMES)}"
            role, company = _pick(rng, _ROLES), _pick(rng, _COMPANIES)
            context = (f"{name} serves as the {role} of {company}. "
                       f"Under their leadership the company expanded into three new markets last year.")
            question = f"Which company does {name} work for?"
            answer = company
        elif kind == 1:
            item, company = _pick(rng, _ITEMS), _pick(rng, _COMPANIES)
            year = int(rng.integers(1998, 2026))
            context = (f"The {item} was first released by {company} in {year}. "
                       f"It quickly became one of the best-selling products in its category.")
            question = f"In what year was the {item} first released?"
            answer = str(year)
        else:
            landmark, city, season = _pick(rng, _LANDMARKS), _pick(rng, _CITIES), _pick(rng, _SEASONS)
            context = (f"The {landmark} in {city} attracts thousands of visitors every {season}. "
                       f"Guided tours run daily and admission is free on weekends.")
            question = f"In which city is the {landmark} located?"
            answer = city
        if question not in seen:
            seen.add(question)
            pool.append({"context": context, "question": question, "answer": answer})
    return pool


def _offline_pairs(rng, n):
    pool, seen = [], set()
    for _ in range(n * 4):
        if len(pool) >= n:
            break
        s1, s2 = _pick(rng, _PAIR_TEMPLATES)
        item = _pick(rng, _ITEMS)
        s1, s2 = s1.format(item=item), s2.format(item=item)
        if s1 not in seen:
            seen.add(s1)
            pool.append({"sentence1": s1, "sentence2": s2})
    return pool


def build_offline_pool(task, n, labels, seed=None):
    rng = np.random.default_rng(seed)
    if task == "classification":
        return _offline_classification(rng, n, labels)
    if task == "retrieval":
        return _offline_retrieval(rng, n)
    if task == "qa":
        return _offline_qa(rng, n)
    return _offline_pairs(rng, n)


# ─────────────────────────────────────────────
# Assembly — exact ratios, label noise, dirt
# ─────────────────────────────────────────────

def _exact_split_mask(rng, n, true_count):
    """Boolean mask with exactly true_count Trues, randomly placed."""
    mask = np.zeros(n, dtype=bool)
    if true_count > 0:
        mask[rng.choice(n, size=min(true_count, n), replace=False)] = True
    return mask


def _label_counts(rng, n, labels, distorted):
    """Exact per-class counts: even when balanced, skewed when distorted."""
    k = len(labels)
    if distorted:
        weights = np.array([0.55 ** i for i in range(k)])
        weights = weights / weights.sum()
        counts = np.floor(weights * n).astype(int)
    else:
        counts = np.full(k, n // k)
    for i in range(n - counts.sum()):
        counts[i % k] += 1
    return {label: int(c) for label, c in zip(labels, counts)}


def _assemble_classification(rng, pool, n, labels, distorted):
    by_label = {lb: [] for lb in labels}
    canonical = {lb.lower(): lb for lb in labels}
    for rec in pool:
        lb = canonical.get(str(rec.get("label", "")).strip().lower())
        if lb:
            by_label[lb].append(rec["text"])
    all_texts = [rec["text"] for rec in pool]

    counts = _label_counts(rng, n, labels, distorted)
    assigned = [lb for lb in labels for _ in range(counts[lb])]
    rng.shuffle(assigned)

    rows = []
    for i, label in enumerate(assigned):
        bank = by_label[label] or all_texts
        rows.append({"TextID": f"T-{i:06d}", "Text": bank[int(rng.integers(0, len(bank)))], "Label": label})

    noise_flips = 0
    if distorted and len(labels) > 1:
        noise_flips = int(round(LABEL_NOISE_PCT_DISTORTED / 100.0 * n))
        for i in rng.choice(n, size=noise_flips, replace=False):
            others = [lb for lb in labels if lb != rows[int(i)]["Label"]]
            rows[int(i)]["Label"] = others[int(rng.integers(0, len(others)))]
    return rows, noise_flips


def _assemble_retrieval(rng, pool, n, negative_ratio):
    n_neg = int(round(negative_ratio * n)) if len(pool) > 1 else 0
    neg_mask = _exact_split_mask(rng, n, n_neg)
    q_idx = rng.integers(0, len(pool), n)
    rows = []
    for i in range(n):
        qi = int(q_idx[i])
        if neg_mask[i]:
            pi = int(rng.integers(0, len(pool) - 1))
            if pi >= qi:
                pi += 1  # guaranteed different pool item
            relevance = 0
        else:
            pi, relevance = qi, 1
        rows.append({
            "QueryID": f"Q-{qi:05d}",
            "Query": pool[qi]["query"],
            "PassageID": f"P-{pi:05d}",
            "Passage": pool[pi]["passage"],
            "Relevance": relevance,
        })
    return rows, n_neg


def _assemble_qa(rng, pool, n):
    idx = rng.integers(0, len(pool), n)
    return [{
        "ContextID": f"C-{int(j):05d}",
        "Context": pool[int(j)]["context"],
        "Question": pool[int(j)]["question"],
        "Answer": pool[int(j)]["answer"],
    } for j in idx]


def _assemble_pairs(rng, pool, n, negative_ratio):
    n_neg = int(round(negative_ratio * n)) if len(pool) > 1 else 0
    neg_mask = _exact_split_mask(rng, n, n_neg)
    a_idx = rng.integers(0, len(pool), n)
    rows = []
    for i in range(n):
        ai = int(a_idx[i])
        if neg_mask[i]:
            bi = int(rng.integers(0, len(pool) - 1))
            if bi >= ai:
                bi += 1
            label = 0
        else:
            bi, label = ai, 1
        rows.append({
            "PairID": f"PR-{i:06d}",
            "Sentence1": pool[ai]["sentence1"],
            "Sentence2": pool[bi]["sentence2"],
            "IsParaphrase": label,
        })
    return rows, n_neg


_LABEL_COLUMNS = {"Label", "Relevance", "IsParaphrase", "Answer"}


def _column_summaries(rows):
    if not rows:
        return []
    summaries = []
    for name in rows[0].keys():
        values = [str(r[name]) for r in rows if r[name] is not None]
        summaries.append({
            "name": name,
            "type": "label" if name in _LABEL_COLUMNS else "text",
            "unique_values": len(set(values)),
            "avg_chars": round(float(np.mean([len(v) for v in values])), 1) if values else 0,
        })
    return summaries


def generate_nlp_dataset(task, row_count, distorted=False, seed=None, pool=None,
                         labels=None, negative_ratio=DEFAULT_NEGATIVE_RATIO):
    """Assemble an NLP dataset from a semantic pool. Returns (rows, report)."""
    n = int(row_count)
    labels = labels or DEFAULT_LABELS
    if seed is None:
        seed = int(np.random.SeedSequence().entropy % (2**31))
    rng = np.random.default_rng(seed)
    if not pool:
        raise ValueError("Empty example pool — nothing to assemble from.")

    noise_flips, n_neg = 0, None
    if task == "classification":
        rows, noise_flips = _assemble_classification(rng, pool, n, labels, distorted)
    elif task == "retrieval":
        rows, n_neg = _assemble_retrieval(rng, pool, n, negative_ratio)
    elif task == "qa":
        rows = _assemble_qa(rng, pool, n)
    elif task == "pairs":
        rows, n_neg = _assemble_pairs(rng, pool, n, negative_ratio)
    else:
        raise ValueError(f"Unknown NLP task: {task}")

    if distorted:
        dirty = rng.random(n) < (TEXT_DIRT_PCT_DISTORTED / 100.0)
        text_cols = [c for c in rows[0] if c not in _LABEL_COLUMNS and not c.endswith("ID")]
        for i in range(n):
            if dirty[i]:
                col = text_cols[int(rng.integers(0, len(text_cols)))]
                rows[i][col] = _mangle_text(rng, str(rows[i][col]))

    label_col = next((c for c in ("Label", "Relevance", "IsParaphrase") if c in rows[0]), None)
    label_distribution = None
    if label_col:
        label_distribution = {}
        for r in rows:
            key = str(r[label_col])
            label_distribution[key] = label_distribution.get(key, 0) + 1

    report = {
        "rows_requested": n,
        "rows_delivered": len(rows),
        "seed": seed,
        "distribution": "distorted" if distorted else "balanced",
        "task": task,
        "unique_pool_size": len(pool),
        "label_distribution": label_distribution,
        "label_noise_flips": noise_flips,
        "negative_pairs": n_neg,
        "columns": _column_summaries(rows),
    }
    return rows, report
