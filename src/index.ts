import { TimestampUUIDv7 } from "./timestamp-uuid";
import { addHyphens, genRandParts } from "./utils";

export class UUIDv7 {
	#lastTimestamp: number = -1;
	#lastRandA: number;
	#lastRandB: bigint;
	#lastUUID: bigint = -1n;
	#encodeAlphabet: string;
	#timestampUUID: TimestampUUIDv7;

	/**
	 * Generates a new `UUIDv7` instance.
	 * @param encodeAlphabet Alphabet used for encoding. Defaults to [Base58](https://www.cs.utexas.edu/users/moore/acl2/manuals/current/manual/index-seo.php/BITCOIN_____A2BASE58-CHARACTERS_A2) alphabet. 16-64 characters.
	 */
	constructor(opts?: { encodeAlphabet?: string }) {
		if (opts?.encodeAlphabet) {
			if (opts.encodeAlphabet.length < 16 || opts.encodeAlphabet.length > 64) {
				throw new Error("uuidv7 error: encode alphabet must be between 16 and 64 characters long");
			}

			if (new Set(opts.encodeAlphabet).size !== opts.encodeAlphabet.length) {
				throw new Error("uuidv7 error: encode alphabet must not contain duplicate characters");
			}
		}

		this.#encodeAlphabet = opts?.encodeAlphabet ?? "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
		this.#timestampUUID = new TimestampUUIDv7();
	}

	/**
	 * Generates a new UUIDv7.
	 * @param {number} [customTimestamp] Custom timestamp in milliseconds. If not provided, it defaults to `Date.now()`.
	 * @returns {string} UUIDv7
	 */
	gen(customTimestamp?: number) {
		const hasCustomTimestamp = typeof customTimestamp === "number";

		if (hasCustomTimestamp) {
			return this.#timestampUUID.gen(customTimestamp);
		}

		let uuid = this.#lastUUID;

		while (this.#lastUUID >= uuid) {
			const timestamp = Date.now();

			let randA: number;
			let randB: bigint;

			// Generate new [rand_a] and [rand_b] parts if current timestamp one is ahead of the last stored one.
			if (timestamp > this.#lastTimestamp) {
				const parts = genRandParts();
				randA = parts.randA;
				randB = parts.randB;
			} else if (timestamp < this.#lastTimestamp) {
				// The system clock went backwards. So wait until it goes ahead before generating new UUIDs.
				continue;
			} else {
				// Otherwise, current timestamp is the same as the previous stored one.

				// Method 2 - Monotonic Random
				// https://datatracker.ietf.org/doc/html/rfc9562#monotonicity_counters

				// Keep the same [rand_a] part by default.
				randA = this.#lastRandA;

				// Random increment value is between 1 and 2 ** 32 (4,294,967,296).
				randB = this.#lastRandB + BigInt(crypto.getRandomValues(new Uint32Array(1))[0]! + 1);

				// In the rare case that [rand_b] overflows its 62 bits after the increment,
				if (randB > 2n ** 62n - 1n) {
					// When [rand_b] overflows its 62 bits, always generate a new random part for it.
					randB = genRandParts().randB;

					// this will use [rand_a] part as an additional counter, incrementing it by 1.
					randA = randA + 1;

					// If the [rand_a] part overflows its 12 bits,
					// Skip this loop iteration, since both [rand_a] and [rand_b] counters have overflowed.
					// This ensures monotonicity per instance.
					if (randA > 2 ** 12 - 1) {
						continue;
					}
				}
			}

			// [unix_ts_ms] timestamp in milliseconds - 48 bits
			uuid = BigInt(timestamp) << 80n;

			// [ver] version "7" - 4 bits
			uuid = uuid | (0b0111n << 76n);

			// [rand_a] secondary randomly seeded counter - 12 bits
			uuid = uuid | (BigInt(randA) << 64n);

			// [var] variant 0b10 - 2 bits
			uuid = uuid | (0b10n << 62n);

			// [rand_b] primary randomly seeded counter - 62 bits
			uuid = uuid | randB;

			this.#lastRandA = randA;
			this.#lastRandB = randB;

			this.#lastTimestamp = timestamp;
		}

		this.#lastUUID = uuid;

		return addHyphens(uuid.toString(16).padStart(32, "0"));
	}

	/**
	 * Generates an array of new UUIDv7.
	 * @param amount Amount of UUIDs to generate
	 * @param {number} [customTimestamp] Custom timestamp in milliseconds. If not provided, it defaults to `Date.now()`.
	 * @returns {string[]} Array of UUIDv7s
	 */
	genMany(amount: number, customTimestamp?: number) {
		if (amount <= 0) {
			throw new Error("uuidv7 genMany error: generation amount must be greater than 0");
		}

		return Array.from({ length: amount }, () => this.gen(customTimestamp));
	}

