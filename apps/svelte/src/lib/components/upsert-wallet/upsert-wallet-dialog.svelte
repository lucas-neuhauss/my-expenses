<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { upsertWalletAction } from "$lib/remote/wallet.remote";
	import type { LoadWallet } from "$lib/server/data/wallet";
	import { toast } from "svelte-sonner";

	let {
		open = $bindable(),
		wallet,
	}: {
		open: boolean;
		wallet: LoadWallet | null;
	} = $props();

	$effect(() => {
		if (open) {
			if (wallet) {
				upsertWalletAction.fields.set({
					id: wallet.id.toString(),
					name: wallet.name,
					initialBalance: wallet.initialBalance.toString(),
				});
			} else {
				upsertWalletAction.fields.set({
					id: "",
					name: "",
					initialBalance: "",
				});
			}
		}
	});

	let isUpdate = $derived(wallet !== null);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>
				{isUpdate ? "Update Wallet" : "Create Wallet"}
			</Dialog.Title>
		</Dialog.Header>

		<form
			{...upsertWalletAction.enhance(async ({ form, submit }) => {
				try {
					await submit();
					const res = upsertWalletAction.result;
					if (!res) throw Error();

					if (res.success) {
						form.reset();
						toast.success(res.message);
						open = false;
					} else {
						throw Error();
					}
				} catch {
					toast.error("Something went wrong. Please try again later.");
				}
			})}
			class="flex flex-col gap-4 py-4 [&>div]:flex [&>div]:flex-col [&>div]:justify-items-end [&>div]:gap-2"
		>
			<input {...upsertWalletAction.fields.id.as("text")} hidden />

			<Label for="wallet-name-input">Name</Label>
			<Input {...upsertWalletAction.fields.name.as("text")} placeholder="Name" required />
			{#each upsertWalletAction.fields.name.issues() as issue (issue.message)}
				<p class="text-sm text-red-400">{issue.message}</p>
			{/each}

			<Label for="wallet-initialbalance-input">Initial Balance</Label>
			<Input
				{...upsertWalletAction.fields.initialBalance.as("text")}
				placeholder="R$ 0.00"
				type="number"
				step="0.01"
			/>
			{#each upsertWalletAction.fields.initialBalance.issues() as issue (issue.message)}
				<p class="text-sm text-red-400">{issue.message}</p>
			{/each}

			<Dialog.Footer class="mt-2">
				<Button type="submit" class="ml-auto">Save</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
