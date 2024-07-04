export function addHyphens(id: string) {
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
export function genRandParts() {
	const v4 = crypto.randomUUID();

	return {
		randA: parseInt(v4.slice(15, 18), 16),
		randB: BigInt("0x" + v4.replace(/-/g, "")) & ((1n << 62n) - 1n),
	};
}
