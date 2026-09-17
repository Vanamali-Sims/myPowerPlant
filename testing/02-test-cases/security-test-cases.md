# Security Test Cases

**Why this suite exists.** MyPowerPlant has no accounts. The server-generated
household identifier held by the browser *is* the entire access control mechanism.
That single design decision means the identifier's unguessability and the server's
refusal to serve a profile to the wrong holder are the highest-impact things in the
build — so they get a standing automated regression suite rather than a one-off check.

Most of these are automated in `backend/tests/`. The table records the intent and
rationale; the code records the assertions.

## Access control

| ID | Test | Expected | Rationale | Automated in | Status |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | Create two profiles; compare identifiers | Both UUIDv4, differing across most of their 128 bits | If identifiers were sequential, holding one would let you enumerate every household | `test_access_control.py` | |
| SEC-02 | Alter one character of a valid identifier and `GET` | `404` | The mandated check that a modified identifier yields nothing | `test_access_control.py` | |
| SEC-03 | `POST` a client-chosen `household_id` | `422` | Identifiers must be server-generated, never derived from user input | `test_access_control.py` | |
| SEC-04 | `PUT` another household's profile using its identifier only | Behaviour defined and tested | Establishes exactly what possessing an identifier permits | `test_access_control.py` | |
| SEC-05 | URL-encoded path traversal in the identifier | `404`, never a redirect | `redirect_slashes=False` keeps the "no such record" response uniform; a `307` would distinguish real from fake identifiers | `test_access_control.py` | |

## Input handling

| ID | Test | Expected | Rationale | Automated in | Status |
| --- | --- | --- | --- | --- | --- |
| SEC-06 | Control characters / null bytes in any string field | `422` | Guarded across all string fields by a wildcard validator | `test_input_validation.py` | |
| SEC-07 | Values outside every numeric bound | `422` | Reject, do not repair — a silently clamped value corrupts the KPI | `test_input_validation.py` | |
| SEC-08 | Off-allow-list battery model / provider | `422` | Prevents unbounded free text reaching storage | `test_input_validation.py` | |
| SEC-09 | Over-long strings past `max_length` | `422` | Bounds storage and blocks oversized payloads | `test_input_validation.py` | |
| SEC-10 | Script-like payload in a text field (e.g. `<script>`) | Rejected or stored inert and rendered as text | React escapes by default; the test guards against a future `dangerouslySetInnerHTML` | | |

## Transport and platform

| ID | Test | Expected | Rationale | Automated in | Status |
| --- | --- | --- | --- | --- | --- |
| SEC-11 | Security response headers present | Headers set by `SecurityHeadersMiddleware` | Defence in depth for a browser-delivered app | `test_headers_and_limits.py` | |
| SEC-12 | Exceed the per-IP rate limit | `429` | Limits brute-force identifier guessing and casual scraping | `test_headers_and_limits.py` | |
| SEC-13 | Cross-origin request from a disallowed origin | Blocked by CORS | Allow-list is `CORS_ORIGINS`; credentials are off since no cookies are used | | |
| SEC-14 | Secret scan across full commit history | No findings | A secret removed in a later commit is still leaked — hence `fetch-depth: 0` | `.github/workflows/security.yml` (gitleaks) | |
| SEC-15 | Dependency audit, both stacks | No high-severity advisories | Guards the compromised-dependency risk | `.github/workflows/security.yml` (`npm audit`, `pip-audit`) | |

## Running these

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v
```

CI runs the same suite on every push to `main`, `development` and `sec`, on every
pull request, and weekly on a schedule so a newly disclosed advisory in an unchanged
dependency is still caught.
