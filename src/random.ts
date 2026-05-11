export type GenState = {
	lastTimestamp: number;
	randA: number; // 12 bits
	randB: bigint; // 62 bits
};

export const RAND_B_MASK = (1n << 62n) - 1n;

const incBuf = new Uint32Array(1);

export function createState(): GenState {
	return { lastTimestamp: -1, randA: 0, randB: 0n };
}

// Fills the state with fresh CSPRNG-backed random parts. Uses crypto.randomUUID
// rather than crypto.getRandomValues + typed array reads: V8's BigInt parse
// from a hex string measurably outperforms BigUint64Array element reads for
// the 64-bit BigInt we need. The string allocations are absorbed by V8's
// native fast path for randomUUID().
export function fillRandomParts(state: GenState): void {
	const v4 = crypto.randomUUID();
	state.randA = parseInt(v4.slice(15, 18), 16);
	state.randB = BigInt("0x" + v4.replace(/-/g, "")) & RAND_B_MASK;
}

// Returns a BigInt counter increment in [1, 2^32].
export function randomIncrement(): bigint {
	crypto.getRandomValues(incBuf);
	return BigInt(incBuf[0]! + 1);
}
