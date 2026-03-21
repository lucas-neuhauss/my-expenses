# Moving Off Supabase

This document outlines strategies for migrating away from Supabase while maintaining current functionality.

## Implementation Status

**Option 2 (Auth.js) has been implemented.** See the [Migration Checklist](#migration-checklist---completed) section for details.

---

## Current Setup (Before Migration)

### What's Being Used

| Feature | Usage | Notes |
|---------|-------|-------|
| **Supabase Auth (GoTrue)** | Active | Email/password authentication, session management |
| **PostgreSQL** | Active | Via Drizzle ORM, bypasses PostgREST |
| **Supabase Studio** | Available | Database GUI (not required for app) |
| **PostgREST** | Running | Not used (using Drizzle directly) |
| **Realtime** | Running | Not used |
| **Storage** | Running | Not used |
| **Edge Functions** | Running | Not used |
| **Kong (API Gateway)** | Required | Routes auth requests |
| **Analytics (Logflare)** | Running | Not used |
| **Supavisor (Pooler)** | Running | Connection pooling |

### Architecture (Before)

```
14+ Docker containers:
├── supabase-db (PostgreSQL)
├── supabase-auth (GoTrue)
├── supabase-kong (API Gateway)
├── supabase-pooler (Supavisor)
├── supabase-studio (GUI)
├── supabase-rest (PostgREST) ← NOT USED
├── supabase-realtime ← NOT USED
├── supabase-storage ← NOT USED
├── supabase-meta ← NOT USED
├── supabase-functions ← NOT USED
├── supabase-analytics ← NOT USED
├── supabase-imgproxy ← NOT USED
└── supabase-vector ← NOT USED
```

### Architecture (After)

```
1 Docker container:
└── my-expenses-db (PostgreSQL 15)
```

---

## Migration Options

### Option 1: Standalone GoTrue + PostgreSQL

**Complexity:** Low  
**Code Changes:** Minimal  
**Containers:** 2 (down from 14+)

Keep using GoTrue (Supabase's auth server) but run it standalone without the full Supabase stack.

#### Why This Works
- GoTrue is a standalone product (supabase/gotrue on GitHub)
- Your auth code remains almost unchanged
- Only need GoTrue + PostgreSQL containers

#### New Docker Setup

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: yourpassword
      POSTGRES_DB: myexpenses
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  auth:
    image: supabase/gotrue:v2.184.0
    depends_on:
      - db
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://postgres:yourpassword@db:5432/myexpenses
      GOTRUE_SITE_URL: http://localhost:5173
      GOTRUE_JWT_SECRET: your-jwt-secret-min-32-chars
      GOTRUE_JWT_EXP: 3600
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"
    ports:
      - "9999:9999"

volumes:
  postgres_data:
```

#### Pros
- Minimal code changes
- Proven auth solution
- JWT-based sessions work the same

#### Cons
- Still using Supabase-authored software
- GoTrue configuration can be complex

---

### Option 2: Auth.js (IMPLEMENTED)

**Complexity:** Medium  
**Code Changes:** Moderate  
**Containers:** 1 (PostgreSQL only)

Use the popular Auth.js library with SvelteKit adapter.

#### Implementation

1. **Install dependencies**:
```bash
pnpm add @auth/core @auth/sveltekit argon2 jose
```

2. **Create auth config** (`src/lib/server/auth.ts`):
```typescript
import { SvelteKitAuth } from "@auth/sveltekit";
import Credentials from "@auth/core/providers/credentials";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { verify } from "argon2";
import { AUTH_SECRET } from "$env/static/private";

export const { handle, signIn, signOut } = SvelteKitAuth({
  secret: AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const [user] = await db
          .select()
          .from(table.user)
          .where(eq(table.user.email, credentials.email.toLowerCase()))
          .limit(1);
        if (!user) return null;
        const isValid = await verify(user.passwordHash, credentials.password);
        if (!isValid) return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
});
```

3. **Update hooks** (`src/hooks.server.ts`):
```typescript
import { handle as authHandle } from "$lib/server/auth";
import { sequence } from "@sveltejs/kit/hooks";

export const handle = sequence(authHandle, authGuard, subscriptionGeneration);
```

#### Schema Changes Required

Add a users table with password hashes:
```typescript
// src/lib/server/db/schema.ts
export const user = pgTable("user", {
  id: varchar("id", { length: 50 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: varchar("id", { length: 50 }).primaryKey(),
  userId: varchar("user_id", { length: 50 }).notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});
```

#### Pros
- Industry-standard library
- Great SvelteKit integration
- Supports multiple providers (Google, GitHub, etc.)
- Active community

#### Cons
- Need to migrate existing user accounts
- Need to implement password hashing
- More code changes than Option 1

---

### Option 3: Custom Auth Implementation

**Complexity:** High  
**Code Changes:** Extensive  
**Containers:** 1 (PostgreSQL only)

Build your own auth using battle-tested primitives.

#### Dependencies

```bash
pnpm add argon2 jose uuid
pnpm add -D @types/uuid
```

#### Implementation

1. **Password hashing** (`src/lib/server/auth/password.ts`):
```typescript
import { hash, verify } from "argon2";

export const hashPassword = (password: string) => hash(password);
export const verifyPassword = (hash: string, password: string) => verify(hash, password);
```

2. **JWT handling** (`src/lib/server/auth/jwt.ts`):
```typescript
import { SignJWT, jwtVerify } from "jose";
import { SECRET_KEY } from "$env/static/private";

export const createSession = async (userId: string) => {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(SECRET_KEY));
};

export const verifySession = async (token: string) => {
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(SECRET_KEY)
  );
  return payload;
};
```

3. **Auth service** (`src/lib/server/auth/index.ts`):
```typescript
import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./jwt";
import { generateId } from "uuid";

export const register = async (email: string, password: string) => {
  const hashedPassword = await hashPassword(password);
  const userId = generateId();
  
  await db.insert(user).values({
    id: userId,
    email,
    passwordHash: hashedPassword,
  });
  
  return createSession(userId);
};

export const login = async (email: string, password: string) => {
  const [foundUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  
  if (!foundUser || !(await verifyPassword(foundUser.passwordHash, password))) {
    throw new Error("Invalid credentials");
  }
  
  return createSession(foundUser.id);
};
```

#### Pros
- Full control over auth flow
- No external auth dependencies
- Smallest attack surface
- Learning experience

#### Cons
- Most code to write and maintain
- Need to handle security carefully
- No built-in OAuth providers

---

### Option 4: Commercial Auth Provider

**Complexity:** Low  
**Code Changes:** Moderate  
**Containers:** 1 (PostgreSQL only)

Use a hosted auth service.

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **Clerk** | 10k MAU | Great DX, SvelteKit SDK |
| **Auth0** | 7.5k MAU | Enterprise features |
| **WorkOS** | 1M MAU | Enterprise-focused |
| **Stytch** | 10k MAU | Passwordless focus |

#### Clerk Example (Most SvelteKit-friendly)

```bash
pnpm add clerk-sveltekit
```

```typescript
// hooks.server.ts
import { clerkHandler } from "clerk-sveltekit/server";
import { sequence } from "@sveltejs/kit/hooks";

export const handle = sequence(clerkHandler(), /* other hooks */);
```

#### Pros
- Zero infrastructure for auth
- Built-in OAuth providers
- MFA, passwordless, etc. included
- Great developer experience

#### Cons
- External dependency
- May hit free tier limits
- Less control over auth flow
- Vendor lock-in

---

## Recommendation Summary

| Option | Effort | Maintenance | Flexibility | Best For |
|--------|--------|-------------|-------------|----------|
| **1. Standalone GoTrue** | Low | Low | Medium | Quickest migration |
| **2. Auth.js** | Medium | Low | High | Long-term, open source |
| **3. Custom Auth** | High | High | Highest | Full control, learning |
| **4. Commercial** | Low | Lowest | Lowest | Offload auth entirely |

---

## Migration Checklist - Completed

The following tasks have been completed for Option 2 (Auth.js):

- [x] Create new `docker-compose.yml` with just PostgreSQL (in `apps/svelte/`)
- [x] Add users table to Drizzle schema (`src/lib/server/db/schema.ts`)
- [x] Add session table to schema (for future database session support)
- [x] Install Auth.js dependencies (`@auth/core`, `@auth/sveltekit`, `argon2`, `jose`)
- [x] Create password hashing utilities (`src/lib/server/auth/password.ts`)
- [x] Implement Auth.js configuration (`src/lib/server/auth.ts`)
- [x] Update `hooks.server.ts` to use Auth.js handle
- [x] Update auth guard to work with Auth.js sessions
- [x] Update login route (`src/routes/login/+page.server.ts`)
- [x] Update register route (`src/routes/register/+page.server.ts`)
- [x] Update logout route (`src/routes/logout/+page.server.ts`)
- [x] Update login form component (`src/routes/login/login-form.svelte`)
- [x] Update layout server (`src/routes/+layout.server.ts`)
- [x] Update TypeScript types (`src/app.d.ts`)
- [x] Remove Supabase dependencies (`@supabase/ssr`, `@supabase/supabase-js`)
- [x] Remove old auth service (`src/lib/services/auth.ts`)
- [x] Remove old auth remote (`src/lib/remote/auth.remote.ts`)
- [x] Update environment variables (`.env`, `.env.example`)

### Files Changed

| File | Change |
|------|--------|
| `apps/svelte/docker-compose.yml` | New - PostgreSQL only |
| `apps/svelte/.env` | Updated - removed Supabase vars, added AUTH_SECRET |
| `apps/svelte/.env.example` | Updated - simplified |
| `src/lib/server/db/schema.ts` | Added user and session tables |
| `src/lib/server/auth.ts` | New - Auth.js configuration |
| `src/lib/server/auth/password.ts` | New - Password hashing utilities |
| `src/hooks.server.ts` | Rewritten - Auth.js handle |
| `src/routes/login/+page.server.ts` | Rewritten - Direct auth implementation |
| `src/routes/login/login-form.svelte` | Updated - Standard form with enhance |
| `src/routes/register/+page.server.ts` | Rewritten - Direct user creation |
| `src/routes/logout/+page.server.ts` | Rewritten - Cookie deletion |
| `src/routes/+layout.server.ts` | Updated - Uses locals.getSession() |
| `src/app.d.ts` | Updated - Auth.js types |
| `package.json` | Added/removed dependencies |
| `src/lib/services/auth.ts` | Deleted |
| `src/lib/remote/auth.remote.ts` | Deleted |

### Next Steps

1. **Start the new database:**
   ```bash
   cd apps/svelte
   pnpm db:start
   ```

2. **Push the schema changes:**
   ```bash
   pnpm db:push
   ```

3. **Run the app:**
   ```bash
   pnpm dev
   ```

4. **Test auth flows:**
   - Register a new user
   - Login with the new user
   - Logout

5. **Optional - Remove old Supabase folder:**
   ```bash
   rm -rf apps/supabase
   ```

---

## Database Schema for Auth

The current implementation uses this schema:

```typescript
// src/lib/server/db/schema.ts
export const user = pgTable("user", {
  id: varchar("id", { length: 50 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: varchar("id", { length: 50 }).primaryKey(),
  userId: varchar("user_id", { length: 50 }).notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});
```

---

## Environment Variables

### Before (Supabase)

```
DATABASE_URL="postgres://postgres.your-tenant-id:password@localhost:5432/postgres"
PUBLIC_SUPABASE_URL="http://localhost:8000"
PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### After (Auth.js)

```
DATABASE_URL="postgres://postgres:password@localhost:5432/myexpenses"
AUTH_SECRET="your-super-secret-jwt-token-with-at-least-32-characters-long"
```

---

## Questions to Consider

1. **Do you need to preserve existing user accounts?** 
   - If yes, you'll need to migrate passwords from Supabase's auth schema
   - If no, new registrations will work fine

2. **Do you need OAuth providers (Google, GitHub, etc.)?**
   - Auth.js supports these - add additional providers to the config

3. **Is this a personal project or team project?**
   - Personal: Current implementation is sufficient
   - Team: Consider adding OAuth providers for convenience

4. **What's your timeline?**
   - Done: Auth.js implementation is complete
