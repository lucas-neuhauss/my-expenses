# My Expenses

An open-source application to track your expenses.

## Project Structure

- **apps/svelte/**: Fullstack application built with SvelteKit.
- **apps/supabase/**: Backend powered by Supabase, using a minimal Docker Compose setup.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [pnpm](https://pnpm.io/) or [npm](https://www.npmjs.com/)

### Backend (Supabase)

1. Navigate to `apps/supabase/`.
2. Follow the [Supabase Docker guide](https://supabase.com/docs/guides/hosting/docker) to start the backend:
   ```bash
   cd apps/supabase
   docker compose up
   ```

### Frontend (SvelteKit)

1. Navigate to `apps/svelte/`.
2. Install dependencies:
   ```bash
   cd apps/svelte
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm run dev
   ```

## Building for Production

See `apps/svelte/README.md` for frontend build instructions.

## License

MIT
