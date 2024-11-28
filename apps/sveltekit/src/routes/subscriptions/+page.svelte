<script lang="ts">
	import ConfirmDialog from "$lib/components/confirm-dialog.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { formatCurrency } from "$lib/currency";
	import type { Subscription } from "$lib/server/db/schema";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash from "lucide-svelte/icons/trash";

	let { data } = $props();

	let upsertDialog = $state<{
		open: boolean;
		subscription: Subscription | null;
	}>({
		open: false,
		subscription: null,
	});

	const handleClickCreate = () => {
		upsertDialog = {
			open: true,
			subscription: null,
		};
	};

	const handleClickEdit = (subscription: any) => {
		upsertDialog = {
			open: true,
			subscription,
		};
	};
</script>

<svelte:head>
	<title>Subscriptions - My Expenses</title>
</svelte:head>

<div class="container flex flex-col gap-y-4">
	<div>
		<Button autofocus variant="outline" onclick={handleClickCreate}
			>Create Subscription</Button
		>
	</div>

	<div
		class="grid grid-cols-1 gap-2 pb-4 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-3 xl:grid-cols-4"
	>
		{#each data.subscriptions as subscription}
			<Card.Root>
				<Card.Content class="flex items-center justify-between">
					<div>
						<h3 class="mb-3 font-bold">{subscription.name}</h3>
						<p>{formatCurrency(subscription.cents)}</p>
					</div>
					<div class="flex items-center gap-1 lg:gap-2">
						<Button
							size="icon"
							variant="ghost"
							onclick={() => handleClickEdit(subscription)}
						>
							<Pencil />
						</Button>
						<ConfirmDialog
							title="Are you sure?"
							description="Are you sure you want to delete this subscription?"
							formProps={{
								action: `?/delete-subscription&id=${subscription.id}`,
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
