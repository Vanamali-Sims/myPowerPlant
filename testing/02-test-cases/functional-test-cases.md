# Functional Test Cases

Scope: the end-to-end journeys a user actually performs. Validation edge cases live
in [validation-test-cases.md](validation-test-cases.md); security cases in
[security-test-cases.md](security-test-cases.md).

**Priority** follows the risk table in [../01-test-plan.md](../01-test-plan.md#4-risk-based-prioritisation).

---

### FUN-01 — First-run user completes setup and reaches the dashboard — **P1**

| | |
| --- | --- |
| **Rationale** | The primary journey. If this fails, nothing else about the product matters. |
| **Precondition** | No profile in browser storage (fresh profile / cleared site data) |
| **Steps** | 1. Open the app. 2. Choose *Get started*. 3. Complete all five steps with valid data. 4. Submit. |
| **Expected** | Each step advances without error; on submit a household identifier is issued, the profile is persisted, and the dashboard renders with KPI cards and the energy balance chart. |
| **Actual** | |
| **Status** | |

### FUN-02 — Returning user goes straight to the dashboard — **P1**

| | |
| --- | --- |
| **Rationale** | The home page branches on whether a profile exists. A returning user must not be sent back through setup. |
| **Precondition** | A profile has been created in this browser |
| **Steps** | 1. Reload the app. 2. Observe the home page. |
| **Expected** | The home page offers *View dashboard* rather than *Get started*; the dashboard shows the previously saved values. |
| **Actual** | |
| **Status** | |

### FUN-03 — Step gating blocks an incomplete step — **P1**

| | |
| --- | --- |
| **Rationale** | Confirms partially completed steps cannot leak into the calculation. |
| **Steps** | 1. Start setup. 2. Leave a required field blank. 3. Attempt to continue. |
| **Expected** | Navigation is blocked, an inline message names the specific field, and focus/scroll moves to the first field in error. |
| **Actual** | |
| **Status** | |

### FUN-04 — Back-navigation preserves entered answers — **P2**

| | |
| --- | --- |
| **Rationale** | Raised as a likely usability failure. Losing answers on *Back* is a common wizard defect and a known cause of abandonment. |
| **Steps** | 1. Complete steps 1–3. 2. Navigate back to step 1. 3. Navigate forward again. |
| **Expected** | Every previously entered answer is still present and unchanged on both steps. |
| **Actual** | |
| **Status** | |

### FUN-05 — Progress survives a page refresh mid-setup — **P2**

| | |
| --- | --- |
| **Rationale** | With no accounts, an accidental refresh must not destroy ten minutes of input. |
| **Steps** | 1. Complete steps 1–2. 2. Refresh the browser. |
| **Expected** | Setup resumes with prior answers intact (or the behaviour is documented and communicated to the user if by design it does not). |
| **Actual** | |
| **Status** | |

### FUN-06 — Editing a profile updates the dashboard — **P2**

| | |
| --- | --- |
| **Rationale** | Verifies `PUT /api/profile` round-trips and that the dashboard is not showing cached figures. |
| **Steps** | 1. From the dashboard, open the profile view. 2. Change monthly kWh. 3. Save. 4. Return to the dashboard. |
| **Expected** | The saved value persists after reload and the affected KPIs recalculate. |
| **Actual** | |
| **Status** | |

### FUN-07 — Household without solar or battery still gets a dashboard — **P1**

| | |
| --- | --- |
| **Rationale** | A likely audience for this product is a household *considering* solar. If the dashboard assumes a system exists, it excludes the exact user who most needs it. |
| **Steps** | 1. Complete setup with `hasSolar = no`. 2. Reach the dashboard. |
| **Expected** | The dashboard renders without errors, empty charts, or `NaN`; KPIs that need a solar system are absent or clearly labelled as not applicable. |
| **Actual** | |
| **Status** | |

### FUN-08 — KPI values match a hand-worked calculation — **P2**

| | |
| --- | --- |
| **Rationale** | The KPIs drive a real financial decision. "It rendered a number" is not evidence the number is right. |
| **Steps** | 1. Enter a profile whose expected KPIs have been calculated by hand beforehand. 2. Compare each displayed KPI to the worked figure. |
| **Expected** | Each KPI matches the hand calculation within the agreed rounding tolerance. |
| **Notes** | Record the worked example and its inputs in [../05-evidence/](../05-evidence/) so the check is reproducible. |
| **Actual** | |
| **Status** | |

### FUN-09 — Energy balance chart reflects the profile — **P2**

| | |
| --- | --- |
| **Rationale** | The chart is the main visual output; it must move when its inputs move. |
| **Steps** | 1. Note the chart for a baseline profile. 2. Materially increase monthly kWh. 3. Re-open the dashboard. |
| **Expected** | The chart changes in the expected direction; axes and legend stay readable. |
| **Actual** | |
| **Status** | |

### FUN-10 — Extreme-but-valid inputs do not break the dashboard — **P2**

| | |
| --- | --- |
| **Rationale** | Boundary values are accepted by validation but may still produce `Infinity`, `NaN`, or a broken layout downstream. |
| **Steps** | Complete setup using the maximum permitted value for every bounded field (bill 5000, kWh 5000, 80 panels at 500 W, 8 battery units). |
| **Expected** | All KPIs are finite, formatted, and readable; no layout overflow. |
| **Actual** | |
| **Status** | |

### FUN-11 — Backend unavailable is handled gracefully — **P2**

| | |
| --- | --- |
| **Rationale** | Tests the failure path rather than the happy path. A silent failure at submit loses the user's whole session. |
| **Steps** | 1. Stop the backend. 2. Complete setup and submit. |
| **Expected** | A clear, non-technical error message; entered data is not discarded; retry is possible once the backend returns. |
| **Actual** | |
| **Status** | |

### FUN-12 — Health endpoint responds — **P3**

| | |
| --- | --- |
| **Rationale** | Cheap smoke test used to confirm an environment is up before other testing begins. |
| **Steps** | `GET /api/health` |
| **Expected** | `200` with a healthy payload. |
| **Actual** | |
| **Status** | |
