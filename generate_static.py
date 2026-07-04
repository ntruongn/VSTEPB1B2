import os
import json
import re

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

def main():
    categories = ["reading", "listening", "writing", "speaking"]
    result = {}
    for cat in categories:
        result[cat] = get_sorted_ids(cat)
    
    output_path = os.path.join(DATA_DIR, "exams.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Successfully generated {output_path} with:")
    for cat, ids in result.items():
        print(f"  - {cat}: {len(ids)} exams")

if __name__ == "__main__":
    main()
