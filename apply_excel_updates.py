"""
Apply reviewed Excel changes to index.html ROOMS/AREAS JSON.
"""

import json, re
from openpyxl import load_workbook

EXCEL_PATH = "/root/.claude/uploads/1a95ad9a-4c85-5103-8d4b-289795273960/7cdc69bc-Ansprechpartner_Review.xlsx"
HTML_PATH = "/home/user/SkillLabsLean/index.html"

# ── Read Excel ────────────────────────────────────────────────────────────────

wb = load_workbook(EXCEL_PATH, read_only=True, data_only=True)
ws = wb.active

rows = []
for row in ws.iter_rows(min_row=2, values_only=True):
    raum     = (row[0] or "").strip()
    geraet   = (row[1] or "").strip()
    status   = (row[2] or "").strip()
    schritte = (row[3] or "").strip()
    ap1_name = (row[4] or "").strip()
    ap1_det  = (row[5] or "").strip()

    if not raum or not geraet:
        continue

    rows.append({
        "raum": raum, "geraet": geraet, "status": status,
        "schritte": schritte,
        "ap1_name": ap1_name, "ap1_det": ap1_det,
    })

print(f"Loaded {len(rows)} rows from Excel")

# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_steps(text):
    """'(1) a → (2) b → (3) c' → ['a','b','c']"""
    if not text:
        return []
    # split only on ' → ' followed by a numbered prefix
    parts = re.split(r' → (?=\(\d+\) )', text)
    steps = []
    for part in parts:
        s = re.sub(r'^\(\d+\)\s*', '', part.strip())
        if s:
            steps.append(s)
    return steps

def split_lines(detail):
    return [l.strip() for l in detail.split("|") if l.strip()] if detail else []

def build_node(device_name, ap1_name, ap1_det, schritte_text):
    steps = parse_steps(schritte_text)
    lines = split_lines(ap1_det)

    # Separate safety warn (first step starts with ⚠)
    safety_warn = None
    inner_steps = []
    for i, step in enumerate(steps):
        if i == 0 and step.startswith("⚠"):
            safety_warn = step.lstrip("⚠").strip()
        else:
            inner_steps.append(step)

    # Core node
    if ap1_name and inner_steps:
        core = {
            "kind": "self",
            "title": device_name,
            "steps": inner_steps,
            "escalation": {
                "kind": "contact",
                "contact": {"name": ap1_name, "lines": lines},
                "desc": "", "pills": []
            }
        }
    elif ap1_name:
        core = {
            "kind": "contact",
            "contact": {"name": ap1_name, "lines": lines},
            "desc": "", "pills": []
        }
    elif inner_steps:
        core = {"kind": "self", "title": device_name, "steps": inner_steps}
    else:
        core = {"kind": "contact", "contact": {"name": "", "lines": lines}}

    if safety_warn:
        return {"kind": "safety", "warn": safety_warn, "inner": core}
    return core

# ── Read HTML ─────────────────────────────────────────────────────────────────

html = open(HTML_PATH, encoding="utf-8").read()

rooms_m = re.search(r"(const ROOMS\s*=\s*)(\[.*?\])(\s*;\s*\n)", html, re.DOTALL)
areas_m = re.search(r"(const AREAS\s*=\s*)(\[.*?\])(\s*;\s*\n)", html, re.DOTALL)

if not rooms_m or not areas_m:
    raise ValueError("Cannot find ROOMS or AREAS in HTML")

ROOMS = json.loads(rooms_m.group(2))
AREAS = json.loads(areas_m.group(2))
ALL   = ROOMS + AREAS

def find_device(raum, geraet):
    for r in ALL:
        if r["name"] == raum:
            for d in r.get("devices", []):
                if d["name"] == geraet:
                    return r, d
    return None, None

# ── Apply ─────────────────────────────────────────────────────────────────────

updated, not_found = 0, []

for row in rows:
    _, dev = find_device(row["raum"], row["geraet"])
    if dev is None:
        not_found.append(row)
        continue
    dev["node"] = build_node(row["geraet"], row["ap1_name"], row["ap1_det"], row["schritte"])
    if row["status"]:
        dev["status"] = row["status"]
    updated += 1

print(f"Updated: {updated}")
print(f"Not found: {len(not_found)}")
for r in not_found:
    print(f"  [{r['raum']}] {r['geraet']}")

# Add new rows
for row in not_found:
    for r in ALL:
        if r["name"] == row["raum"]:
            node = build_node(row["geraet"], row["ap1_name"], row["ap1_det"], row["schritte"])
            r["devices"].append({
                "name": row["geraet"],
                "status": row["status"] or node["kind"],
                "node": node,
                "manuals": []
            })
            print(f"  Added: [{row['raum']}] {row['geraet']}")
            break

# ── Write back ────────────────────────────────────────────────────────────────

rooms_json = json.dumps(ROOMS, ensure_ascii=False, indent=2)
areas_json = json.dumps(AREAS, ensure_ascii=False, indent=2)

# Replace ROOMS block
rooms_new = rooms_m.group(1) + rooms_json + rooms_m.group(3)
html = html[:rooms_m.start()] + rooms_new + html[rooms_m.end():]

# Re-search for AREAS (offsets changed after ROOMS replacement)
areas_m2 = re.search(r"(const AREAS\s*=\s*)(\[.*?\])(\s*;\s*\n)", html, re.DOTALL)
areas_new = areas_m2.group(1) + areas_json + areas_m2.group(3)
html = html[:areas_m2.start()] + areas_new + html[areas_m2.end():]

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\nDone. {updated} updated, {len(not_found)} new devices added.")
