<script lang="ts">
	import { enhance } from '$app/forms';
	import { DateFormatter } from '@internationalized/date';
	import { formatCurrency } from '$lib/currency';

	let { data } = $props();
</script>

{#if data.transactions.length > 0}
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Description</th>
				<th>Category</th>
				<th>Wallet</th>
				<th>Value</th>
			</tr>
		</thead>

		<tbody>
			{#each data.transactions as t}
				<tr>
					<td>{new DateFormatter('en-US').format(t.timestamp)}</td>
					<td>{t.description}</td>
					<td>{t.category.title}</td>
					<td>{t.wallet.name}</td>
					<td>{formatCurrency(t.cents)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
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
		<button
			class="inline-flex h-8 items-center justify-center rounded-sm
                    bg-zinc-100 px-4 font-medium leading-none text-zinc-600"
			type="button"
		>
			Cancel
		</button>
		<button
			class="inline-flex h-8 items-center justify-center rounded-sm
                    bg-magnum-100 px-4 font-medium leading-none text-magnum-900"
			type="submit"
		>
			Save changes
		</button>
	</div>
</form>

<form method="post" action="/logout?/logout" use:enhance>
	<button
		class="force-dark mt-4 rounded-xl bg-magnum-400 px-4 py-2 font-semibold text-magnum-900 transition hover:opacity-75 active:translate-y-0.5"
		>Sign Out</button
	>
</form>
