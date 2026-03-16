import os
import csv
import re
from io import StringIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__)

CORS(app, origins=[
    "https://datagen.pages.dev",      # Cloudflare Pages (no trailing slash!)
    "http://localhost:5173",          # keep for local dev
])

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "DataGen API is running."}), 200

@app.route('/api/generate', methods=['POST'])
def generate_table():
    # Fetch from environment variable for secure deployment
    OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
    if not OPENROUTER_API_KEY:
        return jsonify({"error": "OPENROUTER_API_KEY environment variable is missing on the server."}), 500

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )
    
    # Use silent=True so it doesn't crash on bad Content-Type headers
    config_payload: dict = request.get_json(silent=True) or {}
    columns = config_payload.get("columns", [])
    row_count = config_payload.get("rowCount", 5)

    column_details = []
    for col in columns:
        detail_parts = [f"name: {col.get('name')}"]
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
    custom_instructions = config_payload.get("customInstructions", "").strip()
    instruction_string = f" ({custom_instructions})" if custom_instructions else ""
    distribution_type = config_payload.get("distributionType", "balanced")
    distribution_string = ""
    
    if distribution_type == "distorted":
        distribution_string = " Ensure the data is distorted and noisy with missing values and outliers."
    elif distribution_type == "balanced":
        distribution_string = " Ensure the data is well-balanced and clean."

    prompt = (
        f"Generate a dataset table with {row_count} rows. Each column must strictly adhere to the following specifications:\n"
        f"{detailed_col_string}.\n\n"
        f"Return *only* the raw CSV string, with the first row as headers. "
        f"Do not include any conversational text or markdown fences like ```csv. "
        f"Ensure all {row_count} rows are present."
        f"{instruction_string}{distribution_string}"
    )

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b:free",
            messages=[{"role": "user", "content": prompt}],
        )
        csv_text = response.choices[0].message.content.strip()
    except Exception as e:
        return jsonify({"error": "OpenRouter API request failed", "details": str(e)}), 502

    try:
        # Regex to extract text inside markdown code block if LLM ignores our "no markdown" rule
        match = re.search(r'```(?:csv)?\n?(.*?)\n?```', csv_text, re.DOTALL | re.IGNORECASE)
        if match:
            csv_text = match.group(1).strip()
            
        lines = [line.strip() for line in csv_text.split('\n') if line.strip()]
        if not lines:
            raise ValueError("No CSV data found in LLM output")
            
        csv_file = StringIO("\n".join(lines))
        reader = list(csv.reader(csv_file))
        
        # Robustly locate the actual header row instead of arbitrarily taking the first row
        expected_cols = [c.get('name', '').strip().lower() for c in columns]
        header_index = 0
        
        for i, row in enumerate(reader):
            row_lower = [col_val.strip().lower() for col_val in row]
            # If the row has at least one common column name, call it the header.
            if any(col in expected_cols for col in row_lower) and len(row) > 1:
                header_index = i
                break
                
        header = [c.strip() for c in reader[header_index]]
        parsed_table = []
        
        for row_data in reader[header_index + 1:]:
            # If a row is shorter/longer than the header, skip it
            if len(row_data) != len(header):
                continue
                
            row_dict = {}
            for i, col_name in enumerate(header):
                cleaned_col_name = col_name.strip()
                value = row_data[i]
                
                # Use lowered lookup to defend against LLaMA arbitrarily auto-capitalizing Headers
                frontend_col_config = next((c for c in columns if c['name'].strip().lower() == cleaned_col_name.lower()), None)
                
                if frontend_col_config and frontend_col_config.get('type') == 'number':
                    if value.strip() == '':
                        value = None
                    else:
                        # Clean up number string formatting (currency mapping, commas)
                        clean_val_str = re.sub(r'[^\d.-]', '', value)
                        try:
                            temp_val = float(clean_val_str)
                            if frontend_col_config.get('numberType') == 'integers' and temp_val.is_integer():
                                value = int(temp_val)
                            else:
                                value = temp_val
                        except ValueError:
                            pass # Leaves as string if parsing completely collapsed
                elif value.strip() == '':
                    value = None
                    
                row_dict[cleaned_col_name] = value
                
            parsed_table.append(row_dict)
            
    except Exception as e:
        return jsonify({
            "error": "Failed to parse model output as CSV",
            "details": str(e),
            "raw": csv_text
        }), 500

    return jsonify({"status": "ok", "table": parsed_table}), 200

if __name__ == "__main__":
    # Use Railway's provided PORT or default to 8000
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
