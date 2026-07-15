# Tasks: Refine the Effect / TanStack DB Boundary

## 1. Schema Unification (foundation)

- [x] 1.1 Run the schema-unification spike: define wallet with `S.Struct`, derive a Zod schema via `S.toStandardSchemaV1`, validate it works with both `sveltekit-superforms` and TanStack DB's `queryCollectionOptions`. Document outcome in a comment on `src/lib/schemas/wallet.ts`.
- [x] 1.2 Create `src/lib/schemas/` with the canonical schema module for **wallet** (one entity first, to de-risk the pattern).
- [x] 1.3 Replace the three definitions of "wallet" (Drizzle column, `upsert-wallet-schema.ts`, `wallet-collection.ts`) with imports from the canonical module. Add a compile-time `AssertWalletSchemaMatchesDrizzle` type check.
- [x] 1.4 Repeat 1.2–1.3 for **category**, then **subscription**, then **transaction** (each as a separate task — never all at once).

## 2. Error Propagation (foundation)

- [x] 2.1 Update the remote function for **wallet** to **throw** `error(httpStatus, taggedError)` on failure instead of returning `{ success, message, errorType? }`. Add a small `statusFor(tag: string): number` helper colocated with the data layer's error types.
- [x] 2.2 Update `walletCollection`'s `onDelete` to `try/catch` and switch on `isHttpError(e) && e.body._tag` instead of checking `res.message` strings. Show tag-specific toasts.
- [x] 2.3 Repeat 2.1–2.2 for **category**, **subscription**, **transaction**.

## 3. Transport Unification

- [x] 3.1 Add a `getWallets()` `query()` function to `wallet.remote.ts`. It re-exports the same Effect data fetch that the current `+server.ts` route runs.
- [x] 3.2 Update `walletCollection`'s `queryFn` to call `getWallets()` instead of `fetch("/api/wallets")`.
- [x] 3.3 Grep the codebase for any consumer of `/api/wallets` outside `src/lib/db-collectons/`. If none, delete `src/routes/api/wallets/+server.ts`. Record the search result in the change log.
- [x] 3.4 Repeat 3.1–3.3 for **category**, **subscription**, **transaction**. Leave `api/create-backup` alone (binary download, different concern).

## 4. Optimistic Writes (UI payoff)

- [x] 4.1 Add `onInsert` and `onUpdate` handlers to `walletCollection` that apply optimistic writes via `writeInsert`/`writeUpdate`, call the remote function, and roll back on `try/catch` failure (dispatch on `e.body._tag` from task 2).
- [x] 4.2 Verify the wallet create/edit dialog triggers the new handlers and that the wallet appears in the list before the server response resolves.
- [x] 4.3 Add a Playwright e2e test for "wallet appears optimistically" and "wallet delete rolls back if server rejects".
- [x] 4.4 Repeat 4.1–4.3 for **category**, **subscription**, **transaction**. The transaction case is the trickiest (linkage rules, installment groups) — tackle it last and expect to spend more time.

## 5. Verification

- [x] 5.1 `pnpm check` — TypeScript compilation passes
- [x] 5.2 `pnpm test:unit -- --run` — unit tests pass
- [x] 5.3 `pnpm test:e2e` — Playwright tests pass (including the new optimistic-write test from 4.3)
- [x] 5.4 `pnpm build` — production build succeeds
- [x] 5.5 `pnpm lint` — no new warnings
- [x] 5.6 `openspec validate refine-effect-tanstack-boundary` — proposal, specs, design, and tasks are consistent

## Ordering note

Tasks are written to be done in numeric order within each group, but the groups themselves are ordered by dependency:

- Group **1** (schema) must be done first because everything else references the canonical schema
- Group **2** (errors) must be done before group **4** (optimistic writes) because the rollback path uses the new error shape
- Group **3** (transport) can be done in parallel with group **2**; both block group **4**
- Group **5** (verification) is the final pass

If the team wants to ship value early, the minimum viable path is: 1.1–1.3, 2.1–2.2, 4.1–4.2, 5. That gives the wallet case a full working optimistic UI with typed errors and unified schema, without touching the other three entities yet.
