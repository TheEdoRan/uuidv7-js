import { createCodec, decode, decodeOrThrow, encode, type Codec } from "./codec";
import { assemble, parseTimestamp } from "./format";
import { createState, fillRandomParts, randomIncrement, type GenState } from "./random";

const DEFAULT_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const MAX_TIMESTAMP = 0xffffffffffff; // 2^48 - 1
const MAX_RAND_A = 0xfff;
const MAX_RAND_B = (1n << 62n) - 1n;

// Module-level regex; the inline literal pattern in `static isValid` below
// avoids any cross-module property access in the hottest validation path.
const VALIDATION_RE =
	/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export class UUIDv7 {
	#state: GenState = createState();
	#customState: GenState = createState();
	#codec: Codec;

	/**
	 * Generates a new `UUIDv7` instance.
	 * @param encodeAlphabet Alphabet used for encoding. Defaults to the
	 * [Base58](https://www.cs.utexas.edu/users/moore/acl2/manuals/current/manual/index-seo.php/BITCOIN_____A2BASE58-CHARACTERS_A2)
	 * alphabet. ASCII, 16-64 characters, no duplicates.
	 */
	constructor(opts?: { encodeAlphabet?: string }) {
		this.#codec = createCodec(opts?.encodeAlphabet ?? DEFAULT_ALPHABET);
	}

	/**
	 * Generates a new UUIDv7.
	 *
	 * The two branches (custom-timestamp and runtime) share intent but are
	 * written out separately rather than via a shared helper — V8's call-frame
	 * overhead measurably regresses throughput on the regen branch.
	 *
	 * @param customTimestamp Custom timestamp in milliseconds. If omitted, uses `Date.now()`.
	 */
	gen(customTimestamp?: number): string {
		if (typeof customTimestamp === "number") {
			if (customTimestamp < 0 || customTimestamp > MAX_TIMESTAMP) {
				throw new Error("uuidv7 gen error: custom timestamp must be between 0 and 2 ** 48 - 1");
			}
			const cs = this.#customState;

			if (customTimestamp !== cs.lastTimestamp) {
				fillRandomParts(cs);
				cs.lastTimestamp = customTimestamp;
				return assemble(customTimestamp, cs.randA, cs.randB);
			}

			const newB = cs.randB + randomIncrement();
			if (newB <= MAX_RAND_B) {
				cs.randB = newB;
				return assemble(customTimestamp, cs.randA, newB);
			}

			// rand_b overflow — bump rand_a as secondary counter.
			const ra = cs.randA + 1;
			if (ra <= MAX_RAND_A) {
				fillRandomParts(cs);
				cs.randA = ra;
				return assemble(customTimestamp, ra, cs.randB);
			}

			// Both overflow on custom-ts: last-resort regen. Breaks per-instance
			// monotonicity for custom timestamps (documented).
			fillRandomParts(cs);
			return assemble(customTimestamp, cs.randA, cs.randB);
		}

		const s = this.#state;
		const now = Date.now();
		// Pin to lastTimestamp if the clock went backwards. RFC 9562 §6.2 prefers
		// the counter path over blocking; this avoids the v1 spin-loop hazard.
		const target = now >= s.lastTimestamp ? now : s.lastTimestamp;

		if (target !== s.lastTimestamp) {
			fillRandomParts(s);
			s.lastTimestamp = target;
			return assemble(target, s.randA, s.randB);
		}

		const newB = s.randB + randomIncrement();
		if (newB <= MAX_RAND_B) {
			s.randB = newB;
			return assemble(target, s.randA, newB);
		}

		const ra = s.randA + 1;
		if (ra <= MAX_RAND_A) {
			fillRandomParts(s);
			s.randA = ra;
			return assemble(target, ra, s.randB);
		}

		// Both overflow within one millisecond: advance the timestamp by 1ms.
		// Sub-millisecond drift is permitted by RFC 9562 §6.2.
		const ts = target + 1;
		fillRandomParts(s);
		s.lastTimestamp = ts;
		return assemble(ts, s.randA, s.randB);
	}

	/**
	 * Generates an array of new UUIDv7s.
	 */
	genMany(amount: number, customTimestamp?: number): string[] {
		if (amount <= 0) {
			throw new Error("uuidv7 genMany error: generation amount must be greater than 0");
		}
		const out: string[] = [];
		for (let i = 0; i < amount; i++) {
			out.push(this.gen(customTimestamp));
		}
		return out;
	}

	/**
	 * Encodes a UUIDv7 with the instance's alphabet.
	 */
	encode(id: string): string {
		return encode(this.#codec, id);
	}

	/**
	 * Decodes an encoded UUIDv7. Returns `null` if invalid.
	 */
	decode(encodedId: string): string | null {
		return decode(this.#codec, encodedId);
	}

	/**
	 * Decodes an encoded UUIDv7. Throws if invalid.
	 */
	decodeOrThrow(encodedId: string): string {
		return decodeOrThrow(this.#codec, encodedId);
	}

	static isValid(id: string): boolean {
		return VALIDATION_RE.test(id);
	}

	static timestamp(id: string): number | null {
		return parseTimestamp(id);
	}

	static date(id: string): Date | null {
		const ts = parseTimestamp(id);
		return ts === null ? null : new Date(ts);
	}
}
