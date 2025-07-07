<script lang="ts">
	import { buttonVariants } from "$lib/components/ui/button";
	import { Calendar } from "$lib/components/ui/calendar";
	import * as Popover from "$lib/components/ui/popover";
	import { cn } from "$lib/utils.js";
	import { CalendarDate, DateFormatter, getLocalTimeZone } from "@internationalized/date";
	import { tick } from "svelte";
	import CalendarIcon from "@lucide/svelte/icons/calendar";

	let {
		date = $bindable(),
		open = $bindable(),
	}: {
		date: CalendarDate | undefined;
		open: boolean;
	} = $props();
	let calendarElement = $state<HTMLDivElement | null>(null);

	const df = new DateFormatter("en-US", {
		dateStyle: "long",
	});
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class={cn(
			buttonVariants({
				variant: "outline",
				class: "col-span-3 w-full justify-start text-left font-normal",
			}),
			!date && "text-muted-foreground",
		)}
	>
		<CalendarIcon class="mr-2 size-4" />
		{date ? df.format(date.toDate(getLocalTimeZone())) : "Pick a date"}
	</Popover.Trigger>
	<Popover.Content
		id="transaction-form-calendar-popover"
		class="calendar-popover w-auto p-0"
		align="start"
		onOpenAutoFocus={(e) => {
			e.preventDefault();
			tick().then(() => {
				const el = calendarElement?.querySelector("[data-selected] [role='button']") as
					| HTMLElement
					| undefined;
				if (el) el.focus();
			});
		}}
	>
		<Calendar
			bind:ref={calendarElement}
			type="single"
			bind:value={date}
			onValueChange={() => (open = false)}
			preventDeselect
		/>
	</Popover.Content>
</Popover.Root>
