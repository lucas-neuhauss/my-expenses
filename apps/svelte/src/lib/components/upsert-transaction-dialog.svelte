<script lang="ts">
	import { enhance } from "$app/forms";
	import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: "outline" })}
		>Create Transaction</Dialog.Trigger
	>
	<Dialog.Content class="sm:max-w-[425px]">
		<form method="post" action="?/upsert-transaction" use:enhance>
			<Dialog.Header>
				<Dialog.Title>Create Transaction</Dialog.Title>
				<Dialog.Description>
					Make changes to your profile here. Click save when you're done.
				</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<input type="hidden" name="wallet" value="1" />
				<input type="hidden" name="type" value="expense" />
				<input type="hidden" name="category" value="1" />

				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="name" class="text-right">Timestamp</Label>
					<Input
						id="timestamp"
						type="datetime-local"
						name="timestamp"
						class="col-span-3"
					/>
				</div>

				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="username" class="text-right">Cents</Label>
					<Input id="cents" type="number" name="cents" class="col-span-3" />
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit">Save</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
