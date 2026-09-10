# Test Evidence

Proof that testing was actually performed, kept so a reader can verify a claim
without re-running anything.

## What belongs here

| Type | Naming | Notes |
| --- | --- | --- |
| Test run output | `run-YYYY-MM-DD-pytest.txt` | Paste the full pytest summary, not just "all passed" |
| CI run records | `ci-YYYY-MM-DD.md` | Workflow run URL, commit SHA, job results |
| Screenshots of defects | `defect-<id>-<short-name>.png` | Include the URL bar and any error text |
| Screenshots of fixes | `fixed-<id>-<short-name>.png` | Pair with the defect image for before/after |
| Worked KPI calculations | `kpi-worked-example-<n>.md` | Inputs, hand calculation, displayed value (supports FUN-08) |
| Usability session recordings | *do not commit* | Store per your unit's data handling rules; link, don't upload |

## What does **not** belong here

- Participant names, emails, or any identifying detail — session notes use codes only
- Real electricity bills or real addresses from participants
- Anything containing a credential or API key (gitleaks scans full history and will fail the build)
- Large video files — link to them instead

## Index

Keep this table current so the folder is navigable without opening every file.

| Date | Evidence | Covers | File |
| --- | --- | --- | --- |
| 2026-09-10 | Vitest run — 177 passed | VAL-01…VAL-24, FUN-06…FUN-10 | [run-2026-09-10-vitest.txt](run-2026-09-10-vitest.txt) |
| 2026-09-10 | pytest run — 67 passed | SEC-01…SEC-12, VAL-25…VAL-28 | [run-2026-09-10-pytest.txt](run-2026-09-10-pytest.txt) |
| 2026-09-10 | Hand-worked KPI calculation | FUN-08 | [kpi-worked-example-1.md](kpi-worked-example-1.md) |

## Suggested minimum before submission

- [x] One recorded pytest run with the full summary
- [x] One recorded Vitest run with the full summary
- [ ] One CI run record showing all four jobs green
- [ ] Screenshots of the completed setup journey and the resulting dashboard (FUN-01)
- [x] At least one worked KPI example supporting FUN-08
- [ ] Before/after screenshots for at least one defect found and fixed
- [ ] Before/after evidence for at least one usability finding that changed the build
