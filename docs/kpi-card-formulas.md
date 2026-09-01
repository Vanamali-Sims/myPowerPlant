# KPI card formulas

Dashboard KPI cards are modelled in `frontend/src/lib/kpis.ts` (`buildKpiReport`). Lookup rates, appliance ratings, and VPP plans come from `GET /api/methodology` (Postgres, seeded by Alembic `003`). Nothing is a live meter reading.

The dashboard shows **two cards**. Other quantities below are intermediate values used to compute those cards (or shown in the transparency section).

---

## Cards on the dashboard

| Card | Display value | Source field | Badge kind | Timeframe scaling |
| --- | --- | --- | --- | --- |
| Estimated energy consumption | `formatKwh(scaleKwh(weekly.consumptionKwh, timeframe))` | `report.weekly.consumptionKwh` | `from_you` if billed monthly kWh was entered by the user; otherwise `estimate` | Daily = weekly ÷ 7; weekly = as modelled; monthly = weekly × 4 |
| Estimated savings | `formatAud(scaleAud(weekly.savingsAud, timeframe))` | `report.weekly.savingsAud` | Always `estimate` | Same as consumption |

Display rounding:

| Formatter | Rule |
| --- | --- |
| `formatKwh` | ≥ 100 → whole kWh; ≥ 10 → 1 decimal; else 2 decimals |
| `formatAud` | \|value\| ≥ $10 → whole dollars; else 2 decimals |

Constants: `DAYS_PER_WEEK = 7`, `WEEKS_PER_MONTH = 4` (`frontend/src/constants/kpiMethodology.ts`).

---

## Consumption card

| Step | Formula | When used | Notes |
| --- | --- | --- | --- |
| Billed weekly kWh | `monthlyKwh / 4` | Profile `monthlyKwh` parses to a number > 0 | Preferred path. Kind is `from_you` if that field was user-entered. |
| Modelled weekly kWh | `Σ (units × powerKw × hoursPerWeek)` | No billed monthly kWh | Sum of appliance lines. Kind is always `estimate`. |
| Card value | `scaleKwh(consumptionWeekly, timeframe)` | Always | Daily ÷ 7 or monthly × 4. |

`parseCount` strips a trailing `+` (e.g. `"6+"` → 6) and returns 0 if the value is empty.

---

## Appliance model (`E = N × P × H`)

Used only when billed monthly kWh is missing. Each line is `weeklyKwh = units × spec.powerKw × hoursPerWeek`.

| Appliance | Units (N) | Hours / week (H) | Included when |
| --- | --- | --- | --- |
| TV | 1 | Typical (21) | Always |
| Computer monitor | 1 | `wfhMonitorHours` (40), not the typical 35 | `wfh === 'yes'` |
| Refrigerator | `max(refrigerators, 1)` — 0 fridges still counts as 1 | Typical (168) | Always |
| Dishwasher | 1 | Typical (4) | People ≥ `dishwasherMinPeople` (3) |
| Clothes washer | 1 | `max(washerMinHours, people)` = `max(2, people)` | Always |
| Clothes dryer | 1 | `max(dryerWeek + dryerWeekend, 1)` | `dryer === 'yes'` |
| Air conditioner | 1 | `min(airconMaxHours, airconBaseHours + rooms × airconHoursPerRoom)` = `min(28, 8 + rooms × 1.5)` | `cooling === 'air_conditioning'` |
| Evaporative cooler | 1 | `evaporativeHours` (12) | `cooling === 'evaporative'` |
| Electric heater | 1 | `min(heaterMaxHours, heaterBaseHours + rooms)` = `min(24, 6 + rooms)` | `heating === 'electric'` |
| Electric water heater | 1 | `waterHeaterHours` (8) | `hotWater === 'yes'` **and** `gas !== 'yes'` (gas HW is excluded) |

People and rooms are `max(parseCount(…), 1)`. Fridges are `max(parseCount(…), 0)`.

Seeded typical ratings (`powerKw` / typical hours):

