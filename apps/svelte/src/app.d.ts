import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
		}
		interface PageData {
			session: Session | null;
		}
		namespace Superforms {
			type Message = {
				type: "error" | "success";
				text: string;
			};
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {}; // See https://svelte.dev/docs/kit/types#app.d.ts
