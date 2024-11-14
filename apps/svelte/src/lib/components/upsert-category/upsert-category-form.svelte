<script lang="ts">
	import { enhance } from "$app/forms";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Label } from "$lib/components/ui/label";
	import { Input } from "$lib/components/ui/input";
	import { Button } from "$lib/components/ui/button";
	import Trash from "lucide-svelte/icons/trash";
	import { CATEGORY_ICON_LIST } from "$lib/categories";
	import IconsList from "../icons-list.svelte";

	let {
		type,
	}: {
		type: "expense" | "income";
	} = $props();
	let categories = $state([getEmptyCategory()]);

	function getRandomIcon() {
		const randomIndex = Math.floor(Math.random() * CATEGORY_ICON_LIST.length);
		return CATEGORY_ICON_LIST[randomIndex];
	}

	function getEmptyCategory() {
		return {
			id: "new" as number | "new",
			name: "",
			icon: getRandomIcon() as string,
		};
	}

	const handleAddSubcategory = () => {
		categories.push(getEmptyCategory());
	};

	const handleDeleteSubcategory = (index: number) => {
		const clone = [...categories];
		clone.splice(index + 1, 1);
		categories = clone;
	};

	const handleSelectIcon = (icon: string) => {
		const newCategories = [...categories];
		newCategories[0] = { ...newCategories[0], icon };
		categories = newCategories;
	};

	const handleSelectSubcategoryIcon = (icon: string, index: number) => {
		const newCategories = [...categories];
		newCategories[index + 1] = {
			...newCategories[index + 1],
			icon,
		};
		categories = newCategories;
	};
</script>

<form method="post" action="?/upsert-category" use:enhance>
	<div class="mt-3">
		<p class="font-bold">Category</p>

		<input hidden name="category.type" value={type} />
		<input hidden name="category.id" value={categories[0].id} />
		<input hidden name="category.icon" value={categories[0].icon} />
		<div class="mt-2.5 flex items-center [&>div]:flex [&>div]:flex-col [&>div]:gap-2.5">
			<div>
				<Label>Icon</Label>
				<IconsList icon={categories[0].icon} onSelect={handleSelectIcon} />
			</div>

			<div class="ml-5 flex-1">
				<Label for="name">Name</Label>
				<Input id="name" name="category.name" required bind:value={categories[0].name} />
			</div>
		</div>
	</div>

	<div class="mt-5">
		<p class="font-bold">Sub-categories</p>

		{#each categories.slice(1) as c, index}
			<div class="mt-2.5 flex items-center [&>div]:flex [&>div]:flex-col [&>div]:gap-2.5">
				<input type="hidden" name={`subcategory.${index}.id`} value={c.id} />
				<input type="hidden" name={`subcategory.${index}.icon`} value={c.icon} />
				<div>
					<Label>Icon</Label>
					<IconsList
						icon={c.icon}
						onSelect={(icon) => handleSelectSubcategoryIcon(icon, index)}
					/>
				</div>

				<div class="ml-5 flex-1">
					<Label for={`subcategory.${index}.name`}>Name</Label>
					<Input
						id={`subcategory.${index}.name`}
						name={`subcategory.${index}.name`}
						bind:value={c.name}
						required
					/>
				</div>

				<Button
					title="Delete sub-category"
					aria-label="delete sub-category"
					variant="ghost"
					class="ml-2 mt-6"
					size="icon"
					onclick={() => handleDeleteSubcategory(index)}
				>
					<Trash />
				</Button>
			</div>
		{/each}

		<Button size="sm" variant="outline" class="mt-4" onclick={handleAddSubcategory}
			>Add subcategory</Button
		>
	</div>

	<Dialog.Footer>
		<Button type="submit">Save</Button>
	</Dialog.Footer>
</form>
