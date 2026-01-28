<script lang="ts">
	/**
	 * Mock version of the upsert category dialog for Storybook.
	 * Doesn't use server actions.
	 */
	import { CATEGORY_ICON_LIST } from "$lib/categories";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Tabs from "$lib/components/ui/tabs";
	import type { NestedCategory } from "$lib/utils/category";
	import IconsList from "$lib/components/icons-list.svelte";

	let {
		open = $bindable(),
		category,
		currentType,
		onSave,
	}: {
		open: boolean;
		category: NestedCategory | null;
		currentType: "expense" | "income";
		onSave: (data: { name: string; icon: string }) => void;
	} = $props();

	let isUpdate = $derived(category !== null);
	let type = $state(currentType);

	function getRandomIcon() {
		const randomIndex = Math.floor(Math.random() * CATEGORY_ICON_LIST.length);
		return CATEGORY_ICON_LIST[randomIndex];
	}

	let name = $state(category?.name ?? "");
	let icon = $state(category?.icon ?? getRandomIcon());

	// Reset form when dialog opens
	$effect(() => {
		if (open) {
			name = category?.name ?? "";
			icon = category?.icon ?? getRandomIcon();
			type = category?.type ?? currentType;
		}
	});

	const handleSubmit = (e: Event) => {
		e.preventDefault();
		onSave({ name, icon });
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-106">
		<Dialog.Header>
			<Dialog.Title>
				{isUpdate ? "Update Category" : "Create Category"}
			</Dialog.Title>
		</Dialog.Header>
		<Tabs.Root value={type} onValueChange={(v) => (type = v as "expense" | "income")}>
			<Tabs.List class="w-full [&_button]:w-full">
				<Tabs.Trigger value="expense" disabled={!!category}>Expense</Tabs.Trigger>
				<Tabs.Trigger value="income" disabled={!!category}>Income</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value={type}>
				<form onsubmit={handleSubmit}>
					<div class="mt-3">
						<p class="font-bold">Category</p>
						<div
							class="mt-2.5 flex items-center [&>div]:flex [&>div]:flex-col [&>div]:gap-2.5"
						>
							<div>
								<Label>Icon</Label>
								<IconsList {icon} onSelect={(i) => (icon = i)} />
							</div>

							<div class="ml-5 flex-1">
								<Label for="name">Name</Label>
								<Input
									id="name"
									name="name"
									required
									bind:value={name}
									data-testid="category-name-input"
								/>
							</div>
						</div>
					</div>

					<Dialog.Footer class="mt-6">
						<Button type="submit" data-testid="save-button">Save</Button>
					</Dialog.Footer>
				</form>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
