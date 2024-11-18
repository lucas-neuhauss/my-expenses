<script lang="ts">
	import { CATEGORY_ICON_LIST } from "$lib/categories";
	import { buttonVariants } from "$lib/components/ui/button";
	import * as Popover from "$lib/components/ui/popover";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { cn } from "$lib/utils.js";

	let {
		icon,
		onSelect,
	}: {
		icon: string;
		onSelect: (icon: string) => void;
	} = $props();

	let open = $state(false);
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class="flex size-9 items-center justify-center rounded-full bg-sky-800 hover:bg-sky-700"
	>
		<img src={`/images/category/${icon}`} alt="category icon" class="size-5" />
	</Popover.Trigger>
	<Popover.Content side="right">
		{#snippet child({ props })}
			<ScrollArea {...props} class={cn((props as any).class, "h-[400px] w-[320px]")}>
				<div class="grid grid-cols-6 gap-2">
					{#each CATEGORY_ICON_LIST as icon}
						<button
							class={buttonVariants({
								variant: "secondary",
								class: "h-auto w-auto self-center justify-self-center rounded-full p-2",
							})}
							onclick={() => {
								onSelect(icon);
								open = false;
							}}
						>
							<img
								src={`/images/category/${icon}`}
								alt="category icon"
								width="26"
								height="26"
							/>
						</button>
					{/each}
				</div>
			</ScrollArea>
		{/snippet}
	</Popover.Content>
</Popover.Root>
