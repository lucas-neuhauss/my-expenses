# My Expenses

A modern, full-featured personal finance manager to track your expenses, income, and subscriptions across multiple wallets.

<!-- Screenshot placeholder - Add your app screenshot here -->
<!-- ![App Screenshot](./docs/screenshot.png) -->

## Features

### 💰 Multi-Wallet Management
- Track multiple wallets with independent balances
- Transfer money between wallets seamlessly
- Set initial balances and monitor changes over time

### 📊 Transaction Tracking
- Record expenses and income with detailed descriptions
- Mark transactions as paid or unpaid
- Organize transactions by customizable categories
- Split payments into installments with automatic grouping
- Link transactions to recurring subscriptions

### 🏷️ Smart Categories
- Create hierarchical categories (parent-child structure)
- Separate categories for income and expenses
- Customize with icons for visual identification
- Quick category selection with search

### 🔄 Subscription Management
- Set up recurring expenses and income
- Configure payment dates and frequencies
- Pause/resume subscriptions without deletion
- Optional end dates for time-limited subscriptions
- Automatic transaction linking

### 📈 Data Visualization
- Dashboard with interactive charts
- Visual insights into spending patterns
- Track financial trends over time

### 🔐 Secure & Private
- Secure user authentication with session-based auth
- Data backup and restore functionality
- Self-hosted option with Docker

## Tech Stack

- **Frontend**: SvelteKit, Svelte 5, TypeScript, TailwindCSS 4
- **Backend**: PostgreSQL with Drizzle ORM, custom session auth
- **State Management**: TanStack Query, TanStack DB
- **UI Components**: bits-ui, shadcn-svelte
- **Validation**: Zod, Effect-TS

## Project Structure

- **apps/svelte/**: Fullstack application built with SvelteKit, including `docker-compose.yml` for the local PostgreSQL database

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [pnpm](https://pnpm.io/) or [npm](https://www.npmjs.com/)

### Backend (PostgreSQL)

1. Start the PostgreSQL database with Docker Compose:
   ```bash
   pnpm db:start
   ```
   Or directly:
   ```bash
   docker compose -f apps/svelte/docker-compose.yml up -d
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
