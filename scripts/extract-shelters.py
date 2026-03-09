"""Extract shelter data from the official PDF file."""
import json
import re
import sys
import pdfplumber


# Column boundaries derived from vertical edges in the PDF.
# These define x-position ranges for each data column.
COL_BOUNDS = {
    "num": (0, 82),
    "name": (82, 254),
    "address": (254, 448),
    "operator": (448, 595),
    "type": (595, 710),
    "category": (710, 900),
}


def normalize_type(raw: str) -> str:
    """Normalize shelter type to canonical form."""
    text = raw.strip().lower()
    if "скривалище" in text:
        return "Скривалище"
    if "противорадиационн" in text or "укритие" in text:
        return "Противорадиационно укритие"
    return raw.strip()


def normalize_category(raw: str) -> str:
    """Normalize category to I or II."""
    text = raw.strip()
    # Handle Cyrillic І (looks like Latin I)
    text = text.replace("І", "I")
    if text in ("I", "II"):
        return text
    if "II" in text:
        return "II"
    if "I" in text:
        return "I"
    return text


def clean_text(text: str | None) -> str:
    """Clean extracted text: collapse whitespace, strip."""
    if text is None:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def parse_table_row(row: list, ncols: int) -> dict | None:
    """Parse a single table row into a shelter dict (without id/region).

    Handles both 8-column and 6-column layouts:
    - 8 cols: [num, None, name, address, operator, type, category, None]
    - 6 cols: [num, name, address, operator, type, category]
    """
    cell0 = clean_text(row[0])
    if not cell0.isdigit():
        return None

    if ncols >= 8:
        name = clean_text(row[2])
        address = clean_text(row[3])
        operator = clean_text(row[4])
        type_raw = clean_text(row[5])
        category_raw = clean_text(row[6])
    else:
        name = clean_text(row[1])
        address = clean_text(row[2])
        operator = clean_text(row[3])
        type_raw = clean_text(row[4])
        category_raw = clean_text(row[5]) if len(row) > 5 else ""

    return {
        "row_num": int(cell0),
        "name": name,
        "address": address,
        "operator": operator,
        "type": normalize_type(type_raw),
        "category": normalize_category(category_raw),
    }


def get_table_top(page) -> float:
    """Get the top y-coordinate of the first table on the page."""
    tables_found = page.find_tables()
    if tables_found:
        return tables_found[0].bbox[1]
    return 0


def words_to_columns(words: list) -> dict:
    """Assign words to columns based on their x-position."""
    cols = {name: [] for name in COL_BOUNDS}
    for w in words:
        x = w["x0"]
        for col_name, (x_min, x_max) in COL_BOUNDS.items():
            if x_min <= x < x_max:
                cols[col_name].append(w)
                break
    # Sort each column's words by y then x position
    for col_name in cols:
        cols[col_name].sort(key=lambda w: (w["top"], w["x0"]))
    return cols


def extract_orphan_shelter(page, table_top: float) -> tuple[dict | None, str | None]:
    """Extract a data row and/or region header from orphan text above the table.

    Returns (shelter_dict_or_None, region_name_or_None).
    """
    words = page.extract_words(keep_blank_chars=False, y_tolerance=3)
    orphan_words = [w for w in words if w["top"] < table_top]
    if not orphan_words:
        return None, None

    # Check for region header
    full_text = " ".join(
        w["text"]
        for w in sorted(orphan_words, key=lambda w: (w["top"], w["x0"]))
    )
    region = None
    region_match = re.search(r"Област\s+(\S+(?:\s+\S+)*?)(?:\s+\d|\s*$)", full_text)
    if region_match:
        candidate = region_match.group(1).strip()
        # Only accept known region names (avoid false matches)
        if not any(c.isdigit() for c in candidate) and len(candidate) < 30:
            region = candidate

    # Assign words to columns
    cols = words_to_columns(orphan_words)

    # Check if there's a row number
    num_text = " ".join(w["text"] for w in cols["num"]).strip()
    nums = re.findall(r"\d+", num_text)
    if not nums:
        return None, region

    row_num = int(nums[0])

    name = " ".join(w["text"] for w in cols["name"]).strip()
    address = " ".join(w["text"] for w in cols["address"]).strip()
    operator = " ".join(w["text"] for w in cols["operator"]).strip()
    type_raw = " ".join(w["text"] for w in cols["type"]).strip()
    category_raw = " ".join(w["text"] for w in cols["category"]).strip()

    # Filter out region headers from the name field
    if re.match(r"^Област\s+", name):
        # The "name" column picked up a region header, not actual data
        # Check if there's actual shelter data mixed in
        name = re.sub(r"Област\s+\S+(?:\s+\S+)?\s*", "", name).strip()
        if not name:
            return None, region

    shelter = {
        "row_num": row_num,
        "name": clean_text(name),
        "address": clean_text(address),
        "operator": clean_text(operator),
        "type": normalize_type(type_raw) if type_raw else "",
        "category": normalize_category(category_raw) if category_raw else "",
    }

    return shelter, region


def extract_shelters(pdf_path: str) -> list[dict]:
    pdf = pdfplumber.open(pdf_path)
    shelters: list[dict] = []
    current_region = ""
    global_id = 0

    for page_idx, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        if not tables:
            continue

        table = tables[0]
        ncols = len(table[0]) if table else 0

        # Check for orphan row above the table
        table_top = get_table_top(page)
        if table_top > 50 and page_idx > 0:
            orphan_shelter, orphan_region = extract_orphan_shelter(page, table_top)

            if orphan_region:
                current_region = orphan_region

            if orphan_shelter and orphan_shelter["name"]:
                global_id += 1
                shelters.append({
                    "id": global_id,
                    "name": orphan_shelter["name"],
                    "address": orphan_shelter["address"],
                    "region": current_region,
                    "operator": orphan_shelter["operator"],
                    "type": orphan_shelter["type"],
                    "category": orphan_shelter["category"],
                    "lat": None,
                    "lng": None,
                })

        # Process table rows
        for row in table:
            if row is None:
                continue

            while len(row) < ncols:
                row.append(None)

            cell0 = clean_text(row[0])
            cell1 = clean_text(row[1]) if len(row) > 1 else ""

            # Detect region header
            region_cell = cell1
            if "Област" in region_cell and not cell0.isdigit():
                match = re.search(r"Област\s+(.+)", region_cell)
                if match:
                    current_region = match.group(1).strip()
                continue

            # Skip non-data rows
            if not cell0.isdigit():
                continue

            parsed = parse_table_row(row, ncols)
            if parsed:
                global_id += 1
                shelters.append({
                    "id": global_id,
                    "name": parsed["name"],
                    "address": parsed["address"],
                    "region": current_region,
                    "operator": parsed["operator"],
                    "type": parsed["type"],
                    "category": parsed["category"],
                    "lat": None,
                    "lng": None,
                })

    pdf.close()
    return shelters


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "docs/shelters.pdf"
    shelters = extract_shelters(path)
    print(f"Extracted {len(shelters)} shelters", file=sys.stderr)
    with open("data/shelters-raw.json", "w", encoding="utf-8") as f:
        json.dump(shelters, f, ensure_ascii=False, indent=2)
    print("Written to data/shelters-raw.json", file=sys.stderr)
