# KPI card formulas

Dashboard KPI cards are modelled in `frontend/src/lib/kpis.ts` (`buildKpiReport`). Lookup rates, appliance ratings, and VPP plans come from `GET /api/methodology` (Postgres, seeded by Alembic `003` and `004`). Nothing is a live meter reading.

Every quantity the model produces is shown on the page: six KPI cards, two charts, a VPP plan comparison, and the transparency section.

---

## Cards on the dashboard

All six scale the same way — daily = weekly ÷ 7, weekly = as modelled, monthly = weekly × 4.

| Card | Source field | Badge kind |
| --- | --- | --- |
| Estimated energy consumption | `weekly.consumptionKwh` | `from_you` if billed monthly kWh was user-entered; otherwise `estimate` |
| Estimated savings | `weekly.savingsAud` | Always `estimate` |
| Solar generation / Solar potential | `weekly.generationKwh` | `estimate` |
| Solar you use at home | `weekly.selfConsumedKwh` | `estimate` |
| Sent out to the grid | `weekly.energyDistributedKwh` | `estimate` |
| Carbon avoided | `weekly.carbonAvoidedKg` | `estimate` |

`weekly.surplusKwh` and the retail rate appear under the day-part chart rather than as cards.

Display rounding:

| Formatter | Rule |
| --- | --- |
| `formatKwh` | ≥ 100 → whole kWh; ≥ 10 → 1 decimal; else 2 decimals |
| `formatAud` | \|value\| ≥ $10 → whole dollars; else 2 decimals |
| `formatKg` | ≥ 10 → whole kg; else 1 decimal |

`scaleWeekly` is the single scaling primitive; `scaleKwh` and `scaleAud` are named aliases so money and energy stay in lockstep. Constants: `DAYS_PER_WEEK = 7`, `WEEKS_PER_MONTH = 4` (`frontend/src/constants/kpiMethodology.ts`).

---

## Charts

| Chart | Input | What it does |
| --- | --- | --- |
| `TypicalDayChart` | `buildTypicalDay(report.periods)` | 24 hourly points of load against solar, with the leftover window shaded |
| `EnergyBalanceChart` | `report.periods` | Day-part bars of use against solar |

`buildTypicalDay` only reshapes energy — the hourly totals add back to the modelled week ÷ 7. Load is spread evenly across each day-part's hours. Solar is reshaped onto a half-sine daylight curve (6am–8pm, crest at 1pm) instead of the period shares, because an even spread would draw generation at 2am. The night period's 0.02 solar share therefore affects the day-part bars but not the hourly line.

---

## Consumption card

| Step | Formula | When used | Notes |
| --- | --- | --- | --- |
| Billed weekly kWh | `monthlyKwh / 4` | Profile `monthlyKwh` parses to a number > 0 | Preferred path. Kind is `from_you` if that field was user-entered. |
| Modelled weekly kWh | `Σ (units × powerKw × hoursPerWeek)` | No billed monthly kWh | Sum of appliance lines. Kind is always `estimate`. |
| Card value | `scaleKwh(consumptionWeekly, timeframe)` | Always | Daily ÷ 7 or monthly × 4. |

`parseCount` strips a trailing `+` (e.g. `"6+"` → 6) and returns 0 if the value is empty.

---

## Appliance model (`E = N × P × H × season`)

Used only when billed monthly kWh is missing. Each line is `weeklyKwh = units × spec.powerKw × hoursPerWeek`, where `hoursPerWeek` is the seeded reference figure after any household override and the seasonal factor.

Weekly hours come from `context/Appliance_Usage_Reference.docx` and live on the appliance row alongside the metric and source that produced them, so the transparency table can cite them. Rows the reference does not cover keep their previous hours and say so.

| Appliance | Units (N) | Hours / week (H) | Included when |
| --- | --- | --- | --- |
| TV | 1 | 17.15 | Always |
| Computer monitor | 1 | 44.1 | `wfh === 'yes'` |
| Refrigerator | `max(refrigerators, 1)` — 0 fridges still counts as 1 | 168 | Always |
| Dishwasher | 1 | 12.375 | People ≥ `dishwasherMinPeople` (3) |
| Clothes washer | 1 | 4.0785 | Always |
| Clothes dryer | 1 | `cycles × 0.90167` when saved, else `0.747 × people` | `dryer === 'yes'` |
| Air conditioner | 1 | 42 × season | `cooling === 'air_conditioning'` |
| Evaporative cooler | 1 | 12 × season | `cooling === 'evaporative'` |
| Electric heater | 1 | 30.8 × season | `heating === 'electric'` |
| Electric water heater | 1 | 8 | `hotWater === 'yes'` **and** `gas !== 'yes'` (gas HW is excluded) |

`cycles` is `dryerWeek + dryerWeekend`. People are `max(parseCount(…), 1)`; fridges are `max(parseCount(…), 0)`. Room count no longer affects any appliance.

Seeded ratings and their sources:

