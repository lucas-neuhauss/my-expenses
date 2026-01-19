<script lang="ts">
	import AppSidebar from "$lib/components/app-sidebar.svelte";
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { Toaster } from "$lib/components/ui/sonner";
	import dayjs from "dayjs";
	import localizedFormat from "dayjs/plugin/localizedFormat";
	import { ModeWatcher } from "mode-watcher";
	import "../app.css";
	import { Tooltip } from "bits-ui";
	import { NuqsAdapter } from "nuqs-svelte/adapters/svelte-kit";
	import { QueryClientProvider } from "@tanstack/svelte-query";
	import {
		queryClient,
		initializeQueryPersistence,
	} from "$lib/integrations/tanstack-query/query-client";
	import { SvelteQueryDevtools } from "@tanstack/svelte-query-devtools";
	import { onMount } from "svelte";
	dayjs.extend(localizedFormat);

	onMount(() => {
		initializeQueryPersistence();
	});

	let { children, data } = $props();
	let isAdmin = true;
	let email = $derived(data.user?.email ?? "");
</script>

<svelte:head>
	<title>My Expenses</title>
	<meta
		name="description"
		content="Simple expense tracking app to manage your personal finances. Track income, expenses, and budgets across multiple wallets and categories."
	/>
</svelte:head>

<ModeWatcher />

<Toaster position="top-center" richColors />
<Tooltip.Provider>
	<NuqsAdapter>
		<QueryClientProvider client={queryClient}>
			<SvelteQueryDevtools />
			{#if data.user}
				<Sidebar.Provider open={data.sidebarOpen}>
					<AppSidebar {isAdmin} {email} />
					<main class="flex min-h-svh w-screen flex-1 flex-col">
						<header class="flex items-center justify-between p-4">
							<Sidebar.Trigger />
							<ThemeToggle />
						</header>
						{@render children()}
					</main>
				</Sidebar.Provider>
			{:else}
				<main class="flex h-screen w-screen items-center justify-center px-4">
					{@render children()}
				</main>
			{/if}
		</QueryClientProvider>
	</NuqsAdapter>
</Tooltip.Provider>
