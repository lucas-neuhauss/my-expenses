<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import { buttonVariants } from "$lib/components/ui/button";
	import UpsertWalletForm from "./upsert-wallet-form.svelte";
	import { page } from "$app/stores";

	let open = $state(false);

	$effect(() => {
		if ($page.form && $page.form.ok) {
			open = false;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: "outline" })}>
		Create Wallet
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Create Wallet</Dialog.Title>
		</Dialog.Header>

		<UpsertWalletForm />
	</Dialog.Content>
</Dialog.Root>
