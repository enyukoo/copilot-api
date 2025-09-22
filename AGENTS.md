# NOTE: This project must always be runnable and all methods must be compatible with Ubuntu 20. Any new method, dependency, or instruction added must be tested and confirmed to work on Ubuntu 20 (LTS) environments.
# AGENTS.md

## Build, Lint, and Test Commands

-- **Build:**  
  `npm run build` (uses `tsc` with `tsconfig.build.json`)
-- **Dev:**  
  `npm run dev` (uses `ts-node-dev`)
-- **Lint:**  
  `npm run lint` (uses @echristian/eslint-config)
-- **Lint & Fix staged files:**  
  `npx lint-staged`
-- **Test all:**  
   `npm test` (runs Node test runner on all tests)
-- **Test single file:**  
   `npm test -- tests/<filename>.test.ts`
-- **Start (prod):**  
  `npm run start`

## Code Style Guidelines

- **Imports:**  
  Use ESNext syntax. Prefer absolute imports via `~/*` for `src/*` (see `tsconfig.json`).
- **Formatting:**  
  Follows Prettier (with `prettier-plugin-packagejson`). Run `npm run lint` to auto-fix.
- **Types:**  
  Strict TypeScript (`strict: true`). Avoid `any`; use explicit types and interfaces.
- **Naming:**  
  Use `camelCase` for variables/functions, `PascalCase` for types/classes.
- **Error Handling:**  
  Use explicit error classes (see `src/lib/error.ts`). Avoid silent failures.
- **Unused:**  
  Unused imports/variables are errors (`noUnusedLocals`, `noUnusedParameters`).
- **Switches:**  
  No fallthrough in switch statements.
- **Modules:**  
  Use ESNext modules, no CommonJS.
- **Testing:**  
  Use Node's built-in test runner. Place tests in `tests/`, name as `*.test.ts`.
- **Linting:**  
  Uses `@echristian/eslint-config`. Includes stylistic, unused imports, regex, and package.json rules.
- **Paths:**  
  Use path aliases (`~/*`) for imports from `src/`.

---

This file is tailored for agentic coding agents. For more details, see the configs in `eslint.config.js` and `tsconfig.json`.
