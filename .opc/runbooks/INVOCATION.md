# How to kick off the Ship-Ready A+ loop

Paste exactly this to Claude Code in this repo:

---

```
/opc loop Drive ProblemSolver to ship-ready A+ on every dimension using the
runbook at .opc/runbooks/ship-ready-a-plus.md. Start from Phase 1 (the
user-reported "0 replies" bug is the first blocker). Every build unit must be
reviewed by an independent subagent that did not participate in the build. The
orchestrator writes NO grades — the final audit (U21) is dispatched to a fresh
reviewer with no prior runbook context. Do not terminate until U21 assigns A+
to all 7 dimensions AND U22 user acceptance is confirmed in a separate session.
Do not touch the runbook file during execution. Follow the hard rules verbatim.
```

---

## What this does

1. `/opc loop` → loop-protocol.md discovers `.opc/runbooks/ship-ready-a-plus.md` and loads it as the plan, skipping decomposition
2. The loop initializes `.harness/loop-state.json` at `U1` (the BUG-1 reproducer)
3. Each tick:
   - Reads `.harness/loop-state.json` and `ship-ready-a-plus.md`
   - Executes the current unit (build / review / execute)
   - Calls `opc-harness complete-tick` with verify artifacts
   - Calls `opc-harness next-tick` to advance to the next unit
4. U21 dispatches a fresh reviewer that was NOT in the build loop — independent final audit
5. U22 requires YOUR confirmation in a new session — the orchestrator cannot close it on its own

## Before you paste the command

- [ ] Make sure dev server is stopped (loop will manage it)
- [ ] Make sure you have committed any uncommitted local changes you want to keep
- [ ] If you want the loop to run unattended for hours, also verify there's no Supabase state it might write that you don't want (the loop will hit your real Supabase unless you've pointed it at a throwaway project)
- [ ] `RESEND_API_KEY` in your Vercel env is optional — if unset, email unit (U5-U8) will use the existing graceful fallback

## If you want to pause

- `/opc stop` — terminates the loop, preserves `.harness/loop-state.json` so you can resume with another `/opc loop` invocation
- `/opc skip` — advances past the current unit without executing it (use if a unit is genuinely not applicable)
- `/opc pass` — forces the current gate to PASS (USE WITH CARE — this is the escape hatch that lets you bypass a review you disagree with)
