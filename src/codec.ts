import { VALIDATION_RE } from "./format";

export type Codec = {
	alphabet: string;
	base: bigint;
	maxEncodedLen: number;
	// charCode → (alphabet index + 1). 0 means "not in alphabet". Sized to 128
	// because the alphabet is required to be ASCII.
	lookup: Uint8Array;
};

export function createCodec(alphabet: string): Codec {
	if (alphabet.length < 16 || alphabet.length > 64) {
		throw new Error("uuidv7 error: encode alphabet must be between 16 and 64 characters long");
	}
	if (new Set(alphabet).size !== alphabet.length) {
		throw new Error("uuidv7 error: encode alphabet must not contain duplicate characters");
	}

	const lookup = new Uint8Array(128);
	for (let i = 0; i < alphabet.length; i++) {
		const code = alphabet.charCodeAt(i);
		if (code >= 128) {
			throw new Error("uuidv7 error: encode alphabet must contain only ASCII characters");
		}
		lookup[code] = i + 1; // offset by 1 so 0 reliably means "not present"
	}

	return {
		alphabet,
		base: BigInt(alphabet.length),
		// ceil(128 / log2(alphabet.length)) — longest possible valid encoding of a
		// 128-bit value in this base. Guards against pathological inputs causing
		// O(n²) BigInt math.
		maxEncodedLen: Math.ceil(128 / Math.log2(alphabet.length)),
		lookup,
	};
}

export function encode(codec: Codec, id: string): string {
	if (!VALIDATION_RE.test(id)) {
		throw new Error(`uuidv7 encode error: [${id}] is not a valid UUIDv7`);
	}

	let n = BigInt("0x" + id.replace(/-/g, ""));

	const base = codec.base;
	const alphabet = codec.alphabet;
	let encoded = "";
	// V8's rope-string representation makes this prepend-loop fast for short
	// outputs (a UUID encodes to ≤26 chars in any 16-64 alphabet).
	while (n > 0n) {
		encoded = alphabet[Number(n % base)]! + encoded;
		n /= base;
	}
	return encoded;
}

export function decodeOrThrow(codec: Codec, encoded: string): string {
	// Bound the input. Without this, an attacker-controlled string can drive
	// O(n²) BigInt multiplication.
	if (encoded.length === 0 || encoded.length > codec.maxEncodedLen) {
		throw new Error(`uuidv7 decode error: invalid encoded id length: ${encoded.length}`);
	}

	const lookup = codec.lookup;
	const base = codec.base;
	let n = 0n;
	for (let i = 0; i < encoded.length; i++) {
		const code = encoded.charCodeAt(i);
		// `v` is 0 for both non-ASCII (code >= 128 reads past length, returns 0)
		// and ASCII not in the alphabet. Either way: invalid.
		const v = code < 128 ? lookup[code]! : 0;
		if (v === 0) {
			throw new Error(
				`uuidv7 decode error: invalid character in id [${encoded}] at index ${i}: "${encoded[i]}"`,
			);
		}
		n = n * base + BigInt(v - 1);
	}

	const hex = n.toString(16).padStart(32, "0");
	// Length guard above bounds n < base^maxEncodedLen, which can still exceed
	// 2^128 by a small margin. Reject the overflow explicitly.
	if (hex.length > 32) {
		throw new Error(`uuidv7 decode error: cannot decode [${encoded}] into a valid UUIDv7`);
	}
	const id =
		hex.slice(0, 8) +
		"-" +
		hex.slice(8, 12) +
		"-" +
		hex.slice(12, 16) +
		"-" +
		hex.slice(16, 20) +
		"-" +
		hex.slice(20);

	if (!VALIDATION_RE.test(id)) {
		throw new Error(`uuidv7 decode error: cannot decode [${encoded}] into a valid UUIDv7`);
	}
	return id;
}

export function decode(codec: Codec, encoded: string): string | null {
	try {
		return decodeOrThrow(codec, encoded);
	} catch {
		return null;
	}
}
