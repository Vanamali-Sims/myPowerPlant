# Testing

Testing artefacts for **MyPowerPlant** — a Victorian household solar/battery/VPP
profile and dashboard app (React + TypeScript frontend, FastAPI + PostgreSQL backend).

This folder holds the *documentation* of testing. The executable tests live with
the code they test (see [04-automated](04-automated/README.md)) so that CI runs them.

## Contents

| File | What it holds |
| --- | --- |
| **[MyPowerPlant-Test-Report.pdf](MyPowerPlant-Test-Report.pdf)** | **Submission report — 15 pages, covers everything below** |
| [01-test-plan.md](01-test-plan.md) | Scope, test levels, techniques, risk-based priorities, entry/exit criteria |
| [02-test-cases/](02-test-cases/) | Test cases with rationale, the traceability matrix, and the defect log |
| [03-usability/](03-usability/) | Tester scenarios, facilitator script, session notes, findings → user story changes |
| [04-automated/](04-automated/) | Where the automated suites live, how to run them, how CI enforces them |
| [05-evidence/](05-evidence/) | Screenshots, CI run records, and test execution results |

Regenerate the PDF after editing `test-report.html`:

```bash
cd testing
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="MyPowerPlant-Test-Report.pdf" \
  "file://$PWD/test-report.html"
```

## How to use this folder

1. Read [01-test-plan.md](01-test-plan.md) first — it explains *why* we test what we test.
2. Test cases in [02-test-cases/](02-test-cases/) are written before execution and
   carry a **Rationale** column. Fill the *Actual result* and *Status* columns only
   after a run, and record the run in [05-evidence/](05-evidence/).
3. Usability sessions follow [03-usability/scenarios.md](03-usability/scenarios.md).
   Every issue raised is logged in
   [03-usability/findings-and-actions.md](03-usability/findings-and-actions.md)
   with the user story it changed.

## Status

| Area | State |
| --- | --- |
| Automated tests | **244 passing** — 67 backend (pytest), 177 frontend (Vitest). Run and recorded 2026-09-10. |
| Defects found | 3 open — see [02-test-cases/defect-log.md](02-test-cases/defect-log.md) (two S2, one S3) |
| Manual functional cases | Written, **not yet executed** — FUN-01…FUN-12 |
| Usability sessions | Scenarios and script ready, **no sessions run yet** |

**Execution columns for manual cases, session notes, and usability evidence are
intentionally blank.** They are filled in by the team as testing is actually
performed. Do not pre-fill a result you have not observed.
