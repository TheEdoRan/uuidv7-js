import { afterEach, expect, test, vi } from "vitest";
import { UUIDv7, decodeOrThrowUUIDv7, decodeUUIDv7, encodeUUIDv7, uuidv7 } from ".";

afterEach(() => {
	vi.restoreAllMocks();
});

test("1_000_000 generated UUIDs with default timestamp should be valid and monotonic", () => {
	const uuid = new UUIDv7();

	uuid.genMany(1_000_000).forEach((id, idx, arr) => {
		expect(UUIDv7.isValid(id)).toBe(true);

		if (idx > 0 && id <= arr[idx - 1]!) {
			throw new Error(`UUIDs are not monotonic: ${id} <= ${arr[idx - 1]!}`);
		}
	});
});

test("1_000_000 generated UUIDs with custom timestamp should be valid and have the expected timestamp", () => {
	const expectedTimestamp = 1716073376015;
	const uuid = new UUIDv7();

	uuid.genMany(1_000_000, expectedTimestamp).forEach((id) => {
		expect(UUIDv7.isValid(id)).toBe(true);
		expect(UUIDv7.timestamp(id)).toBe(expectedTimestamp);
	});
});

test("uppercase UUID should be valid", () => {
	const uuid = new UUIDv7();
	const uppercase = uuid.gen().toUpperCase();
	expect(UUIDv7.isValid(uppercase)).toBe(true);
});

test("timestamp and date functions should return expected values", () => {
	const id = "018f0760-4a87-737d-9889-b832d3dcce74";
	const expectedTimestamp = 1713815702151;
	const expectedDate = new Date(expectedTimestamp);

	const actualTimestamp = UUIDv7.timestamp(id);
	const actualDate = UUIDv7.date(id);

	expect(actualTimestamp).toBe(expectedTimestamp);
	expect(actualDate).toEqual(expectedDate);
});

test("generated and encoded 1_000_000 UUIDs using default Base58 alphabet should match the original UUIDs when decoded", () => {
	const uuid = new UUIDv7();

	for (let i = 0; i < 1_000_000; i++) {
		const id = uuid.gen();
		const encodedId = uuid.encode(id);
		const decodedId = uuid.decode(encodedId);
		const decodedOrThrowId = uuid.decodeOrThrow(encodedId);

		expect(decodedId).toEqual(id);
		expect(decodedOrThrowId).toEqual(id);
	}
});

test("generated and encoded 1_000_000 UUIDs using Crockford Base32 alphabet should match the original UUIDs when decoded", () => {
	const crockfordBase32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
	const uuid = new UUIDv7({ encodeAlphabet: crockfordBase32 });

	for (let i = 0; i < 1_000_000; i++) {
		const id = uuid.gen();
		const encodedId = uuid.encode(id);
		const decodedId = uuid.decode(encodedId);
		const decodedOrThrowId = uuid.decodeOrThrow(encodedId);

		expect(decodedId).toEqual(id);
		expect(decodedOrThrowId).toEqual(id);
	}
});

test("generated and encoded 1_000_000 UUIDs using Base48 alphabet should match the original UUIDs when decoded", () => {
	const base48 = "BCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz256789";
	const uuid = new UUIDv7({ encodeAlphabet: base48 });

	for (let i = 0; i < 1_000_000; i++) {
		const id = uuid.gen();
		const encodedId = uuid.encode(id);
		const decodedId = uuid.decode(encodedId);
		const decodedOrThrowId = uuid.decodeOrThrow(encodedId);

		expect(decodedId).toEqual(id);
		expect(decodedOrThrowId).toEqual(id);
	}
});

test("function aliases should work as expected", () => {
	const id = uuidv7();
	const encodedId = encodeUUIDv7(id);
	const decodedId = decodeUUIDv7(encodedId);
	const decodedOrThrowId = decodeOrThrowUUIDv7(encodedId);

	expect(UUIDv7.isValid(id)).toBe(true);
	expect(decodedId).toBe(id);
	expect(decodedOrThrowId).toBe(id);
});

test("invalid UUIDs should be detected", () => {
	const invalid1 = "invalid_id";
	const invalid2 = "00000000-0000-0000-0000-000000000000";
	const invalid3 = "12345678-1234-1234-1234-123456789012";
	const invalid4 = "c8cb31ca-8fb7-476d-806a-e2181dcdf980"; // UUIDv4 should not pass this test

	expect(UUIDv7.isValid(invalid1)).toBe(false);
	expect(UUIDv7.isValid(invalid2)).toBe(false);
	expect(UUIDv7.isValid(invalid3)).toBe(false);
	expect(UUIDv7.isValid(invalid4)).toBe(false);
});

test("invalid encoded UUIDs should return null when decoded with `decode`", () => {
	const invalidEncoded1 = "invalid encoded id";
	const invalidEncoded2 = "c8cb31ca-8fb7-476d-806a-e2181dcdf980";

	expect(decodeUUIDv7(invalidEncoded1)).toBeNull();
	expect(decodeUUIDv7(invalidEncoded2)).toBeNull();
});

test("invalid encoded UUIDs should throw error when decoded with `decodeOrThrow`", () => {
	const invalidEncoded1 = "invalid encoded id";
	const invalidEncoded2 = "c8cb31ca-8fb7-476d-806a-e2181dcdf980";

	expect(() => decodeOrThrowUUIDv7(invalidEncoded1)).toThrow();
	expect(() => decodeOrThrowUUIDv7(invalidEncoded2)).toThrow();
});

test("gen() should not spin when the clock goes backwards", () => {
	const uuid = new UUIDv7();
	const baseTime = 1_700_000_000_000;

	const nowSpy = vi.spyOn(Date, "now").mockReturnValue(baseTime);
	const first = uuid.gen();

	// Jump the clock back five seconds. v1 would busy-wait until it caught up.
	nowSpy.mockReturnValue(baseTime - 5_000);
	const start = performance.now();
	const second = uuid.gen();
	const elapsed = performance.now() - start;

	expect(elapsed).toBeLessThan(10);
	expect(UUIDv7.isValid(second)).toBe(true);
	expect(second > first).toBe(true); // pinned timestamp + counter increment keeps it monotonic
});

test("decode() should reject pathological input lengths quickly", () => {
	const uuid = new UUIDv7();
	const longInput = "A".repeat(10_000);

	const start = performance.now();
	const result = uuid.decode(longInput);
	const elapsed = performance.now() - start;

	expect(result).toBeNull();
	expect(elapsed).toBeLessThan(10);
	expect(() => uuid.decodeOrThrow(longInput)).toThrow();
});

test("decode() should reject empty input", () => {
	const uuid = new UUIDv7();
	expect(uuid.decode("")).toBeNull();
	expect(() => uuid.decodeOrThrow("")).toThrow();
});

test("burst generation within a single millisecond should be monotonic", () => {
	const uuid = new UUIDv7();
	vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

	const ids = uuid.genMany(10_000);
	for (let i = 1; i < ids.length; i++) {
		expect(UUIDv7.isValid(ids[i]!)).toBe(true);
		if (ids[i]! <= ids[i - 1]!) {
			throw new Error(`Not monotonic at ${i}: ${ids[i]!} <= ${ids[i - 1]!}`);
		}
	}
});

