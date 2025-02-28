<script lang="ts">
	import LoginForm from "../login/login-form.svelte";

	let { form } = $props();
</script>

<LoginForm type="register" error={form?.message} />
