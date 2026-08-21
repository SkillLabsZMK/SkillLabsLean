# SkillLabsLean – Project Context

## What it is
Standalone single-file HTML app (`index.html`) for Skill Labs at ZMK Tübingen (dental school). No server. Deployed via GitHub Pages at https://skilllabszmk.github.io/SkillLabsLean/

## Purpose
Troubleshooting guide for students/staff: select a room → select a device → get self-help steps or contact info.

## Repo
https://github.com/SkillLabsZMK/SkillLabsLean  
Branch for Claude work: `claude/optimistic-faraday-wtzx9q`

## Architecture
- Single file: `index.html` (~4700 lines)
- Data: `ROOMS` and `AREAS` JSON arrays embedded in the HTML
- Each room has `devices[]`, each device has `name`, `status`, `node`, `manuals`
- Node kinds: `self` (self-help steps + escalation), `contact` (AP finden), `safety` (warning wrapper), `branch`/`choice` (multiple paths), `direct` (Gebäude: contact + steps on same page)
- AP2 stored as `ap2: {name, lines}` on contact/escalation nodes — shown as side-by-side boxes

## Key UI features
- Room grid → device list → node tree navigation
- "Ansprechpartner finden" shows AP1 + AP2 in boxes, contact details below
- Feedback widget (⚑ button) — currently needs GitHub PAT in localStorage; mailto alternative planned
- Search across devices and materials

## Python scripts (data management)
| File | Purpose |
|---|---|
| `apply_excel_updates.py` | Reads reviewed Excel → updates ROOMS/AREAS in index.html |
| `generate_excel.py` | Exports current data to Excel for review |
| `cleanup_duplicates.py` | One-off: removes renamed devices after Excel import |
| `cleanup_contact_lines.py` | Removes "Falls nötig in CC" redundancies from AP lines |
| `cleanup_person_refs.py` | Removes person/role refs from AP detail lines |
| `sort_devices.py` | Sorts devices in each room by canonical order |

## Recent changes (last session)
- Feedback widget: localStorage PAT + Datenschutz consent notice
- Canonical device sort (Buchung first, Medienpanel second, PC/Buchung last)
- Icon consistency fix (Medienpanel Seminar 1: self→branch)
- Removed ~45 "Falls nötig in CC / 2. Stelle: X" lines (AP2 box makes them redundant)
- Stripped all person/role references from AP detail lines
- Footer: added "ABX" between Technischer Koordinator and Poliklinik
- QR code generated for presentation (qrcode.png)

## Open items
- Feedback widget: PAT requirement — considering mailto: fallback
- PR #6 merged, PR #7 merged; branch is up to date with main
