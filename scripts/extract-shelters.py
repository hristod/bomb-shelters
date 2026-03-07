"""Extract shelter data from the official docx file."""
import json
import re
import sys
import docx

def extract_shelters(docx_path: str) -> list[dict]:
    doc = docx.Document(docx_path)
    table = doc.tables[1]

    shelters = []
    current_region = ""
    current_municipality = ""

    for row in table.rows[1:]:
        cells = [cell.text.strip() for cell in row.cells]

        if "Област:" in cells[1]:
            current_region = cells[1].replace("Област:", "").strip()
            continue
        if "Община" in cells[1] and "Район" in cells[1]:
            current_municipality = re.sub(r"Община\s*/\s*Район:\s*", "", cells[1]).strip()
            continue
        if not cells[0].isdigit():
            continue

        address = re.sub(r"\s*,?\s*Община/Район:.*$", "", cells[2]).strip()
        category_raw = cells[5].split(":")[0].strip() if ":" in cells[5] else cells[5].strip()

        shelters.append({
            "id": int(cells[0]),
            "name": cells[1],
            "address": address,
            "region": current_region,
            "municipality": current_municipality,
            "operator": cells[3],
            "type": cells[4],
            "category": category_raw,
            "lat": None,
            "lng": None,
        })

    return shelters

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "docs/2022-03-10-listksz.docx"
    shelters = extract_shelters(path)
    print(f"Extracted {len(shelters)} shelters", file=sys.stderr)
    with open("data/shelters-raw.json", "w", encoding="utf-8") as f:
        json.dump(shelters, f, ensure_ascii=False, indent=2)
    print("Written to data/shelters-raw.json", file=sys.stderr)
