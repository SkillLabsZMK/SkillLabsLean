"""
Remove redundant lines from contact details now that AP2 is shown in its own box.

Rules applied:
1. Remove any AP1 line matching "Falls nötig in CC" (AP2 box makes this redundant)
2. Remove any AP1 line that is identical to the AP1 contact name itself
3. Remove any AP2 line that is identical to an AP1 line (de-duplicate cross-listed details)
"""

import json, re

HTML_PATH = "/home/user/SkillLabsLean/index.html"

def clean_ap1_lines(lines, contact_name, ap2_name):
    cleaned = []
    for line in lines:
        # Remove "Falls nötig in CC / 2. Stelle: X" — AP2 box already shows this
        if re.search(r'falls nötig in cc', line, re.IGNORECASE):
            continue
        # Remove line that literally repeats the contact name
        if line.strip() == contact_name.strip():
            continue
        cleaned.append(line)
    return cleaned

def clean_ap2_lines(ap2_lines, ap1_lines):
    ap1_set = set(l.strip() for l in ap1_lines)
    return [l for l in ap2_lines if l.strip() not in ap1_set]

def process_contact_node(node):
    """Process a contact node (has .contact and optionally .ap2)."""
    c = node.get("contact", {})
    ap2 = node.get("ap2")
    if not ap2:
        return
    ap1_name = c.get("name", "")
    ap2_name = ap2.get("name", "")
    orig_lines = list(c.get("lines", []))
    c["lines"] = clean_ap1_lines(orig_lines, ap1_name, ap2_name)
    ap2["lines"] = clean_ap2_lines(ap2.get("lines", []), c["lines"])
    if orig_lines != c["lines"]:
        removed = set(orig_lines) - set(c["lines"])
        print(f"  AP1 lines removed: {removed}")

def walk(node, path=""):
    if not isinstance(node, dict):
        return
    kind = node.get("kind")
    if kind in ("contact", "direct"):
        process_contact_node(node)
    if kind == "self" and "escalation" in node:
        esc = node["escalation"]
        if isinstance(esc, dict) and esc.get("kind") in ("contact", "direct"):
            process_contact_node(esc)
        walk(esc, path + ".escalation")
    if kind == "safety" and "inner" in node:
        walk(node["inner"], path + ".inner")
    if kind in ("branch", "choice"):
        for opt in node.get("options", []):
            walk(opt.get("node", {}), path + ".option")
    # recurse into escalation of contact nodes too (shouldn't be needed but safe)

html = open(HTML_PATH, encoding="utf-8").read()
rooms_m = re.search(r"(const ROOMS\s*=\s*)(\[.*?\])(\s*;\s*\n)", html, re.DOTALL)
areas_m = re.search(r"(const AREAS\s*=\s*)(\[.*?\])(\s*;\s*\n)", html, re.DOTALL)
ROOMS = json.loads(rooms_m.group(2))
AREAS = json.loads(areas_m.group(2))

for collection in (ROOMS, AREAS):
    for room in collection:
        for d in room.get("devices", []):
            print(f"[{room['name']}] {d['name']}")
            walk(d.get("node", {}))

rooms_json = json.dumps(ROOMS, ensure_ascii=False, indent=2)
areas_json = json.dumps(AREAS, ensure_ascii=False, indent=2)

rooms_new = rooms_m.group(1) + rooms_json + rooms_m.group(3)
html = html[:rooms_m.start()] + rooms_new + html[rooms_m.end():]

areas_m2 = re.search(r"(const AREAS\s*=\s*)(\[.*?\])(\s*;\s*\n)", html, re.DOTALL)
areas_new = areas_m2.group(1) + areas_json + areas_m2.group(3)
html = html[:areas_m2.start()] + areas_new + html[areas_m2.end():]

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)

print("\nDone.")
