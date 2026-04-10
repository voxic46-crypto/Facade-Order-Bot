# FacadeBot Workspace

## Overview

pnpm workspace monorepo using TypeScript. System for managing facade orders via MAX messenger bot.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Email**: nodemailer (SMTP)
- **Excel**: xlsx library
- **File upload**: multer

## Architecture

### Artifacts
- `artifacts/api-server` — Express backend, handles API + bot webhook
- `artifacts/admin-panel` — React admin panel (at `/`)

### Shared Libraries
- `lib/db` — Drizzle ORM schema + DB client
- `lib/api-spec` — OpenAPI spec + Orval codegen config
- `lib/api-client-react` — Generated React Query hooks (frontend)
- `lib/api-zod` — Generated Zod schemas (backend validation)

### Database Tables
- `regions` — 3 regions with manager emails (Московская область, ЦФО, Черноземье)
- `manufacturers` — Facade manufacturers
- `collections` — Collections per manufacturer
- `decors` — Decors per collection
- `prices` — Price per (region × decor): pricePerSqm, pricePerHole, pricePackagingPerSqm
- `orders` — Customer orders with totals
- `order_items` — Individual facade items per order (height, width, quantity, holes)

### Bot Logic
- Bot webhook: `POST /api/bot/webhook`
- Bot handler: `artifacts/api-server/src/lib/botHandler.ts`
- In-memory session state per user (steps: region → manufacturer → collection → decor → name → contact → items → confirm)
- After order confirmation: saves to DB, generates Excel, sends email to manager

### Order Calculation
Per item: area = (height_mm/1000) × (width_mm/1000) × quantity
Costs: facadesCost = area × pricePerSqm
       holesCost = holes × quantity × pricePerHole
       packagingCost = area × pricePackagingPerSqm

### Catalog Import (Excel/CSV)
Expected columns: Производитель | Коллекция | Декор | Цена за м2 | Цена за отверстие | Цена упаковки за м2
Endpoint: POST /api/catalog/import (multipart/form-data, fields: file + regionId)

## Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection (auto-provisioned)
- `SESSION_SECRET` — Already set
- `MAX_BOT_TOKEN` — MAX messenger bot token (needs to be set)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — Email config (needs to be set)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## MAX Bot Setup
1. Create bot at max.ru/botfather
2. Set MAX_BOT_TOKEN secret
3. Register webhook URL: https://your-domain/api/bot/webhook

## Email Setup (SMTP)
Set secrets: SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS, SMTP_FROM
