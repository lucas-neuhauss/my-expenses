<script lang="ts">
	import { page } from "$app/stores";
	import { buttonVariants } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Tabs from "$lib/components/ui/tabs";

	let tab = $state<"expense" | "income">("expense");
	let open = $state(false);

	$effect(() => {
		if ($page.form && $page.form.ok) {
			open = false;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: "outline" })}>
		Create Category
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Create Transaction</Dialog.Title>
		</Dialog.Header>
		<Tabs.Root bind:value={tab}>
			<Tabs.List class="w-full [&_button]:w-full">
				<Tabs.Trigger value="expense">Expense</Tabs.Trigger>
				<Tabs.Trigger value="income">Income</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="expense"></Tabs.Content>
			<Tabs.Content value="income"></Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
