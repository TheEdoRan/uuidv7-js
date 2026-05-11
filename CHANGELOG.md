# uuidv7-js

## 2.0.0

### Major Changes

- [#2](https://github.com/TheEdoRan/uuidv7-js/pull/2) [`e17d873`](https://github.com/TheEdoRan/uuidv7-js/commit/e17d8733ac55bbda6ea4dd2559f97cb93138ecb4) Thanks [@TheEdoRan](https://github.com/TheEdoRan)! - Audit, security hardening, and full restructure. Headline changes:

  - **No more spin-loop on backwards clock by default.** When `Date.now()` returns a value smaller than the last observed timestamp (NTP step-back, VM time-warp), v1 would busy-wait synchronously until the clock caught up — blocking the event loop for the full skew duration. v2 pins the timestamp to the last observed value and continues incrementing the monotonic counter. RFC 9562 §6.2 explicitly permits this. The v1 behavior is still available via `new UUIDv7({ blockOnBackwardsClock: true })` for callers who prefer strict timestamp fidelity over event-loop liveness.
  - **Counter double-overflow now advances the timestamp by 1ms** (runtime path) instead of busy-waiting. Sub-millisecond drift is permitted by RFC 9562 §6.2.
  - **`decode` / `decodeOrThrow` reject pathological inputs.** v1 would attempt to decode arbitrarily long strings, triggering super-linear BigInt math (a CPU-DoS hazard when input is untrusted). v2 rejects empty inputs and inputs longer than the maximum valid encoding length for the configured alphabet.
  - **Custom encode alphabets must be ASCII.** v1 silently accepted non-ASCII alphabets and would behave incorrectly with multi-code-unit characters; v2 throws at construction.
  - **Internal `TimestampUUIDv7` class removed.** It was an implementation detail not re-exported from the package entrypoint, but counts as breaking for anyone deep-importing.
  - **Performance.** Across the four hot paths (`gen()`, `gen(customTimestamp)`, `encode`, `decode`), v2 is at least as fast as v1 on every benchmark and noticeably faster on most: `gen()` ~+10%, `decode` ~+23%, `encode` ~+6%, `gen(customTimestamp)` ~+3%.
  - **Stricter TypeScript build.** `strictPropertyInitialization` and `useUnknownInCatchVariables` are no longer relaxed.
  - **Internal restructure.** Source split into `generator.ts`, `codec.ts`, `format.ts`, `random.ts`. No effect on the public API surface beyond the items listed above.

### Minor Changes

- [#2](https://github.com/TheEdoRan/uuidv7-js/pull/2) [`e17d873`](https://github.com/TheEdoRan/uuidv7-js/commit/e17d8733ac55bbda6ea4dd2559f97cb93138ecb4) Thanks [@TheEdoRan](https://github.com/TheEdoRan)! - Modernize toolchain: TypeScript 6, Oxlint + Oxfmt (with type-aware linting) replacing ESLint + Prettier, tsdown replacing tsup, Vitest replacing the Node.js built-in test runner, and Changesets replacing semantic-release. Husky / commitlint / commitizen are removed in favor of CI-only enforcement. CI/release split into `ci.yml` and `release.yml`. Node 26 pinned for development via `.node-version`; the library imposes no runtime Node-version constraint. The published package now uses an `exports` map with proper dual-package types (`index.d.ts` + `index.d.cts`) and is `type: "module"`; `dist/index.js` is ESM and `dist/index.cjs` is CJS.
