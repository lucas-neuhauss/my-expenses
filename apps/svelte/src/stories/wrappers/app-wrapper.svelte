<script lang="ts">
	import { Tooltip } from "bits-ui";
	import { ModeWatcher } from "mode-watcher";
	import { NuqsAdapter } from "nuqs-svelte/adapters/native";
	import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
	import { isQueryCacheHydrated } from "$lib/integrations/tanstack-query/query-client";
	import { Toaster } from "$lib/components/ui/sonner";
	import { onMount, type Snippet } from "svelte";

	let { children }: { children: Snippet } = $props();

	// Create a fresh QueryClient for each story instance
	const storyQueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				gcTime: 1000 * 60 * 60, // 1 hour
				staleTime: 1000 * 60 * 5, // 5 minutes
				retry: false,
			},
		},
	});

	// Force cache to be hydrated for stories
	onMount(() => {
		isQueryCacheHydrated.set(true);
	});
</script>

<ModeWatcher />
<Toaster position="top-center" richColors />
<Tooltip.Provider>
	<NuqsAdapter>
		<QueryClientProvider client={storyQueryClient}>
			<main class="bg-background flex min-h-svh w-full flex-1 flex-col p-4">
				{@render children()}
			</main>
		</QueryClientProvider>
	</NuqsAdapter>
</Tooltip.Provider>
