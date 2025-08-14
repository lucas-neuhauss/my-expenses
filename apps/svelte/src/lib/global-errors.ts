export const GLOBAL_ERRORS = {
	INVALID_CHART_TOOLTIP_PARAMS: {
		code: "INVALID_CHART_TOOLTIP_PARAMS",
		message: "Invalid chart tooltip parameters",
	},
};

export class GlobalError extends Error {
	constructor(code: keyof typeof GLOBAL_ERRORS) {
		const error = GLOBAL_ERRORS[code];
		super(`[${error.code}] - ${error.message}`);
		this.name = "GlobalError";
	}
}
