<script lang="ts">
	import LoginForm from "../login/login-form.svelte";

	let { form } = $props();
</script>

<div class="flex h-screen w-full items-center justify-center px-4">
	<LoginForm type="register" error={form?.message} />
</div>
