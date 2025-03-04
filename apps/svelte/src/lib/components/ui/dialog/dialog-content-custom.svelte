<script lang="ts">
	import { Dialog, type WithoutChildrenOrChild } from "bits-ui";
	import { fly } from "svelte/transition";
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils";
 
	let {
		ref = $bindable(null),
    class: className,
		children,
		...restProps
	}: WithoutChildrenOrChild<Dialog.ContentProps> & {
		children?: Snippet;
	} = $props();
</script>

<Dialog.Content forceMount bind:ref {...restProps}>
  {#snippet child({ props, open })}
    {#if open}
      <div {...props} transition:fly={{ duration: 100 }} class={cn("bg-background fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg sm:rounded-lg", className)}>
				{@render children?.()}
      </div>
    {/if}
  {/snippet}
</Dialog.Content>
