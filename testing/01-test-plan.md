# Test Plan — MyPowerPlant

## 1. Purpose and scope

MyPowerPlant collects a household energy profile through a five-step setup wizard
(household, usage, solar, battery, energy provider) and returns a dashboard of
energy KPIs and a battery/solar energy balance. There are **no user accounts**: a
household is addressed by a server-generated identifier held by the browser.

That last point drives most of our testing decisions. With no login, three things
carry disproportionate risk and therefore get disproportionate test effort:

1. **Identifier handling** — the household identifier *is* the access control.
2. **Input validation** — the profile is user-typed free text feeding a calculation.
3. **The setup wizard's usability** — a user who abandons the wizard never reaches
   the product at all.

### In scope

- Profile creation, retrieval and update (`POST`/`GET`/`PUT /api/profile`)
- Client-side and server-side validation of every profile field
- KPI and energy-balance calculations
- Setup wizard navigation, step gating, and error recovery
- Access control, rate limiting, and security response headers
- Usability of the end-to-end first-run journey

### Out of scope, and why

| Excluded | Reason |
| --- | --- |
| Authentication / authorisation roles | The product has no accounts by design |
| AWS deployment (Lambda, Aurora, Amplify) | Not part of the assessed build; local + CI only |
| Load and performance testing | No stated non-functional performance requirement |
| Cross-browser matrix beyond current Chrome/Firefox/Safari | Target users are on evergreen browsers |

## 2. Test levels

| Level | What it covers | Where it lives | Who runs it |
| --- | --- | --- | --- |
| **Unit** | Pure functions: validation rules, KPI maths, formatters | `frontend/src/lib/`, `backend/tests/` | Automated, every push |
| **Integration** | API routes against a real DB session — request in, row out | `backend/tests/` | Automated, every push |
| **System** | Full journey through the browser against a running API | Manual, per [02-test-cases](02-test-cases/) | Team, per iteration |
| **Security** | Access control, input rejection, headers, rate limits | `backend/tests/` | Automated, every push |
| **Usability (UAT)** | Real participants completing task scenarios unaided | [03-usability](03-usability/) | Team-facilitated sessions |

## 3. Test design techniques

We did not write test cases by walking the UI and guessing. Each case comes from a
named technique, recorded so a reader can see the reasoning:

- **Equivalence partitioning** — inputs are grouped into classes that should behave
  identically, and one representative is tested from each. A Victorian postcode is
  valid; a non-Victorian one is not; a non-numeric string is not. Three classes,
  three cases — not thirty arbitrary postcodes.
- **Boundary value analysis** — most defects sit at the edges of a range, so every
  bounded numeric field is tested at `min-1`, `min`, `max`, `max+1`. Panel count is
  bounded 1–80, so we test 0, 1, 80, 81.
- **Negative / destructive testing** — we deliberately submit what the UI would never
  send: a client-chosen identifier, an altered identifier, an oversized payload.
  The browser rules are a usability feature, **not** a control, so the server is
  tested independently of the client.
- **Conditional / path coverage** — fields that only appear when another answer is
  given (dryer frequency appears only when `dryer = yes`; panel details only when
  `hasSolar = yes`) are tested down both branches.
- **Exploratory testing** — timeboxed, unscripted sessions to find what the scripted
  cases assume away. Findings that recur get promoted into a written case.

## 4. Risk-based prioritisation

Effort is allocated by (likelihood × impact), not evenly:

| Risk | Impact | Priority | Mitigating tests |
| --- | --- | --- | --- |
| One household's data reachable by altering an identifier | Severe — privacy breach | **P1** | `test_access_control.py`; SEC-01…SEC-04 |
| Identifiers guessable or sequential | Severe | **P1** | `test_access_control.py` |
| Invalid input accepted server-side and corrupting KPIs | High | **P1** | `test_input_validation.py`; VAL-01…VAL-14 |
| User abandons the 5-step wizard | High — product unusable | **P1** | Usability scenarios US-1, US-2 |
| KPI figures wrong or misleading | High — user makes a bad purchase decision | **P2** | `kpis.selftest.ts`; FUN-08…FUN-11 |
| Wizard loses entered data on back-navigation | Medium | **P2** | FUN-04, FUN-05 |
| Missing security headers / no rate limit | Medium | **P2** | `test_headers_and_limits.py` |
| Cosmetic layout defects | Low | **P3** | Exploratory |

## 5. Environments

| Environment | Frontend | Backend | Database |
| --- | --- | --- | --- |
| Local dev | `npm run dev` (`localhost:5173`) | `uvicorn app.main:app --reload` (`localhost:8000`) | Postgres 16 via `docker compose` |
| CI | `npx tsc -b`, `npm run lint` | `pytest tests/` | SQLite (`aiosqlite`) in-memory |
| Usability sessions | Participant's own device where possible, otherwise a facilitator laptop | Local backend | Local Postgres, reset between participants |

CI uses SQLite rather than Postgres for speed. This is a **known limitation**: it
does not exercise Postgres-specific behaviour (JSON column semantics, constraint
error text). Anything Postgres-specific must be verified locally before merge.

## 6. Entry and exit criteria

**Entry** — testing of an iteration begins when the feature is merged to the
iteration branch, the app builds cleanly, and its user stories have agreed
acceptance criteria.

**Exit** — an iteration is testable-complete when:

- All P1 test cases have been executed and pass.
- No open Severity-1 or Severity-2 defect remains.
- The `security` CI workflow is green (gitleaks, `npm audit`, `pip-audit`, `tsc`, lint, pytest).
- Every usability finding rated Major or above has an owner and a decision recorded
  in [03-usability/findings-and-actions.md](03-usability/findings-and-actions.md).

## 7. Defect severity

| Severity | Definition | Example |
| --- | --- | --- |
| **S1 — Critical** | Data exposure, data loss, or the app cannot be used | One household can read another's profile |
| **S2 — Major** | A core journey fails, or a KPI is wrong; no workaround | Setup cannot be completed with a valid profile |
| **S3 — Moderate** | A journey works but is impeded; workaround exists | Back-navigation clears a previously answered field |
| **S4 — Minor** | Cosmetic or wording | Misaligned label; unclear helper text |

## 8. Roles

| Role | Responsibility |
| --- | --- |
| Test lead | Owns this plan, prioritises cases, reports status |
| Developers | Write and maintain unit/integration tests; fix defects |
| Usability facilitator | Runs sessions, reads the script, does **not** coach the participant |
| Note-taker | Records observations and quotes; never interrupts the session |

> Fill in team member names against each role before submission.
