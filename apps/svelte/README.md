# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/main/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Database integration tests

Run these against a disposable PostgreSQL database named `myexpenses_test_*`,
never your application database. The suite creates and deletes its own test users.

```bash
# Create the disposable database in the local PostgreSQL container
docker exec my-expenses-db createdb -U postgres myexpenses_test_local

# Set the connection URL using your local PostgreSQL credentials
export TEST_DATABASE_URL="postgres://postgres:<password>@localhost:5432/myexpenses_test_local"
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:push
pnpm test:integration

# Remove the disposable database when finished
docker exec my-expenses-db dropdb -U postgres myexpenses_test_local
```

`pnpm test:unit --run` excludes database integration tests.

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
