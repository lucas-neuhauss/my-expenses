<script lang="ts">
	import { enhance } from "$app/forms";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import type { Snippet } from "svelte";
	import type { HTMLFormAttributes } from "svelte/elements";
	import { page } from "$app/state";

	let {
		title,
		description,
		triggerChild,
		formProps = {},
	}: {
		title: string;
		description: string;
		triggerChild: Snippet<[any]>;
		formProps?: HTMLFormAttributes;
	} = $props();

	let open = $state(false);

	// Close the alert on any action
	$effect(() => {
		if (page.form) {
			open = false;
		}
	});
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Trigger>
		{#snippet child({ props })}
			{@render triggerChild({ props })}
		{/snippet}
	</AlertDialog.Trigger>
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
