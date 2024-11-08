<script lang="ts">
	import AppSidebar from "$lib/components/app-sidebar.svelte";
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import dayjs from "dayjs";
	import localizedFormat from "dayjs/plugin/localizedFormat";
	import { ModeWatcher } from "mode-watcher";
	import "../app.css";

	let { children, data } = $props();
	dayjs.extend(localizedFormat);
</script>

<svelte:head>
	<title>My Expenses</title>
</svelte:head>

<ModeWatcher />

{#if data.user}
	<Sidebar.Provider>
		<AppSidebar />
		<main class="flex min-h-svh flex-1 flex-col">
			<header class="flex justify-between p-4">
				<Sidebar.Trigger />
				<ThemeToggle />
			</header>
			{@render children()}
		</main>
	</Sidebar.Provider>
{:else}
	{@render children()}
{/if}
