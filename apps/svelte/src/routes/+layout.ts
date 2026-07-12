// Disable SSR for the entire app.
//
// Reason: the app uses TanStack DB query collections (transactionCollection,
// walletCollection, categoryCollection, subscriptionCollection) which are
// instantiated at module top-level. Their default syncMode is "eager", which
// immediately invokes the queryFn (a `fetch` to internal API routes) when the
// module is loaded. During SSR this fetch is unnecessary work (the rendered
// HTML shows the loading skeleton anyway because useLiveQuery only resolves
// on the client) and it triggers SvelteKit's "Avoid calling `fetch` eagerly
// during server-side rendering" warning plus ECONNREFUSED errors when the
// dev server has not yet bound the port the URL helper falls back to.
//
// Disabling SSR is safe here because:
//   - The app is fully authenticated (no SEO needs).
//   - All data is loaded reactively on the client via TanStack Query/DB.
//   - Server load functions (+layout.server.ts, +page.server.ts) still run
//     on the server, so auth checks and redirects continue to work.
//   - The initial paint already shows a skeleton/loading state.

export const ssr = false;
export const prerender = false;
