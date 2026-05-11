export const VALIDATION_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

// Precomputed RFC 9562 fixed bits, hoisted out of the hot path.
const VERSION_BITS = 0b0111n << 76n;
const VARIANT_BITS = 0b10n << 62n;

export function isValid(id: string): boolean {
	return VALIDATION_RE.test(id);
}

export function parseTimestamp(id: string): number | null {
	if (!VALIDATION_RE.test(id)) return null;
	return parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}

// Assembles the hyphenated UUIDv7 string from its bit-level parts. One
// BigInt-to-hex conversion is faster in V8 than four separate Number-to-hex
// conversions + padStart calls (measured), so we stay on the BigInt path here.
export function assemble(timestamp: number, randA: number, randB: bigint): string {
	const uuid = (BigInt(timestamp) << 80n) | VERSION_BITS | (BigInt(randA) << 64n) | VARIANT_BITS | randB;
	const hex = uuid.toString(16).padStart(32, "0");
	return (
		hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20)
	);
}
