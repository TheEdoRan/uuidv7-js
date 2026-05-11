import { UUIDv7 } from "./generator";

export { UUIDv7 } from "./generator";

const defaultId = new UUIDv7();

/**
 * Generates a new UUIDv7 using the shared default instance.
 */
export function uuidv7(customTimestamp?: number): string {
	return defaultId.gen(customTimestamp);
}

/**
 * Encodes a UUIDv7 with the default Base58 alphabet.
 */
export function encodeUUIDv7(id: string): string {
	return defaultId.encode(id);
}

/**
 * Decodes an encoded UUIDv7. Returns `null` if invalid.
 */
export function decodeUUIDv7(encodedId: string): string | null {
	return defaultId.decode(encodedId);
}

/**
 * Decodes an encoded UUIDv7. Throws if invalid.
 */
export function decodeOrThrowUUIDv7(encodedId: string): string {
	return defaultId.decodeOrThrow(encodedId);
}
