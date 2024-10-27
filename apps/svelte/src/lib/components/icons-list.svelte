<script lang="ts">
	const imageModules: Record<string, { default: string }> = import.meta.glob(
		'$lib/assets/categories/*.{avif,gif,heif,jpeg,jpg,png,tiff,webp,svg}',
		{ eager: true, query: { enhanced: true } }
	);
</script>

{#each Object.entries(imageModules) as [, module]}
	<enhanced:img src={module.default} alt={`category icon`} width="26" height="26" />
{/each}
