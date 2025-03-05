<script lang="ts">
	import { page } from "$app/state";
	import { formMessageSchema } from "$lib/utils/form.js";
	import { toast } from "svelte-sonner";

	$effect(() => {
		if (page.form?.form?.message) {
			const messageSafeParse = formMessageSchema.safeParse(page.form.form.message);
			if (messageSafeParse.success) {
				const { type, text } = messageSafeParse.data;
				toast[type](text);
			}
		}
	});
</script>
