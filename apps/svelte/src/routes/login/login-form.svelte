<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { loginAction } from "$lib/remote/auth.remote";
	import { resolve } from "$app/paths";

	let { type }: { type: "login" | "register" } = $props();
</script>

<Card.Root class="mx-auto w-[360px]">
	<Card.Header>
		<Card.Title class="text-2xl">
			<h1>{type === "login" ? "Login" : "Register"}</h1>
		</Card.Title>
		<Card.Description
			>Enter your email below to {type === "login"
				? "login to your account"
				: "register"}</Card.Description
		>
	</Card.Header>
	<Card.Content>
		<form {...loginAction}>
			<div class="grid gap-4">
				<div class="grid gap-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						type="email"
						name="email"
						placeholder="m@example.com"
						required
					/>
				</div>
				<div class="grid gap-2">
					<!-- <div class="flex items-center"> -->
					<Label for="password">Password</Label>
					<!-- 	<a href="##" class="ml-auto inline-block text-sm underline"> -->
					<!-- 		Forgot your password? -->
					<!-- 	</a> -->
					<!-- </div> -->
					<Input id="password" type="password" name="password" required />
				</div>
				{#if loginAction.result?.ok === false}
					<p class="-mt-2.5 text-sm text-red-400">{loginAction.result.message}</p>
				{/if}

				<Button type="submit" class="w-full">
					{type === "login" ? "Login" : "Register"}
				</Button>

				<!-- <Button variant="outline" class="w-full">Login with Google</Button> -->
			</div>
			{#if type === "login"}
				<div class="mt-4 text-center text-sm">
					Don't have an account?
					<a href={resolve("/register")} class="underline"> Sign up </a>
				</div>
			{:else}
				<div class="mt-4 text-center text-sm">
					Already have an account?
					<a href={resolve("/login")} class="underline"> Login </a>
				</div>
			{/if}
		</form>
	</Card.Content>
</Card.Root>