| id | Name | kW | Typical h/week |
| --- | --- | --- | --- |
| `tv` | TV | 0.117 | 21 |
| `monitor` | Computer monitor | 0.025 | 35 |
| `refrigerator` | Refrigerator | 1.92 | 168 |
| `dishwasher` | Dishwasher | 0.213 | 4 |
| `washer` | Clothes washer | 0.551 | 3 |
| `dryer` | Clothes dryer | 0.884 | 3 |
| `aircon` | Air conditioner | 1.92 | 14 |
| `evaporative` | Evaporative cooler | 0.7 | 12 |
| `heater` | Electric heater | 2.1 | 10 |
| `waterHeater` | Electric water heater | 3.6 | 8 |

---

## Savings card (full chain)

Savings are **not** billed dollars. They are modelled as avoided retail cost of self-consumed solar, plus a VPP export credit on leftover generation.

| Step | Symbol | Formula |
| --- | --- | --- |
| 1. Weekly consumption | `C` | See consumption card |
| 2. Weekly generation | `G` | See solar generation |
| 3. Daytime consumption share | `daytimeShare` | `shares.morning + shares.afternoon` |
| 4. Self-consumed (daytime) | `selfConsumedRaw` | `min(G, C × daytimeShare)` |
| 5. Leftover export | `leftoverExport` | `max(0, G − selfConsumedRaw)` |
| 6. Usable battery | `usableBattery` | See battery |
| 7. Evening shift | `shifted` | `min(usableBattery, leftoverExport × batteryShiftFactor, C × shares.evening)` |
| 8. Self-consumed (final) | `S` | `selfConsumedRaw + shifted` |
| 9. Energy distributed | `D` | `max(0, G − S)` |
| 10. Retail rate | `R` | See retail rate |
| 11. Plan weekly savings | — | `S × R + D × plan.exportRate` for each compatible VPP plan |
| 12. Headline savings | `savingsAud` | Highest savings among plans that are **not** the current provider; if none, the top plan overall |

`surplusKwh = max(0, G − C)` is computed but **not shown** on the cards.

Carbon avoided `D × vicGridKgCo2PerKwh` is computed and listed as an assumption, but **hidden** from the transparency list (`HIDDEN_ASSUMPTIONS = {'Carbon avoided'}`).

---

## Solar generation

| Case | System size (kW) | Daily kWh | Weekly kWh |
| --- | --- | --- | --- |
| Has solar (`hasSolar === 'yes'`) | `(panelCount × panelWatts) / 1000` | `kW × melbournePeakSunHours × solarPerformanceRatio × orientation` | daily × 7 |
| No solar (potential) | `typicalPotentialKw` (6.6) | Same formula | daily × 7 |
| Zero size | `kW ≤ 0` | — | 0 |

Orientation factor from `solar_orientation_factors` (falls back to `not_sure` then 1):

| Direction | Factor |
| --- | --- |
| N | 1.00 |
| NE, NW | 0.95 |
| E, W, not_sure | 0.85 |
| SE, SW | 0.70 |
| S | 0.55 |

Seeded solar scalars: peak sun hours **4.2**, performance ratio **0.8**.

---

## Time-of-day shares

Peak period defaults to **evening** if unset.

| Period | Consumption share | Solar generation share | Hours (hint) |
| --- | --- | --- | --- |
| Morning | 0.2, or **0.4 if this is the peak** | 0.28 | 6am – 12pm |
| Afternoon | 0.2, or **0.4 if this is the peak** | 0.55 | 12pm – 6pm |
| Evening | 0.2, or **0.4 if this is the peak** | 0.15 | 6pm – 10pm |
| Night | 0.2, or **0.4 if this is the peak** | 0.02 | 10pm – 6am |

Base share = 0.2, peak share = 0.4. With default evening peak: morning 0.2 + afternoon 0.2 → `daytimeShare = 0.4`. Period balances (`consumptionWeekly × share`, `generationWeekly × solarShare`) are built for the transparency UI, not the two cards.

---

## Battery usable energy

| Step | Formula |
| --- | --- |
| Units | `max(batteryUnits, 0)` — 0 units → usable = 0 |
| Capacity | Matched `batteryModels[name].usableKwh`, else default model (`isDefault`), else **10 kWh** |
| Reserve | `clamp(parseCount(reservePercent), 0, 80) / 100` |
| Usable | `units × capacity × (1 − reserve)` |

