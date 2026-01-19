<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Skeleton } from "$lib/components/ui/skeleton";
</script>

<div class="flex flex-col gap-y-4">
	{#each { length: 5 } as _, i (i)}
		<Card.Root class="w-full p-0">
			<Card.Content class="flex items-center justify-between p-5 pt-3">
				<div class="flex flex-col items-start justify-between gap-3">
					<div class="mt-0.5 flex items-center justify-start gap-x-3">
						<Skeleton class="size-9 rounded-full" />
						<Skeleton class="h-4 w-24" />
					</div>
					<div class="flex flex-wrap gap-2">
						{#each { length: 2 + (i % 3) } as _, j (j)}
							<Skeleton class="h-7 w-20 rounded" />
						{/each}
					</div>
				</div>
				<div class="flex shrink-0 gap-1">
					<Skeleton class="size-8" />
					<Skeleton class="size-8" />
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
