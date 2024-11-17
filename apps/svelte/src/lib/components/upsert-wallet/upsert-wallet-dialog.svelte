<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import * as Dialog from "$lib/components/ui/dialog";
	import { enhance } from "$app/forms";
	import { Input } from "$lib/components/ui/input";
	import { Button } from "$lib/components/ui/button";
	import { Label } from "$lib/components/ui/label";
	import type { LoadWallet } from "$lib/server/data/wallet";

	let {
		open = $bindable(),
		wallet = $bindable(),
	}: {
		open: boolean;
		wallet: LoadWallet | null;
	} = $props();
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
			use:enhance={({ formElement }) => {
				return ({ result }) => {
					if (result.type === "success") {
						open = false;
						invalidateAll();
						formElement.reset();
					}
				};
			}}
			method="post"
			action="?/upsert-wallet"
			class="flex flex-col gap-4 py-4 [&>div]:flex [&>div]:flex-col [&>div]:justify-items-end [&>div]:gap-2"
		>
			<input hidden name="id" readonly value={wallet ? wallet.id : "new"} />
			<div>
				<Label for="name">Name</Label>
				<Input required id="name" name="name" value={wallet?.name} />
			</div>
			<Dialog.Footer class="mt-2">
				<Button type="submit" class="ml-auto">Save</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
