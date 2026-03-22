# Effect v4 Migration Plan

## Overview

Effect v4 is a major release with structural and organizational changes across the ecosystem. The core programming model (`Effect`, `Layer`, `Schema`, `Stream`) remains the same, but package organization, versioning, and specific APIs have changed.

**Status: COMPLETED** - Migration to v4.0.0-beta.36 completed on 2026-03-22.

## Benefits

- **Smaller bundles**: ~70 kB → ~20 kB for minimal Effect + Stream + Schema program
- **Faster runtime**: Rewritten fiber runtime with lower memory overhead
- **Unified versioning**: All packages share the same version number
- **Consolidated core**: Many packages merged into `effect` core

## Migration Summary

### Dependencies Updated

| Package | Old Version | New Version |
|---------|-------------|-------------|
| `effect` | ^3.19.17 | 4.0.0-beta.36 |
| `@effect/opentelemetry` | ^0.58.0 | 4.0.0-beta.36 |
| `@opentelemetry/sdk-logs` | (not installed) | 0.213.0 (new dependency) |

### Files Modified

1. **`src/lib/schema.ts`** - Schema transformation API updated
   - `S.transform()` → `S.decodeTo()` with `SchemaTransformation.transform()`
   - `S.Union(S.String, S.Number)` → `S.Union([S.String, S.Number])`
   - `S.NonNegativeInt` → `S.Number.pipe(S.check(S.isGreaterThanOrEqualTo(0)))`

2. **`src/lib/remote/wallet.remote.ts`** - Error handling and Schema API
   - `Effect.catchAllCause` → `Effect.catchCause`
   - `S.standardSchemaV1` → `S.toStandardSchemaV1`
   - `S.positive` → `S.check(S.isGreaterThan(0))`

3. **`src/lib/remote/transaction.remote.ts`** - Error handling
   - `Effect.catchAllCause` → `Effect.catchCause`

4. **`src/routes/+page.server.ts`** - Error handling
   - `Effect.tapErrorCause` → `Effect.tapCause`

5. **`src/routes/backup/+page.server.ts`** - Error handling
   - `Effect.tapErrorCause` → `Effect.tapCause`

6. **`src/routes/api/create-backup/+server.ts`** - Error handling
   - `Effect.tapErrorCause` → `Effect.tapCause`

7. **`src/lib/server/data/transaction.ts`** - Type utility
   - `Effect.Effect.Success<T>` → `Effect.Success<T>`

8. **`src/lib/server/data/wallet.ts`** - Type utility
   - `Effect.Effect.Success<T>` → `Effect.Success<T>`

### Key API Changes Applied

| v3 API | v4 API | Notes |
|--------|--------|-------|
| `Effect.catchAllCause` | `Effect.catchCause` | Error handling |
| `Effect.tapErrorCause` | `Effect.tapCause` | Error handling |
| `Effect.Effect.Success<T>` | `Effect.Success<T>` | Type utility |
| `S.transform(from, to, opts)` | `from.pipe(S.decodeTo(to, transform))` | Schema transformation |
| `S.Union(A, B)` | `S.Union([A, B])` | Variadic → array |
| `S.standardSchemaV1` | `S.toStandardSchemaV1` | Rename |
| `S.positive` | `S.check(S.isGreaterThan(0))` | Removed filter |
| `S.NonNegativeInt` | `S.Number.pipe(S.check(S.isGreaterThanOrEqualTo(0)))` | Removed schema |

### Not Changed (Still Works in v4)

- `Data.TaggedError` - Still works as-is
- `Effect.fn` - Still works as-is
- `Effect.gen` - Still works as-is
- `Effect.runPromise` - Still works as-is
- `Effect.provide` - Still works as-is
- `Effect.logError` - Still works as-is
- `Layer` APIs - Not used in this project

## Verification

- [x] `pnpm check` - TypeScript compilation passes
- [x] `pnpm test:unit -- --run` - Unit tests pass
- [x] `pnpm build` - Production build succeeds
- [x] `pnpm lint` - Linting passes (2 pre-existing warnings unrelated to migration)

## Resources

- [Effect v4 Beta Blog Post](https://effect.website/blog/releases/effect/40-beta/)
- [Main Migration Guide](https://github.com/Effect-TS/effect-smol/blob/main/MIGRATION.md)
- [Schema Migration Guide](https://github.com/Effect-TS/effect-smol/blob/main/migration/schema.md)
- [Services Migration Guide](https://github.com/Effect-TS/effect-smol/blob/main/migration/services.md)
- [Error Handling Migration Guide](https://github.com/Effect-TS/effect-smol/blob/main/migration/error-handling.md)
- [Issue Tracker](https://github.com/Effect-TS/effect-smol/issues)

## Notes

- **Beta status**: v4 is currently in beta. APIs may change between releases.
- **Unstable modules**: New features are available under `effect/unstable/*` and may have breaking changes in minor releases
- **LTS release**: Once v4 stabilizes, it will be a long-term stable release
- **v3 maintenance**: v3 will continue receiving bug fixes and security patches, but no new features
