<script lang="ts">
	import { Skeleton } from "$lib/components/ui/skeleton";
	import * as Table from "$lib/components/ui/table";
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-26.5">Date</Table.Head>
			<Table.Head>Description</Table.Head>
			<Table.Head>Category</Table.Head>
			<Table.Head>Wallet</Table.Head>
			<Table.Head>Amount</Table.Head>
			<Table.Head class="w-18">Paid</Table.Head>
			<Table.Head class="w-24">Actions</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each { length: 6 } as _, i (i)}
			<Table.Row>
				<Table.Cell>
					<Skeleton class="h-4 w-20" />
				</Table.Cell>
				<Table.Cell>
					<Skeleton class="h-4 w-32" />
				</Table.Cell>
				<Table.Cell>
					<div class="flex items-center gap-x-4">
						<Skeleton class="h-5 w-5 rounded-full" />
						<Skeleton class="h-4 w-20" />
					</div>
				</Table.Cell>
				<Table.Cell>
					<Skeleton class="h-4 w-16" />
				</Table.Cell>
				<Table.Cell>
					<Skeleton class="h-4 w-20" />
				</Table.Cell>
				<Table.Cell>
					<Skeleton class="h-4 w-6" />
				</Table.Cell>
				<Table.Cell class="flex items-center gap-2">
					<Skeleton class="h-8 w-8" />
					<Skeleton class="h-8 w-8" />
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
