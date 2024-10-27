<script lang="ts">
	const ITEMS = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/categories', label: 'Categories' }
	];
</script>

{#snippet SidebarItem({ href, label }: { href: string; label: string })}
	<a {href} class="p-2 hover:bg-slate-200 rounded">{label}</a>
{/snippet}

<div style:--sidebar-width="256px">
	<div class="w-[--sidebar-width] h-svh"></div>
	<div
		class="fixed left-0 top-0 bottom-0 bg-slate-50 border-r w-[--sidebar-width] flex flex-col gap-1 p-2"
	>
		{#each ITEMS as item}
			{@render SidebarItem(item)}
		{/each}
	</div>
</div>
