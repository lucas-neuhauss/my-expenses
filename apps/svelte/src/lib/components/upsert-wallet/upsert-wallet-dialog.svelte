<script lang="ts">
	import { goto } from "$app/navigation";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Form from "$lib/components/ui/form";
	import { Input } from "$lib/components/ui/input";
	import type { LoadWallet } from "$lib/server/data/wallet";
	import { omit } from "es-toolkit";
	import SuperDebug, { defaults, superForm } from "sveltekit-superforms";
	import { zod, zodClient } from "sveltekit-superforms/adapters";
	import { upsertWalletSchema } from "./upsert-wallet-schema";

	let {
		open,
		wallet,
	}: {
		open: boolean;
		wallet: LoadWallet | null;
	} = $props();
	const form = superForm(defaults(wallet, zod(upsertWalletSchema)), {
		validators: zodClient(upsertWalletSchema),
		onUpdated({ form }) {
			if (form.message) {
				// Close the dialog on success
				if (form.message.type === "success") {
					goto("/wallets");
				}
			}
		},
	});
	const { form: formData, enhance, reset } = form;

	let isUpdate = $derived(wallet !== null);

	$effect(() => {
		reset({ data: wallet ? omit(wallet, ["balance"]) : undefined });
	});
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
			use:enhance
			method="post"
			action="?/upsert-wallet"
			class="flex flex-col gap-4 py-4 [&>div]:flex [&>div]:flex-col [&>div]:justify-items-end [&>div]:gap-2"
		>
			<input hidden name="id" bind:value={$formData.id} />

			<Form.Field {form} name="name">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Name</Form.Label>
						<Input {...props} bind:value={$formData.name} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="initialBalance">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Initial Balance</Form.Label>
						<Input
							placeholder="R$ 0.00"
							type="number"
							step="0.01"
							{...props}
							bind:value={$formData.initialBalance}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Dialog.Footer class="mt-2">
				<Form.Button class="ml-auto">Save</Form.Button>
			</Dialog.Footer>
		</form>
		<SuperDebug data={$formData} display={false} />
	</Dialog.Content>
</Dialog.Root>
