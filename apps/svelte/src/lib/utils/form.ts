import { z } from "zod/v4";

export const formMessageSchema = z.object({
	type: z.union([z.literal("error"), z.literal("success")]),
	text: z.string(),
});

export class FormUtil {
	static getErrorMessage(error: unknown) {
		let text;
		if (typeof error === "string") {
			text = error;
		} else {
			const obj = z
				.object({ message: z.string() })
				.transform((v) => ({ text: v.message }))
				.catch({ text: "Something went wrong" })
				.parse(error);
			text = obj.text;
		}
		return { type: "error" as const, text };
	}

	static getSuccessMessage(text: string) {
		return { type: "success" as const, text };
	}

	static getErrorForm(error: unknown) {
		return {
			form: {
				message: this.getErrorMessage(error),
			},
		};
	}
}
