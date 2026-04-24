# FacadeBot Workspace

## Overview

pnpm workspace monorepo using TypeScript. System for managing facade orders via Telegram bot.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 20+
- **Package manager**: pnpm (required — npm will not work)
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle → `dist/index.mjs`)
- **Email**: nodemailer (SMTP)
- **Excel**: xlsx library
- **File upload**: multer

## Architecture

### Artifacts
- `artifacts/api-server` — Express backend: REST API + Telegram bot webhook
- `artifacts/admin-panel` — React admin panel (Vite + Tailwind, built to `dist/public/`)

### Shared Libraries
- `lib/db` — Drizzle ORM schema + DB client (`@workspace/db`)
- `lib/api-spec` — OpenAPI spec + Orval codegen config
- `lib/api-client-react` — Generated React Query hooks (frontend)
- `lib/api-zod` — Generated Zod schemas (backend validation)

### Database Tables
- `regions` — Regions with manager emails
- `manufacturers` — Facade manufacturers
- `collections` — Collections per manufacturer
- `decors` — Decors per collection
- `prices` — Price per (region × decor): pricePerSqm, pricePerHole, pricePackagingPerSqm
- `orders` — Customer orders with totals and customerEmail (nullable)
- `order_items` — Individual facade items per order (height, width, quantity, holes)
- `invoice_settings` — Company/bank requisites for invoice generation

### Admin Panel Authentication

Session-based auth using `express-session` (in-memory store, MemoryStore).

- `POST /api/auth/login` — validates credentials against `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars, creates session
- `POST /api/auth/logout` — destroys session
- `GET /api/auth/me` — returns current auth state
- All API routes except `/auth/*`, `/healthz`, `/bot/webhook` require a valid session
- Frontend: `useAuth` hook (context provider in App.tsx), `Login.tsx` page shown when unauthenticated
- Session cookie: `httpOnly`, `secure: true` in production, 7-day maxAge
- All API client fetch calls include `credentials: "include"` (custom-fetch.ts)

### Bot Flow (Telegram)
region → manufacturer → collection → decor → enter_items → attach_file (optional) → enter_customer_name → enter_customer_phone → enter_customer_email (optional) → confirm → order created

- Bot webhook: `POST /api/bot/webhook`
- Bot handler: `artifacts/api-server/src/lib/botHandler.ts`
- In-memory session state per Telegram user ID
- After confirmation: saves to DB, generates order Excel + invoice Excel, sends both to manager by email, sends order Excel to user in Telegram

### Order Calculation
Per item: area = (height_mm/1000) × (width_mm/1000) × quantity
- facadesCost = area × pricePerSqm
- holesCost = holes × quantity × pricePerHole
- packagingCost = area × pricePackagingPerSqm

### Catalog Import (Excel/CSV)
Expected columns: Производитель | Коллекция | Декор | Цена за м2 | Цена за отверстие | Цена упаковки за м2
Endpoint: POST /api/catalog/import (multipart/form-data, fields: file + regionId)

## Environment Variables Required (on server)

Set in `ecosystem.config.cjs` for PM2:

| Variable | Description |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | API server port (e.g. `8080`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Random string 40+ chars |
| `ADMIN_USERNAME` | Admin panel login (default: `admin`) |
| `ADMIN_PASSWORD` | Admin panel password (default: `admin`) |
| `COOKIE_SECURE` | Set `true` only when HTTPS is configured; omit/`false` for HTTP |
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Any string for webhook security |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port (587) |
| `SMTP_USER` | SMTP username / email |
| `SMTP_PASS` | SMTP password / app password |
| `SMTP_FROM` | (optional) From address |

## Key Commands

- `pnpm install` — install all dependencies
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run build` — build API server only
- `pnpm --filter @workspace/admin-panel run build` — build admin panel only
- `pnpm --filter @workspace/db run push` — apply DB schema changes to PostgreSQL
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec

## Server Deployment (Ubuntu + PM2 + Nginx)

See `facadebot_install_guide.docx` for the full step-by-step guide.

### Quick reference:
1. Clone repo, run `pnpm install`
2. Build: `pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/admin-panel run build`
3. Apply DB schema: `export $(cat .env | xargs) && pnpm --filter @workspace/db run push`
4. Start: `pm2 start ecosystem.config.cjs && pm2 save`
5. Nginx root for admin panel: `artifacts/admin-panel/dist/public/`
6. Register webhook: `curl -X POST "https://api.telegram.org/botTOKEN/setWebhook" -d '{"url":"http://YOUR_IP/bot/webhook"}'`

## Email Setup (SMTP)

For Gmail: enable 2FA → Google Account → Security → App Passwords → create one for "Mail".
Set SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=your@gmail.com, SMTP_PASS=app-password
