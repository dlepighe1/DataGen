"""Cost model: DataGen hybrid engine vs. a naive 'LLM emits every row' approach.

DataGen calls the LLM exactly once per generation, for a small (<=80 record) pool
of *text columns only*; NumPy then expands that into N fully-structured rows for
free. A naive approach asks the model to emit all N rows as tokens, so its cost
grows linearly with row count (and quickly exceeds a single completion's output
limit).

Token counts are estimated at ~4 chars/token (tiktoken not required) from real
generated samples, and priced with published GPT-4o-mini rates as a representative
paid model (DataGen itself now runs on free-tier OpenRouter models, so this is a
conservative what-if baseline). Treat the dollar figures as well-grounded
estimates, not invoices.

Run from backend/:  python -m benchmark.cost_analysis
"""

import json

from generator import generate_dataset
from text_pools import build_local_records, expand_records

# Published GPT-4o-mini rates (USD per 1M tokens) — a representative paid model for
# the comparison; DataGen's own generation now runs on free-tier OpenRouter models.
PRICE_IN = 0.15 / 1_000_000
PRICE_OUT = 0.60 / 1_000_000
CHARS_PER_TOKEN = 4
POOL_CAP = 80                  # DataGen caps the semantic pool at 80 records
COMPLETION_OUTPUT_LIMIT = 16_384   # gpt-4o-mini max output tokens per call

# Representative schema (the README e-commerce example)
COLUMNS = [
    {"name": "CustomerName", "type": "string"},
    {"name": "Email", "type": "email"},
    {"name": "OrderDate", "type": "date"},
    {"name": "ProductName", "type": "string"},
    {"name": "Category", "type": "string"},
    {"name": "Quantity", "type": "number", "numberType": "integers", "minValue": 1, "maxValue": 5},
    {"name": "UnitPrice", "type": "number", "numberType": "decimals", "minValue": 5, "maxValue": 500},
    {"name": "TotalAmount", "type": "number", "numberType": "decimals", "minValue": 10, "maxValue": 2500},
    {"name": "PaymentMethod", "type": "string"},
    {"name": "IsFirstPurchase", "type": "boolean"},
]
TEXT_COLS = [c for c in COLUMNS if c["type"] in ("string", "email") and not c["name"].endswith("ID")]

# A realistic instruction/prompt overhead (input tokens), fixed per call.
PROMPT_INPUT_TOKENS = 320


def _tokens(chars):
    return chars / CHARS_PER_TOKEN


def _avg_pool_record_tokens(seed=1):
    """Tokens for one JSON object of just the text columns (what the LLM emits)."""
    records = build_local_records(TEXT_COLS, 40, seed)
    sizes = [len(json.dumps({c["name"]: rec[c["name"]] for c in TEXT_COLS})) for rec in records]
    return _tokens(sum(sizes) / len(sizes))


def _avg_full_row_tokens(seed=1):
    """Tokens for one full row across ALL columns (what a naive LLM would emit)."""
    records = expand_records(build_local_records(TEXT_COLS, 40, seed), TEXT_COLS, 200, seed)
    rows, _ = generate_dataset(COLUMNS, 200, seed=seed, text_records=records)
    sizes = [len(",".join(str(v) for v in r.values())) for r in rows]
    return _tokens(sum(sizes) / len(sizes))


def datagen_cost(pool_record_tokens):
    """One call: fixed prompt in, <=80 text records out — independent of N."""
    out_tokens = POOL_CAP * pool_record_tokens
    return PROMPT_INPUT_TOKENS * PRICE_IN + out_tokens * PRICE_OUT


def naive_llm_cost(n, full_row_tokens):
    """N rows emitted as tokens; chunked across calls to respect the output limit."""
    out_tokens = n * full_row_tokens
    calls = max(1, -(-int(out_tokens) // COMPLETION_OUTPUT_LIMIT))  # ceil
    return calls * PROMPT_INPUT_TOKENS * PRICE_IN + out_tokens * PRICE_OUT, calls


def main():
    pool_tok = _avg_pool_record_tokens()
    row_tok = _avg_full_row_tokens()
    dg = datagen_cost(pool_tok)

    table = {}
    for n in (1_000, 10_000):
        naive, calls = naive_llm_cost(n, row_tok)
        table[f"{n}_rows"] = {
            "datagen_usd": round(dg, 6),
            "naive_llm_usd": round(naive, 6),
            "naive_llm_calls_needed": calls,
            "datagen_cheaper_x": round(naive / dg, 1),
        }

    report = {
        "model_priced": "gpt-4o-mini — representative paid model ($0.15/1M in, $0.60/1M out)",
        "estimation": "~4 chars/token from real generated samples",
        "avg_pool_record_tokens": round(pool_tok, 1),
        "avg_full_row_tokens": round(row_tok, 1),
        "per_row_count": table,
        "note": (
            "DataGen cost is flat in N (one <=80-record call); the naive approach "
            "grows linearly and needs multiple calls past the completion output limit."
        ),
    }
    print(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    main()
