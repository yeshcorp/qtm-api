# qtm-api

Vercel serverless API that proxies Airtable for inventory and MPC (master product catalog) operations.

## Local development

```bash
npm install
cp .env.example .env   # then set values locally (never commit .env)
npm run dev            # Vercel dev server
```

## Environment variables

| Name | Purpose |
|------|---------|
| `AIRTABLE_PAT` | Airtable personal access token (required for live API calls) |
| `ALLOWED_ORIGIN` | CORS `Access-Control-Allow-Origin` value (optional; defaults to `*` when unset) |

## Tests and typecheck

```bash
npm test
npm run typecheck
```
