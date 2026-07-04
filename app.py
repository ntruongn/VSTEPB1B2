import os
import json
import re
from flask import Flask, jsonify, render_template, abort, send_from_directory

app = Flask(__name__, static_folder="static", template_folder=".")

DATA_DIR = os.path.abspath("./extracted_data")

def get_sorted_ids(category):
    category_dir = os.path.join(DATA_DIR, category)
    if not os.path.exists(category_dir):
        return []
    
    files = os.listdir(category_dir)
    ids = []
    pattern = re.compile(rf"{category}_(\d+)\.json")
    
    for filename in files:
        match = pattern.match(filename)
        if match:
            ids.append(int(match.group(1)))
            
    return sorted(ids)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/extracted_data/<path:filename>")
def serve_extracted_data(filename):
    return send_from_directory(DATA_DIR, filename)

@app.route("/api/exams")
def get_all_exams():
    categories = ["reading", "listening", "writing", "speaking"]
    result = {}
    for cat in categories:
        result[cat] = get_sorted_ids(cat)
    return jsonify(result)

@app.route("/api/exams/<category>/<int:test_id>")
def get_exam_details(category, test_id):
    if category not in ["reading", "listening", "writing", "speaking"]:
        abort(400, description="Invalid exam category")
        
    file_path = os.path.join(DATA_DIR, category, f"{category}_{test_id}.json")
    if not os.path.exists(file_path):
        abort(404, description=f"Exam not found: {category} {test_id}")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        abort(500, description=f"Error reading exam data: {str(e)}")

if __name__ == "__main__":
    # Run the flask application
    print("Starting VSTEP web server...")
    app.run(host="0.0.0.0", port=8888, debug=True)
