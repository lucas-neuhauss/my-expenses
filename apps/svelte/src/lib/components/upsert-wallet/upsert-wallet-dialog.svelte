<script lang="ts">
	import { goto } from "$app/navigation";
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

	let formErrors: Record<string, string> = $state({});
	$effect(() => {
		if (open) formErrors = {};
	});

	let isUpdate = $derived(wallet !== null);
</script>

<Dialog.Root
	{open}
	onOpenChange={(o) => {
		if (!o) goto("/wallets");
	}}
>
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
						goto("/wallets");
					} else {
						if (res.errorType === "ParseError") {
							formErrors = res.formErrors;
						} else {
							throw Error();
						}
					}
				} catch {
					toast.error("Something went wrong. Please try again later.");
				}
			})}
			class="flex flex-col gap-4 py-4 [&>div]:flex [&>div]:flex-col [&>div]:justify-items-end [&>div]:gap-2"
		>
			<input hidden name="id" value={wallet?.id} />

			<Label for="wallet-name-input">Name</Label>
			<Input
				placeholder="Name"
				name="name"
				id="wallet-name-input"
				value={wallet?.name}
				required
			/>
			{#if formErrors.name}
				<p class="text-sm text-red-400">{formErrors.name}</p>
			{/if}

			<Label for="wallet-initialbalance-input">Initial Balance</Label>
			<Input
				id="wallet-initialbalance-input"
				name="initialBalance"
				placeholder="R$ 0.00"
				type="number"
				step="0.01"
				value={wallet?.initialBalance}
			/>
			{#if formErrors.initialBalance}
				<p class="text-sm text-red-400">{formErrors.initialBalance}</p>
			{/if}

			<Dialog.Footer class="mt-2">
				<Button type="submit" class="ml-auto">Save</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
