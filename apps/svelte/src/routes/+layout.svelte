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
	dayjs.extend(localizedFormat);

	let { children, data } = $props();
	let isAdmin = true;
	let email = $derived(data.user?.email ?? "");
</script>

<svelte:head>
	<title>My Expenses</title>
</svelte:head>

<ModeWatcher />

<Toaster position="top-center" />
<Tooltip.Provider>
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
</Tooltip.Provider>
