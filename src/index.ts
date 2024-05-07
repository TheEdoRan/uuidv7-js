import baseX from "base-x";

function addHyphens(id: string) {
	return (
		id.substring(0, 8) +
		"-" +
		id.substring(8, 12) +
		"-" +
		id.substring(12, 16) +
		"-" +
		id.substring(16, 20) +
		"-" +
		id.substring(20)
	);
}

// Generates the 12 [rand_a] and 62 bits [rand_b] parts in number and bigint formats.
function genRandParts() {
	const v4 = crypto.randomUUID();

	return {
		randA: parseInt(v4.slice(15, 18), 16),
		randB: BigInt("0x" + v4.replace(/-/g, "")) & ((1n << 62n) - 1n),
	};
}

export class UUIDv7 {
	#lastTimestamp: number = -1;
	#lastRandA: number;
	#lastRandB: bigint;
	#lastUUID: bigint = -1n;
	#encoder: baseX.BaseConverter;

	/**
	 * Generates a new `UUIDv7` instance.
	 * @param encodeAlphabet Alphabet used for encoding. Defaults to [Base58](https://www.cs.utexas.edu/users/moore/acl2/manuals/current/manual/index-seo.php/BITCOIN_____A2BASE58-CHARACTERS_A2) alphabet. 16-64 characters.
	 */
	constructor(opts?: { encodeAlphabet: string }) {
		if (opts?.encodeAlphabet) {
			if (opts.encodeAlphabet.length < 16 || opts.encodeAlphabet.length > 64) {
				throw new Error("uuidv7: encode alphabet must be between 16 and 64 characters long");
			}

			if (new Set(opts.encodeAlphabet).size !== opts.encodeAlphabet.length) {
				throw new Error("uuidv7: encode alphabet must not contain duplicate characters");
			}
		}

		this.#encoder = baseX(opts?.encodeAlphabet ?? "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");
	}

	/**
	 * Generates a new UUIDv7.
	 * @returns {string} UUIDv7
	 */
	gen() {
		let uuid = this.#lastUUID;

		while (this.#lastUUID >= uuid) {
			const timestamp = Date.now();

			let randA: number;
			let randB: bigint;

			if (timestamp > this.#lastTimestamp) {
				// If current timestamp is after the last stored one, generate new [rand_a] and [rand_b] parts.
				const parts = genRandParts();
				randA = parts.randA;
				randB = parts.randB;
			} else if (timestamp < this.#lastTimestamp) {
				// If current timestamp is before the last stored one, it means that the system clock went
				// backwards. So wait until it goes ahead before generating new UUIDs.
				continue;
			} else {
				// Otherwise, current timestamp is the same as the previous one.

				// Method 2 - Monotonic Random
				// https://datatracker.ietf.org/doc/html/draft-ietf-uuidrev-rfc4122bis#monotonicity_counters

				// Keep the same [rand_a] part by default.
				randA = this.#lastRandA;

				// Random increment value is between 1 and 2 ** 32 (4,294,967,296).
				randB = this.#lastRandB + BigInt(crypto.getRandomValues(new Uint32Array(1))[0]! + 1);

				// In the rare case that [rand_b] overflows its 62 bits after the increment,
				if (randB > 2n ** 62n - 1n) {
					// this will use [rand_a] part as an additional counter, incrementing it by 1.
					randA = randA + 1;

					// If the [rand_a] part overflows its 12 bits, skip this loop iteration, since both
					// [rand_a] and [rand_b] counters have overflowed.
					if (randA > 2 ** 12 - 1) {
						continue;
					}

					// When [rand_b] overflows its 62 bits, always generate a new random part for it.
					randB = genRandParts().randB;
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

			this.#lastTimestamp = timestamp;
			this.#lastRandA = randA;
			this.#lastRandB = randB;
		}

		this.#lastUUID = uuid;
		return addHyphens(uuid.toString(16).padStart(32, "0"));
	}

	/**
	 * Generates an array of new UUIDv7.
	 * @param amount Amount of UUIDs to generate
	 * @returns {string[]} Array of UUIDv7s
	 */
	genMany(amount: number) {
		if (amount <= 0) {
			throw new Error("uuidv7: generation amount must be greater than 0");
		}

		return Array.from({ length: amount }, () => this.gen());
	}

	/**
	 * Encodes UUIDv7 with the default `Base58` alphabet or a custom one, if provided to the constructor.
	 * @param id UUIDv7
	 * @returns {string} Encoded UUIDv7
	 */
	encode(id: string) {
		return this.#encoder.encode(Buffer.from(id.replace(/-/g, ""), "hex"));
	}

	/**
	 * Decodes an encoded UUIDv7 with the default `Base58` alphabet or a custom one, if provided to the constructor. If the UUIDv7 is not valid, `null` is returned.
	 * @param encodedId UUIDv7
	 * @returns {string | null} Decoded UUIDv7 or `null` if invalid
	 */
	decode(encodedId: string) {
		try {
			const decoded = addHyphens(Buffer.from(this.#encoder.decode(encodedId)).toString("hex"));

			if (!UUIDv7.isValid(decoded)) {
				return null;
			}

			return decoded;
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
		const decoded = this.decode(encodedId);

		if (!decoded) {
			throw new Error(`uuidv7: encoded UUID is not valid: ${encodedId}`);
		}

		return decoded;
	}

	/**
	 * Checks if UUIDv7 is of valid format.
	 * @param id UUIDv7
	 * @returns {boolean} UUIDv7 validity
	 */
	static isValid(id: string) {
		return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
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
 * This is a shortand for `new UUIDv7().gen()`, without the need to create an instance.
 * @returns {string} UUIDv7
 */
export function uuidv7() {
	return defaultId.gen();
}

/**
 * Encodes UUIDv7 with the default `Base58` alphabet.
 * This is a shortand for `new UUIDv7().encode()`, without the need to create an instance.
 * @param id UUIDv7
 * @returns {string} Encoded UUIDv7
 */
export function encodeUUIDv7(id: string) {
	return defaultId.encode(id);
}

/**
 * Decodes an encoded UUIDv7 with the default `Base58` alphabet. If the UUIDv7 is not valid, `null` is returned.
 * This is a shortand for `new UUIDv7().decode()`, without the need to create an instance.
 * @param encodedId UUIDv7
 * @returns {string | null} Decoded UUIDv7 or `null` if invalid
 */
export function decodeUUIDv7(encodedId: string) {
	return defaultId.decode(encodedId);
}
/**
 * Decodes an encoded UUIDv7 with the default `Base58` alphabet. If the UUIDv7 is not valid, an error is thrown.
 * This is a shortand for `new UUIDv7().decodeOrThrow()`, without the need to create an instance.
 * @param encodedId UUIDv7
 * @returns {string} Decoded UUIDv7
 */
export function decodeOrThrowUUIDv7(encodedId: string) {
	return defaultId.decodeOrThrow(encodedId);
}
