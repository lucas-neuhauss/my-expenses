<script lang="ts">
	import ConfirmDialog from "$lib/components/confirm-dialog-remote.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Tabs from "$lib/components/ui/tabs";
	import { UpsertSubscription } from "$lib/components/upsert-subscription";
	import { formatCurrency } from "$lib/currency";
	import {
		deleteSubscriptionAction,
		togglePauseSubscriptionAction,
	} from "$lib/remote/subscription.remote";
	import type { SubscriptionWithRelations } from "$lib/server/data/subscription";
	import { nestCategories } from "$lib/utils/category";
	import { invalidateAll } from "$app/navigation";
	import { transactionCollection } from "$lib/db-collectons/transaction-collection";
	import Pause from "@lucide/svelte/icons/pause";
	import Pencil from "@lucide/svelte/icons/pencil";
	import Play from "@lucide/svelte/icons/play";
	import Trash from "@lucide/svelte/icons/trash";
	import { toast } from "svelte-sonner";

	let { data } = $props();

	let nestedCategories = $derived(nestCategories(data.categories));
	let tab = $state<"active" | "paused">("active");

	let activeSubscriptions = $derived(data.subscriptions.filter((s) => !s.paused));
	let pausedSubscriptions = $derived(data.subscriptions.filter((s) => s.paused));
	let displayedSubscriptions = $derived(
		tab === "active" ? activeSubscriptions : pausedSubscriptions,
	);

	let upsertDialog = $state<{
		open: boolean;
		subscription: SubscriptionWithRelations | null;
	}>({
		open: false,
		subscription: null,
	});
	let deleteDialog = $state<{
		open: boolean;
		subscription: SubscriptionWithRelations | null;
	}>({
		open: false,
		subscription: null,
	});

	function getNextGenerationDate(sub: SubscriptionWithRelations): string {
		const today = new Date();
		let nextDate: Date;

		if (sub.lastGenerated === null) {
			// First generation based on start date
			const [year, month, day] = sub.startDate.split("-").map(Number);
			const startDate = new Date(year, month - 1, day);
			nextDate = getDateWithDay(
				startDate.getFullYear(),
				startDate.getMonth(),
				sub.dayOfMonth,
			);

			if (nextDate < startDate) {
				nextDate = getDateWithDay(
					startDate.getFullYear(),
					startDate.getMonth() + 1,
					sub.dayOfMonth,
				);
			}
		} else {
			const [year, month] = sub.lastGenerated.split("-").map(Number);
			nextDate = getDateWithDay(year, month, sub.dayOfMonth);
		}

		// If nextDate is in the past, show "Pending"
		if (nextDate <= today) {
			return "Pending";
		}

		return nextDate.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	function getDateWithDay(year: number, month: number, day: number): Date {
		while (month > 11) {
			month -= 12;
			year++;
		}
		const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
		const actualDay = Math.min(day, lastDayOfMonth);
		return new Date(year, month, actualDay);
	}

	async function handleTogglePause(sub: SubscriptionWithRelations) {
		try {
			const res = await togglePauseSubscriptionAction(sub.id);
			if (res?.ok) {
				toast.success(res.message);
				invalidateAll();
				// Refresh transactions when unpausing (may have generated new ones)
				if (sub.paused) {
					transactionCollection.utils.refetch();
				}
			} else {
				toast.error(res?.message ?? "Something went wrong");
			}
		} catch {
			toast.error("Something went wrong. Please try again later.");
		}
	}

	async function handleDelete() {
		if (!deleteDialog.subscription) return;
		try {
			const res = await deleteSubscriptionAction(deleteDialog.subscription.id);
			if (res?.ok) {
				toast.success(res.message);
				deleteDialog.open = false;
				invalidateAll();
			} else {
				toast.error(res?.message ?? "Something went wrong");
			}
		} catch {
			toast.error("Something went wrong. Please try again later.");
		}
	}
</script>

<svelte:head>
	<title>Subscriptions - My Expenses</title>
</svelte:head>

<UpsertSubscription
	bind:open={upsertDialog.open}
	subscription={upsertDialog.subscription}
	wallets={data.wallets}
	categories={nestedCategories}
/>

<ConfirmDialog
	open={deleteDialog.open}
	title="Are you sure?"
	description={deleteDialog.subscription
		? `Are you sure you want to delete the "${deleteDialog.subscription.name}" subscription?`
		: ""}
	remoteCommand={handleDelete}
/>

<div class="container flex flex-col gap-y-4 px-8 pb-10">
	<Tabs.Root bind:value={tab}>
		<div class="flex items-center gap-4">
			<Button
				title="Create subscription"
				autofocus
				variant="outline"
				onclick={() => (upsertDialog = { open: true, subscription: null })}
			>
				Create Subscription
			</Button>
			<Tabs.List>
				<Tabs.Trigger value="active">Active ({activeSubscriptions.length})</Tabs.Trigger>
				<Tabs.Trigger value="paused">Paused ({pausedSubscriptions.length})</Tabs.Trigger>
			</Tabs.List>
		</div>
	</Tabs.Root>

	{#if displayedSubscriptions.length === 0}
		<div class="text-muted-foreground mt-10 text-center">
			{tab === "active"
				? "No active subscriptions. Create one to get started!"
				: "No paused subscriptions."}
		</div>
	{:else}
		{#each displayedSubscriptions as subscription (subscription.id)}
			<Card.Root class="w-full p-0">
				<Card.Content class="flex items-center justify-between p-5 pt-3">
					<div class="flex flex-col items-start justify-between gap-3">
						<div class="mt-0.5 flex items-center justify-start gap-x-3">
							<div
								class="flex size-9 items-center justify-center rounded-full bg-gray-800"
							>
								<img
									alt="category icon"
									src={`/images/category/${subscription.category.icon}`}
									class="size-5"
								/>
							</div>
							<div>
								<p class="font-medium">{subscription.name}</p>
								<p class="text-muted-foreground text-sm">
									{formatCurrency(subscription.cents)} • Day {subscription.dayOfMonth}
								</p>
							</div>
						</div>

						<div class="flex flex-wrap gap-2 text-sm">
							<div class="flex items-center gap-1.5 rounded border px-2 py-1">
								<span class="text-muted-foreground">Category:</span>
								<span>{subscription.category.name}</span>
							</div>
							<div class="flex items-center gap-1.5 rounded border px-2 py-1">
								<span class="text-muted-foreground">Wallet:</span>
								<span>{subscription.wallet.name}</span>
							</div>
							{#if !subscription.paused}
								<div class="flex items-center gap-1.5 rounded border px-2 py-1">
									<span class="text-muted-foreground">Next:</span>
									<span>{getNextGenerationDate(subscription)}</span>
								</div>
							{/if}
						</div>
					</div>
					<div class="flex shrink-0 items-center">
						<Button
							title={subscription.paused ? "Resume subscription" : "Pause subscription"}
							size="icon"
							variant="ghost"
							onclick={() => handleTogglePause(subscription)}
						>
							{#if subscription.paused}
								<Play />
							{:else}
								<Pause />
							{/if}
						</Button>
						<Button
							title="Edit subscription"
							size="icon"
							variant="ghost"
							onclick={() => (upsertDialog = { open: true, subscription })}
						>
							<Pencil />
						</Button>
						<Button
							title="Delete subscription"
							variant="ghost"
							class="size-8 p-0 [&_svg]:size-3.5"
							onclick={() => (deleteDialog = { open: true, subscription })}
						>
							<Trash />
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	{/if}
</div>
