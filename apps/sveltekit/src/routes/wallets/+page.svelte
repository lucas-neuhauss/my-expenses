<script lang="ts">
	import ConfirmDialog from "$lib/components/confirm-dialog.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import UpsertWalletDialog from "$lib/components/upsert-wallet/upsert-wallet-dialog.svelte";
	import { formatCurrency } from "$lib/currency";
	import type { LoadWallet } from "$lib/server/data/wallet.js";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash from "lucide-svelte/icons/trash";
	import { toast } from "svelte-sonner";

	let { data, form } = $props();

	let upsertDialog = $state<{
		open: boolean;
		wallet: LoadWallet | null;
	}>({
		open: false,
		wallet: null,
	});

	$effect(() => {
		if (!!form && !form.ok) {
			toast.error(form.message ?? "Something went wrong");
		}
	});

	const handleClickEdit = (wallet: LoadWallet) => {
		upsertDialog = {
			open: true,
			wallet,
		};
	};

	const handleClickCreate = () => {
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
		<Button autofocus variant="outline" onclick={handleClickCreate}>Create Wallet</Button>
		<UpsertWalletDialog bind:open={upsertDialog.open} bind:wallet={upsertDialog.wallet} />
	</div>

	<div
		class="grid grid-cols-1 gap-2 pb-4 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-3 xl:grid-cols-4"
	>
		{#each data.wallets as wallet}
			<Card.Root>
				<Card.Content class="flex items-center justify-between">
					<div>
						<h3 class="mb-3 font-bold">{wallet.name}</h3>
						<p>{formatCurrency(wallet.balance)}</p>
					</div>
					<div class="flex items-center gap-1 lg:gap-2">
						<Button size="icon" variant="ghost" onclick={() => handleClickEdit(wallet)}>
							<Pencil />
						</Button>
						<ConfirmDialog
							title="Are you sure?"
							description="Are you sure you want to delete this wallet?"
							formProps={{
								action: `?/delete-wallet&id=${wallet.id}`,
								method: "post",
							}}
						>
							{#snippet triggerChild({ props })}
								<Button
									title="Delete wallet"
									aria-label="delete wallet"
									variant="ghost"
									class="size-8 p-0 [&_svg]:size-3.5"
									{...props}
								>
									<Trash />
								</Button>
							{/snippet}
						</ConfirmDialog>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
