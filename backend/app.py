import os
import re
import json
import csv
from io import StringIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from together import Together

app = Flask(__name__)
CORS(app)

# No need for last_table or last_config globally if we return directly
# last_config = None
# last_table = None
last_error = None # Keep last_error for potential debugging/logging

TOGETHER_API_KEY = "3a823237163e2759f94c94b7a7b32f2454cfe3a0dbf677afe8090d16dd1ef4c7"
client = Together(api_key=TOGETHER_API_KEY)

@app.route('/api/generate', methods=['POST'])
def generate_table():
    global last_error # Only need last_error if we still want to log it
    last_error = None

    config_payload = request.get_json()
    columns = config_payload.get("columns", [])
    col_names = ", ".join(col["name"] for col in columns)
    row_count = config_payload.get("rowCount", 5)
    
    # Add custom instructions to the prompt if they exist
    custom_instructions = config_payload.get("customInstructions", "").strip()
    instruction_string = f" ({custom_instructions})" if custom_instructions else ""

    # Add distribution type to the prompt
    distribution_type = config_payload.get("distributionType", "balanced")
    distribution_string = ""
    if distribution_type == "distorted":
        distribution_string = " Ensure the data is distorted and noisy with missing values and outliers."
    elif distribution_type == "balanced":
        distribution_string = " Ensure the data is well-balanced and clean."


    # Updated prompt to request CSV format
    prompt = (
        f"Generate a dataset table with {row_count} rows and columns: {col_names}.\n"
        f"Return *only* the raw CSV string, with the first row as headers."
        f" Do not include any additional text or markdown fences. Ensure all {row_count} rows are present."
        f"{instruction_string}{distribution_string}"
    )

    try:
        response = client.chat.completions.create(
            model="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7 # Added temperature for more consistent output
        )
        csv_text = response.choices[0].message.content.strip()
    except Exception as e:
        last_error = {"error": "Together AI request failed", "details": str(e)}
        return jsonify(last_error), 502

    # --- CLEAN & PARSE CSV ---
    try:
        # Remove any leading/trailing markdown code blocks if present
        if csv_text.startswith('```csv'):
            csv_text = csv_text[len('```csv'):]
        if csv_text.endswith('```'):
            csv_text = csv_text[:-len('```')]
        
        # Split into lines and filter out empty lines
        lines = [line.strip() for line in csv_text.split('\n') if line.strip()]

        if not lines:
            raise ValueError("No CSV data found in LLM output")

        # Use StringIO to treat the string as a file for csv.reader
        csv_file = StringIO("\n".join(lines))
        reader = csv.reader(csv_file)

        header = next(reader) # Get the header row

        parsed_table = []
        for row_data in reader:
            if len(row_data) != len(header):
                # Skip malformed rows or pad with None/empty string.
                # For robustness, we might want to log this or try to align.
                print(f"Warning: Skipping malformed row: {row_data}. Expected {len(header)} columns, got {len(row_data)}.")
                continue 
            
            row_dict = {}
            for i, col_name in enumerate(header):
                # Clean up column names for consistent dictionary keys
                cleaned_col_name = col_name.strip()
                row_dict[cleaned_col_name] = row_data[i]
            parsed_table.append(row_dict)

        # Ensure the generated table has the requested number of rows
        if len(parsed_table) < row_count:
            print(f"Warning: Generated {len(parsed_table)} rows, but {row_count} were requested. Filling with empty rows.")
            # Optionally, pad with empty rows or handle as an error
            # For this example, we'll just return what we got.

    except Exception as e:
        last_error = {
            "error": "Failed to parse model output as CSV",
            "details": str(e),
            "raw": csv_text
        }
        print(f"CSV Parsing Error: {e}")
        print(f"Raw LLM Output:\n{csv_text}")
        return jsonify(last_error), 500

    # --- SUCCESS: return clean JSON ---
    return jsonify({"status": "ok", "table": parsed_table}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)