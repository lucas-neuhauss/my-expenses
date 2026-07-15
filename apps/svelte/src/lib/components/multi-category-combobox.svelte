<script lang="ts">
	import Check from "@lucide/svelte/icons/check";
	import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
	import { tick } from "svelte";
	import * as Command from "$lib/components/ui/command";
	import * as Popover from "$lib/components/ui/popover";
	import { Button } from "$lib/components/ui/button";
	import { cn } from "$lib/utils.js";
	import type { NestedCategory } from "$lib/utils/category";

	let {
		value = [],
		categories,
		onChange,
		style,
	}: {
		value?: number[];
		categories: NestedCategory[];
		onChange?: (ids: number[]) => void;
		style?: string;
	} = $props();

	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement | null>(null);

	// Flatten categories for display with indentation
	type FlatCategory = {
		id: number;
		name: string;
		icon: string;
		isChild: boolean;
	};
	let flatCategories = $derived(
		categories.reduce<FlatCategory[]>((acc, cur) => {
			acc.push({ id: cur.id, name: cur.name, icon: cur.icon, isChild: false });
			for (const child of cur.children) {
				acc.push({ id: child.id, name: child.name, icon: child.icon, isChild: true });
			}
			return acc;
		}, []),
	);

	let selectedCount = $derived(value?.length ?? 0);
	let displayText = $derived(
		selectedCount === 0
			? "All categories"
			: selectedCount === 1
				? flatCategories.find((c) => c.id === value[0])?.name ?? "1 category"
				: `${selectedCount} categories`,
	);

	function toggleCategory(catId: number) {
		const current = value ?? [];
		const updated = current.includes(catId)
			? current.filter((id) => id !== catId)
			: [...current, catId];
		onChange?.(updated);
	}

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef?.focus();
		});
	}

	function clearAll() {
		onChange?.([]);
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				variant="outline"
				{style}
				role="combobox"
				aria-expanded={open}
				{...props}
				class="justify-between font-normal"
				title="Select categories"
			>
				<span class="truncate">{displayText}</span>
				<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-(--bits-floating-anchor-width) p-0">
		<Command.Root>
			<Command.Input placeholder="Search categories" class="h-9" />
			<Command.List>
				<Command.Empty>No categories found.</Command.Empty>
				<Command.Group>
					{#if selectedCount > 0}
						<Command.Item onSelect={clearAll} class="text-muted-foreground text-sm">
							Clear all ({selectedCount})
						</Command.Item>
					{/if}
					{#each flatCategories as category (category.id)}
						{@const isSelected = (value ?? []).includes(category.id)}
						<Command.Item
							value={category.name}
							onSelect={() => toggleCategory(category.id)}
						>
							<Check
								class={cn(
									"mr-2 size-4",
									!isSelected && "text-transparent",
								)}
							/>
							{#if category.isChild}
								<span class="text-muted-foreground">• </span>
							{/if}
							<img
								src={`/images/category/${category.icon}`}
								alt="category icon"
								width="14"
								height="14"
							/>
							<span>{category.name}</span>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
