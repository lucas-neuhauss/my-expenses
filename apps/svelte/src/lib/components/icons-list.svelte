<script lang="ts">
	import { CATEGORY_ICON_LIST } from "$lib/categories";
	import { buttonVariants } from "$lib/components/ui/button";
	import * as Popover from "$lib/components/ui/popover";
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { cn } from "$lib/utils.js";
</script>

<Popover.Root>
	<Popover.Trigger
		class="col-span-3 flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
	>
		Category title
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
