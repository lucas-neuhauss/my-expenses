# E2E Tests

Playwright E2E tests for the my-expenses app.

## Structure

```
e2e/
├── global-setup.ts     # Auth setup, runs before all tests
├── pages/              # Page Object Models
├── tests/              # Test files (*.test.ts)
└── utils/              # Helpers and factories
```

## Running Tests

```bash
pnpm test:e2e              # Run all
pnpm test:e2e dashboard    # Run specific file
```

## Auth Strategy

- `global-setup.ts` logs in as `test@email.com` / `password`
- Saves auth state to `e2e/.auth/user.json`
- All tests (except `auth.test.ts`) reuse this state
- Setup also cleans all test data via `DELETE /api/test/seed`

## Playwright Config

- Builds & previews app on port 4173
- 3 projects: `setup`, `chromium` (auth'd), `unauthenticated`
- Sequential workers (`workers: 1`) to prevent race conditions

## Page Object Pattern

Each page has its own class in `pages/`:

```typescript
export class DashboardPage {
  constructor(private page: Page) {}

  // Locators (getters)
  get createTransactionButton() {
    return this.page.getByRole("button", { name: "Create Transaction" });
  }

  // Actions
  async openCreateTransaction() {
    await this.createTransactionButton.click();
  }

  // Assertions
  async expectLoaded() {
    await expect(this.createTransactionButton).toBeVisible();
  }
}
```

**Available pages:** `DashboardPage`, `WalletsPage`, `CategoriesPage`, `LoginPage`, `TransactionDialog`

## Test Data

### API Seeding (preferred)

Use `seedData()` and `cleanupData()` from `utils/helpers.ts`:

```typescript
const { wallet } = await seedData(page, {
  wallet: { name: "Test Wallet", initialBalance: 1000 }
});
```

### Factories

Use `createWallet()`, `createCategory()`, `createTransaction()` from `utils/factories.ts` for random test data with Faker.

### UI Setup

For tests that need full UI flow (category/wallet creation), use page objects:

```typescript
async function setupTestData(page: Page) {
  const walletsPage = new WalletsPage(page);
  await walletsPage.goto();
  await walletsPage.createWallet("Test Wallet", 1000);
}
```

## Writing Tests

```typescript
import { test, expect } from "@playwright/test";
import { DashboardPage, TransactionDialog } from "../pages";

test("should create expense", async ({ page }) => {
  const dashboard = new DashboardPage(page);
  const dialog = new TransactionDialog(page);

  await dashboard.goto();
  await dashboard.openCreateTransaction();

  await dialog.createExpense({ description: "Groceries", value: 50 });
  await dialog.expectClosed();
  await dashboard.expectTransactionVisible("Groceries");
});
```

## Test API Endpoint

`POST/DELETE /api/test/seed` - Only available when `E2E_TEST=true` env var is set.

- `POST`: Create wallet/category/transaction
- `DELETE`: Remove specific items or `{ all: true }` for full cleanup
