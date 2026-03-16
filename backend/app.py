import os
import csv
import re
import time
from io import StringIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI, APIConnectionError, APITimeoutError, APIStatusError

app = Flask(__name__)

CORS(app, origins=[
    "https://datagen.pages.dev",      # Cloudflare Pages
    "http://localhost:5173",          # Local dev
    "http://localhost:3000",          # Alternative local dev
])

# ─────────────────────────────────────────────
# Models to try in order. Falls back automatically.
# ─────────────────────────────────────────────
CANDIDATE_MODELS = [
    "openai/gpt-4o-mini",            # Best quality, low cost — try first
    "openai/gpt-3.5-turbo",          # Solid fallback
    "meta-llama/llama-3.1-8b-instruct:free",  # Free tier fallback
    "mistralai/mistral-7b-instruct:free",      # Free tier fallback
]

TIMEOUT_SECONDS = 90  # How long to wait for a single model response


@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "DataGen API is running."}), 200


def build_prompt(columns, row_count, custom_instructions, distribution_type):
    """Build the CSV generation prompt from column specs."""
    column_details = []
    for col in columns:
        detail_parts: list[str] = [f"name: {col.get('name')}"]
        col_type = col.get('type', 'string')
        detail_parts.append(f"type: {col_type}")

        if col_type == 'number':
            number_type = col.get('numberType', 'integers')
            detail_parts.append(f"number_type: {number_type}")
            min_val = col.get('minValue')
            max_val = col.get('maxValue')
            if min_val is not None and max_val is not None:
                detail_parts.append(f"range: {min_val}-{max_val}")
            elif min_val is not None:
                detail_parts.append(f"min_value: {min_val}")
            elif max_val is not None:
                detail_parts.append(f"max_value: {max_val}")

        nan_percentage = col.get('nanPercentage', 0)
        if nan_percentage > 0:
            detail_parts.append(f"missing_percentage: {nan_percentage}%")

        add_noise = col.get('addNoise', False)
        noise_level = col.get('noiseLevel', 0)
        if add_noise and noise_level > 0:
            detail_parts.append(f"add_noise: {noise_level}%_level")

        add_outliers = col.get('addOutliers', False)
        outlier_percentage = col.get('outlierPercentage', 0)
        if add_outliers and outlier_percentage > 0:
            detail_parts.append(f"add_outliers: {outlier_percentage}%_percentage")

        column_details.append(f"({', '.join(detail_parts)})")

    detailed_col_string = ", ".join(column_details)
    instruction_string = f" Special instructions: {custom_instructions.strip()}" if custom_instructions and custom_instructions.strip() else ""

    if distribution_type == "distorted":
        distribution_string = " Ensure the data is distorted and noisy with missing values and outliers."
    elif distribution_type == "balanced":
        distribution_string = " Ensure the data is well-balanced and clean."
    else:
        distribution_string = ""

    prompt = (
        f"Generate a dataset table with exactly {row_count} rows. "
        f"Each column must strictly adhere to the following specifications:\n"
        f"{detailed_col_string}.\n\n"
        f"IMPORTANT RULES:\n"
        f"1. Return ONLY the raw CSV string, with the first row as headers.\n"
        f"2. Do NOT include markdown code fences (no ```csv or ```).\n"
        f"3. Do NOT include any explanation, commentary, or extra text.\n"
        f"4. Ensure ALL {row_count} rows are present in the output.\n"
        f"5. Every row must have the exact same number of columns as the header.\n"
        f"6. Respect the column types strictly — booleans must be true/false, "
        f"emails must be valid format, dates must be YYYY-MM-DD format, etc.\n"
        f"7. If a column has a missing_percentage, leave that percentage of cells empty (just a comma with no value).\n"
        f"{instruction_string}{distribution_string}"
    )
    return prompt


def try_generate(client, prompt):
    """Try each model in order. Returns (csv_text, model_used) or raises."""
    last_error = None
    for model in CANDIDATE_MODELS:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                timeout=TIMEOUT_SECONDS,
            )
            csv_text = response.choices[0].message.content.strip()
            return csv_text, model
        except APITimeoutError:
            last_error = f"Model '{model}' timed out after {TIMEOUT_SECONDS}s."
            continue
        except APIConnectionError as e:
            last_error = f"Connection error while calling '{model}': {str(e)}"
            break  # Connection error means the whole API is down, stop trying
        except APIStatusError as e:
            # 429 = rate limited, 502/503 = bad gateway from upstream — try next model
            if e.status_code in (429, 500, 502, 503):
                last_error = f"Model '{model}' returned HTTP {e.status_code}: {e.message}"
                continue
            else:
                raise  # Re-raise unexpected status errors
        except Exception as e:
            last_error = f"Unexpected error with model '{model}': {str(e)}"
            continue

    raise RuntimeError(last_error or "All models failed without a specific error.")


