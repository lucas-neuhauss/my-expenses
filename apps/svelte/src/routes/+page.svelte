<script lang="ts">
	import { enhance } from '$app/forms';
	import { DateFormatter } from '@internationalized/date';
	import { formatCurrency } from '$lib/currency';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();
</script>

{#if data.transactions.length > 0}
	<Table.Root>
		<Table.Caption>A list transactions.</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-[100px]">Date</Table.Head>
				<Table.Head>Description</Table.Head>
				<Table.Head>Category</Table.Head>
				<Table.Head>Wallet</Table.Head>
				<Table.Head class="text-right">Amount</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.transactions as t}
				<Table.Row>
					<Table.Cell class="font-medium"
						>{new DateFormatter('en-US').format(t.timestamp)}
					</Table.Cell>
					<Table.Cell>{t.description}</Table.Cell>
					<Table.Cell>{t.category.title}</Table.Cell>
					<Table.Cell>{t.wallet.name}</Table.Cell>
					<Table.Cell class="text-right">{formatCurrency(t.cents)}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}

<form class="mt-4 p-4" action="?/upsert-transaction" method="post" use:enhance>
	<input type="hidden" name="wallet" value="1" />
	<input type="hidden" name="type" value="expense" />
	<input type="hidden" name="category" value="1" />

	<fieldset class="mb-4 flex items-center gap-5">
		<label class="w-[90px] text-right text-black" for="timestamp">Timestamp</label>
		<input
			class="inline-flex h-8 w-full flex-1 items-center justify-center rounded-sm border border-solid px-3 leading-none text-black"
			id="timestamp"
			type="datetime-local"
			name="timestamp"
		/>
	</fieldset>

	<fieldset class="mb-4 flex items-center gap-5">
		<label class="w-[90px] text-right text-black" for="cents">Cents</label>
		<input
			class="inline-flex h-8 w-full flex-1 items-center justify-center rounded-sm border border-solid px-3 leading-none text-black"
			id="cents"
			type="number"
			name="cents"
		/>
	</fieldset>

	<div class="mt-6 flex justify-end gap-4">
		<Button type="button" variant="outline">Cancel</Button>
		<Button type="submit">Save changes</Button>
	</div>
</form>

<form method="post" action="/logout?/logout" use:enhance>
	<Button variant="ghost">Sign out</Button>
</form>
