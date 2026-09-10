# Validation Test Cases

**Technique:** equivalence partitioning + boundary value analysis.
**Rationale for this suite:** the profile is free-typed input that feeds an energy
calculation and is persisted. Browser validation
(`frontend/src/lib/validateProfile.ts`) is a **usability feature, not a control** —
the authoritative rules are the Pydantic validators in `backend/app/models.py`.
Each field is therefore tested on **both** sides, and the two are compared.

Bounds below are taken from the code, not assumed.

| Field | Rule | Client source | Server source |
| --- | --- | --- | --- |
| Postcode | `^[38]\d{3}$` (Victoria only) | `validateProfile.ts` | `models.py:_postcode` |
| Monthly bill | 1 – 5000, required | `validateProfile.ts` | `models.py:_bill` |
| Monthly kWh | 1 – 5000, required | `validateProfile.ts` | `models.py:_kwh` |
| Dryer cycles | 0 – 7 | required when `dryer = yes` | `models.py:_dryer_cycles` |
| Panel count | 1 – 80 | `validateProfile.ts` | `models.py:_panel_count` |
| Panel watts | 50 – 500 | `validateProfile.ts` | `models.py:_panel_watts` |
| Battery units | client 1 – 8 / server 0 – 8 | `validateProfile.ts` | `models.py` `ge=0, le=8` |
| Reserve percent | 0 – 80 | `validateProfile.ts` | `models.py:_reserve` |
| Battery age | 0 – 40 years | `validateProfile.ts` | `models.py:_battery_age` |
| Battery model | allow-list, or `Not sure` | `validateProfile.ts` | `models.py:_battery_model` |
| Provider | allow-list, or `Not sure` / `Other` | `validateProfile.ts` | `models.py:_provider` |

## Postcode — equivalence classes

| ID | Class | Input | Expected | Rationale | Actual | Status |
| --- | --- | --- | --- | --- | --- | --- |
| VAL-01 | Valid (3xxx) | `3000` | Accepted, advance to next step | Representative of the valid Victorian class | | |
| VAL-02 | Valid (8xxx) | `8007` | Accepted | `8xxx` is also Victorian — a second class the regex must allow | | |
| VAL-03 | Invalid state | `2000` | Rejected: "valid Victorian postcode" | NSW postcode — the product is Victoria-only | | |
| VAL-04 | Wrong length | `300` | Rejected | Boundary on length | | |
| VAL-05 | Non-numeric | `abcd` | Rejected | Type-confusion class | | |
| VAL-06 | Empty | `` (blank) | Rejected: required | Required-field class | | |

## Bounded numerics — boundary value analysis

Test each at `min-1`, `min`, `max`, `max+1`. Only the boundaries are listed; mid-range
values are covered by the happy-path cases in `functional-test-cases.md`.

| ID | Field | min-1 → expect | min → expect | max → expect | max+1 → expect | Actual | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VAL-07 | Monthly bill | `0` reject | `1` accept | `5000` accept | `5001` reject | | |
| VAL-08 | Monthly kWh | `0` reject | `1` accept | `5000` accept | `5001` reject | | |
| VAL-09 | Panel count | `0` reject | `1` accept | `80` accept | `81` reject | | |
| VAL-10 | Panel watts | `49` reject | `50` accept | `500` accept | `501` reject | | |
| VAL-11 | Reserve % | `-1` reject | `0` accept | `80` accept | `81` reject | | |
| VAL-12 | Battery age | `-1` reject | `0` accept | `40` accept | `41` reject | | |
| VAL-13 | Dryer cycles | `-1` reject | `0` accept | `7` accept | `8` reject | | |
| VAL-14 | Battery units | `0` see note | `1` accept | `8` accept | `9` reject | | |

> **VAL-14 note — client/server rule mismatch.** `validateProfile.ts` rejects
> `batteryUnits < 1`, but the server schema allows `ge=0`. Zero units is therefore
> rejected in the browser and accepted by the API. Confirm which is intended and
> align the two; record the outcome as a defect if the divergence is unintentional.

## Allow-list fields

| ID | Field | Input | Expected | Rationale | Actual | Status |
| --- | --- | --- | --- | --- | --- | --- |
| VAL-15 | Battery model | `Tesla Powerwall 2` | Accepted | Member of the allow-list | | |
| VAL-16 | Battery model | `Not sure` | Accepted | Explicit escape hatch — a user may not know their model | | |
| VAL-17 | Battery model | `Acme SuperCell` | Rejected, with guidance to pick "Not sure" | Off-list value must not be stored as free text | | |
| VAL-18 | Provider | `AGL Energy` | Accepted | Member of the allow-list | | |
| VAL-19 | Provider | `Other` | Accepted | Provider list is not exhaustive; `Other` is permitted | | |
| VAL-20 | Provider | `Totally Fake Energy` | Rejected | Off-list value | | |

## Conditional fields — both branches

| ID | Precondition | Action | Expected | Rationale | Actual | Status |
| --- | --- | --- | --- | --- | --- | --- |
| VAL-21 | `dryer = no` | Advance from household step | Dryer frequency fields hidden and not required | The "no" branch must not block on invisible fields | | |
| VAL-22 | `dryer = yes` | Leave frequency blank, advance | Rejected: weekday and weekend use required | The "yes" branch adds two required fields | | |
| VAL-23 | `hasSolar = no` | Advance from solar step | Panel count/watts/direction hidden and not required | Households without solar must still complete setup | | |
| VAL-24 | `hasSolar = yes` | Leave panel fields blank, advance | Rejected: direction, count and watts required | Conditional-required path | | |

## Server-side rejection (client bypassed)

Send these directly to the API with `curl` or the `/docs` page, **not** through the UI.
The point is to prove the server does not trust the browser.

| ID | Request | Expected | Rationale | Actual | Status |
| --- | --- | --- | --- | --- | --- |
| VAL-25 | `POST /api/profile` with `postcode: "2000"` | `422`, profile not created | Server enforces the rule independently of the client | | |
| VAL-26 | `POST /api/profile` with a null byte / control character in any string | `422` | `_no_control_characters` guards every string field | | |
| VAL-27 | `POST /api/profile` with `provider` off the allow-list | `422` | Allow-list is enforced server-side | | |
| VAL-28 | `POST /api/profile` with an unknown key in `field_sources` | `422` | Only the known `PROFILE_FIELD_KEYS` are accepted | | |

**Automation status:** VAL-25 to VAL-28 are covered by
`backend/tests/test_input_validation.py`. The client-side rows are currently manual —
see [../04-automated/README.md](../04-automated/README.md) for the gap and the
recommendation to add Vitest.
