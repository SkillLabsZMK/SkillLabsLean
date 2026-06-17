"""
Remove all person/role references from contact detail lines.
Keep only generic contact methods and functional instructions.
"""

import json, re

HTML_PATH = "/home/user/SkillLabsLean/index.html"

REMOVE_EXACT = {
    'Arzt Skill Labs oder Techn. Koordinator ansprechen',
    'Arzt Skill Labs oder Techn. Koordinator – Einweisung anfordern',
    'Arzt Skill Labs; Techn. Koordinator oder IT-Service Tal ansprechen',
    'Arzt im Raum „Besprechung Lehrende" ansprechen',
    'Aufsicht / Arzt im Raum „Besprechung Lehrende" ansprechen',
    'Falls nötig in CC / 2. Stelle: Druckerwartung · Firma Morgenstern',
    'Falls nötig in CC / 2. Stelle: Technischer Koordinator Skill Labs',
    'Falls nötig in Techn. Koordinator CC',
    'Für Lehrungen, Hauswirtschaft kontaktieren',
    'Mit Einweisung → direkt kontaktieren',
    'Ohne Einweisung → zuerst Techn. Koordinator',
    'Techn. Koordinator in cc setzen',
    'Technischer Koordinator Skill Labs – direkt ansprechen',
    'Zuständige Aufsicht oder Arzt im Raum ansprechen',
    'Zuständigen Kollegen ansprechen',
}

SIMPLIFY = {
    'Direkt ansprechen oder per Mail – cc: Sekretariat / Koordination': 'per Mail',
    'Direkt ansprechen oder per Mail – cc: Techn. Koordinator':         'per Mail',
}

def clean_lines(lines):
    result = []
    for l in lines:
        if l in REMOVE_EXACT:
            continue
        if l in SIMPLIFY:
            result.append(SIMPLIFY[l])
            continue
        result.append(l)
    return result

def process_contact(node):
    c = node.get("contact", {})
    if "lines" in c:
        c["lines"] = clean_lines(c["lines"])
    ap2 = node.get("ap2")
    if ap2 and "lines" in ap2:
        ap2["lines"] = clean_lines(ap2["lines"])

def walk(node):
    if not isinstance(node, dict): return
    kind = node.get("kind")
    if kind in ("contact", "direct"):
        process_contact(node)
    if kind == "self" and "escalation" in node:
        esc = node["escalation"]
        if isinstance(esc, dict) and esc.get("kind") in ("contact", "direct"):
            process_contact(esc)
        walk(esc)
    if kind == "safety":
        walk(node.get("inner", {}))
    if kind in ("branch", "choice"):
        for o in node.get("options", []):
            walk(o.get("node", {}))

html = open(HTML_PATH, encoding="utf-8").read()
rooms_m = re.search(r"(const ROOMS\s*=\s*)(\[.*?\])(\s*;\s*\n)", html, re.DOTALL)
areas_m = re.search(r"(const AREAS\s*=\s*)(\[.*?\])(\s*;\s*\n)", html, re.DOTALL)
ROOMS = json.loads(rooms_m.group(2))
AREAS = json.loads(areas_m.group(2))

for collection in (ROOMS, AREAS):
    for room in collection:
        for d in room.get("devices", []):
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

print("Done.")
