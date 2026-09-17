# Requirement Traceability Matrix

**Purpose.** Show that every user story has at least one test, and that every test
exists because of a story — not because it was easy to write. Gaps in either
direction are visible in a single view: a story with no test is untested scope; a
test with no story is scope nobody asked for.

## How to complete this

Replace `US-xx` with your real backlog IDs and titles from the project board, then
fill the two coverage columns. Keep it updated whenever a story is added or split —
this table is the evidence that testing tracked the backlog rather than lagging it.

| Story ID | User story | Acceptance criteria met by | Automated coverage | Manual coverage | Usability scenario | Gap? |
| --- | --- | --- | --- | --- | --- | --- |
| US-01 | *As a Victorian household, I can enter my home's details so my energy profile is accurate* | Household step validates and persists | `test_input_validation.py`, `validateProfile.test.ts` | VAL-01…VAL-06, VAL-21, VAL-22 | US-1 | |
| US-02 | *…I can record my electricity usage* | Usage step validates and persists | `test_input_validation.py`, `validateProfile.test.ts` | VAL-07, VAL-08 | US-1 | |
| US-03 | *…I can record my solar setup, or say I don't have one* | Both branches complete setup | `test_input_validation.py`, `validateProfile.test.ts`, `kpis.test.ts` | VAL-09, VAL-10, VAL-23, VAL-24, FUN-07 | US-2 | |
| US-04 | *…I can record my battery and reserve level* | Battery step validates and persists | `test_input_validation.py`, `validateProfile.test.ts` | VAL-11…VAL-17 | US-2 | |
| US-05 | *…I can select my energy provider* | Provider allow-list enforced | `test_input_validation.py`, `validateProfile.test.ts` | VAL-18, VAL-19, VAL-20 | US-2 | |
| US-06 | *…I see a dashboard of KPIs after setup* | Dashboard renders from the saved profile | `kpis.test.ts` | FUN-01, FUN-08, FUN-10 | US-3 | |
| US-07 | *…I see how my solar and battery balance my usage* | Energy balance chart | `kpis.test.ts` | FUN-09 | US-3 | |
| US-08 | *…I can return later and see my dashboard without signing in* | Home page branches on stored profile | `test_access_control.py` | FUN-02 | US-4 | |
| US-09 | *…I can correct details I got wrong* | Profile view saves changes | `kpis.test.ts` (recalculation) | FUN-06 | US-5 | |
| US-10 | *…my data is not visible to other households* | Identifier-based access control | `test_access_control.py` | SEC-01…SEC-05 | — | |

## Coverage summary

| Measure | Count | Notes |
| --- | --- | --- |
| Stories with at least one test | / | |
| Stories with automated coverage | / | |
| Stories with **no** coverage | | Any entry here is a release risk — record the decision |
| Test cases not traceable to a story | | Usually security or robustness cases; justify or retire |

## Known coverage gaps

| Gap | Risk | Decision |
| --- | --- | --- |
| ~~No frontend unit test runner~~ | — | **Closed** — Vitest added, 177 tests, wired into CI |
| No end-to-end browser test | FUN-01…FUN-12 are manual only; the primary journey has no automated guard | Open — Playwright on FUN-01 recommended |
| CI runs SQLite, not Postgres | Postgres-specific behaviour unverified in CI | Verify locally before merge |
| Two known defects pinned, not fixed | KPI-01 and KPI-02 remain in the build | See [defect-log.md](defect-log.md) |
