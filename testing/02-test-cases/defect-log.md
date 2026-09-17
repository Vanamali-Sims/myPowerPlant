# Defect Log

Defects found by executing the test suites. Each entry names the test that catches it.

---

## KPI-01 — Refrigerator power rating overstates modelled consumption ~30×

| | |
| --- | --- |
| **Severity** | S2 — Major (a KPI is wrong; no workaround) |
| **Found by** | `frontend/src/lib/kpis.test.ts` → *KPI-01: a single refrigerator should use a realistic 5-20 kWh per week* |
| **Location** | `frontend/src/data/appliances.ts` — `refrigerator.powerKw` |
| **Status** | Open |

**Detail.** The refrigerator is given `powerKw: 1.92` — the identical figure to the air
conditioner on line 63 — and run for 168 h/week (continuously, correctly, since a fridge
never switches off). The model therefore produces:

    1.92 kW × 168 h = 322.56 kWh per fridge per week

A real domestic refrigerator uses roughly 1–2 kWh **per day**, i.e. 7–14 kWh/week. The
model is out by a factor of about 30. On the baseline two-fridge profile the fridges
alone contribute 645 kWh of a 687 kWh modelled week — 94% of total household
consumption, which is implausible on its face.

`1.92` looks like a rated input power rather than an average draw. A fridge cycles at
roughly a 15–25% duty cycle, giving an effective figure near 0.05 kW.

**Impact.** Only affects the *modelled* consumption path, used when a household has not
entered a monthly kWh figure — which is exactly the least-informed user, and the one
most dependent on the estimate. Any household reaching the dashboard without a bill
figure sees a wildly overstated consumption total, and every downstream KPI inherits it.

**Suggested fix.** Replace `powerKw` with a duty-cycle adjusted average draw, or keep the
rated power and set `typicalHoursPerWeek` to compressor run-hours rather than 168. The
first is clearer. Verify against the GEMS dataset the file cites.

---

## KPI-02 — Households with no solar are shown dollar savings and carbon avoided

| | |
| --- | --- |
| **Severity** | S2 — Major (misleading financial figure) |
| **Found by** | `frontend/src/lib/kpis.test.ts` → *KPI-02: a household with no solar should not be shown dollar savings* |
| **Location** | `frontend/src/lib/kpis.ts` (`buildKpiReport`) and `frontend/src/components/dashboard/DashboardView.tsx:62` |
| **Status** | Open |

**Detail.** When a household answers `hasSolar: 'no'`, `buildKpiReport` still models a
typical 6.6 kW array and carries those figures into `weekly.savingsAud` and
`weekly.carbonAvoidedKg`. Measured on a no-solar profile:

| Figure | Value returned |
| --- | --- |
| `generationKwh` | 131.95 kWh |
| `savingsAud` | $33.69 |
| `carbonAvoidedKg` | 51.70 kg |

The report does set `solarIsPotential: true`, but `DashboardView.tsx:62` renders
`weekly.savingsAud` as a dollar KPI without consulting that flag. A household that has
just told the product it has no panels is shown $33.69/week of savings it is not making,
and 51.7 kg of carbon it is not avoiding.

**Impact.** This is the product's stated audience — a household *considering* solar — so
it is not an edge case. Presenting a hypothetical as an achieved figure could reasonably
be read as misleading, which matters more than the arithmetic being wrong.

**Suggested fix.** Either zero the savings and carbon figures when `solarIsPotential` is
true, or — better, since the potential figure is genuinely useful — relabel the KPI cards
in the potential case: "You could save ~$34/week" rather than "You saved $34". The
decision belongs with the team; the test currently pins the existing behaviour so the
change is deliberate rather than accidental.

---

## VAL-14 — Battery unit minimum differs between client and server

| | |
| --- | --- |
| **Severity** | S3 — Moderate |
| **Found by** | `frontend/src/lib/validateProfile.test.ts` and `backend/tests/test_input_validation.py` |
| **Location** | `frontend/src/lib/validateProfile.ts` vs `backend/app/models.py:165` |
| **Status** | Open — needs a decision, not necessarily a fix |

**Detail.** The browser rejects `batteryUnits < 1`; the API schema allows `ge=0`.
`0` is therefore rejected in the UI and accepted by the API. Confirmed in both suites:
the backend test rejects `-1` and `9` but has no case for `0`.

**Impact.** Low in practice — the UI is the only caller. It matters as a policy question:
should a household with no battery record 0 units, or is "no battery" expressed some
other way? Whichever answer is right, the two layers should agree.

**Suggested fix.** Decide the intended minimum, align both, and add a backend test case
for `0` that asserts the decision.
