# [uuidv7-js](https://github.com/TheEdoRan/uuidv7-js)

UUIDv7 generator library for JavaScript that implements the [RFC 9562](https://datatracker.ietf.org/doc/html/rfc9562) spec.

## Installation

```sh
npm i uuidv7-js
```

## Usage

```typescript
import { UUIDv7, uuidv7, encodeUUIDv7, decodeUUIDv7 } from "uuidv7-js";

// Initialize a new UUIDv7 generator.
// You can pass a custom encoding alphabet here.
const uuid = new UUIDv7();

const id = uuid.gen(); // 018ef3e8-90e2-7be4-b4ea-4be3bf8803b7
const encoded = uuid.encode(id); // CANANjseoigQthQMd1VwC
const decoded = uuid.decode(encoded); // 018ef3e8-90e2-7be4-b4ea-4be3bf8803b7
const isValid = UUIDv7.isValid(id); // true
const timestamp = UUIDv7.timestamp(id); // 1713489088738
const date = UUIDv7.date(id); // 2024-04-19T01:11:28.738Z

// You can also use convenient function aliases if you don't need to use a custom alphabet.
const id = uuidv7(); // 018ef3e8-90e2-7be4-b4ea-4be3bf8803b7
const encoded = encodeUUIDv7(id); // CANANjseoigQthQMd1VwC
const decoded = decodeUUIDv7(encoded); // // 018ef3e8-90e2-7be4-b4ea-4be3bf8803b7
```

## Create a new instance

```typescript
const uuid = new UUIDv7(opts?: { encodeAlphabet: string })
```

Creates a new `UUIDv7` instance. By default it uses the [Base58](https://www.cs.utexas.edu/users/moore/acl2/manuals/current/manual/index-seo.php/BITCOIN_____A2BASE58-CHARACTERS_A2) alphabet to `encode` and `decode` UUIDs, but you can pass a custom alphabet (16-64 characters).

### Instance methods

#### `gen`

```typescript
gen(customTimestamp?: number) => string
```

Generates a new UUIDv7. You can provide a custom timestamp to be used instead of the current one.

#### `genMany`

```typescript
genMany(amount: number, customTimestamp?: number) => string[]
```

Generates a custom amount of UUIDv7s. You can provide a custom timestamp to be used instead of the current one.

#### `encode`

```typescript
encode(id: string) => string
```

Encodes a UUIDv7 using the alphabet passed to the constructor or the default one.

#### `decode`

```typescript
decode(encodedId: string) => string | null
```

Decodes an encoded UUIDv7 using the alphabet passed to the constuctor or the default one. If the UUIDv7 is not valid, `null` is returned.

#### `decodeOrThrow`

```typescript
decodeOrThrow(encodedId: string) => string
```

Decodes an encoded UUIDv7 using the alphabet passed to the constuctor or the default one. If the UUIDv7 is not valid, an error is thrown.

### Static methods

#### `UUIDv7.isValid`

```typescript
UUIDv7.isValid(id: string) => boolean
```

Checks if the UUIDv7 is valid.

#### `UUIDv7.timestamp`

```typescript
UUIDv7.timestamp(id: string) => number | null
```

Returns the timestamp part of the UUIDv7. If the UUIDv7 is not valid, `null` is returned.

#### `UUIDv7.date`

```typescript
UUIDv7.date(id: string) => Date | null
```

Returns the timestamp part of the UUIDv7 converted to `Date`. If the UUIDv7 is not valid, `null` is returned.

### Function aliases

The library provides a few function aliases for convenience. You can use them without creating a new `UUIDv7` instance:

| Function name         | Instance method | Description                                                                                   |
| --------------------- | --------------- | --------------------------------------------------------------------------------------------- |
| `uuidv7`              | `gen`           | Generates a new UUIDv7.                                                                       |
| `encodeUUIDv7`        | `encode`        | Encodes a UUIDv7 with the default Base58 alphabet.                                            |
| `decodeUUIDv7`        | `decode`        | Decodes an encoded UUIDv7 from Base58 alphabet. Returns null if the encoded ID is invalid.    |
| `decodeOrThrowUUIDv7` | `decodeOrThrow` | Decodes an encoded UUIDv7 from Base58 alphabet. Throws an error if the encoded ID is invalid. |

## Implementation details

This library implements the [RFC 9562](https://datatracker.ietf.org/doc/html/rfc9562#name-uuid-version-7) spec to generate UUIDv7s:

- if the current timestamp is ahead of the last stored one, it generates new `rand_a` and `rand_b` parts;
- if the current timestamp is behind the last stored one, it waits for the next valid timestamp to return a UUIDv7 with newly generated `rand_a` and `rand_b` parts;
- if the current timestamp is the same as the last stored one:
  - it uses `rand_b` and then `rand_a` as randomly seeded counters, in that order. `rand_b` is the primary counter, and `rand_a` is used as the secondary one, when `rand_b` overflows its 62 bits (rare case). When used as a counter, `rand_b` increments its previous random value by a random integer between 1 and 4,294,967,296 (2^32), and `rand_a` increments its previous random value by 1, while generating a new `rand_b` part.
  - if both counters overflow their bit sizes, the generation function waits for the next millisecond to return a UUIDv7 with newly generated random parts.

This approach follows the [method 2](https://datatracker.ietf.org/doc/html/rfc9562#monotonicity_counters) of the "Monotonicity and Counters" section of the spec. It guarantees monotonicity and uniqueness per instance, and always keeps timestamp the same as `Date.now()` value.

If you provide a custom timestamp, it will be used instead of the current one. Generation works differently in this case:

- if the custom timestamp is different from the last custom stored one, it generates new `rand_a` and `rand_b` parts;
- if the custom timestamp is the same as the last custom stored one, it uses `rand_b` and then `rand_a` as randomly seeded counters, in that order, just like the normal generation method. If both `rand_a` and `rand_b` overflow, though, the generator throws an error informing that a valid UUIDv7 cannot be generated with the provided timestamp. This is an extremely rare case.

## Field and Bit Layout

This is the UUIDv7 Field and Bit Layout, took from the spec linked above:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           unix_ts_ms                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          unix_ts_ms           |  ver  |       rand_a          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|var|                        rand_b                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                            rand_b                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Description

#### unix_ts_ms

48 bit big-endian unsigned number of Unix epoch timestamp in milliseconds as per [Section 6.1](https://datatracker.ietf.org/doc/html/rfc9562#timestamp_considerations). Occupies bits 0 through 47 (octets 0-5).

#### ver

The 4 bit version field as defined by [Section 4.2](https://datatracker.ietf.org/doc/html/rfc9562#version_field), set to 0b0111 (7). Occupies bits 48 through 51 of octet 6.

#### rand_a

12 bits pseudo-random data to provide uniqueness as per [Section 6.9](https://datatracker.ietf.org/doc/html/rfc9562#unguessability) and/or optional constructs to guarantee additional monotonicity as per [Section 6.2](https://datatracker.ietf.org/doc/html/rfc9562#monotonicity_counters). Occupies bits 52 through 63 (octets 6-7).

#### var

The 2 bit variant field as defined by [Section 4.1](https://datatracker.ietf.org/doc/html/rfc9562#variant_field), set to 0b10. Occupies bits 64 and 65 of octet 8.

#### rand_b

The final 62 bits of pseudo-random data to provide uniqueness as per [Section 6.9](https://datatracker.ietf.org/doc/html/rfc9562#unguessability) and/or an optional counter to guarantee additional monotonicity as per [Section 6.2](https://datatracker.ietf.org/doc/html/rfc9562#monotonicity_counters). Occupies bits 66 through 127 (octets 8-15).

## Feedback

If you found a bug in the implementation, please open a new [issue](https://github.com/TheEdoRan/uuidv7-js/issues/new).

## Alternatives

- [uuidv7](https://www.npmjs.com/package/uuidv7) by [LiosK](https://github.com/LiosK)

## License

This project is licensed under the MIT License.
