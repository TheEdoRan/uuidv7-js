import { addHyphens, genRandParts } from "./utils";

export class TimestampUUIDv7 {
	#lastTimestamp: number = -1;
	#lastRandA: number;
	#lastRandB: bigint;

	/**
	 * Generates a new UUIDv7 with custom timestamp.
	 *
	 * @param timestamp Custom timestamp in milliseconds
	 * @returns
	 */
	gen(timestamp: number) {
		if (timestamp < 0 || timestamp > 2 ** 48 - 1) {
			throw new Error("uuidv7 gen error: custom timestamp must be between 0 and 2 ** 48 - 1");
		}

		let uuid = 0n;
		let randA: number;
		let randB: bigint;

		if (timestamp !== this.#lastTimestamp) {
			const parts = genRandParts();
			randA = parts.randA;
			randB = parts.randB;
		} else {
			// Keep the same [rand_a] part by default.
			randA = this.#lastRandA;

			// Random increment value is between 1 and 2 ** 32 (4,294,967,296).
			randB = this.#lastRandB + BigInt(crypto.getRandomValues(new Uint32Array(1))[0]! + 1);

			// In the rare case that [rand_b] overflows its 62 bits after the increment,
			if (randB > 2n ** 62n - 1n) {
				const newParts = genRandParts();
				// When [rand_b] overflows its 62 bits, always generate a new random part for it.
				randB = newParts.randB;

				// this will use [rand_a] part as an additional counter, incrementing it by 1.
				randA = randA + 1;

				// If the [rand_a] part overflows its 12 bits, use a new value for it.
				if (randA > 2 ** 12 - 1) {
					randA = newParts.randA;
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

		return addHyphens(uuid.toString(16).padStart(32, "0"));
	}
}
