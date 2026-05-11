// Run with `pnpm vitest bench --run src/bench.ts`.
// This file is excluded from the published bundle and from the test command
// (vitest's `test.include` only picks up `*.test.ts`).
import { bench, describe } from "vitest";
import { UUIDv7 } from ".";

const uuid = new UUIDv7();

// Warm up so JIT decisions happen before any bench measurement.
for (let i = 0; i < 100_000; i++) uuid.gen();

const sample = uuid.gen();
const encoded = uuid.encode(sample);

describe("gen()", () => {
	bench("UUIDv7.gen() (default timestamp)", () => {
		uuid.gen();
	});
});

describe("gen(customTimestamp)", () => {
	// A monotonically rising timestamp so the same-ms counter branch hits
	// roughly the same fraction of calls as the runtime path.
	let t = 1_700_000_000_000;
	bench("UUIDv7.gen(customTimestamp)", () => {
		// Advance every few calls to exercise both branches.
		if ((t++ & 0xfff) === 0) t += 1;
		uuid.gen(t);
	});
});

describe("encode/decode", () => {
	bench("UUIDv7.encode()", () => {
		uuid.encode(sample);
	});
	bench("UUIDv7.decode()", () => {
		uuid.decode(encoded);
	});
});

describe("isValid", () => {
	bench("UUIDv7.isValid()", () => {
		UUIDv7.isValid(sample);
	});
});
