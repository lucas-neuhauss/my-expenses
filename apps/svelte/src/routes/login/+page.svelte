<script lang="ts">
	import LoginForm from "./login-form.svelte";

	let { form } = $props();
</script>

<LoginForm type="login" error={form?.message} />
