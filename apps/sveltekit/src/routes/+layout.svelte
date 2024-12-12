<script lang="ts">
	import AppSidebar from "$lib/components/app-sidebar.svelte";
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { Toaster } from "$lib/components/ui/sonner";
	import { USER_ADMIN_ID } from "$lib/user";
	import dayjs from "dayjs";
	import localizedFormat from "dayjs/plugin/localizedFormat";
	import { ModeWatcher } from "mode-watcher";
	import "../app.css";

	let { children, data } = $props();

	let isAdmin = data.user?.id === USER_ADMIN_ID;
	dayjs.extend(localizedFormat);
</script>

<svelte:head>
	<title>My Expenses</title>
</svelte:head>

<ModeWatcher />

<Toaster />
{#if data.user}
	<Sidebar.Provider>
		<AppSidebar {isAdmin} />
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
