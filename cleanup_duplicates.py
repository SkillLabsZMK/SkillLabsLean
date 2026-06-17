"""Fix up duplicate/renamed devices after apply_excel_updates.py run."""

import json, re

HTML_PATH = "/home/user/SkillLabsLean/index.html"

html = open(HTML_PATH, encoding="utf-8").read()
rooms_m = re.search(r"(const ROOMS\s*=\s*)(\[.*?\])(\s*;\s*\n)", html, re.DOTALL)
ROOMS = json.loads(rooms_m.group(2))

# ── Seminar 2: remove the old "analoger Raum" entry (renamed to "Lautsprecher") ──
for r in ROOMS:
    if r["name"] == "Seminar 2":
        r["devices"] = [d for d in r["devices"] if d["name"] != "Ausstattung – analoger Raum"]
        print("Seminar 2 devices:", [d["name"] for d in r["devices"]])

# ── Technicum: remove old "Handstück" (renamed to "Handstück dreht links") ───
for r in ROOMS:
    if r["name"] == "Technicum":
        # Keep all except the old bare "Handstück"
        r["devices"] = [d for d in r["devices"] if d["name"] != "Handstück"]
        print("Technicum devices:", [d["name"] for d in r["devices"]])

# ── Write back ────────────────────────────────────────────────────────────────
rooms_json = json.dumps(ROOMS, ensure_ascii=False, indent=2)
rooms_new = rooms_m.group(1) + rooms_json + rooms_m.group(3)
html = html[:rooms_m.start()] + rooms_new + html[rooms_m.end():]

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)

print("Done.")
