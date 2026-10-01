import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
	decodeBackupFile,
	InvalidBackupError,
	MAX_BACKUP_FILE_BYTES,
	MAX_BACKUP_JSON_BYTES,
} from "./backup-file";

describe("decodeBackupFile", () => {
	const data = { wallet: [], category: [], transaction: [], description: "Café 💰" };
	const compressed = gzipSync(JSON.stringify(data));

	it("decodes real gzip including UTF-8 text", () => {
		expect(decodeBackupFile(compressed)).toEqual(data);
	});
	it.each([false, true])("decodes legacy base64 (JSON quoted: %s)", (quoted) => {
		const base64 = compressed.toString("base64");
		expect(
			decodeBackupFile(Buffer.from(quoted ? JSON.stringify(base64) : base64)),
		).toEqual(data);
	});
	it.each([
		Buffer.from("not a backup"),
		Buffer.from('"not base64!"'),
		compressed.subarray(0, compressed.length - 5),
		gzipSync("not JSON"),
	])("rejects corrupted input", (input) => {
		expect(() => decodeBackupFile(input)).toThrow(InvalidBackupError);
	});
	it("rejects oversized uploads before decompression", () => {
		expect(() => decodeBackupFile(Buffer.alloc(MAX_BACKUP_FILE_BYTES + 1))).toThrow(
			InvalidBackupError,
		);
	});
	it("limits decompressed bytes even for tiny compressed files", () => {
		const bomb = gzipSync(Buffer.alloc(MAX_BACKUP_JSON_BYTES + 1, 32));
		expect(bomb.length).toBeLessThan(100000);
		expect(() => decodeBackupFile(bomb)).toThrow(InvalidBackupError);
	});
});
