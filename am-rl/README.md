# AM-RL Framework v3.0 — Self-Assessment Tool

Assessment framework for **Additive Manufacturing readiness** in medical/healthcare
settings: **15 dimensions**, **9 maturity levels** each, **3 sectors**
(Hospital · Medtech · Pharma), with gap analysis, sector benchmarks and a
matchmaking engine for expert assignment.

This is a full rebuild (v3.0) from the v2.0 handover specification. It is fully
self-contained — no build step, no server, no external dependencies.

## Files

| File | Role |
|---|---|
| `index.html` | The complete application (UI, radar chart, matchmaking, glossary tooltips, export) |
| `data.js` | **Single source of truth** for all framework data — dimensions, level names, questions, benchmarks, glossary |

Open `index.html` in any browser — it also works directly from `file://`
(v2 used `fetch()` on a JSON file, which breaks locally due to CORS; v3 loads
the data as a plain script instead, same structure).

## Editing content

All content lives in `data.js` (`window.AM_RL_DATA`):

- `dimensions[]` — `id`, `name`, `short` (radar label), `sector` (`"H"`/`"M"`/`"P"` characters, combinable, e.g. `"HMP"`), `color`, `experts[]`, `domain`
- `level_names` / `questions` — `{ dimId: [L1 … L9] }`
- `benchmarks` — `{ H|M|P: { dimId: value } }` — **currently placeholders**, replace with real anonymised network data
- `glossary[]` — `{ abbr, full, context }` — abbreviations are auto-detected in all question/level text and get hover/tap tooltips

Question phrasing convention (keep when editing):

- **L1–L3 (Exploration)** — soft: “Are you aware…”, “Have you begun…”, “Do you know…” — never “all”/“complete”; use “the main”, “the key”, “your relevant”
- **L4–L6 (Implementation)** — action: “Have you implemented…”, “Is your system…”
- **L7–L9 (Maturity)** — strong: “Do you maintain…”, “Have you achieved…”, “Is your system operating…”

## Features (v3.0)

- Sector selection filters dimensions (Hospital 13, Medtech 12, Pharma 13¹)
- 9-level ladder per dimension: click the highest level you can answer “yes” to; explicit “Level 0 — not started” option
- Adjustable **target level** per dimension (defaults to the sector benchmark, rounded up)
- **Autosave** to `localStorage` with resume-on-return
- Results: KPI stats, **SVG radar** (current vs. target vs. benchmark), gap table with concrete next-step question, **expert recommendations** with priority badges (Critical ≥ 4 gap levels, High = 3, Medium = 2, Low = 1)
- **Glossary**: ~70 entries, searchable modal + automatic `<abbr>` tooltips (hover, keyboard focus and touch)
- Export as **JSON** and **print/PDF** (print stylesheet included)
- Responsive layout, automatic dark mode

¹ The handover table assigns Biotech (MP) *and* GMP (P) to Pharma, giving 13;
its summary line says 12. The table was followed — see pending task
“Sector Assignment Review” below.

## D4 — Labor Safety (expanded)

D4 incorporates the expanded VDI 3405 Bl. 6.1–6.3 content directly in
`data.js` (v2 had it only in a standalone review docx): all medically relevant
AM processes (Metal/Polymer PBF, SLA/DLP/MJ, FFF, bioprinting, binder jetting),
the German regulatory chain (ArbSchG, GefStoffV, OStrV, BetrSichV, TRGS, DGUV),
STOP hierarchy, ATEX zoning, exposure monitoring and occupational health
surveillance.

## Handover task status

| # | Task (from v2 handover) | Status |
|---|---|---|
| 1 | Merge D4 v2 into JSON | ✅ done (in `data.js`) |
| 2 | Abbreviation tooltip feature | ✅ done (glossary + auto-`<abbr>` tooltips) |
| 3 | Review remaining dimensions | ⏳ open — needs reference documents per dimension |
| 4 | Sector assignment review | ⏳ open — see footnote above |
| 5 | Update mindmap | ⏳ open (draw.io file not in this repo) |
| 6 | Regenerate full review document | ⏳ open (docx not in this repo) |
| 7 | Real benchmark data | ⏳ open — placeholders clearly marked in UI |
| 8 | Phase 2: 5–10 questions per level | ⏳ open |
| 9 | Phase 3: website embedding | ➕ easier now — self-contained, no fetch/CORS constraints |
| 10 | Eurostars Call 11 prep (~Sep 2026) | supported via D15 Funding RL |

**Note:** the original v2 data files were not available for this rebuild; level
names and questions were re-authored from the handover specification and its
phrasing conventions. Review by domain experts is recommended before external use.
