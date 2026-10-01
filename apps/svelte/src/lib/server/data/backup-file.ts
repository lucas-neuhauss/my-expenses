import { Data } from "effect";
import { gunzipSync } from "node:zlib";

export const MAX_BACKUP_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_BACKUP_JSON_BYTES = 50 * 1024 * 1024;

export class InvalidBackupError extends Data.TaggedError("InvalidBackupError")<{
	message: string;
}> {}

/** Accept real gzip files and legacy downloads containing a (JSON-quoted) base64 string. */
export function decodeBackupFile(bytes: Uint8Array): unknown {
	if (bytes.byteLength === 0 || bytes.byteLength > MAX_BACKUP_FILE_BYTES) {
		throw new InvalidBackupError({
			message: "Backup file must be between 1 byte and 10 MB",
		});
	}
	try {
		let compressed = Buffer.from(bytes);
		if (compressed[0] !== 0x1f || compressed[1] !== 0x8b) {
			const text = compressed.toString("utf8").trim();
			const base64: unknown = text.startsWith('"') ? JSON.parse(text) : text;
			if (
				typeof base64 !== "string" ||
				!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)
			) {
				throw new Error("Invalid base64");
			}
			compressed = Buffer.from(base64, "base64");
		}
		const json = gunzipSync(compressed, { maxOutputLength: MAX_BACKUP_JSON_BYTES });
		return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(json));
	} catch {
		throw new InvalidBackupError({
			message: "Invalid, corrupted, or oversized backup file",
		});
	}
}
