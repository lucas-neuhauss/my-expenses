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
		/**
		 * Tagged errors raised by remote functions and forwarded to the
		 * client as the body of a thrown SvelteKit `HttpError`. The client
		 * dispatches on `body._tag` rather than parsing strings.
		 *
		 * The fields are optional so that legacy string-bodied
		 * `error(status, "string")` calls continue to compile, and so
		 * each tagged error can carry its own structured payload without
		 * forcing every call site to declare the union.
		 */
		interface Error {
			_tag?: string;
			message?: string;
			entity?: string;
			id?: number;
			issues?: ReadonlyArray<{ message: string; path?: ReadonlyArray<PropertyKey> }>;
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
