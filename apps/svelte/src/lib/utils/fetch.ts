/**
 * Get an API URL that works in both SSR and browser contexts
 * @param path - API path (e.g., "/api/categories")
 * @returns Full URL in SSR, relative path in browser
 */
export function getApiUrl(path: string): string {
	// In browser context, use relative URL
	if (typeof window !== "undefined") {
		return path;
	}

	// In SSR context, construct absolute URL
	// Use environment variable or fallback to preview server default
	const origin = process.env.ORIGIN || "http://localhost:4173";
	return `${origin}${path}`;
}