def parse_csv_output(csv_text, columns):
    """Parse the raw CSV string from the LLM into a list of dicts."""
    match = re.search(r'```(?:csv)?\n?(.*?)\n?```', csv_text, re.DOTALL | re.IGNORECASE)
    if match:
        csv_text = match.group(1).strip()

    lines = [line.strip() for line in csv_text.split('\n') if line.strip()]
    if not lines:
        raise ValueError("No CSV data found in model output.")

    csv_file = StringIO("\n".join(lines))
    reader = list(csv.reader(csv_file))

    # Robustly locate the actual header row
    expected_cols = [c.get('name', '').strip().lower() for c in columns]
    header_index = 0

    for i, row in enumerate(reader):
        row_lower = [v.strip().lower() for v in row]
        if any(col in expected_cols for col in row_lower) and len(row) > 1:
            header_index = i
            break

    header = [c.strip() for c in reader[header_index]]
    parsed_table = []

    for row_data in reader[header_index + 1:]:
        if len(row_data) != len(header):
            continue  # Skip malformed rows

        row_dict = {}
        for i, col_name in enumerate(header):
            cleaned_col_name = col_name.strip()
            value = row_data[i]

            # Find matching column config (case-insensitive)
            frontend_col = next(
                (c for c in columns if c['name'].strip().lower() == cleaned_col_name.lower()),
                None
            )

            if frontend_col and frontend_col.get('type') == 'number':
                if value.strip() == '':
                    value = None
                else:
                    clean_str = re.sub(r'[^\d.-]', '', value)
                    try:
                        temp_val = float(clean_str)
                        if frontend_col.get('numberType') == 'integers' and temp_val.is_integer():
                            value = int(temp_val)
                        else:
                            value = temp_val
                    except ValueError:
                        pass  # Leave as string if unparseable
            elif value.strip() == '':
                value = None

            row_dict[cleaned_col_name] = value

        parsed_table.append(row_dict)

    return parsed_table


@app.route('/api/generate', methods=['POST'])
def generate_table():
    # ── 1. Verify API key ──
    OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
    if not OPENROUTER_API_KEY:
        return jsonify({
            "error": "Server configuration error",
            "details": "OPENROUTER_API_KEY is not set on the server. Please contact the administrator.",
            "error_type": "config"
        }), 500

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )

    # ── 2. Parse request ──
    config_payload: dict = request.get_json(silent=True) or {}
    columns = config_payload.get("columns", [])
    row_count = config_payload.get("rowCount", 5)
    custom_instructions = config_payload.get("customInstructions", "")
    distribution_type = config_payload.get("distributionType", "balanced")

    if not columns:
        return jsonify({
            "error": "No columns defined",
            "details": "Please add at least one column before generating.",
            "error_type": "validation"
        }), 400

    # ── 3. Build prompt ──
    prompt = build_prompt(columns, row_count, custom_instructions, distribution_type)

    # ── 4. Call LLM with fallbacks ──
    try:
        csv_text, model_used = try_generate(client, prompt)
        app.logger.info(f"Generated data using model: {model_used}")
    except APIConnectionError:
        return jsonify({
            "error": "Cannot connect to AI service",
            "details": (
                "The server cannot reach the OpenRouter API. "
                "This is likely a network/firewall issue on the server side. "
                "Please try again in a few moments."
            ),
            "error_type": "connection"
        }), 503
    except RuntimeError as e:
        return jsonify({
            "error": "All AI models are currently unavailable",
            "details": str(e),
            "error_type": "model_unavailable"
        }), 502
    except Exception as e:
        return jsonify({
            "error": "Unexpected error during generation",
            "details": str(e),
            "error_type": "unknown"
        }), 500

    # ── 5. Parse CSV output ──
    try:
        parsed_table = parse_csv_output(csv_text, columns)
    except Exception as e:
        return jsonify({
            "error": "Failed to parse model output",
            "details": str(e),
            "raw": csv_text[:500],  # First 500 chars for debugging
            "error_type": "parse"
        }), 500

    if not parsed_table:
        return jsonify({
            "error": "Model returned empty data",
            "details": "The AI generated a response but no valid rows could be extracted. Try again.",
            "raw": csv_text[:500],
            "error_type": "empty"
        }), 500

    return jsonify({"status": "ok", "table": parsed_table}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
