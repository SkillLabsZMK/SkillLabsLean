"""
Sort devices within each room/area by a canonical order so that
shared device types (Medienpanel, PC, Buchung…) always appear
in the same relative position when comparing rooms.
"""

import json, re

HTML_PATH = "/home/user/SkillLabsLean/index.html"

# Canonical order — prefix-matched against device names (case-insensitive).
# Devices not matching any prefix keep their relative order and sort last.
CANONICAL = [
    "Medienpanel",
    "ClickShare",
    "Beamer",
    "Mikrofon",
    "Labcam",
    "Arbeitsplatzkamera",
    "KI-Tracking",
    "Patientenkamera",
    "Aufnahme über AV",
    "Intraoralscanner",
    "Behandlungseinheit",
    "Handstück",
    "Präpchecker",
    "Phantomkopf",
    "Pentamix",
    "Mikroskop",
    "QUATTROcare",
    "Noflame",
    "Hotty",
    "Sirona",
    "Absaugbox",
    "Zentralabsaugung",
    "Elmasonic",
    "Smartbox",
    "Smartmix",
    "Rüttler",
    "Gipstrimmer",
    "Trockentrimmer",
    "Giroform",
    "Polierbox",
    "Gipsabscheider",
    "Drucktopf",
    "Sandstrahl",
    "Erkoform",
    "Steamy",
    "Abdampfgerät",
    "Augenspülstation",
    "eyevolution",
    "Cavex",
    "Ausstattung",
    "Bildschirme",
    "Kein Strom",
    "Klimatisierung",
    "Gerät defekt",
    "PC / Workstation",
    "Trennwände",
    "Buchung",
]

def rank(device_name):
    name_lower = device_name.lower()
    for i, prefix in enumerate(CANONICAL):
        if name_lower.startswith(prefix.lower()):
            return i
    return len(CANONICAL)  # unknown → end, preserving relative order

html = open(HTML_PATH, encoding="utf-8").read()

rooms_m = re.search(r"(const ROOMS\s*=\s*)(\[.*?\])(\s*;\s*\n)", html, re.DOTALL)
areas_m = re.search(r"(const AREAS\s*=\s*)(\[.*?\])(\s*;\s*\n)", html, re.DOTALL)

ROOMS = json.loads(rooms_m.group(2))
AREAS = json.loads(areas_m.group(2))

for collection in (ROOMS, AREAS):
    for room in collection:
        devices = room.get("devices", [])
        # stable sort preserves original order for equal-rank items
        devices.sort(key=lambda d: rank(d["name"]))
        room["devices"] = devices
        print(f"  {room['name']}: {[d['name'] for d in devices]}")

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
