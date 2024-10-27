<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';

	let { children, data } = $props();
</script>

<ModeWatcher />

{#if data.user}
	<Sidebar.Provider>
		<AppSidebar />
		<main>
			<Sidebar.Trigger />
			<ThemeToggle />
			{@render children()}
		</main>
	</Sidebar.Provider>
{:else}
	{@render children()}
{/if}
