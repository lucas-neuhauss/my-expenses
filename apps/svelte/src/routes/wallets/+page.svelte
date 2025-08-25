<script lang="ts">
	import ConfirmDialog from "$lib/components/confirm-dialog-remote.svelte";
	import ToastEffect from "$lib/components/toast-effect.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import UpsertWalletDialog from "$lib/components/upsert-wallet/upsert-wallet-dialog.svelte";
	import { formatCurrency } from "$lib/currency";
	import { deleteWalletAction } from "$lib/remote/wallet.remote";
	import Pencil from "@lucide/svelte/icons/pencil";
	import Trash from "@lucide/svelte/icons/trash";
	import { toast } from "svelte-sonner";

	let { data } = $props();
	let walletToDelete = $state<(typeof data)["wallets"][number] | null>(null);
	let upsertWalletDialog = $state({
		open: false,
		wallet: null as (typeof data)["wallets"][number] | null,
	});
</script>

<svelte:head>
	<title>Wallets - My Expenses</title>
</svelte:head>

<ToastEffect />

<div class="container flex flex-col gap-y-4 px-8">
	<div>
		<Button
			onclick={() => (upsertWalletDialog = { open: true, wallet: null })}
			autofocus
			variant="outline"
		>
			Create Wallet
		</Button>
		<UpsertWalletDialog
			open={upsertWalletDialog.open}
			wallet={upsertWalletDialog.wallet}
		/>
	</div>

	<ConfirmDialog
		open={!!walletToDelete}
		onOpenChange={(o) => {
			if (!o) walletToDelete = null;
		}}
		title="Are you sure?"
		description="Are you sure you want to delete this wallet?"
		remoteCommand={async () => {
			if (!walletToDelete) return;
			try {
				const res = await deleteWalletAction(walletToDelete.id);
				if (!res) throw Error();
				toast[res.success ? "success" : "error"](res.message);
				walletToDelete = null;
			} catch {
				toast.error("Something went wrong. Please try again later.");
			}
		}}
	/>

	<div
		class="grid grid-cols-1 gap-2 pb-10 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-3 xl:grid-cols-4"
	>
		{#each data.wallets as w (w.id)}
			<Card.Root class="py-6">
				<Card.Content class="flex items-center justify-between">
					<div>
						<h3 class="mb-3 font-bold">{w.name}</h3>
						<p>{formatCurrency(w.balance)}</p>
					</div>
					<div class="flex items-center gap-1 lg:gap-2">
						<Button
							onclick={() => (upsertWalletDialog = { open: true, wallet: w })}
							title="Edit wallet"
							size="icon"
							variant="ghost"
						>
							<Pencil />
						</Button>
						<Button
							onclick={() => (walletToDelete = w)}
							title="Delete wallet"
							aria-label="delete wallet"
							variant="ghost"
							class="size-8 p-0 [&_svg]:size-3.5"
						>
							<Trash />
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
