# Automated Tests

Executable tests live **with the code they test**, not in this folder. That is
deliberate: `backend/pytest.ini` sets `testpaths = tests`, and the CI workflow runs
`pytest tests/` from `backend/`. A suite moved under `testing/` would be collected by
neither, and would silently stop running — a test that does not run is worse than no
test, because it looks like coverage.

## Where the tests are

| Suite | Location | Runner | Count |
| --- | --- | --- | --- |
| Backend access control | `backend/tests/test_access_control.py` | pytest | 67 total |
| Backend input validation | `backend/tests/test_input_validation.py` | pytest | ↑ |
| Headers and rate limits | `backend/tests/test_headers_and_limits.py` | pytest | ↑ |
| Shared fixtures | `backend/tests/conftest.py` | — | — |
| **Frontend validation rules** | `frontend/src/lib/validateProfile.test.ts` | Vitest | 83 |
| **Frontend KPI engine** | `frontend/src/lib/kpis.test.ts` | Vitest | 94 |
| Frontend KPI self-check (legacy) | `frontend/src/lib/kpis.selftest.ts` | ad hoc — superseded by `kpis.test.ts` | — |

**Total: 244 automated tests** — 67 backend, 177 frontend.

## Running them locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
pytest tests/ -v
```

`requirements-dev.txt` pulls in pytest, pytest-asyncio, aiosqlite, httpx and pip-audit
on top of the runtime requirements. Tests run against in-memory SQLite via
`aiosqlite`, so no Postgres container is needed for the suite.

Frontend unit tests and static checks:

```bash
cd frontend
npm ci
npm test          # vitest run - 177 tests
npm run test:watch  # during development
npx tsc -b
npm run lint
```

## How CI enforces this

`.github/workflows/security.yml` runs on every push to `main`, `development` and
`sec`, on every pull request, and weekly on a schedule.

| Job | What it does | Fails the build on |
| --- | --- | --- |
| `secret-scan` | gitleaks over **full** history (`fetch-depth: 0`) | Any secret, including one removed in a later commit |
| `frontend-audit` | `npm ci`, `npm audit --audit-level=high`, `tsc -b`, `npm run lint`, `npm test` | High-severity advisory, type error, lint error, failing unit test |
| `backend-audit` | `pip-audit --strict` | Any known vulnerable dependency |
| `security-tests` | `pytest tests/ -v` | Any failing test |

Dependabot (`.github/dependabot.yml`) raises update PRs, which then run the same
workflow.

## Known gaps — stated, not hidden

**1. ~~No frontend test runner.~~ Closed.** Vitest is installed, `npm test` runs 177
tests covering every boundary in
[../02-test-cases/validation-test-cases.md](../02-test-cases/validation-test-cases.md)
and the KPI methodology, and the `frontend-audit` job now runs it on every push.
`kpis.selftest.ts` is superseded by `kpis.test.ts` and can be deleted once the team
is satisfied nothing else imports it.

**3. CI uses SQLite, not Postgres.** Fast, but it does not exercise Postgres JSON
column semantics or constraint error text. Anything Postgres-specific must be
verified locally against the `docker compose` database before merge.

**4. CI installs test dependencies inline.** The `security-tests` job runs
`pip install -r requirements.txt pytest aiosqlite httpx` rather than
`requirements-dev.txt`, so a new test dependency has to be added in two places or CI
breaks. Worth consolidating.

**5. No end-to-end browser test.** Every journey in
[../02-test-cases/functional-test-cases.md](../02-test-cases/functional-test-cases.md)
is currently executed by hand. Playwright covering FUN-01 alone would protect the
primary journey on every push.

## Two tests are deliberately marked `it.fails`

`kpis.test.ts` contains two `it.fails` cases. They encode the behaviour the team
believes is *correct* for defects **KPI-01** and **KPI-02**
([../02-test-cases/defect-log.md](../02-test-cases/defect-log.md)), and currently fail —
so Vitest records them as passing while the defect stands. Each is paired with a
"current behaviour, pinned" test asserting what the code does today.

When a defect is fixed, its `it.fails` case starts failing loudly. Remove the `.fails`
and delete the paired pinning test at that point. This keeps the suite green without
pretending the defects are not there.

## Recording a run

Paste the summary line and date into [../05-evidence/](../05-evidence/) whenever a
suite is run for the record — for example before a demo or a submission.
