<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PBDerp — Agent Guidelines

Read `docs/00-research-and-plan.md` and `README.md` before making architectural changes.

## Commands

```bash
pnpm dev                 # Turbopack dev server
pnpm typecheck           # tsc --noEmit (must pass)
pnpm lint                # ESLint (must pass)
pnpm test                # Vitest
pnpm build               # production build (must pass)
pnpm prisma generate
pnpm prisma migrate dev --name <name>
pnpm seed
```

If `pnpm` is intercepted by a broken mise shim, use the local binaries:
`./node_modules/.bin/next`, `./node_modules/.bin/tsc`, `./node_modules/.bin/vitest`, `./node_modules/.bin/prisma`.

## Architecture contract

- **One deployable**: Next.js App Router + PostgreSQL. No microservices, no separate API server.
- **Modules live in `src/modules/<domain>/`** with exactly this split:
  - `schema.ts` — Zod input schemas.
  - `queries.ts` — read-only queries, `import "server-only"`.
  - `service.ts` — transactional writes + audit, `import "server-only"`.
  - `actions.ts` — `"use server"` entry points: `requirePermission` → Zod parse → service → revalidate/redirect.
- **Pages** (`src/app/**/page.tsx`) only compose UI and call `queries`. Never put business transactions in pages.
- **Inventory writes must go through `src/modules/inventory/service.ts`** (`lockStockLevel`, `createStockMovement`, `adjustStock`, `transferStock`). Never update `StockLevel.quantity` directly.
- **Every business table has `organizationId`**. Every query and write must filter by the current organization. Never trust a client-supplied organization id.
- **Money/quantity use Decimal** (`src/lib/money.ts`). Never use `number` for money arithmetic. Prisma columns are `numeric`.
- **Audit every mutation** inside the same transaction (`writeAudit`).
- **Document numbers** via `nextDocumentNo(tx, organizationId, type)` inside the transaction. Do not use `Date.now()`.
- **Channel imports** go through `src/modules/channels/service.ts`: CSV parsing is in `adapter.ts`, imported orders become DRAFT sales orders, and `ChannelOrder` is the idempotency key (`channelId + externalOrderNo`).

## Permissions

- `src/lib/permissions.ts` is the single role matrix.
- Pages call `requirePermission("products.read")` etc.
- Actions call `requirePermission("...write")`; status transitions use the specific permission (`sales.ship`, `purchase.receive`).
- Roles: `ADMIN`, `MANAGER`, `SALES`, `PURCHASER`, `WAREHOUSE`, `FINANCE`, `VIEWER`.
- Channel import uses `channels.write`; channel viewing uses `channels.read`.

## UI conventions

- shadcn/ui here is **Base UI**, not Radix. Use the `render` prop instead of `asChild`:
  ```tsx
  <DropdownMenuTrigger render={<Button variant="ghost" />}>...</DropdownMenuTrigger>
  ```
- Prefer native `<select>` for forms (`NativeSelect`) — simple, serializes reliably.
- Forms use the shared `ActionForm` client wrapper (`useActionState`) and server actions return `ActionState`.
- For status buttons use `ActionButtonForm`; for destructive deletes use `ConfirmSubmitButton`.
- Client components must not import Prisma or `src/lib/db.ts`. `src/lib/money.ts` and `src/lib/format.ts` are client-safe; keep them free of `@/generated/prisma`.
- `next.config.ts` has `cacheComponents: false`: the back office is fully dynamic (session + tenant data). Do not enable it without adding Suspense/prerender handling to every authenticated page.

## Data model rules

- Sales: `DRAFT` (no stock effect) → `CONFIRMED` (reserve) → `PARTIALLY_SHIPPED` / `SHIPPED` (deduct) → `COMPLETED`.
- Purchase: `DRAFT` → `APPROVED` → `ORDERED` → `PARTIALLY_RECEIVED` / `RECEIVED` (increase stock).
- Partial shipments/receipts operate on `qty_<lineId>` form fields and validate against the remaining quantity.
- Sales returns: `DRAFT` → `RECEIVED`; receiving increases stock, increments `SalesOrderLine.returnedQuantity`, and creates an OUT payment for the refund.
- Stock takes snapshot stock levels; completing writes `ADJUSTMENT` movements and sets physical quantity to the counted value.
- Reservations are rows in `StockReservation`; confirm creates `ACTIVE`, ship sets `CONSUMED`, cancel sets `RELEASED`.
- `StockMovement.quantity` is signed: positive in, negative out. `balanceAfter` is the physical quantity after the movement.
- Lock order is deterministic: lock the document row first, then stock levels (transfer locks stock levels in key order).

## Adding a module (checklist)

1. Create `src/modules/<domain>/{schema,queries,service,actions}.ts`.
2. Add models/enums to `prisma/schema.prisma`, run `prisma format`, `prisma migrate dev`.
3. Add nav item + permission in `src/components/layout/nav.ts` and `src/lib/permissions.ts` if user-facing.
4. Add pages under `src/app/(dashboard)/<domain>/`.
5. Use shared `PageHeader`, `DataTable` patterns, `Pagination`, `StatusBadge`, `ActionForm`.
6. Add unit tests for pure logic; add integration tests for stock/transaction behavior when touching inventory.
7. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

## Known limitations (intentional for MVP)

- Single organization per deployment (tenant fields are present, org switching is not built).
- Inventory list low-stock filter fetches a bounded window (2,000 rows) and filters in memory; optimize with SQL later.
- Purchase returns and partial cancellation after receipt are not implemented yet.
- Channel integration currently supports CSV import only; platform API adapters and background sync are pending.
- CSV import creates DRAFT sales orders; it does not confirm/reserve stock automatically.

## Security

- Never expose raw Prisma errors to clients; convert to `AppError` messages.
- Never log secrets or session tokens.
- All mutations are server-side and permission-checked; client components must not perform privileged writes directly.