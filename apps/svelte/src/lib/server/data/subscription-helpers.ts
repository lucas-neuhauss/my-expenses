/**
 * Shared pure helper functions for subscription and transaction data logic.
 *
 * These functions were extracted from `src/lib/server/data/subscription.ts`
 * and `src/lib/server/data/transaction.ts` to make them testable and to
 * eliminate code duplication (both modules had their own `splitEqually`).
 *
 * All functions are pure — no database or side-effect dependencies.
 */

/**
 * Split a total amount in cents as equally as possible into N parts.
 * Distributes remainder among first parts to ensure sum equals total.
 *
 * @example
 * splitEqually(100, 3) // [34, 33, 33]
 * splitEqually(100, 4) // [25, 25, 25, 25]
 * splitEqually(100, 1) // [100]
 * splitEqually(0, 5)   // [0, 0, 0, 0, 0]
 */
export function splitEqually(totalCents: number, count: number): number[] {
	const base = Math.floor(totalCents / count);
	const remainder = totalCents % count;
	return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Add N months to a date string (YYYY-MM-DD).
 * Clamps to last day of month if original day doesn't exist (Jan 31 + 1mo → Feb 28/29).
 *
 * @example
 * addMonths("2024-01-15", 2)      // "2024-03-15"
 * addMonths("2024-11-15", 3)      // "2025-02-15"
 * addMonths("2024-01-31", 1)      // "2024-02-29" (leap year)
 * addMonths("2023-01-31", 1)      // "2023-02-28" (non-leap year)
 */
export function addMonths(dateStr: string, months: number): string {
	const [year, month, day] = dateStr.split("-").map(Number);
	let newYear = year;
	let newMonth = month + months;

	// Handle year overflow
	while (newMonth > 12) {
		newMonth -= 12;
		newYear++;
	}

	// Get last day of target month
	const lastDay = new Date(newYear, newMonth, 0).getDate();
	const clampedDay = Math.min(day, lastDay);

	return `${newYear}-${String(newMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

/**
 * Get date with specific day, handling month overflow.
 * e.g., day 31 in February becomes Feb 28/29.
 *
 * @example
 * getDateWithDay(2024, 11, 31) // Date for 2024-12-31
 * getDateWithDay(2024, 1, 31)  // Date for 2024-02-29 (leap year)
 * getDateWithDay(2023, 1, 31)  // Date for 2023-02-28 (non-leap year)
 */
export function getDateWithDay(year: number, month: number, day: number): Date {
	// Handle year overflow
	while (month > 11) {
		month -= 12;
		year++;
	}

	// Get last day of the target month
	const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
	const actualDay = Math.min(day, lastDayOfMonth);

	return new Date(year, month, actualDay);
}

/**
 * Parse a YYYY-MM-DD string into a Date object.
 *
 * @example
 * parseDate("2024-03-15") // Date for March 15, 2024
 */
export function parseDate(dateStr: string): Date {
	const [year, month, day] = dateStr.split("-").map(Number);
	return new Date(year, month - 1, day);
}

/**
 * Format a Date object to a YYYY-MM-DD string.
 *
 * @example
 * formatDateString(new Date(2024, 2, 15)) // "2024-03-15"
 */
export function formatDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
