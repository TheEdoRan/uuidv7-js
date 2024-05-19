/* eslint-disable @typescript-eslint/no-floating-promises */

import assert from "node:assert";
import { test } from "node:test";
import { UUIDv7, decodeOrThrowUUIDv7, decodeUUIDv7, encodeUUIDv7, uuidv7 } from ".";

test("1_000_000 generated UUIDs with default timestamp should be valid and monotonic", () => {
	const uuid = new UUIDv7();

	uuid.genMany(1_000_000).forEach((id, idx, arr) => {
		assert.strictEqual(UUIDv7.isValid(id), true);

		if (idx > 0 && id <= arr[idx - 1]!) {
			assert.fail(`UUIDs are not monotonic: ${id} <= ${arr[idx - 1]!}`);
		}
	});
});

test("1_000_000 generated UUIDs with custom timestamp should be valid and have the expected timestamp", () => {
	const expectedTimestamp = 1716073376015;
	const uuid = new UUIDv7();

	uuid.genMany(1_000_000, expectedTimestamp).forEach((id) => {
		assert.strictEqual(UUIDv7.isValid(id), true);
		assert.strictEqual(UUIDv7.timestamp(id), expectedTimestamp);
	});
});

test("uppercase UUID should be valid", () => {
	const uuid = new UUIDv7();
	const uppercase = uuid.gen().toUpperCase();
	assert.strictEqual(UUIDv7.isValid(uppercase), true);
});

test("timestamp and date functions should return expected values", () => {
	const id = "018f0760-4a87-737d-9889-b832d3dcce74";
	const expectedTimestamp = 1713815702151;
	const expectedDate = new Date(expectedTimestamp);

	const actualTimestamp = UUIDv7.timestamp(id);
	const actualDate = UUIDv7.date(id);

	assert.strictEqual(expectedTimestamp, actualTimestamp);
	assert.deepStrictEqual(expectedDate, actualDate);
});

test("generated and encoded 1_000_000 UUIDs using default Base58 alphabet should match the original UUIDs when decoded", () => {
	const uuid = new UUIDv7();

	for (let i = 0; i < 1_000_000; i++) {
		const id = uuid.gen();
		const encodedId = uuid.encode(id);
		const decodedId = uuid.decode(encodedId);
		const decodedOrThrowId = uuid.decodeOrThrow(encodedId);

		assert.deepStrictEqual(id, decodedId);
		assert.deepStrictEqual(id, decodedOrThrowId);
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

		assert.deepStrictEqual(id, decodedId);
		assert.deepStrictEqual(id, decodedOrThrowId);
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

		assert.deepStrictEqual(id, decodedId);
		assert.deepStrictEqual(id, decodedOrThrowId);
	}
});

test("function aliases should work as expected", () => {
	const id = uuidv7();
	const encodedId = encodeUUIDv7(id);
	const decodedId = decodeUUIDv7(encodedId);
	const decodedOrThrowId = decodeOrThrowUUIDv7(encodedId);

	assert.strictEqual(UUIDv7.isValid(id), true);
	assert.strictEqual(id, decodedId);
	assert.strictEqual(id, decodedOrThrowId);
});

test("invalid UUIDs should be detected", () => {
	const invalid1 = "invalid_id";
	const invalid2 = "00000000-0000-0000-0000-000000000000";
	const invalid3 = "12345678-1234-1234-1234-123456789012";
	const invalid4 = "c8cb31ca-8fb7-476d-806a-e2181dcdf980"; // UUIDv4 should not pass this test

	assert.strictEqual(UUIDv7.isValid(invalid1), false);
	assert.strictEqual(UUIDv7.isValid(invalid2), false);
	assert.strictEqual(UUIDv7.isValid(invalid3), false);
	assert.strictEqual(UUIDv7.isValid(invalid4), false);
});

test("invalid encoded UUIDs should return null when decoded with `decode`", () => {
	const invalidEncoded1 = "invalid encoded id";
	const invalidEncoded2 = "c8cb31ca-8fb7-476d-806a-e2181dcdf980";

	assert.strictEqual(decodeUUIDv7(invalidEncoded1), null);
	assert.strictEqual(decodeUUIDv7(invalidEncoded2), null);
});

test("invalid encoded UUIDs should throw error when decoded with `decodeOrThrow`", () => {
	const invalidEncoded1 = "invalid encoded id";
	const invalidEncoded2 = "c8cb31ca-8fb7-476d-806a-e2181dcdf980";

	assert.throws(() => decodeOrThrowUUIDv7(invalidEncoded1));
	assert.throws(() => decodeOrThrowUUIDv7(invalidEncoded2));
});
