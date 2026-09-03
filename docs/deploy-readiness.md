# Deploy readiness

This repo is a Vercel Node.js serverless API (`/api/**/*.ts`) that proxies QTM Inventory App Airtable operations for base `appeZjpIflD4tYvZK`. Handlers already exist. This document is for a later deploy — do not treat it as authorization to deploy now.

## Required environment variables (names only)

Set these in the Vercel project after it is linked. Never commit real values.

| Name | Required | Notes |
| --- | --- | --- |
| `AIRTABLE_PAT` | Yes | Personal Access Token for the QTM Inventory Airtable base. Local placeholder only in `.env.example`. |
| `ALLOWED_ORIGIN` | No | CORS origin. Defaults to `*` if unset. Prefer the production app origin. |

Do not put secrets in git, pull requests, or `vercel.json`.

## Node.js version

Vercel selects the function runtime from `package.json` `engines.node` (`20.x`). Do not set `"runtime": "nodejs20.x"` on `functions` in `vercel.json` — that key is for community runtimes (for example `vercel-php@…`), and this repo already removed it as invalid.

`vercel.json` declares the `/api/**/*.ts` handlers and a Hobby-safe `maxDuration` of 10 seconds. Vercel maps those TypeScript files to the official Node.js serverless runtime automatically.

Node.js 20 on Vercel is deprecated for **new** deployments on 2026-10-01. Existing deployments keep running; upgrade `engines.node` to `22.x` or `24.x` before that date.

## How to deploy later (manual, not done in this PR)

1. Confirm `npm test` and `npm run typecheck` pass.
2. Create or link a Vercel project for this repo (`vercel link` or the Vercel GitHub integration). Use a Hobby/free project. Do not upgrade billing.
3. Add env vars in the Vercel dashboard (or `vercel env add`) — names above, values never committed.
4. Deploy when you are ready (`vercel` preview first, then `vercel --prod` only with intent).
5. Smoke-test `GET /api` (no PAT required). Then hit a real handler only after `AIRTABLE_PAT` is set.
6. Point the iOS / React Native app at the deployed origin. Replace direct Airtable calls in `src/services/airtable.ts` with the proxy routes in the [API reference](./superpowers/plans/2026-05-31-vercel-airtable-proxy.md#api-reference-for-updating-the-react-native-app). Remove `EXPO_PUBLIC_AIRTABLE_PAT` from the app.

## Still blocked

- A real `AIRTABLE_PAT` (must be created in Airtable and stored only in Vercel env, never in this repo).
- Vercel project link / GitHub integration for `yeshcorp/qtm-api`.
- iOS app configured to call this API instead of Airtable directly.
- Node 20 → 22/24 upgrade before 2026-10-01 if you still need new production deploys after that date.
