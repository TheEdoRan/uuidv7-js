---
"uuidv7-js": minor
---

Modernize toolchain: TypeScript 6, Oxlint + Oxfmt (with type-aware linting) replacing ESLint + Prettier, tsdown replacing tsup, Vitest replacing the Node.js built-in test runner, and Changesets replacing semantic-release. Husky / commitlint / commitizen are removed in favor of CI-only enforcement. CI/release split into `ci.yml` and `release.yml`. Node 26 pinned for development via `.node-version`; the library imposes no runtime Node-version constraint. The published package now uses an `exports` map with proper dual-package types (`index.d.ts` + `index.d.cts`) and is `type: "module"`; `dist/index.js` is ESM and `dist/index.cjs` is CJS.