Then only **half** of leftover export can be shifted (`batteryShiftFactor = 0.5`), and never more than evening consumption.

Seeded usable capacities:

| Model | Usable kWh | Default? |
| --- | --- | --- |
| Tesla Powerwall 2 | 13.5 | no |
| Sungrow SBR HV | 12.8 | no |
| BYD Battery-Box Premium LVL | 13.8 | no |
| AlphaESS SMILE5 | 10.1 | no |
| Goodwe Lynx Home F | 10.24 | no |
| SonnenBatterie | 10 | **yes** |

---

## Retail rate

| Path | Formula | Kind |
| --- | --- | --- |
| Bill + usage present | `monthlyBill / monthlyKwh` | `from_you` if either field was user-entered; else `estimate` |
| Otherwise | `defaultRetailRate` (0.32 $/kWh) | `estimate` |

---

## VPP plan matching and recommended savings

Compatible plans: those listing `profile.batteryModel`. If none match (or no model), **all** plans are used.

Plans are sorted by `weeklySavings` descending. The **recommended** plan is the first that is not the current `provider` brand; otherwise the highest-saving plan. Card savings use that recommended plan’s `weeklySavings`.

`signupBonus` and `lockInMonths` are stored but **not** used in the savings formula.

| Plan | Brand | Export rate ($/kWh) |
| --- | --- | --- |
| AGL Virtual Power Plant | AGL Energy | 0.15 |
| Origin Loop VPP | Origin Energy | 0.12 |
| EnergyAustralia PowerResponse | EnergyAustralia | 0.10 |
| Simply VPP | Simply Energy | 0.18 |
| Red Energy VPP | Red Energy | 0.11 |

Standard feed-in without a VPP (`defaultFeedInRate` = 0.05) is mentioned in transparency copy only; it is **not** in the savings equation.

---

## Methodology scalars (seeded)

| Scalar | Seeded value | Role |
| --- | --- | --- |
| `melbournePeakSunHours` | 4.2 | Daily solar yield |
| `solarPerformanceRatio` | 0.8 | Inverter / system losses |
| `typicalPotentialKw` | 6.6 | Hypothetical array if no solar |
| `vicGridKgCo2PerKwh` | 0.77 | Carbon avoided (computed, hidden) |
| `defaultRetailRate` | 0.32 | Fallback $/kWh |
| `defaultFeedInRate` | 0.05 | Transparency only |
| `batteryShiftFactor` | 0.5 | Fraction of leftover export that can be stored |
| `consumptionShareBase` | 0.2 | Off-peak period weight |
| `consumptionSharePeak` | 0.4 | Peak period weight |
| `dishwasherMinPeople` | 3 | Dishwasher inclusion |
| `wfhMonitorHours` | 40 | WFH monitor hours |
| `washerMinHours` | 2 | Minimum washer hours |
| `airconBaseHours` | 8 | AC hours intercept |
| `airconHoursPerRoom` | 1.5 | AC hours per room |
| `airconMaxHours` | 28 | AC hours cap |
| `evaporativeHours` | 12 | Evaporative hours |
| `heaterBaseHours` | 6 | Heater hours intercept |
| `heaterMaxHours` | 24 | Heater hours cap |
| `waterHeaterHours` | 8 | Electric HW hours |

---

## Code map

| Piece | File |
| --- | --- |
| Engine (`buildKpiReport`, scaling, formatters) | `frontend/src/lib/kpis.ts` |
| Card rendering and timeframe toggle | `frontend/src/components/dashboard/DashboardView.tsx` |
| Days / weeks constants | `frontend/src/constants/kpiMethodology.ts` |
| Hidden carbon row, kind labels | `frontend/src/constants/dashboard.ts` |
| API client + types | `frontend/src/lib/methodologyApi.ts` |
| Self-test seed (mirrors Alembic) | `frontend/src/lib/methodologyFixture.ts` |
| `GET /api/methodology` | `backend/app/routes/methodology.py` |
| Seeded tables and values | `backend/alembic/versions/003_create_methodology_tables.py` |
