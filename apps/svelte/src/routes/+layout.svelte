<script lang="ts">
	import Sidebar from '$lib/components/sidebar/sidebar.svelte';
	import '../app.css';
	let { children, data } = $props();
</script>

{#if data.user}
	<div class="flex min-h-svh w-full">
		<Sidebar />
		<main class="flex flex-col min-h-svh flex-1">
			{@render children()}
		</main>
	</div>
{:else}
	{@render children()}
{/if}
