import { describe, expect, it } from "vitest";
import { FormUtil } from "./form";

describe("FormUtil.getErrorMessage", () => {
	it("extracts message from a string error", () => {
		const result = FormUtil.getErrorMessage("error text");
		expect(result).toEqual({ type: "error", text: "error text" });
	});

	it("extracts message from an Error object", () => {
		const result = FormUtil.getErrorMessage(new Error("something broke"));
		expect(result).toEqual({ type: "error", text: "something broke" });
	});

	it("returns fallback for null", () => {
		const result = FormUtil.getErrorMessage(null);
		expect(result).toEqual({ type: "error", text: "Something went wrong" });
	});

	it("returns fallback for undefined", () => {
		const result = FormUtil.getErrorMessage(undefined);
		expect(result).toEqual({ type: "error", text: "Something went wrong" });
	});

	it("returns fallback for plain objects without message", () => {
		const result = FormUtil.getErrorMessage({ foo: "bar" });
		expect(result).toEqual({ type: "error", text: "Something went wrong" });
	});

	it("returns fallback for number", () => {
		const result = FormUtil.getErrorMessage(42);
		expect(result).toEqual({ type: "error", text: "Something went wrong" });
	});
});

describe("FormUtil.getSuccessMessage", () => {
	it("returns success shape with given text", () => {
		const result = FormUtil.getSuccessMessage("Done!");
		expect(result).toEqual({ type: "success", text: "Done!" });
	});
});

describe("FormUtil.getErrorForm", () => {
	it("returns a form object with error message", () => {
		const result = FormUtil.getErrorForm("Something went wrong");
		expect(result).toEqual({
			form: {
				message: { type: "error", text: "Something went wrong" },
			},
		});
	});
});
