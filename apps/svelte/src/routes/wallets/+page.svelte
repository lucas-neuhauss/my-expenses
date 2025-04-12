<script lang="ts">
	import { page } from "$app/state";
	import ConfirmDialogNew from "$lib/components/confirm-dialog-new.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import UpsertWalletDialog from "$lib/components/upsert-wallet/upsert-wallet-dialog.svelte";
	import { formatCurrency } from "$lib/currency";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash from "lucide-svelte/icons/trash";
	import ToastEffect from "$lib/components/toast-effect.svelte";

	let { data } = $props();
	let updateId = $derived(page.url.searchParams.get("id"));
	let wallet = $derived.by(() => {
		const id = updateId;
		if (id === null || id === "new") return null;
		return data.wallets.find((w) => w.id === Number(id)) ?? null;
	});
	let isDelete = $derived(page.url.searchParams.get("delete") === "true");
	let upsertDialogOpen = $derived(!isDelete && (!!wallet || updateId === "new"));
	let deleteConfirmOpen = $derived(isDelete && !!wallet);
</script>

<svelte:head>
	<title>Wallets - My Expenses</title>
</svelte:head>

<ToastEffect />

<div class="container flex flex-col gap-y-4">
	<div>
		<Button autofocus variant="outline" href="/wallets?id=new">Create Wallet</Button>
		<UpsertWalletDialog open={upsertDialogOpen} {wallet} />
	</div>

	<div
		class="grid grid-cols-1 gap-2 pb-4 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-3 xl:grid-cols-4"
	>
		{#each data.wallets as w (w.id)}
			<Card.Root>
				<Card.Content class="flex items-center justify-between">
					<div>
						<h3 class="mb-3 font-bold">{w.name}</h3>
						<p>{formatCurrency(w.balance)}</p>
					</div>
					<div class="flex items-center gap-1 lg:gap-2">
						<Button
							href={`/wallets?id=${w.id}`}
							title="Edit wallet"
							size="icon"
							variant="ghost"
						>
							<Pencil />
						</Button>
						<Button
							href={`/wallets?id=${w.id}&delete=true`}
							title="Delete wallet"
							aria-label="delete wallet"
							variant="ghost"
							class="size-8 p-0 [&_svg]:size-3.5"
						>
							<Trash />
						</Button>
						<ConfirmDialogNew
							open={deleteConfirmOpen && w.id === wallet?.id}
							successRedirect="/wallets"
							title="Are you sure?"
							description="Are you sure you want to delete this wallet?"
							formProps={{
								action: `?/delete-wallet&id=${w.id}`,
								method: "post",
							}}
						/>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
