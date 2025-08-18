<script lang="ts">
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import type { Snippet } from "svelte";

	let {
		open,
		title,
		description,
		remoteCommand,
		triggerChild,
		onOpenChange,
	}: {
		open?: boolean;
		title: string;
		description: string;
		remoteCommand: () => void;
		triggerChild?: Snippet<[{ props: Record<string, unknown> }]>;
		onOpenChange?: (open: boolean) => void;
	} = $props();
</script>

<AlertDialog.Root {open} {onOpenChange}>
	{#if triggerChild}
		<AlertDialog.Trigger>
			{#snippet child({ props })}
				{@render triggerChild({ props })}
			{/snippet}
		</AlertDialog.Trigger>
	{/if}
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>
				{description}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={remoteCommand}>Continue</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
