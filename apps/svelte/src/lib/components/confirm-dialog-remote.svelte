<script lang="ts">
	import * as AlertDialog from "$lib/components/ui/alert-dialog";

	let {
		open,
		title,
		description,
		remoteCommand,
		onOpenChange,
	}: {
		open: boolean;
		title: string;
		description: string;
		remoteCommand: () => void;
		onOpenChange?: (open: boolean) => void;
	} = $props();
</script>

<AlertDialog.Root {open} {onOpenChange}>
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
