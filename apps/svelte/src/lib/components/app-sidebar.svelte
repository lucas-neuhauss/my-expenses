<script lang="ts">
	import { page } from "$app/state";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import Calendar from "lucide-svelte/icons/calendar";
	import House from "lucide-svelte/icons/house";
	import Inbox from "lucide-svelte/icons/inbox";
	import LogOut from "lucide-svelte/icons/log-out";
	import Database from "lucide-svelte/icons/database";

	let { isAdmin, email }: { isAdmin: boolean; email: string } = $props();

	// Menu items.
	const items = [
		{
			title: "Home",
			url: "/",
			icon: House,
		},
		{
			title: "Categories",
			url: "/categories",
			icon: Inbox,
		},
		{
			title: "Wallets",
			url: "/wallets",
			icon: Calendar,
		},
	];
	if (isAdmin) {
		items.push({ title: "Backup", url: "/backup", icon: Database });
	}
</script>

<Sidebar.Root>
	<Sidebar.Header></Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<span class="mb-2 ml-2 text-xs">{email}</span>
			<Sidebar.GroupLabel>Application</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each items as item (item.title)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={page.route.id === item.url}>
								{#snippet child({ props })}
									<a href={item.url} {...props}>
										<item.icon />
										<span>{item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		<Sidebar.Group />
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton>
					{#snippet child({ props })}
						<form method="post" action="/logout?/logout">
							<button {...props}>
								<LogOut />
								<span>Logout</span>
							</button>
						</form>
					{/snippet}</Sidebar.MenuButton
				>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>
