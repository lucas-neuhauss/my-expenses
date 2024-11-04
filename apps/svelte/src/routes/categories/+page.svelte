<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash from "lucide-svelte/icons/trash";

	let { data } = $props();
</script>

<div class="container flex flex-col gap-y-4">
	{#each data.nestedCategories as category}
		<Card.Root class="w-full">
			<Card.Content class="flex items-center justify-between p-5 pt-3">
				<div class="flex flex-col items-center justify-between">
					<div class="flex items-center gap-x-3">
						<img
							alt="category icon"
							src={`/images/category/${category.iconName}`}
							width="20"
							height="20"
						/>
						<p>{category.name}</p>
					</div>
				</div>
				<div>
					<Button size="icon" variant="ghost">
						<Pencil />
					</Button>
					<Button size="icon" variant="ghost">
						<Trash />
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
