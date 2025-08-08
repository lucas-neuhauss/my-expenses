<script lang="ts">
	import { goto } from "$app/navigation";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";

	let {
		open,
		title,
		description,
		successRedirect,
		remoteCommand,
	}: {
		open: boolean;
		title: string;
		description: string;
		successRedirect: string;
		remoteCommand: () => void;
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
			<AlertDialog.Action onclick={remoteCommand}>Continue</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
