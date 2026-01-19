<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Skeleton } from "$lib/components/ui/skeleton";
</script>

<div
	class="grid grid-cols-1 gap-2 pb-10 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-3 xl:grid-cols-4"
>
	{#each { length: 4 } as _, i (i)}
		<Card.Root class="py-6">
			<Card.Content class="flex items-center justify-between">
				<div>
					<Skeleton class="mb-3 h-5 w-24" />
					<Skeleton class="h-4 w-20" />
				</div>
				<div class="flex items-center gap-2">
					<Skeleton class="size-8" />
					<Skeleton class="size-8" />
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