| id | Name | kW | h/week | Basis | Reported metric | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `tv` | TV | 0.117 | 17.15 | daily average | 2 hr 27 min/day | Nielsen — Screen time still an Australian pastime |
| `monitor` | Computer monitor | 0.025 | 44.1 | daily average | 6.3 hr/day | Life Calculators — Screen Time Calculator |
| `refrigerator` | Refrigerator | 0.057 | 168 | always on | ~500 kWh/year | Energy Rating — typical 400–500 L fridge-freezer |
| `dishwasher` | Dishwasher | 0.213 | 12.375 | per cycle | 2.25 hr × 5.5 cycles/wk | KitchenAid / RACV |
| `washer` | Clothes washer | 0.551 | 4.0785 | per cycle | 58 min × 220 loads/yr | Sustainability Victoria |
| `dryer` | Clothes dryer | 0.884 | 0.747 **per person** | per person | 54.1 min × 108 uses/yr ÷ 2.5 people | Sustainability Victoria |
| `aircon` | Air conditioner | 1.0 | 42 | daily average | 6 hr/day | Finder — Air conditioner running costs |
| `evaporative` | Evaporative cooler | 0.7 | 12 | daily average | — | MyPowerPlant baseline |
| `heater` | Reverse-cycle heater | 1.2 | 30.8 | daily average | 4.4 hr/day | Finder — heater use in winter |
| `waterHeater` | Electric water heater | 3.6 | 8 | daily average | — | MyPowerPlant baseline |

### `power_kw` is an average, not a nameplate

Alembic `004` redefined `power_kw` as the **average draw while the appliance is in use**, and `power_basis` on each row records how that was reached. Motors, compressors, and elements cycle, so a nameplate figure held across every hour of use overstates them badly:

| Appliance | Was | Now | Why |
| --- | --- | --- | --- |
| Refrigerator | 1.92 | 0.057 | 1.92 kW was a compressor nameplate and gave 322 kWh/week for one fridge, about 30× reality and ~70% of the whole modelled total. 500 kWh/year ÷ 8760 h is what the energy label implies. |
| Air conditioner | 1.92 | 1.0 | Closer to a large ducted system at full load. A 5 kW split at EER 3.5 draws ~1.4 kW, and the thermostat cuts the compressor once the room is cool. |
| Reverse-cycle heater | 2.1 | 1.2 | The profile offers "Electric (Reverse cycle / Heat pump)", so this is a heat pump moving ~3.5 units of heat per unit in — 2.1 kW was priced like a resistive bar heater. Renamed to match. |

---

---

## Seasonal factors

Heating and cooling hours are surveyed in the season people use them most (Finder's heater question is explicitly about winter), so charging both year-round double-counts. `buildKpiReport(profile, data, now = new Date())` reads the Australian meteorological season from the date and scales those lines.

| `season_basis` | Summer | Autumn | Winter | Spring |
| --- | --- | --- | --- | --- |
| `year_round` | 1 | 1 | 1 | 1 |
| `summer_peak` (aircon, evaporative) | 1 | 0.5 | 0 | 0.5 |
| `winter_peak` (heater) | 0 | 0.5 | 1 | 0.5 |

Shoulder seasons keep half the peak hours — an estimate, not a sourced figure. Seasons are Dec–Feb summer, Mar–May autumn, Jun–Aug winter, Sep–Nov spring (`frontend/src/lib/season.ts`). Out-of-season lines still appear in the transparency table at 0 kWh so the omission is visible.

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

`surplusKwh = max(0, G − C)` is shown under the day-part chart, not as a card, because it overlaps with energy distributed.

Carbon avoided is `D × vicGridKgCo2PerKwh`. It has its own card and its own transparency row — the old `HIDDEN_ASSUMPTIONS` filter is gone.

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

Every compatible plan is listed on the dashboard as a tile, with the recommended one badged "Best for you" and the current provider badged separately. `signupBonus` and `lockInMonths` are displayed on each tile but deliberately kept **out** of the savings formula, so a long contract cannot look cheaper than it is.

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

Alembic `004` dropped the room- and people-derived hour scalars (`wfhMonitorHours`, `washerMinHours`, `airconBaseHours`, `airconHoursPerRoom`, `airconMaxHours`, `evaporativeHours`, `heaterBaseHours`, `heaterMaxHours`, `waterHeaterHours`). Weekly hours now live on the appliance row, which also ended a duplication where seven of the ten seeded `typical_hours_per_week` values were shadowed by a scalar and never read.

---

## Code map

| Piece | File |
| --- | --- |
| Engine (`buildKpiReport`, scaling, formatters) | `frontend/src/lib/kpis.ts` |
| Australian season from a date | `frontend/src/lib/season.ts` |
| Hourly load-vs-solar curve | `frontend/src/lib/typicalDay.ts` |
| Cards, charts, plan tiles, timeframe toggle | `frontend/src/components/dashboard/DashboardView.tsx` |
| Day-part bars / hourly line | `frontend/src/components/dashboard/EnergyBalanceChart.tsx`, `TypicalDayChart.tsx` |
| Days / weeks constants | `frontend/src/constants/kpiMethodology.ts` |
| Timeframes and kind labels | `frontend/src/constants/dashboard.ts` |
| API client + types | `frontend/src/lib/methodologyApi.ts` |
| Self-test seed (mirrors Alembic) | `frontend/src/lib/methodologyFixture.ts` |
| `GET /api/methodology` | `backend/app/routes/methodology.py` |
| Seeded tables and values | `backend/alembic/versions/003_create_methodology_tables.py` |
| Sourced appliance hours and seasonal factors | `backend/alembic/versions/004_appliance_usage_metrics.py` |
