# Changelog

## [Unreleased] — OPC cleanup pass

### Security
- **S1.1** — Rotated leaked Supabase + email service keys; audited repo history for secret exposure.
- **S2.1** — Hardened admin auth: JWT-verified `is_admin` claim, explicit role checks server-side, no client-trust of admin flags.
- **S3.1** — API hardening for `send-reply-notification`: input validation, size caps, auth guard, idempotency key.
- **S4.1** — Server-side rate limiting on write RPCs; retry-after headers; per-IP + per-user buckets.

### Database
- **D1.1** — Schema fixes: NOT NULL on critical columns, fk integrity, correct PK types, indexes on hot-path queries. Migrations authored (not auto-applied).

### Code quality
- **C1.1** — Module dedup, consolidated env loading into `src/utils/environment.ts`.
- **C2.1** — Enabled `noUncheckedIndexedAccess` and `useUnknownInCatchVariables` in tsconfig. Fixed ~18 real-bug sites surfaced by the stricter flags. Deleted dead code: 100-line dead `_postsColumns` block in AdminDashboardPage, unused imports in SuccessPage, stale `_triggerReplyNotification` helper. Replaced unreachable 243-line SharePage UI with a ~56-line pure redirector.

### Performance
- **P1.1** — Route-level code splitting via `React.lazy` + `Suspense` fallback. Vendor chunk separation for antd, react-router, FontAwesome, i18next, Supabase, react-dom, react. Main bundle ~74 KB gz; critical-path first-paint ~131 KB gz. CSS-only LoadingPage so Suspense fallback doesn't eagerly pull FA into the critical path. `chunkSizeWarningLimit` raised to 1000 with honest comment on the antd 288 KB gz tail.

### Accessibility & UX
- **A1.1** — Skip link to `#main-content` (visually hidden until focus). Focus restoration on SPA route change: scroll-to-top, focus to `<main tabIndex={-1}>`, `role="status" aria-live="polite"` announcer reads `document.title` 300 ms after nav (lets pages' own useEffect set title first). Uses `location.key` as effect dep so hash/query changes within the same path trigger announcements. `lastKeyRef` (not a boolean) survives React StrictMode double-mount without yanking focus on initial render. `:focus-visible` scoped to native controls + custom buttons via `:not([class*="ant-"])` so AntD's own focus rings don't double-ring. Note-editing affordance in AccessCodeNotebook converted from `<div onClick>` to `<button type="button">` with explicit `fontFamily: 'inherit'` + explicit `fontSize: 11` (dropping the `font:'inherit'` shorthand that silently wiped fontSize).

### Dependencies (D2.1)
- **Group 1**: `@supabase/supabase-js` 2.49 → 2.104. No API breakage.
- **Group 2**: Vite 4 → 5. Vitest 0.30 → 2. `@vitest/coverage-c8` (unmaintained) replaced with `@vitest/coverage-v8`. `@vitejs/plugin-react` 4.0 → 4.7. `jsdom` 21 → 25.
- **Group 3**: `react-router-dom` 6.8 → 6.30 (latest v6). Clears 3 high-sev advisories in `@remix-run/router` transitive dep. Staying on v6 — v7 is a major rewrite and out of scope.
- **Group 4**: ESLint 8 → 9 with flat config migration. `.eslintrc.cjs` replaced by `eslint.config.mjs`. `@typescript-eslint/*` 5 → 8 via `typescript-eslint` meta-package. `--rulesdir` is gone in v9; custom `no-missing-i18n-key` rule wired via inline plugin. Replaced removed `ban-types` rule reference in `react-i18next.d.ts`. Added `caughtErrors: 'none'` to keep ts-eslint v8 from churning every `catch (error)` block.
- **Group 5**: `i18next` 22 → 24. `react-i18next` 12 → 15. Compatible with our custom `TFunction` augmentation.
- **Group 6**: Removed Cypress 12 entirely — the `cypress/` tree contained no actual specs (migrated to Playwright long ago). Consolidated `test:e2e` script to run Playwright.
- **Group 7**: `@ant-design/icons` 6.0 → 6.1.1. **Deferred: antd 5 → 6.** Per plan's "defer if non-trivial breakage" clause — v6 changes 100+ deprecated APIs, restructures `styles`/`classNames` props, changes DOM structure for overlay components, and removes default Tag margin. The blast radius across our codebase (admin tables, forms, modals, drawers) is a full unit of work on its own, not a safe group within D2.1. Leave antd on latest 5.x.

### Still pending
- antd 5 → 6 migration (see above).
- React 18 → 19, TypeScript 5 → 6, `web-vitals` 2 → 5: deferred. Outside the agreed D2.1 groups.
