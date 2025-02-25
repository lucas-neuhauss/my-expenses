<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
</script>

<div class="flex flex-col items-start justify-start gap-5 px-4 pb-4">
	<Card.Root>
		<Card.Header>
			<Card.Title>Create Backup</Card.Title>
		</Card.Header>
		<Card.Content>
			<form action="/api/create-backup">
				<Button type="submit">Create Backup</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Load Backup</Card.Title>
		</Card.Header>
		<Card.Content>
			<form method="post" action="?/load-backup" class="" enctype="multipart/form-data">
				<div class="mb-3 flex flex-col gap-2">
					<Label for="backup-json">Backup File</Label>
					<Input
						id="backup-json"
						name="file"
						type="file"
						accept="application/json"
						class="w-full"
					></Input>
				</div>

				<Button type="submit">Load Backup</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
