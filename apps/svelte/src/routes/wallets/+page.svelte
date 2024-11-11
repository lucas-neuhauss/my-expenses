<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import Pencil from "lucide-svelte/icons/pencil";
	import * as Card from "$lib/components/ui/card";
	import UpsertWalletDialog from "$lib/components/upsert-wallet/upsert-wallet-dialog.svelte";
	import { formatCurrency } from "$lib/currency";
	import type { LoadWallet } from "$lib/server/data/wallet.js";

	let { data } = $props();

	let upsertDialog = $state<{
		open: boolean;
		wallet: LoadWallet | null;
	}>({
		open: false,
		wallet: null,
	});

	const handleClickEdit = (wallet: LoadWallet) => {
		console.log("[1]", wallet);
		upsertDialog = {
			open: true,
			wallet,
		};
	};

	const handleClickCreate = () => {
		console.log("[2]");
		upsertDialog = {
			open: true,
			wallet: null,
		};
	};
</script>

<svelte:head>
	<title>Wallets - My Expenses</title>
</svelte:head>

<div class="container flex flex-col gap-y-4">
	<div>
		<Button variant="outline" onclick={handleClickCreate}>Create Wallet</Button>
		<UpsertWalletDialog bind:open={upsertDialog.open} bind:wallet={upsertDialog.wallet} />
	</div>

	<div class="grid grid-cols-4 gap-4 pb-4">
		{#each data.wallets as wallet}
			<Card.Root>
				<Card.Content class="flex items-center justify-between">
					<div>
						<h3 class="mb-3 font-bold">{wallet.name}</h3>
						<p>{formatCurrency(wallet.balance)}</p>
					</div>
					<Button size="icon" variant="ghost" onclick={() => handleClickEdit(wallet)}>
						<Pencil />
					</Button>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
