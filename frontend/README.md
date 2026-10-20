# MyPowerPlant frontend

This is the part of MyPowerPlant people actually see. It is a React 19 and TypeScript app built with Vite and styled with Tailwind CSS 4 and plain CSS files.

Almost all the logic lives here. The household profile, the KPI maths, the VPP plan comparison, "What if", goals and reminders all run in the browser. The backend is only used for reference data and for phrasing "What if" results.

For the whole project, including the backend, CI and AWS, see the `README.md` in the repo root.

## Running it

You need Node.js 20.19 or later, or 22.12 or later. CI uses Node 22.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The backend should be running on `http://localhost:8000` for the dashboard to load its reference data.

## Environment

| Variable | What it is for |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the backend, with no trailing slash. Locally `http://localhost:8000`. In production CI sets it from the `API_BASE_URL` repository variable. |

Only read it through `src/constants/api.ts`. Do not hardcode `localhost` anywhere else.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server. |
| `npm run build` | Type checks with `tsc -b`, then builds into `dist/`. |
| `npm run preview` | Serves the built `dist/` folder locally. |
| `npm run lint` | Runs ESLint. |
| `npm test` | Runs the Vitest suite once. |
| `npm run test:watch` | Runs Vitest in watch mode. |

## Checks before you push

These match the frontend job in `.github/workflows/security.yml`:

```bash
npm ci
npm audit --audit-level=high
npx tsc -b
npm run lint
npm test
```

Tests sit in `__tests__` folders next to the code they cover. Component tests use Testing Library and jsdom.

There are also three self check scripts for the core maths: `src/lib/kpis.selftest.ts`, `src/lib/energyRiver.selftest.ts` and `src/lib/vppSuggestions.selftest.ts`. They are not part of `npm test` or CI. Run one by hand when you change that model, for example:

```bash
npx tsx src/lib/kpis.selftest.ts
```

`tsx` is not a project dependency, so `npx` will fetch it the first time.

## How the app is put together

There is no URL router. `src/App.tsx` holds the current view in state and swaps screens. There are two journeys:

| Journey | Who it is for | Main screens |
| --- | --- | --- |
| Explore (called Matt in the code) | Has solar and a battery but is not in a VPP yet | Setup, dashboard, recommendations, profile |
| Improve (called Rain in the code) | Already in a VPP | Improve home, What if, goals, reminders, profile |

`docs/user-flows-matt-rain.md` in the repo root explains the two journeys in more detail.

Folder guide:

| Folder | What lives there |
| --- | --- |
| `src/components/` | Screens and UI, grouped by feature (dashboard, setup, whatif, goals, reminders, improve, chat and so on). |
| `src/lib/` | Logic with no UI: KPI maths (`kpis.ts`), the API client (`methodologyApi.ts`), storage helpers, What if and goals logic. |
| `src/constants/` | Fixed values, copy, storage keys and the API settings. |
| `src/data/` | Static data such as baselines and Melbourne postcodes. |
| `src/types/` | Shared TypeScript types. |
| `src/styles/` | CSS, one file per area, with design tokens in `tokens.css`. |

`docs/kpi-card-formulas.md` explains every number on the dashboard and where it comes from.

## What it talks to

| Service | Used for |
| --- | --- |
| `GET /api/methodology` | Rates, appliances, VPP plans and the other figures the KPI maths needs. |
| `POST /api/advice` | Phrasing a "What if" comparison in plain English. If it fails, the app shows a fixed sentence instead. |
| Open-Meteo forecast API | Solar forecast for the generation chart. No key needed. |

## What is stored in the browser

Nothing about the household is sent to the server to be kept. These localStorage keys hold everything:

| Key | What it holds |
| --- | --- |
| `mypowerplant.profile` | The household profile. |
| `mypowerplant.journey` | Which journey the person picked. |
| `mypowerplant.reminders` | Reminders they downloaded. |
| `mypowerplant.tutorials` | Which tutorials have been seen. |
| `mypowerplant.boltHello` | Whether the assistant has said hello this session. |

The keys are defined in `src/constants/storage.ts`. Renaming a key loses everyone's saved data, so avoid it.

## Security headers

`vite.config.ts` adds a Content Security Policy and a few other headers to the dev and preview servers. In production the same job is done by the CloudFront response headers policy in `terraform/cloudfront.tf`. If you add a new outside service, add it to `connect-src` in `vite.config.ts` as well, or the browser will block it.

## Deploying

You do not deploy the frontend by hand in normal use. A push to `main` runs `.github/workflows/deploy.yml`, which builds this folder, syncs `dist/` to S3 and clears the CloudFront cache. See `terraform/README.md` if you ever need to do it manually.
