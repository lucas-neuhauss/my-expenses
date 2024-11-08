<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import { enhance } from "$app/forms";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Button } from "$lib/components/ui/button";
</script>

<form
	method="post"
	action="?/upsert-wallet"
	use:enhance
	class="flex flex-col gap-4 py-4 [&>div]:flex [&>div]:flex-col [&>div]:justify-items-end [&>div]:gap-2"
>
	<input hidden name="id" readonly value="new" />
	<div>
		<Label for="name">Name</Label>
		<Input required id="name" name="name" />
	</div>
	<Dialog.Footer class="mt-2">
		<Button type="submit" class="ml-auto">Save</Button>
	</Dialog.Footer>
</form>
