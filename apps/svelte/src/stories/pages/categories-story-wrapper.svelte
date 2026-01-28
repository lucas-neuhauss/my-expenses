<script lang="ts">
	/**
	 * Wrapper component that combines AppWrapper + CategoriesPage
	 * for easier Storybook testing.
	 */
	import { Tooltip } from "bits-ui";
	import { ModeWatcher } from "mode-watcher";
	import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
	import { isQueryCacheHydrated } from "$lib/integrations/tanstack-query/query-client";
	import { Toaster } from "$lib/components/ui/sonner";
	import { onMount } from "svelte";
	import CategoriesPage from "./categories-page.svelte";
	import type { MockCategory } from "../mocks/category-data";

	let {
		categories = [],
		isLoading = false,
		onCreateCategory,
		onEditCategory,
		onDeleteCategory,
	}: {
		categories: MockCategory[];
		isLoading?: boolean;
		onCreateCategory?: (data: { name: string; type: string; icon: string }) => void;
		onEditCategory?: (id: number, data: Partial<MockCategory>) => void;
		onDeleteCategory?: (id: number) => void;
	} = $props();

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
	<QueryClientProvider client={storyQueryClient}>
		<main class="bg-background flex min-h-svh w-full flex-1 flex-col p-4">
			<CategoriesPage
				{categories}
				{isLoading}
				{onCreateCategory}
				{onEditCategory}
				{onDeleteCategory}
			/>
		</main>
	</QueryClientProvider>
</Tooltip.Provider>
