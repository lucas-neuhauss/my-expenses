<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { formatCurrency } from "$lib/currency";

	let { data } = $props();
</script>

<div class="grid grid-cols-4 gap-4 px-4 pb-4">
	{#each data.wallets as wallet}
		<Card.Root>
			<Card.Header>
				<Card.Title>{wallet.name}</Card.Title>
			</Card.Header>
			<Card.Content>
				<p>{formatCurrency(wallet.balance)}</p>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
