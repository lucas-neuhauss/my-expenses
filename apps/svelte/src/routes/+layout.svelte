<script lang="ts">
	import AppSidebar from "$lib/components/app-sidebar.svelte";
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { Toaster } from "$lib/components/ui/sonner";
	import dayjs from "dayjs";
	import localizedFormat from "dayjs/plugin/localizedFormat";
	import { ModeWatcher } from "mode-watcher";
	import "../app.css";
	dayjs.extend(localizedFormat);

	let { children, data } = $props();
	let isAdmin = $derived(data.user?.role === "admin");
	let email = $derived(data.user?.email ?? "");
</script>

<svelte:head>
	<title>My Expenses</title>
</svelte:head>

<ModeWatcher />

<Toaster position="top-center" />
{#if data.user}
	<Sidebar.Provider open={data.sidebarOpen}>
		<AppSidebar {isAdmin} {email} />
		<main class="flex min-h-svh flex-1 flex-col">
			<header class="flex justify-between p-4">
				<Sidebar.Trigger />
				<ThemeToggle />
			</header>
			{@render children()}
		</main>
	</Sidebar.Provider>
{:else}
	<main class="flex h-screen w-full items-center justify-center px-4">
		{@render children()}
	</main>
{/if}
