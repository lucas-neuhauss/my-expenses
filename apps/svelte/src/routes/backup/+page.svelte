<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import Download from "@lucide/svelte/icons/download";
	import Upload from "@lucide/svelte/icons/upload";

	let { form } = $props();

	let selectedFileName = $state<string | null>(null);

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		selectedFileName = input.files?.[0]?.name ?? null;
	}
</script>

<svelte:head>
	<title>Backup | My Expenses</title>
</svelte:head>

<div class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
	<div>
		<h1 class="text-2xl font-semibold">Backup & Restore</h1>
		<p class="text-muted-foreground mt-1 text-sm">
			Export your data or restore from a previous backup
		</p>
	</div>

	<div class="grid gap-6 sm:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Download class="size-5" />
					Create Backup
				</Card.Title>
				<Card.Description>Download a compressed backup of all your data</Card.Description>
			</Card.Header>
			<Card.Content class="mt-auto">
				<Button href="/api/create-backup" target="_blank" class="w-full">
					<Download class="mr-2 size-4" />
					Download Backup
				</Button>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Upload class="size-5" />
					Restore Backup
				</Card.Title>
				<Card.Description>Upload a backup file to restore your data</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/load-backup" enctype="multipart/form-data">
					<div class="mb-4 flex flex-col gap-2">
						<Label for="backup-json">Backup File (.gz)</Label>
						<Input
							id="backup-json"
							name="file"
							type="file"
							accept=".gz,application/x-gzip,application/gzip"
							class="w-full"
							onchange={handleFileChange}
						/>
						{#if selectedFileName}
							<p class="text-muted-foreground text-xs">Selected: {selectedFileName}</p>
						{/if}
						{#if form?.error}
							<p class="text-sm text-red-400">{form.error}</p>
						{/if}
					</div>

					<Button type="submit" class="w-full">
						<Upload class="mr-2 size-4" />
						Restore Backup
					</Button>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
