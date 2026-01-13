# AGENTS.md

Guidelines for AI coding agents operating in the `my-expenses` repository.

## Project Structure

This is a **pnpm monorepo** with the following structure:
- `apps/svelte/`: SvelteKit fullstack application (TypeScript, Svelte 5, TailwindCSS)
- `apps/supabase/`: Supabase backend using Docker Compose
- Root workspace manages shared dependencies

**Key Tech Stack:**
- Frontend: SvelteKit, Svelte 5 (runes), TypeScript, TailwindCSS 4
- Backend: Supabase (Auth), PostgreSQL with Drizzle ORM
- State: TanStack Query, TanStack DB for client-side collections
- Forms: Sveltekit-Superforms with Zod validation
- UI: bits-ui, custom components in `src/lib/components/ui/`
- Effects: Effect-TS for server-side operations
- Testing: Vitest (unit), Playwright (e2e)

## Development Credentials

**Test Account:**
- Email: `test@email.com`
- Password: `password`

## Build, Lint, Test Commands

All commands run from `apps/svelte/` unless stated otherwise.

### Development
```bash
pnpm dev                  # Start dev server
pnpm build                # Build for production
pnpm preview              # Preview production build
pnpm check                # Type-check with svelte-check
pnpm check:watch          # Type-check in watch mode
```

### Testing
```bash
pnpm test                 # Run all tests (unit + e2e)
pnpm test:unit            # Run Vitest tests (watch mode)
pnpm test:unit -- --run   # Run Vitest tests once
pnpm test:e2e             # Run Playwright tests

# Run a single unit test file
pnpm test:unit src/demo.spec.ts

# Run a single e2e test file
pnpm test:e2e demo.test

# Run tests matching a pattern
pnpm test:unit -- --grep "sum test"
```

**Test file locations:**
- Unit tests: `src/**/*.{test,spec}.ts`
- E2E tests: `e2e/**/*.test.ts`

### Linting & Formatting
```bash
pnpm lint                 # Run ESLint + Prettier check
pnpm format               # Format code with Prettier
```

### Database
```bash
pnpm db:start             # Start PostgreSQL with Docker Compose
pnpm db:push              # Push schema changes to database
pnpm db:migrate           # Run migrations
pnpm db:studio            # Open Drizzle Studio
```

### Storybook
```bash
pnpm storybook            # Start Storybook dev server
pnpm build-storybook      # Build Storybook
```

## Code Style Guidelines

### File Organization
- **Routes:** `src/routes/` (SvelteKit file-based routing)
- **Components:** `src/lib/components/` (reusable Svelte components)
- **UI Components:** `src/lib/components/ui/` (DO NOT EDIT - auto-generated)
- **Server code:** `src/lib/server/` (server-only modules)
- **Database schema:** `src/lib/server/db/schema.ts`
- **Data layer:** `src/lib/server/data/` (database operations using Effect-TS)
- **Client collections:** `src/lib/db-collectons/` (TanStack DB collections)
- **Utils:** `src/lib/utils/`
- **Types:** `src/lib/types.ts` or co-located with features

### Imports
- **Auto-organized:** Prettier plugin `prettier-plugin-organize-imports` handles import sorting
- **Aliases:** Use `$lib/` for imports from `src/lib/`
- **Example:**
  ```typescript
  import { Button } from "$lib/components/ui/button";
  import { db } from "$lib/server/db";
  import type { UserId } from "$lib/types";
  ```

### Formatting (Prettier)
- **Indent:** Tabs (not spaces)
- **Quotes:** Double quotes
- **Trailing commas:** All
- **Print width:** 90 characters
- **Plugins:** svelte, organize-imports, tailwindcss

### TypeScript
- **Strict mode:** Enabled (`strict: true`)
- **Type imports:** Use `type` keyword for type-only imports
- **Any usage:** Avoid `any`; ESLint warns on usage
- **Unused vars:** Warn only (not error)

### Naming Conventions
- **Files:** `kebab-case.ts`, `kebab-case.svelte`
- **Components:** `PascalCase` for Svelte components
- **Variables/Functions:** `camelCase`
- **Types/Interfaces:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE` for true constants
- **Database tables:** `snake_case`

### Svelte 5 Runes
This project uses **Svelte 5 with runes**. Use modern rune syntax:
- `$state()` for reactive state
- `$derived()` for derived values
- `$effect()` for side effects
- `$props()` for component props
- `$bindable()` for two-way binding

**Example:**
```svelte
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
  
  $effect(() => {
    console.log(`Count is ${count}`);
  });
</script>
```

### Error Handling
- **Client-side:** Standard try/catch or form validation with Zod
- **Server-side:** Use Effect-TS patterns:
  ```typescript
  import { Effect } from "effect";
  
  export const myFunction = Effect.fn("namespace/myFunction")(
    function* ({ userId }: { userId: UserId }) {
      const data = yield* exec(db.select()...);
      return { ok: true, data };
    }
  );
  ```
- **Custom errors:** Use Effect's `Data.TaggedError` (see `src/lib/errors/db.ts`)

### Database Patterns
- **ORM:** Drizzle ORM
- **Schema:** Defined in `src/lib/server/db/schema.ts`
- **Queries:** Use Drizzle query builder with Effect-TS `exec()` wrapper
- **Transactions:** Wrap in Effect-TS transactions
- **Example:**
  ```typescript
  import { db, exec } from "$lib/server/db";
  import * as table from "$lib/server/db/schema";
  import { eq } from "drizzle-orm";
  import { Effect } from "effect";
  
  const result = yield* exec(
    db.select().from(table.wallet).where(eq(table.wallet.id, walletId))
  );
  ```

### Form Handling
- Use `sveltekit-superforms` with Zod schemas
- Server actions in `+page.server.ts`
- Client forms with `use:enhance`
- Validate with Zod on both client and server

### Validation
- **Library:** Zod (primary), Effect Schema (secondary)
- **Location:** Co-locate schemas with components or in `src/lib/schema.ts`
- **Example:** See `src/lib/components/upsert-category/upsert-category-schema.ts`

## Testing Guidelines
- **Unit tests:** Focus on utility functions, data transformations
- **E2E tests:** Test user flows, critical paths
- **Coverage:** Not enforced, but aim for critical business logic
- **Mocking:** Use Vitest's mocking utilities

## Common Patterns
- **Server actions:** Return `{ ok: true, toast: "message" }` for success
- **Client collections:** Use TanStack DB for local-first state management
- **Auth:** Supabase SSR with `event.locals.user`
- **Loading states:** Use TanStack Query's loading states
- **Forms:** Combine `use:enhance` + server actions + optimistic updates

## Important Notes
- **DO NOT EDIT** files in `src/lib/components/ui/` (shadcn-svelte generated)
- **Always** check `event.locals.user` for authentication in server actions
- **Use Effect-TS** for all server-side data layer functions
- **Prefer** server-side validation over client-side only
- **Test** both happy path and error cases

## Additional Resources
- SvelteKit docs: https://svelte.dev/docs/kit
- Svelte 5 runes: https://svelte.dev/docs/svelte/v5-migration-guide
- Drizzle ORM: https://orm.drizzle.team/
- Effect-TS: https://effect.website/
- TanStack Query: https://tanstack.com/query/
