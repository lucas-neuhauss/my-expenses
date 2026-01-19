<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import type { SubscriptionWithRelations } from "$lib/server/data/subscription";
	import type { NestedCategory } from "$lib/utils/category";
	import UpsertSubscriptionForm from "./upsert-subscription-form.svelte";

	let {
		open = $bindable(),
		subscription = $bindable(),
		wallets,
		categories,
	}: {
		open: boolean;
		subscription: SubscriptionWithRelations | null;
		wallets: Array<{ id: number; name: string }>;
		categories: NestedCategory[];
	} = $props();
	let isUpdate = $derived(subscription !== null);

	const onSuccess = () => {
		open = false;
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-106">
		<Dialog.Header>
			<Dialog.Title>
				{isUpdate ? "Update Subscription" : "Create Subscription"}
			</Dialog.Title>
		</Dialog.Header>
		<UpsertSubscriptionForm {subscription} {wallets} {categories} {onSuccess} />
	</Dialog.Content>
</Dialog.Root>
