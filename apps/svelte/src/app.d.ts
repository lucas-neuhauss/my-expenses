declare global {
	namespace App {
		interface Locals {
			session: {
				user: {
					id: string;
					email: string;
				};
				expires: string;
			} | null;
			user: {
				id: string;
				email: string;
			} | null;
			getSession: () => Promise<{
				user: {
					id: string;
					email: string;
				};
				expires: string;
			} | null>;
		}
		interface PageData {
			session?: {
				user: {
					id: string;
					email: string;
				};
				expires: string;
			} | null;
		}
		namespace Superforms {
			type Message = {
				type: "error" | "success";
				text: string;
			};
		}
	}
}

export {};
