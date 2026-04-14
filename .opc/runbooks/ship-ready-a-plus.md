# Ship-Ready A+ — ProblemSolver Remediation Runbook

> **Primary goal (amended 2026-04-13):** Drive ProblemSolver to a state where it can
> be launched to the public and reliably serve **1,000 users** over a one-week window.
> The final output of this runbook is a **calibrated confidence score out of 100**,
> produced by an independent reviewer using the methodology in Appendix A.
> The runbook does NOT terminate as successful unless the score is ≥ 95/100.
>
> **Secondary goal:** A+ on every quality dimension as rated against the
> "production software trusted with strangers' data" bar (not the "grade 8
> student project" bar).
>
> **Definition of "1,000 users":** 1,000 unique users submitting posts or
> replies over a 7-day window, with a peak concurrency of ≤ 20 simultaneous
> requests. NOT a high-scale requirement — this is realistic for an 8th
> grader's public launch, and Supabase free tier handles it comfortably.
>
> **Starting grade** (from the OPC code review of commit `1252070`, 4 independent reviewers):
> Overall C+ · Security D · Test quality B · Architecture B+ · UX B · Product C · DX B−.
>
> **Current session progress** (not yet reflected in git):
> - The user-reported "0 replies" bug was diagnosed live — root cause was
>   Supabase RLS blocking SELECT on the `replies` table. Fixed by running
>   `supabase/migrations/2026_04_12_replies_rls_policies.sql`. User confirmed
>   the fix works in the browser. Phase 1 (U1-U3) reproducer-first discipline
>   may be skipped if live-evidence is acceptable.
> - `createReply` was hardened to tolerate RLS blocking SELECT-after-INSERT.
> - `ReplyForm` now shows visible success/error/info feedback.

---

## Hard rules (non-negotiable — a unit that violates any of these is marked BLOCKED)

1. **No self-grading.** The agent that does the work never evaluates it. Every
   build unit must be reviewed by a fresh subagent with no memory of the build.
2. **Reproducer before fix.** Every bug unit starts with a failing reproducer —
   a unit test, an E2E test, or a curl command — committed before the fix.
   The fix is accepted only when that same reproducer passes without modification.
3. **No hardcoded environment values in committed code.** URLs, secrets, ports,
   hostnames, credentials. If it differs between dev/staging/prod, it goes in an
   env var with a `VITE_`-prefixed client fallback documented in `.env.example`.
4. **No test that asserts the current bug.** If an E2E test contains a literal
   URL, credential, or string that is itself part of a known bug, the unit fails
   review. (This is the F3 lesson from the prior session — the verification
   must not defend the bug.)
5. **Verification evidence must be external.** Unit tests passing is NOT
   sufficient evidence. Every UI unit requires a Playwright screenshot of the
   fixed state + a separate screenshot of the broken state pre-fix.
6. **No `console.log` of PII** (email addresses, access codes, tokens). Mask or
   don't log.
7. **Tests must type-check.** Remove the `tsconfig` exclude on test files and
   fix the 17 real type errors in fixtures. No more hiding.
8. **Every fix must not regress any other test.** Run the full suite
   (unit + E2E + tsc + build) before marking a unit complete.
9. **Migrations are tracked.** Move `supabase/migrations/` to a format where
   the app can detect applied vs unapplied state — or at minimum, a README in
   that directory listing which files have been run against which environments.
10. **Acceptance criteria are frozen at the start of the loop.** This file
    defines them. The orchestrator cannot rewrite them during the run.
11. **Confidence score is bounded.** The final U28 confidence score is
    computed by a reviewer that has NOT participated in any build unit, using
    the methodology in Appendix A. No single dimension can exceed 99.5%
    (Unknown Unknowns Ceiling). The joint score cannot exceed ∏(dim_i) × 100.
    The orchestrator does not write the final score — the reviewer does.
12. **Personas must use the live website, not read code.** Phase 0 persona
    walkthroughs are executed against `http://localhost:3000` (or a deployed
    URL) using Playwright with screenshot evidence. A persona reviewer that
    only reads source code fails this hard rule.

---

## Dimension definitions — what A+ actually means

### Security — A+

- No anon Supabase key can read any PII column. Verified by running a curl against the deployed Supabase REST URL with the anon key and confirming `notify_email` is not returned from `/rest/v1/posts` under any filter.
- `/api/send-reply-notification` cannot be triggered by arbitrary input. Verified by:
  - `curl -X POST .../api/send-reply-notification -d '{"email":"any","replyContent":"any"}'` returns 400 or 401, never 200
  - The endpoint only accepts `{replyId, signature}` or equivalent, and looks up email server-side via the service role
- Admin credentials are not in source. `grep -r 'admin123' src/` returns zero matches.
- Write operations on `posts` and `replies` that change ownership-sensitive fields (status, solved, is_solution) require the access code server-side, not just an anon UPDATE policy.
- Email addresses are never logged in plaintext. `grep -r 'notify_email' src/` shows no direct log statements; the API handler masks to `xx***@domain`.
- Resend API key is never imported from a client module. `grep -r 'RESEND_API_KEY' src/` returns zero matches; only `api/*.ts` files reference it.

### Test quality — A+

- `tsc --noEmit` clean on the WHOLE project including test files (no `exclude` escape hatch).
- No test file contains the literal string `http://localhost:9999` or any other known-broken URL/value.
- Every production function added in commit `1252070` onward has a direct unit test. Specifically: `copyCode`, `goToProblem`, `toggleSolved`, `triggerReplyNotification`, `fetchPostByCode`, and the `/api/send-reply-notification` handler.
- Tests for async fire-and-forget patterns use `vi.waitFor` or explicit promise resolution, NOT `setTimeout(10)` polling.
- Every E2E test for a new fix takes a "before" screenshot of the bug AND an "after" screenshot of the fix. Both are written to `test-results/remediation-evidence/`.
- Coverage is derived from `npm run coverage` AND each "critical path" file has ≥95% line + branch coverage: `database.service.ts`, `admin.service.ts`, `AccessCodeNotebook.tsx`, `PastQuestionsPage.tsx`, `ConfessionPage.tsx`, `HelpDetailPage.tsx`, `api/send-reply-notification.ts`.

### Architecture — A+

- `AccessCodeNotebook.tsx` is split into a view component + a hook (or reducer) for state. No single file in `src/components/pages/` exceeds 300 lines.
- Duplicate storage systems are resolved: exactly one of `StorageSystem.ts` / `storage-system.ts` / `storageAdapter.ts` / `sessionStorageAdapter.ts` remains, and it is the one actually used by shipped code. Dead ones are deleted, not just left in place.
- The `PastQuestionsPage` reply fallback (lines 105-114 of the pre-runbook state) is removed IF the RLS migration is applied. If the migration is the permanent fix, dead code must go.
- The `notify_email` column lives in a separate table (`post_notifications` or equivalent) with RLS that blocks anon SELECT. `posts` no longer has the column.
- The mentor-table integration lives behind a single env var `VITE_MENTOR_TABLE_URL` referenced in exactly one place (a helper) — no duplicate hardcodes across `SuccessPage`, `LandingPage`, or tests.

### UX / Visual — A+

- A real user can: submit a confession → receive the access code → bookmark it in the notebook → close the tab → reopen the tab → find it in the notebook → click "Open" → see the post with all existing replies. Verified by a Playwright journey that performs all these steps against a real Supabase (or a high-fidelity mock that matches real RLS behavior).
- The notebook's per-entry action row does not clip, wrap, or overflow at any browser width from 320px (mobile) to 1920px. Verified by Playwright running the notebook render at multiple viewports and asserting no horizontal scrollbar.
- Every external link (Mentor Table) shows a visible "opens in new tab" affordance AND uses `rel="noopener noreferrer"`.
- The "0 replies when a reply exists" bug is reproduced in an E2E test against a state where the DB actually has a reply, and then proven fixed.

### Product completeness — A+

- **The user's own reported bug is fixed and verified by the user.** The "0 replies" bug the session is currently blocking on is resolved end-to-end. The user posts a reply and sees it reflected on past-questions within 5 seconds of submission.
- Email notifications work end-to-end against a real Resend sandbox account, OR the feature is behind a flag so it doesn't half-work. If behind a flag, the flag is documented in `docs/email-notifications.md` and defaults to OFF.
- The Mentor Table link opens a working page (either a deployed URL or a "coming soon" placeholder) — never a browser error page.
- Admin dashboard requires a real password. Default `admin123` is removed from all environments.

### DX / Maintainability — A+

- `tsc --noEmit` clean across all files including tests.
- `npm run lint` clean (or the lint step is explicitly documented as disabled with rationale).
- Main JS bundle under 600 KB gzipped. Measured via `npm run build` output.
- No duplicate modules (storage system consolidation, see Architecture).
- `docs/email-notifications.md` reflects the final architecture including the `post_notifications` table move.
- `.env.example` is complete and matches the variables actually read by the code. Verified by a script that greps `import.meta.env.VITE_*` and `process.env.*` and cross-references them against `.env.example`.

### Honesty of claims — A+

- The final report lists dimensions and grades assigned by an **independent reviewer that was not involved in any build unit**. The orchestrator writes NO grades.
- Every grade is backed by a concrete artifact: screenshot path, test file path, or command output file path.
- If any dimension does not make it to A+, the report says so explicitly and the runbook loop CANNOT be terminated as successful. No cheerful "mostly done" language.

---

## Findings to resolve (sourced from `.harness/nodes/code-review/run_1/` of commit 1252070)

### Critical (ship-blockers) — must be resolved

- **SEC-1 · PII leak** (security · eval-security.md §1)
  `notify_email` column on `posts` + permissive anon SELECT policy → anyone with the anon key (shipped in bundle) can `SELECT notify_email FROM posts`.
  Root cause: column-scoped security enforced via row-level policies.
  Fix: move `notify_email` + `notify_via_email` to a `post_notifications` table with RLS that denies anon SELECT. Rewrite `createPost` and `triggerReplyNotification` accordingly.

- **SEC-2 · Unauth spam relay** (security · eval-security.md §2)
  `api/send-reply-notification.ts` accepts `email` + `replyContent` from the request body. No auth, no rate limit, no cross-check.
  Fix: endpoint accepts only `{replyId, signature}` where `signature` is HMAC-SHA256(`replyId`, shared secret env var). Server looks up reply + email via service-role Supabase client. Add per-IP rate limit (5 req/min).

- **SEC-3 · Permissive UPDATE RLS** (security · eval-security.md §3)
  `posts FOR UPDATE TO anon USING (true) WITH CHECK (true)` allows anyone to overwrite any post's `notify_email`, `status`, anything.
  Fix: drop the universal UPDATE policy. Replace with `SECURITY DEFINER` RPC functions (`mark_post_solved(access_code, status)`, `mark_reply_solution(access_code, reply_id)`) that verify the access code server-side.

- **SEC-4 · Email logged in cleartext** (security · eval-security.md §4, frontend · eval-frontend.md I1)
  Both `api/send-reply-notification.ts` and client-side `triggerReplyNotification` console.log the OP's email. Client-side log leaks OP email to the REPLIER's devtools.
  Fix: mask to `xx***@domain` in all log paths. Grep post-fix to confirm.

- **SEC-5 · viewUrl href unescaped** (security · eval-security.md §5)
  `api/send-reply-notification.ts` line 87 interpolates `${viewUrl}` built from untrusted `Origin` header into the email HTML.
  Fix: allow-list origins at request time, escape `viewUrl` when interpolating.

- **BUG-1 · "0 replies" reproduction failure** (product, user-reported, UNRESOLVED)
  User submits a reply, looks up the post via access code, sees "no replies yet".
  Root cause: unknown (either RLS blocks reply SELECT, or the fallback to `post.replies` from the join is also returning empty, or the reply insert silently failed).
  Fix: **write a reproducer first.** Add diagnostic logging (or use the logging I already added in PastQuestionsPage). Reproduce in the browser. Identify which branch is empty. Fix at the correct layer: either the RLS migration (if reads are blocked) OR the insert path (if writes are failing) OR the render (if both queries return data but the UI doesn't show it). **Do not mark resolved until the user confirms.**

- **BUG-2 · Hardcoded localhost:9999** (frontend · eval-frontend.md C1, devil-advocate · eval-devil-advocate.md critical)
  `LandingPage.tsx` line 98, 101 and `SuccessPage.tsx` line 145 ship `http://localhost:9999/` to production. Plus `session-verification.spec.ts` lines 206-219 ASSERT this URL — the test defended the bug.
  Fix: introduce `VITE_MENTOR_TABLE_URL` env var, default `http://localhost:9999/` in `.env.example`. Reference it from ONE helper (`src/utils/mentorTableUrl.ts`). Update the E2E test to read from the env var at runtime, not assert a literal.

- **BUG-3 · Admin credentials hardcoded** (pre-existing, confirmed by security review)
  `admin.service.ts` uses `username: 'admin', password: 'admin123'` in source.
  Fix: move to env vars `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` (bcrypt). If env vars absent in dev, the app refuses admin login with a clear error — NOT a fallback to the hardcode.

### Improvements (should be resolved for A+)

- **FE-1 · `email.includes('@')` validation** (frontend I5) — use a real regex.
- **FE-2 · Email state not cleared on uncheck** (frontend I5) — `useEffect` that clears when `notifyViaEmail` goes false.
- **FE-3 · Shareable URL ?code= not stripped after consume** (frontend I3) — `history.replaceState` after auto-populate.
- **FE-4 · Reply merge picks first non-empty, not union by id** (frontend I4) — if separate query returns 1 reply and join returns 3, we show 1. Union by id, dedupe by created_at.
- **FE-5 · Notebook action row no `white-space: nowrap`** (frontend I2) — add it so font scaling doesn't wrap.
- **FE-6 · `goToProblem` query string with HashRouter** (frontend I6) — verify HashRouter parses it; if not, use `sessionStorage.temp_access_code` as the handoff.
- **FE-7 · `copyCode` has no `navigator.clipboard` fallback** (frontend M3) — add `document.execCommand('copy')` or show a textarea fallback on insecure contexts.
- **FE-8 · No `noopener,noreferrer` on `window.open`** (frontend C2) — reverse-tabnabbing risk.
- **SEC-6 · No CORS allow-list on API route** (security §7) — explicit OPTIONS handler + allow-list.
- **SEC-7 · `RESEND_FROM_ADDRESS` not validated** (security §6) — regex-validate on read to prevent header injection.
- **TEST-1 · Zero unit tests for notebook `copyCode`/`goToProblem`/`toggleSolved`** (tester critical 1) — tester provided the code in eval-tester.md, use it.
- **TEST-2 · 17 real type errors hidden by tsconfig exclude** (tester critical 2) — remove the exclude and fix the fixtures.
- **TEST-3 · No focused unit test for ConfessionPage email opt-in** (tester critical 3).
- **TEST-4 · Magic 10ms sleeps** (tester improvement) — `vi.waitFor` or microtask flush.
- **TEST-5 · F3 doesn't click through** (tester improvement) — add a click-through assertion that navigates.
- **TEST-6 · F8 doesn't POST through `createReply`** (tester improvement) — seed via the real insert path to exercise the trigger.
- **DEV-1 · Dead replies fallback in `PastQuestionsPage`** (devil-advocate improvement) — if the RLS migration is the permanent fix, delete the client fallback.
- **DEV-2 · `supabase/migrations/` is not a tracked migration system** (devil-advocate improvement) — rename or add a `MIGRATIONS_APPLIED.md` tracking file.

### Minor (can be deferred, but fix if cheap)

- Token-based unsubscribe link in emails (security minor 12) — GDPR compliance before scaling.
- Bundle size optimization — code-split admin dashboard (currently 1.5MB main chunk).
- Dead mentor-table assets in translation files.

---

## Unit sequence

Units are atomic — each ends in a commit. Each build unit is followed by a review unit dispatched to an independent subagent.

### Phase 0 — Live persona walkthroughs (NEW — user-requested)

> Rationale: before reviewing code, have independent personas actually USE
> the live website as real users would. This catches issues that code review
> can't: confusing UX, broken flows, content that looks wrong, missing affordances.

- **U0a · parallel persona walkthroughs** — dispatch 6 persona agents IN PARALLEL, each runs Playwright against `http://localhost:3000` and completes a specific user journey. Agents do NOT read source code except to know what routes exist. Each writes `eval-{persona}.md` to `.harness/nodes/phase-0/run_1/` with: (1) step-by-step journey log, (2) screenshot at each step, (3) bug list with severity, (4) UX issues with severity, (5) overall verdict.
  - **new-user** · never used the app, lands on `/`, tries to figure out what it does and how to submit a confession. Goal: can they submit a first post in under 90 seconds without confusion?
  - **active-user** · has used the app before, has an access code saved in notebook, wants to check on their post. Goal: can they look up their post and see replies in under 30 seconds?
  - **helper** · wants to help someone, browses `/help`, picks a post, leaves a reply. Goal: does submitting a reply give visible success feedback and appear in the post's reply list?
  - **mobile-user** · using Playwright at 375×667 viewport (iPhone SE). Goal: does every page render usably without horizontal scroll or cut-off content?
  - **a11y** · tab-only navigation, screen reader announcements, color contrast, focus indicators. Goal: can a keyboard-only user complete submission + lookup without a mouse?
  - **security-adversary** · try breaking the app as a casual attacker: SQL injection in the access code field, XSS in the confession body, oversized payloads, CSRF, open-redirect. Goal: does anything crash, leak, or escalate?
  - verify: each persona produces their eval-{persona}.md with at least 3 screenshots and a verdict
  - eval (gate): orchestrator synthesizes the 6 evals into a consolidated findings list + priority. NO filtering — everything goes to Phase 0b.

- **U0b · triage persona findings** — read all 6 persona evals. Sort findings by severity and map each to either (a) an existing unit in phases 1-8, or (b) a new ad-hoc fix unit inserted after the relevant phase. Write `.harness/nodes/phase-0/triage.md` with the full mapping. The user-reported bugs are ALREADY covered by Phase 1, and the security audit findings are covered by Phase 2 — do not re-invent.
  - verify: triage.md exists; every persona finding has a target unit; new ad-hoc units are added to this runbook inline at the correct position
  - eval: reviewer confirms no persona finding was dropped or filtered

### Phase 1 — Reproduce and fix the user-reported bug first (BUG-1)

> Rationale: the user is actively blocked. No other unit can claim "shipping quality" while the user can't see their own replies.

- **U1 · reproduce** · `BUG-1` — add a diagnostic log to `PastQuestionsPage.fetchPostByCode` (already done in current state). In a separate commit, write a Playwright test that: seeds Supabase (real or mocked) with a post + reply in separate INSERT calls, navigates as a user, and asserts the reply is visible. The test MUST FAIL at this point and the failure output MUST be saved as evidence.
  - verify: `npx playwright test e2e/bug-1-reproducer.spec.ts` exits non-zero with a meaningful assertion failure. Save stderr to `test-results/remediation-evidence/bug-1-before.txt`.
  - eval (review): the reviewer confirms the reproducer actually reproduces the bug reported by the user (matches what the user described) — NOT a toy case that happens to fail.

- **U2 · diagnose** · `BUG-1` — using the diagnostic logs from U1 (or adding more), identify EXACTLY where the data is lost: reply insert fails? Reply insert succeeds but SELECT returns empty? SELECT returns data but render path doesn't use it? Produce a written diagnosis in `.harness/diagnoses/bug-1.md` with the specific supabase response, the specific code branch, and the root cause.
  - verify: the diagnosis names a specific file:line and a specific Supabase response shape.
  - eval: the reviewer reads the diagnosis and confirms it matches observable behavior. If the diagnosis is "RLS blocks SELECT", reviewer verifies by running a raw curl against the Supabase REST endpoint.

- **U3 · fix** · `BUG-1` — fix at the layer identified in U2. If it's RLS, the fix is an SQL migration. If it's the client, the fix is code. Do NOT fix everywhere "just in case".
  - verify: re-run the U1 reproducer. It must now PASS without modification. Save stderr to `test-results/remediation-evidence/bug-1-after.txt`.
  - eval: the reviewer diffs `bug-1-before.txt` and `bug-1-after.txt` and confirms the failing assertion is the one that now passes.

### Phase 2 — Security critical path

- **U4 · SEC-3 repro + fix** — before U5 touches anything, demonstrate the "anyone can overwrite anyone's notify_email" exploit in a test, then fix via `SECURITY DEFINER` RPCs.
  - verify: integration test that attempts the exploit with the anon key and confirms it is blocked. Test file checked in.
  - eval: reviewer confirms the RPC signature actually requires the access code, not just "pretty please".

- **U5 · SEC-1 fix** — create `post_notifications` table with anon-blocking RLS. Migrate `createPost` to write to both `posts` and `post_notifications`. Remove `notify_email`/`notify_via_email` columns from `posts`.
  - verify: `curl -H "apikey: $ANON_KEY" "$SUPABASE_URL/rest/v1/posts?select=notify_email"` returns 400 or empty. `curl -H "apikey: $ANON_KEY" "$SUPABASE_URL/rest/v1/post_notifications?select=email"` returns 401 or empty.
  - eval: reviewer runs the curls themselves (not from a cached test) and pastes the responses in eval artifact.

- **U6 · SEC-2 fix** — rewrite `/api/send-reply-notification` to accept `{replyId, signature}` only. Generate the signature from a Supabase DB webhook that fires on replies INSERT, signed with `REPLY_NOTIFICATION_SECRET`. Add per-IP rate limit via Vercel Edge Middleware or a simple in-memory bucket.
  - verify: `curl -X POST "/api/send-reply-notification" -d '{"email":"attacker@evil.com","replyContent":"BUY CRYPTO"}'` returns 400. `curl` with a valid signed payload returns 200. Rate limit test: 6 rapid requests → 6th is 429.
  - eval: reviewer confirms no code path in the endpoint reads `email` from `req.body` — only from the DB via `replyId`.

- **U7 · SEC-4 fix** — mask all email logs. Grep to prove it: `grep -rE 'console\.(log|warn|error).*notify_email' src/ api/` must return zero lines, AND there must be at least one test asserting that `triggerReplyNotification` does not include a raw email in console output.
  - verify: grep result + unit test assertion.
  - eval: reviewer runs the grep themselves and confirms empty.

- **U8 · SEC-5 fix** — allow-list origins in the API route, escape `viewUrl` into the href.
  - verify: unit test that a forged `Origin: evil.com` header yields either a 400 or a hardcoded fallback, and the email body href is escaped.

- **U9 · BUG-3 fix** — remove hardcoded admin password. Add `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` env vars. Use bcrypt (via `bcryptjs`). If env vars absent, admin login returns a clear error, not a fallback.
  - verify: `grep -r 'admin123' src/` returns zero. Running admin login with valid hashed password succeeds. Running with `admin/admin123` fails with a "credentials not configured" message if env is not set.
  - eval: reviewer re-runs the grep and attempts to login with the hardcoded value.

### Phase 3 — The ship-to-prod bug

- **U10 · BUG-2 fix** — `VITE_MENTOR_TABLE_URL` env var, single helper, update all 3 call sites.
  - verify: `grep -r 'localhost:9999' src/ e2e/ api/` returns zero lines. Build succeeds. E2E tests read the helper, not a literal string.
  - eval: reviewer confirms the E2E no longer ASSERTS the URL literal — it only asserts the helper's output, or fetches the env value at test time.

### Phase 4 — Test quality and type safety

- **U11 · TEST-2 fix** — remove `tsconfig` exclude, fix 17 real type errors in test fixtures (add missing `is_anonymous`, `is_solution`, `tags`, `status` fields).
  - verify: `npx tsc --noEmit` clean across all files including tests. No `// @ts-expect-error` / `// @ts-ignore` added.
  - eval: reviewer runs `tsc` themselves and confirms zero output.

- **U12 · TEST-1 + TEST-3 fix** — add unit tests for `copyCode`, `goToProblem`, `toggleSolved` (including the toggle-back case), and ConfessionPage email opt-in passthrough.
  - verify: `npx vitest run` passes with the new tests. New test names appear in the output.
  - eval: reviewer confirms tests would fail if the tested function were subtly broken (e.g., `toggleSolved` flipped to `entry.solved` instead of `!entry.solved`).

- **U13 · TEST-4 + TEST-5 + TEST-6 fix** — replace magic sleeps with `vi.waitFor`; add click-through assertion to F3; make F8 POST through `createReply` instead of seeding `db.replies` directly.
  - verify: `grep -rE 'setTimeout\(.*, ?[0-9]{1,2}\)' src/.*__tests__ e2e/` zero matches for 1-99ms sleeps.
  - eval: reviewer confirms F8 exercises the real code path by tracing the mock request log.

### Phase 5 — Architecture cleanup

- **U14 · Notebook split** — `AccessCodeNotebook.tsx` must be split into `useNotebook` hook (state + actions) + `AccessCodeNotebook` view component. Each file ≤ 200 lines.
  - verify: `wc -l src/components/pages/AccessCodeNotebook.tsx src/hooks/useNotebook.ts` — both under 200. All existing notebook tests pass.
  - eval: reviewer confirms the split is meaningful (not just moving code), and the hook is testable in isolation.

- **U15 · Storage consolidation** — pick ONE of `StorageSystem.ts`, `storage-system.ts`, `storageAdapter.ts`, `sessionStorageAdapter.ts`. Delete the others. Update all imports.
  - verify: `grep -r 'from.*storage-system' src/` returns only imports from the one kept file. Build succeeds. All tests pass.
  - eval: reviewer confirms the kept file is the one actually used by shipped paths (HelpDetailPage, ConfessionPage, PastQuestionsPage).

- **U16 · Dead fallback removal** — once U3's RLS migration is applied (or whatever U3 fixed), remove the `post.replies` fallback in `PastQuestionsPage.fetchPostByCode`. If U3 did NOT use the RLS migration, this unit is a no-op and skipped.
  - verify: remove the fallback branch. `npx playwright test e2e/session-verification.spec.ts` still passes (specifically the F4 test may need updating — that is acceptable since F4 was designed to exercise the fallback, and if the fallback is dead, F4 can be retired).
  - eval: reviewer confirms the removal doesn't break any user-visible flow.

### Phase 6 — DX and final cleanup

- **U17 · Bundle size** — main JS bundle ≤ 600 KB gzipped. Code-split admin dashboard. Configure `build.rollupOptions.output.manualChunks` for antd.
  - verify: `npm run build` output shows the gzipped main chunk ≤ 600 KB.
  - eval: reviewer checks bundle analyzer output if provided.

- **U18 · `.env.example` audit** — write a script `scripts/check-env-vars.mjs` that greps `import.meta.env.VITE_*` and cross-references against `.env.example`. Run it in CI (or as part of `npm test`).
  - verify: running the script on clean main produces zero output. Introducing a new env var without documenting it produces an error.
  - eval: reviewer manually adds a fake env var reference and confirms the script catches it.

- **U19 · Migration tracking** — add `supabase/migrations/MIGRATIONS_APPLIED.md` listing each SQL file, which envs it's been run on, and when. Rename `supabase/migrations/` → `supabase/sql-snippets/` only if U3 did not use the migrations.
  - verify: file exists, lists all 3 current SQL files.

- **U20 · Dead mentor-table cleanup** — `grep -r 'mentor' src/locales/` and remove dead keys. `grep -r 'mentor-table' src/` — only the env-var helper (U10) should match.
  - verify: grep count decreases; build succeeds; no regressions.

### Phase 7 — Independent final audit (MANDATORY)

- **U21 · fresh audit** — dispatch an independent reviewer agent that has NO context from any build unit in this runbook. Provide it:
  - A list of the 7 dimensions and A+ criteria from this file
  - The list of U1-U20 commits
  - The test-results/remediation-evidence/ screenshots
  - Permission to run `npm test`, `npm run build`, `npx tsc --noEmit`, `npx playwright test`, and to read any file
  - Instructions to produce a PER-DIMENSION letter grade and to FAIL the runbook if any dimension is below A+.
  - verify: reviewer produces `.harness/final-audit.md` with 7 grades and per-dimension justification.
  - eval: N/A — this IS the eval. The runbook cannot terminate as successful unless the final audit assigns A+ to every dimension. If any dimension is below A+, the loop re-enters the relevant phase.

- **U22 · user acceptance** — the runbook cannot mark complete until the user confirms, in a new session, that:
  - The "0 replies" bug is gone (they try it in the browser and see the reply)
  - The Mentor Table link works
  - They can submit a post with email opt-in without the app logging their email to their own devtools
  - `npm run build && npm run dev` runs clean

---

### Phase 8 — 1K-user launch readiness (NEW — for the 95/100 confidence target)

> Rationale: phases 1-7 verify quality dimensions (correctness, security, tests, etc.).
> Phase 8 verifies that the system survives contact with 1,000 real users. Without
> these units, "code is good" doesn't translate to "site stays up under load and
> abuse can be handled". The confidence math in Appendix A treats every Phase 8
> unit as a separate evidence stream.

- **U23 · load simulation** — Build the production bundle (`npm run build`), serve it via `npm run preview`, and run a load test that simulates 1,000 unique users over a 7-day window compressed into 5 minutes (so ~3.3 req/sec average, with bursts to 20 concurrent). Use [k6](https://k6.io) or a Node script with `p-limit`. Measure: p50 / p95 / p99 latency for the three critical paths (confession submit, access code lookup, reply create), plus error rate and HTTP status distribution.
  - verify: report at `test-results/load/load-test.json` showing p95 < 2000ms for all three paths and error rate < 0.5% over the 5-minute window
  - eval: reviewer confirms the load test actually hit the live URLs (not mocks), the request distribution matches the 1K-user model, and the report numbers are not synthesized

- **U24 · Supabase quota check** — Estimate the worst-case Supabase usage for 1K users: each user submits 1 post + reads it 3 times + might add 2 replies + reads each reply 3 times = ~13 DB reqs/user × 1000 = 13K DB reqs/week. Plus storage estimate (~500 chars/post × 3K rows = 1.5MB). Compare against Supabase free tier limits (50K MAU, 500MB DB, 2GB bandwidth/month) and document headroom.
  - verify: `.harness/launch/supabase-quota.md` with the math, the free tier limits, and a percentage of headroom for each metric
  - eval: reviewer sanity-checks the math and confirms there is at least 5x headroom on every dimension (or flags it as a launch blocker)

- **U25 · deployment to Vercel preview** — `npm run build` + `vercel deploy` (preview, NOT production). Visit the resulting URL from a clean browser profile and complete the smoke test: submit a confession, see the access code, look it up on /past-questions, see the post.
  - verify: deployment URL responds 200, smoke test screenshot saved at `test-results/launch/preview-smoke.png`, deployment URL written to `.harness/launch/preview-url.txt`
  - eval: reviewer opens the URL themselves (in a fresh subagent context), walks the same flow, confirms it works, attaches their own screenshot

- **U26 · observability** — Add minimal error logging so production errors are visible. Either: (a) Sentry SDK with the free tier, or (b) a Supabase `app_errors` table that the client + API functions write to on uncaught exceptions, plus an admin dashboard view. Pick (b) if RESEND_API_KEY is the only existing 3rd-party integration (don't add more vendor accounts than necessary).
  - verify: deliberately throw an error in dev, verify it appears in the configured destination within 60 seconds. Screenshot the error landing in the dashboard / Sentry. Save to `test-results/launch/observability-proof.png`
  - eval: reviewer triggers a different error and confirms it lands

- **U27 · moderation surface** — The existing admin dashboard has `deletePost` and `deleteReply` methods in `admin.service.ts`, but they were never tested against a real Supabase. Verify the admin can actually delete a post + reply via the dashboard, and that a deleted item disappears from `/past-questions` for non-admin users.
  - verify: Playwright test that logs in as admin, deletes a seeded post, then confirms it 404s from the public lookup. Screenshot of the admin dashboard AFTER deletion at `test-results/launch/moderation-after.png`
  - eval: reviewer re-runs the test against a fresh seed and confirms

- **U28 · scientific confidence score** — **Independent reviewer with NO context from any prior unit.** Reads the per-dimension acceptance criteria (Phase 1-7 dimension definitions), the U21 final audit, the U23-U27 launch readiness reports, and computes the confidence score using **Appendix A methodology**. Writes `.harness/confidence-report.md` with: per-dimension probability + justification, the joint probability, the bottleneck dimension, what specific actions would move the score up, and honest caveats about untested risks.
  - verify: confidence-report.md exists, follows Appendix A format, reports a single number out of 100
  - eval (gate): if the number is **≥ 95**, the runbook terminates as success and the loop reports complete. If the number is **< 95**, the loop loops back to whichever phase contains the bottleneck dimension. Maximum 3 retry loops total before surfacing to the user for direction.

---

## Appendix A — Scientific confidence methodology (used by U28)

The confidence score is the joint probability that NO quality dimension causes a user-visible failure during the first week of serving 1K users. It is computed as:

```
confidence = ∏ P(dim_i) × 100
```

where `P(dim_i)` is the probability that dimension `i` does NOT fail in production, conditional on the evidence collected by phases 1-8.

### The 7 dimensions tracked

1. **Security**: P(no critical security incident affects 1K users in week 1)
2. **Reliability**: P(error rate stays under 0.5% under 1K-user load)
3. **Performance**: P(p95 latency stays under 2 seconds under 1K-user load)
4. **Data integrity**: P(every submitted post + reply is retrievable within 5 seconds of submission)
5. **Observability**: P(an incident is detected within 1 hour of starting)
6. **Moderation**: P(an abusive post can be removed within 1 hour of report)
7. **Deployment fidelity**: P(the production build matches what was tested)

### The Unknown Unknowns Ceiling

No single dimension is allowed to score above **99.5%**. This reflects the irreducible uncertainty in any pre-launch evaluation: there are failure modes we haven't enumerated. Dimensions that hit their evidence requirements perfectly cap at 99.5%, not 100%.

### Per-dimension scoring rules

For each dimension, the reviewer assigns one of these levels:

| Evidence quality | P(dim_i) | Required evidence |
|---|---|---|
| **Strong** | 99.0% – 99.5% | All required tests pass + reviewer reproduced the evidence themselves + no critical findings outstanding |
| **Good** | 97.0% – 98.9% | All required tests pass + at least one independent reviewer confirmed + minor findings outstanding |
| **Moderate** | 92.0% – 96.9% | Tests pass but evidence is thin (no independent confirmation, or evidence is from same agent that built the fix) |
| **Weak** | 75.0% – 91.9% | Tests partially pass, or improvement findings exist that may bite in production |
| **Insufficient** | 50.0% – 74.9% | Critical findings outstanding, or no evidence collected |
| **Failed** | < 50% | Active known bug in this dimension, OR a failed test, OR a refused independent review |

The reviewer must justify the chosen level with file references and specific evidence — no vibes-based assignments.

### What 95% requires

If the reviewer wants to report 95%, the joint must be ≥ 0.95. Working backwards under the 99.5% ceiling:

- If all 7 dimensions are **Strong** at 99.5%: joint = 0.995^7 ≈ **0.9655** → 96.5%
- If 6 are at 99.5% and 1 is at 99%: joint ≈ **0.9614** → 96.1%
- If 5 are at 99.5% and 2 are at 99%: joint ≈ **0.9568** → 95.7%
- If 4 are at 99.5% and 3 are at 98%: joint ≈ **0.9234** → 92.3% — **fails the 95 bar**

So **the bar is hard**. Reaching 95% requires nearly every dimension to clear the "Strong" threshold, with at most one or two slipping to "Good". Anything worse than that mathematically can't reach 95%.

This is the point: the user said "95/100", so the runbook honours that as a precise number, not vibes. If the score comes out at 89, the report says 89, and the loop iterates on the weakest dimension until it can honestly clear the bar.

### What the reviewer must NOT do

- Round up to make the math work
- Skip a dimension because "it's hard to measure"
- Inflate evidence quality beyond what the artifacts support
- Report a single number without showing the per-dimension breakdown
- Claim a dimension is "Strong" when it has not been independently verified

### Output format

The reviewer writes `.harness/confidence-report.md`:

```markdown
# Confidence Report — ProblemSolver 1K-User Launch Readiness

**Score: NN.N / 100** (target: ≥ 95)

## Per-dimension breakdown

| # | Dimension | P(dim) | Justification (file refs) |
|---|---|---|---|
| 1 | Security | 0.XXX | <evidence> |
| 2 | Reliability | 0.XXX | <evidence> |
| 3 | Performance | 0.XXX | <evidence> |
| 4 | Data integrity | 0.XXX | <evidence> |
| 5 | Observability | 0.XXX | <evidence> |
| 6 | Moderation | 0.XXX | <evidence> |
| 7 | Deployment fidelity | 0.XXX | <evidence> |

**Joint probability:** 0.XXXX × 100 = NN.N%

## Bottleneck dimension
<the lowest-scoring dimension, what would move it up, expected delta>

## What's NOT measured (honest caveats)
- <unknown unknowns enumerated>
- <known limits of the evaluation methodology>

## Verdict
- [x] PASS (≥ 95) → recommend launch
- [ ] FAIL (< 95) → block launch, loop iterates on bottleneck
```

---

## Termination conditions

- **Success:** U28 confidence score ≥ 95 AND U21 final audit assigns A+ to all 7 dimensions AND U22 user acceptance is confirmed.
- **Partial:** U28 score < 95. The runbook is NOT marked success; the loop iterates on the bottleneck dimension. Hard cap at 3 retry loops, then surface to the user.
- **Stall:** Any unit fails review 3 times in a row. Surface to the user with a clear explanation of what specifically is blocking and what input is needed.
- **Abort:** User invokes `/opc stop`.

## Files the orchestrator must NOT touch during the runbook

- `.harness/acceptance-criteria.md` — frozen at runbook start
- This runbook file itself
- `docs/email-notifications.md` — may only be UPDATED in U5, not deleted
- Any `test-results/remediation-evidence/*.png` — only appended to, never overwritten

## Forbidden patterns (the orchestrator will be rejected at review if any are found)

- `expect(container).toBeTruthy()` or equivalent shallow rendered-without-crash assertions
- `// @ts-ignore`, `// @ts-expect-error`, `as any` in production code (test code requires justification)
- Adding a test that asserts a known-broken value (F3 repeat)
- Catching an error silently without logging OR surfacing to the user
- Marking a unit complete when the verify: command output is not captured to disk
- Replacing an earlier unit's work without explicit approval in the review eval