	/**
	 * Encodes UUIDv7 with the default `Base58` alphabet or a custom one, if provided to the constructor.
	 * @param id UUIDv7
	 * @returns {string} Encoded UUIDv7
	 */
	encode(id: string) {
		try {
			if (!UUIDv7.isValid(id)) {
				throw new Error(`[${id}] is not a valid UUIDv7`);
			}

			let n = BigInt("0x" + id.replace(/-/g, ""));
			let encoded = "";

			while (n > 0n) {
				const charIdx = this.#encodeAlphabet[Number(n % BigInt(this.#encodeAlphabet.length))];
				encoded = charIdx + encoded;
				n /= BigInt(this.#encodeAlphabet.length);
			}

			return encoded;
		} catch (e) {
			throw new Error(`uuidv7 encode error: ${e instanceof Error ? e.message : e}`);
		}
	}

	/**
	 * Decodes an encoded UUIDv7 with the default `Base58` alphabet or a custom one, if provided to the constructor. If the UUIDv7 is not valid, `null` is returned.
	 * @param encodedId UUIDv7
	 * @returns {string | null} Decoded UUIDv7 or `null` if invalid
	 */
	decode(encodedId: string) {
		try {
			return this.decodeOrThrow(encodedId);
		} catch {
			return null;
		}
	}

	/**
	 * Decodes an encoded UUIDv7 with the default `Base58` alphabet or a custom one, if provided to the constructor. If the UUIDv7 is not valid, an error is thrown.
	 * @param encodedId UUIDv7
	 * @returns {string} Decoded UUIDv7
	 */
	decodeOrThrow(encodedId: string) {
		let n = 0n;

		for (let i = 0; i < encodedId.length; i++) {
			const charIdx = this.#encodeAlphabet.indexOf(encodedId[i]!);

			if (charIdx < 0) {
				throw new Error(`uuidv7 decode error: invalid character in id [${encodedId}] at index ${i}: "${encodedId[i]}"`);
			}

			n = n * BigInt(this.#encodeAlphabet.length) + BigInt(charIdx);
		}

		const decoded = addHyphens(n.toString(16).padStart(32, "0"));

		if (!UUIDv7.isValid(decoded)) {
			throw new Error(`uuidv7 decode error: cannot decode [${encodedId}] into a valid UUIDv7`);
		}

		return decoded;
	}

	/**
	 * Checks if UUIDv7 is of valid format.
	 * @param id UUIDv7
	 * @returns {boolean} UUIDv7 validity
	 */
	static isValid(id: string) {
		return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);
	}

	/**
	 * Extracts timestamp from UUIDv7.
	 * @param id UUIDv7
	 * @returns {number | null} Timestamp in milliseconds or `null` if invalid
	 */
	static timestamp(id: string) {
		if (!UUIDv7.isValid(id)) {
			return null;
		}

		return parseInt(id.slice(0, 13).replace("-", ""), 16);
	}

	/**
	 * Extracts date from UUIDv7.
	 * @param id UUIDv7
	 * @returns {number | null} Timestamp in milliseconds or `null` if invalid
	 */
	static date(id: string) {
		if (!UUIDv7.isValid(id)) {
			return null;
		}

		return new Date(UUIDv7.timestamp(id)!);
	}
}

const defaultId = new UUIDv7();

/**
 * Generates a new UUIDv7 using the default instance.
 * This is a shorthand for `new UUIDv7().gen()`, without the need to create an instance.
 * @param {number} [customTimestamp] Custom timestamp in milliseconds. If not provided, it defaults to `Date.now()`.
 * @returns {string} UUIDv7
 */
export function uuidv7(customTimestamp?: number) {
	return defaultId.gen(customTimestamp);
}

/**
 * Encodes UUIDv7 with the default `Base58` alphabet.
 * This is a shorthand for `new UUIDv7().encode()`, without the need to create an instance.
 * @param id UUIDv7
 * @returns {string} Encoded UUIDv7
 */
export function encodeUUIDv7(id: string) {
	return defaultId.encode(id);
}

/**
 * Decodes an encoded UUIDv7 with the default `Base58` alphabet. If the UUIDv7 is not valid, `null` is returned.
 * This is a shorthand for `new UUIDv7().decode()`, without the need to create an instance.
 * @param encodedId UUIDv7
 * @returns {string | null} Decoded UUIDv7 or `null` if invalid
 */
export function decodeUUIDv7(encodedId: string) {
	return defaultId.decode(encodedId);
}
/**
 * Decodes an encoded UUIDv7 with the default `Base58` alphabet. If the UUIDv7 is not valid, an error is thrown.
 * This is a shorthand for `new UUIDv7().decodeOrThrow()`, without the need to create an instance.
 * @param encodedId UUIDv7
 * @returns {string} Decoded UUIDv7
 */
export function decodeOrThrowUUIDv7(encodedId: string) {
	return defaultId.decodeOrThrow(encodedId);
}
