/**
 * Parse a user-entered amount ("25", "25.50", "25,50") into a non-negative
 * number of cents. The sign is ignored, so "-25" is treated as "25": the
 * amount filter matches on magnitude because expenses are stored as negative
 * cents. Returns null when the value is empty or not a valid number.
 *
 * Kept dependency-free so it can be unit-tested without loading the
 * client-side DB collections.
 */
export function parseAmountToCents(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") return null;
	const normalized = trimmed.replace(",", ".");
	const amount = Number(normalized);
	if (!Number.isFinite(amount)) return null;
	return Math.round(Math.abs(amount) * 100);
}

/**
 * A decimal separator in the input means the user wants an exact match
 * ("25.50" = exactly 2550 cents); a whole number acts as a prefix
 * search ("25" matches 2500..2599 cents), mirroring the ilike search
 * on descriptions.
 */
export function hasDecimalPart(value: string): boolean {
	return value.trim().replace(",", ".").includes(".");
}
