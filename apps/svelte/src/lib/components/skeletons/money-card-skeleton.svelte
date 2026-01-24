<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Skeleton } from "$lib/components/ui/skeleton";
</script>

<div class="flex flex-wrap justify-center gap-4 sm:justify-start">
	{#each { length: 4 } as _item, i (i)}
		<Card.Root class="w-50 gap-0 p-0">
			<Card.Header class="p-5 pb-0">
				<Skeleton class="h-4 w-24" />
			</Card.Header>
			<Card.Content class="px-5 pt-3 pb-4">
				<Skeleton class="h-6 w-28" />
			</Card.Content>
		</Card.Root>
	{/each}
</div>
