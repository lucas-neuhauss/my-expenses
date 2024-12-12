<script lang="ts">
	import { page } from "$app/stores";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import Calendar from "lucide-svelte/icons/calendar";
	import Database from "lucide-svelte/icons/database";
	import House from "lucide-svelte/icons/house";
	import Inbox from "lucide-svelte/icons/inbox";
	import LogOut from "lucide-svelte/icons/log-out";
	import Repeat from "lucide-svelte/icons/repeat";

	let { isAdmin }: { isAdmin: boolean } = $props();

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
		{
			title: "Subscriptions",
			url: "/subscriptions",
			icon: Repeat,
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
			<Sidebar.GroupLabel>Application</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each items as item (item.title)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={$page.route.id === item.url}>
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
