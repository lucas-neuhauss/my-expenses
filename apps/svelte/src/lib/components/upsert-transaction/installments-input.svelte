<script lang="ts">
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";

	let {
		enabled = $bindable(false),
		count = $bindable(2),
		totalCents,
		installmentCents = $bindable([]),
	}: {
		enabled: boolean;
		count: number;
		totalCents: number;
		installmentCents: number[];
	} = $props();

	// Split cents equally, distributing remainder among first parts
	function splitEqually(total: number, n: number): number[] {
		if (n <= 0 || total <= 0) return Array(n).fill(0);
		const base = Math.floor(total / n);
		const remainder = total % n;
		return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
	}

	// Recalculate when count or totalCents changes
	$effect(() => {
		if (enabled && totalCents > 0) {
			installmentCents = splitEqually(totalCents, count);
		}
	});

	// Reset when disabled
	$effect(() => {
		if (!enabled) {
			installmentCents = [];
		}
	});

	let sum = $derived(installmentCents.reduce((a, b) => a + b, 0));
	let isValid = $derived(!enabled || sum === totalCents);
	let difference = $derived(totalCents - sum);

	function formatCents(cents: number): string {
		return (cents / 100).toFixed(2);
	}

	function updateInstallment(index: number, value: number) {
		const newCents = [...installmentCents];
		newCents[index] = Math.round(value * 100);
		installmentCents = newCents;
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center gap-3">
		<Switch id="installments-enabled" bind:checked={enabled} />
		<Label for="installments-enabled">Enable installments</Label>
	</div>

	{#if enabled}
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-2">
				<Label for="installments-count" class="shrink-0">Number of installments</Label>
				<Input
					id="installments-count"
					type="number"
					min={2}
					max={24}
					class="w-20"
					bind:value={count}
				/>
			</div>

			<div class="flex flex-col gap-2">
				<Label>Amount per installment</Label>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each installmentCents as cents, i (i)}
						<div class="flex items-center gap-1">
							<span class="text-muted-foreground w-8 text-sm">{i + 1}.</span>
							<Input
								type="number"
								step="0.01"
								min={0}
								class="h-8 text-sm"
								value={cents / 100}
								onchange={(e) =>
									updateInstallment(i, parseFloat(e.currentTarget.value) || 0)}
							/>
						</div>
					{/each}
				</div>
			</div>

			<div
				class="text-sm {isValid
					? 'text-muted-foreground'
					: 'text-destructive font-medium'}"
			>
				{#if isValid}
					Total: R$ {formatCents(sum)}
				{:else if difference > 0}
					Missing: R$ {formatCents(difference)}
				{:else}
					Excess: R$ {formatCents(-difference)}
				{/if}
			</div>
		</div>
	{/if}
</div>
