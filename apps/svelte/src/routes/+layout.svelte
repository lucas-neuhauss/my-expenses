<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar";
	import AppSidebar from "$lib/components/app-sidebar.svelte";
	import "../app.css";
	import { ModeWatcher } from "mode-watcher";
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import dayjs from "dayjs";
	import localizedFormat from "dayjs/plugin/localizedFormat";

	dayjs.extend(localizedFormat);

	let { children, data } = $props();
</script>

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
