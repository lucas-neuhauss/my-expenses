<script lang="ts">
	import Check from "lucide-svelte/icons/check";
	import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
	import { tick } from "svelte";
	import * as Command from "$lib/components/ui/command";
	import * as Popover from "$lib/components/ui/popover";
	import { Button } from "$lib/components/ui/button";
	import { cn } from "$lib/utils.js";
	import type { NestedCategory } from "$lib/utils/category";

	let {
		value = $bindable(),
		categories,
		onChange,
		includeAllCategoriesOption = false,
		style,
	}: {
		value?: number;
		categories: NestedCategory[];
		onChange?: (id: number) => void;
		includeAllCategoriesOption?: boolean;
		style?: string;
	} = $props();
	const ALL_CATEGORIES_VALUE = -1;

	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);

	let flatCategories = $derived(getFlatCategories(categories));
	let selectedCategory = $derived(flatCategories.find((item) => item.id === value));

	// We want to refocus the trigger button when the user selects
	// an item from the list so users can continue navigating the
	// rest of the form with the keyboard.
	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}

	type SelectedCategory = {
		id: number;
		name: string;
		icon: string;
		isChild: boolean;
	};
	function getFlatCategories(categories: NestedCategory[], hideChildren = false) {
		return categories.reduce<SelectedCategory[]>((acc, cur) => {
			acc.push({ ...cur, isChild: false });
			if (cur.children && !hideChildren) {
				acc.push(...cur.children.map((c) => ({ ...c, isChild: true })));
			}
			return acc;
		}, []);
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				variant="outline"
				class="justify-between"
				{style}
				{...props}
				role="combobox"
				aria-expanded={open}
			>
				<span class="flex items-center gap-2">
					{#if selectedCategory}
						<img
							src={`/images/category/${selectedCategory.icon}`}
							alt="category icon"
							width="14"
							height="14"
						/>
						{selectedCategory.name || "Select a category"}
					{:else if value === -1 && includeAllCategoriesOption}
						All categories
					{:else}
						Select a category
					{/if}
				</span>
				<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[var(--bits-floating-anchor-width)] p-0">
		<Command.Root>
			<Command.Input placeholder="Search category" class="h-9" />
			<Command.List>
				<Command.Empty>No framework found.</Command.Empty>
				<Command.Group>
					{#if includeAllCategoriesOption}
						<Command.Item
							value="All categories"
							onSelect={() => {
								value = ALL_CATEGORIES_VALUE;
								closeAndFocusTrigger();
								onChange?.(ALL_CATEGORIES_VALUE);
							}}
						>
							<Check
								class={cn(
									"mr-2 size-4",
									value !== ALL_CATEGORIES_VALUE && "text-transparent",
								)}
							/>
							<!-- <img -->
							<!-- 	src={`/images/category/${category.icon}`} -->
							<!-- 	alt="category icon" -->
							<!-- 	width="14" -->
							<!-- 	height="14" -->
							<!-- /> -->
							All categories
						</Command.Item>
					{/if}
					{#each flatCategories as category}
						<Command.Item
							value={category.name}
							onSelect={() => {
								value = category.id;
								closeAndFocusTrigger();
								onChange?.(category.id);
							}}
						>
							<Check
								class={cn("mr-2 size-4", value !== category.id && "text-transparent")}
							/>
							{#if category.isChild}
								<span> {"• "}</span>
							{/if}
							<img
								src={`/images/category/${category.icon}`}
								alt="category icon"
								width="14"
								height="14"
							/>
							{category.name}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
