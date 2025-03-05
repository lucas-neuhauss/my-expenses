<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import type { HTMLFormAttributes } from "svelte/elements";

	let {
		open,
		title,
		description,
		successRedirect,
		formProps = {},
	}: {
		open: boolean;
		title: string;
		description: string;
		successRedirect: string;
		formProps?: HTMLFormAttributes;
	} = $props();
</script>

<AlertDialog.Root
	{open}
	onOpenChange={(o) => {
		if (!o) goto(successRedirect);
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>
				{description}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<form use:enhance {...formProps}>
				<AlertDialog.Action type="submit">Continue</AlertDialog.Action>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
