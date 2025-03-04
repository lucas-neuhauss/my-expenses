<script lang="ts">
	import { Dialog, type WithoutChildrenOrChild } from "bits-ui";
	import { fade } from "svelte/transition";
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";
 
	let {
		ref = $bindable(null),
    class: className,
		duration = 100,
		children,
		...restProps
	}: WithoutChildrenOrChild<Dialog.OverlayProps> & {
		duration?: number;
		children?: Snippet;
	} = $props();
</script>
 
<Dialog.Overlay forceMount bind:ref class={cn("bg-black/80 fixed inset-0 z-50", className)} {...restProps}>
	{#snippet child({ props, open })}
		{#if open}
			<div {...props} transition:fade={{ duration }}>
				{@render children?.()}
			</div>
		{/if}
	{/snippet}
</Dialog.Overlay>

