<script lang="ts">
	import { buttonVariants } from "$lib/components/ui/button";
	import { Calendar } from "$lib/components/ui/calendar";
	import * as Popover from "$lib/components/ui/popover";
	import { cn } from "$lib/utils.js";
	import {
		DateFormatter,
		type DateValue,
		getLocalTimeZone,
	} from "@internationalized/date";
	import CalendarIcon from "svelte-radix/Calendar.svelte";

	const df = new DateFormatter("en-US", {
		dateStyle: "long",
	});

	let value: DateValue | undefined = undefined;
</script>

<Popover.Root>
	<Popover.Trigger
		class={cn(
			buttonVariants({
				variant: "outline",
				class: "w-[240px] justify-start text-left font-normal",
			}),
			!value && "text-muted-foreground",
		)}
	>
		<CalendarIcon class="mr-2 size-4" />
		{value ? df.format(value.toDate(getLocalTimeZone())) : "Pick a date"}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0" align="start">
		<Calendar type="single" bind:value />
	</Popover.Content>
</Popover.Root>
