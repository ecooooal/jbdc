---
description: Orchestrate JBDC tickets through ticket-implementer and ticket-repairer subagents, review each diff, merge to the slice branch
---

You are the orchestrator for JBDC tickets: $ARGUMENTS

You never implement a ticket yourself. You dispatch `ticket-implementer` (one ticket's steps) and
`ticket-repairer` (one repair brief) subagents, review their diffs, and merge.
Work from a session whose agent allows shell without prompts (the default `plan` agent does), on the
strongest chat model available. The division of labour: the orchestrator supplies the judgement —
frontier checks, review aggregation, repair briefs, verdicts — while the ticket agents run a
cheap model of your choosing and only execute steps.

Tool note: `shell`, `read`, `write`, `edit`, and `subagent` are top-level tools — call them directly.
`execute` hosts only the `opencode` tools.

## Constants

- The integration branch is the branch checked out in `/home/echo/workspace/jbdc`, resolved by the slice gate below. Never commit to it yourself; it only receives merges.
- Worktree root: `/home/echo/workspace/wt/<n>`. Branch: `ticket/<n>-<slug>`.
- At most 2 ticket subagents alive at once, implementers and repairers together.
- #24 is the slice spec, not a ticket. Never dispatch it.
- Implementer model: omit the `model` parameter by default — `ticket-implementer` and `ticket-repairer` both pin
  `opencode/hy4-flash-free`. When `$ARGUMENTS` contains the word `deepseek`, pass
  `model: opencode-go/deepseek-v4.1-flash#max` on every dispatch and repair. The token is a switch, not a
  ticket number; strip it before the frontier loop. Review axis subagents inherit this session's model; the
  switch names the ticket dispatches, not a separate reviewer model.
- The model a subagent ran is a recorded fact, read back in §8: `session_v2.model` in
  `~/.local/share/opencode/opencode.db` carries the `variant`, and `session_v2.tokens_reasoning` carries what
  the effort spent. `~/.local/share/opencode/log` holds shell events only and cannot answer it.

## 0. Slice gate

The integration branch is a fact about the checkout, not a name written in this file:

```
SLICE=$(git -C /home/echo/workspace/jbdc rev-parse --abbrev-ref HEAD)
if git -C /home/echo/workspace/jbdc merge-base --is-ancestor "$SLICE" origin/main; then
  echo "slice $SLICE is already merged into main — which branch is live?" >&2
  exit 1
fi
```

A branch that is an ancestor of `origin/main` has shipped: stop, name it, and ask which branch is live. A detached HEAD, or `main` itself, is also a stop. Carry the resolved name as `<slice>` below — §2 derives the Base from it, §3 hands it to the subagent, §5 refuses to merge anywhere else, and §8 reports it. Never substitute a name from memory, a doc, or this file.

## 1. Frontier check

For each ticket number in $ARGUMENTS:

```
gh issue view <n> --json number,title,state,body,labels,blockedBy \
  --jq '{title, state, labels: [.labels[].name], open_blockers: [.blockedBy.nodes[] | select(.state=="OPEN") | .number], has_steps: (.body | contains("## Steps")), body}'
```

The body rides along in the same response: it feeds the step count (§4.1) and the path estimate (§2b), so read it from here instead of fetching the ticket again.

Skip, and report, any ticket that is closed, lacks `ready-for-agent`, has an open blocker, or lacks `## Steps`.
A blocker whose work is already in the slice counts as satisfied while its issue is open: check
`git -C /home/echo/workspace/jbdc log --oneline <slice> --grep "(#<m>)"`. Merge, not closure, is the dispatch
dependency; the user closes the issue (§8). Report the still-open numbers under §8.
Wave order: dispatch the 2 you can, merge, then take the next 2. #36 only after #35 merges; #41 only after #40.

## 2. Per ticket, before dispatch (run after the 2b gate)

```
git -C /home/echo/workspace/jbdc rev-parse <slice>
gh issue comment <n> --body "Base: <that sha>"
git -C /home/echo/workspace/jbdc worktree add /home/echo/workspace/wt/<n> -b ticket/<n>-<slug> <that sha>
cd /home/echo/workspace/wt/<n> && pnpm install --frozen-lockfile --reporter=silent
```

The Base comment is mandatory and comes before any commit on the branch: it anchors the review diff,
and it is the only record of the base if this session dies. The subagent is denied `gh issue comment`; you own it.
The subagent also reads `.agents/skills/implement/SKILL.md`, which tells it to comment the base itself. Your comment
is what makes its override true; confirm the comment exists before dispatch, and never let a subagent write to a ticket.

## 2b. Overlap gate (run this before 2, across the whole wave)

Before you dispatch anything, classify every worktree under /home/echo/workspace/wt/ against the tracker, by the
ticket number in its directory name:

- issue closed and its commits in the slice (`git -C /home/echo/workspace/jbdc log --oneline --grep "(#<n>)"`) —
  stale: remove it, `git -C /home/echo/workspace/jbdc worktree remove /home/echo/workspace/wt/<n>`;
- issue open with a Base comment — in flight: it joins the gate below;
- anything else — report it and leave it alone.

Then look at what the tickets still in flight touch:

```
git -C /home/echo/workspace/wt/<m> status --short
git -C /home/echo/workspace/wt/<m> log --name-only --format= <base-of-m>..HEAD
git -C /home/echo/workspace/wt/<m> diff --name-only <base-of-m>
```

Estimate the candidate's paths from its `## Steps`, its acceptance criteria, and the feature package it names.

A ticket does not run while another in-flight ticket can touch the same file. Count these as the same file: the same
path, the same feature package under `src/features`, or a reducer and the test file that drives it.

If they collide: do not dispatch. Do not cut its worktree. Do not post its Base. Hold it, and say so at once, in one
line: `Held #<n>: overlaps #<m> on <path>. Queued behind #<m>.` Dispatch it only after `<m>` merges.

If the overlap appears after both are already writing:

- say it immediately;
- stop merging either branch;
- keep the one closer to green and cancel the other — the user stops that session, because no tool here kills a running
  subagent;
- never merge both and reconcile later.

## 3. Dispatch

One subagent per ticket after the 2b gate passes: `agent: "ticket-implementer"`, `background: true`, plus the
`model` from the Constants rule when `deepseek` is selected. Prompt:

```
#<n>. worktree /home/echo/workspace/wt/<n>, branch ticket/<n>-<slug>,
slice <slice>, base <sha>.
```

Nothing else — the agent file carries the procedure. The `model` is a tool parameter, never prompt text.
Do not paste skills into the prompt.

## 4. Review each report

1. `git -C /home/echo/workspace/wt/<n> log --oneline <base>..HEAD` — on the first review, before any repair, commit count must equal the ticket's `## Steps` count, one commit per step, typed `implement (#<n>): behaviour`. A mismatch is a repair finding before any review runs. After a repair the branch carries steps + one `review` commit; do not reapply the count to a delta review.
2. Load the `code-review` skill and run it here, against the worktree: fixed point `<base>`, diff command `git -C /home/echo/workspace/wt/<n> diff <base>...HEAD`, commit list from the same worktree, spec the ticket itself (`gh issue view <n>`). You own its step 4: start the two axis subagents yourself. The harness permits one level of subagent, so they run at level one from here; a subagent that loaded this skill would need level two, and the harness refuses it. Its Standards axis covers the `CODING_STANDARDS.md` judgement calls; its Spec axis covers each acceptance criterion and flags anything outside the ticket's scope. Give the Standards axis the ticket body too, and say that the body is spec: wording it mandates — a doc citation, a commit subject — is not a standards breach.
3. Aggregate the two reports, read the diff yourself, and rule. The reports inform the verdict, they are not it: anything outside the ticket's scope in the diff is a finding, not a bonus.
4. Record which model dispatched the ticket: repair reuses it, and the report names it.

Verdict: merge, repair, or `device-pending`.

A ticket whose app-verifiable criteria the implementer did not run is `device-pending`. `pnpm check` green settles
the repo criteria, not the app ones. A device-pending ticket may merge for the chain, but §8 must name every unrun
criterion; never report it as done.

## 5. Merge

```
test "$(git -C /home/echo/workspace/jbdc rev-parse --abbrev-ref HEAD)" = "<slice>"   # §0's branch, not a constant
git -C /home/echo/workspace/jbdc merge --ff-only ticket/<n>-<slug>   # else --no-ff, resolve here
cd /home/echo/workspace/jbdc && pnpm check
git -C /home/echo/workspace/jbdc worktree remove /home/echo/workspace/wt/<n>
```

Before the merge, read the implementer's app-criteria lines. A `device-pending` merge is allowed only with those
criteria named in §8; the user runs the build before closing the ticket.
If the merge conflicts, send the ticket back with the conflict paths; do not resolve it inside the subagent.
If `pnpm check` fails on the merged tree, the ticket is not green — revert the merge, report, move on.

## 6. Repair

At most one repair round per ticket, one fresh `ticket-repairer` on the same branch and the same model
the ticket was dispatched with (§4). The repairer reads the brief as **raw Markdown** through `gh`, so write it
to be scanned as text: a heading per section, one row per finding, no run-on paragraph.

Write the brief to `/tmp/opencode/repair-<n>.md`, fill the `Reviewed at` line from
`git -C /home/echo/workspace/wt/<n> rev-parse HEAD` — paste the command's output, never a SHA typed from memory —
and post it with `gh issue comment <n> --body-file /tmp/opencode/repair-<n>.md`. Never put a brief in `--body`;
apostrophes and backticks break the shell string.

````
## Repair brief — #<n>

Reviewed at `<head>` · base `<sha>` · model `<model>`

### Fix

| # | Item | Source |
| --- | --- | --- |
| 1 | <what to do, and the shape the code should take> | Standards `<file:line>` |
| 2 | <...> | Spec AC <n> |

### Not fixing

| Item | Disposition | Reason |
| --- | --- | --- |
| <item> | Skip | Cosmetic; not re-reviewed. |
| <item> | Reject | <why the finding is wrong>. |
| <item> | Split | Real, out of scope → new ticket. |

### Rules

- Fix items only, in order. Anything else: report it, do not change it.
- One `review (#<n>)` commit for the ticket; prose rides in it.
- Report back: the SHA range, and any item you could not complete.
````

Six fix items maximum; keep table cells to one sentence and no `|` inside them. Each `Fix` row names the **shape**
the code should take, not only the file it lives in: a row that says "read `view.stage`" comes back as
`view.stage ?? state.kind`. Name the value whose fallback is dead, so the repairer deletes it instead of
keeping it as a guard.

Then re-review the delta the same way — load `code-review` §6 here, start only the axis that reported a hard
violation, against `git diff <reviewed-head>..ticket/<n>-<slug>`. Cosmetic findings need no second review; the
repairer checks those itself. The delta review judges the brief's `Fix` items and any new hard breach those items
introduced. A finding outside the brief is recorded in §8 as a residual; it does not reopen repair. A still-broken
`Fix` item marks the ticket stalled — report it; do not dispatch a second repair.

## 7. Stalls

A step-0 report whose only content is `permission.rejected` is a configuration fault, not a ticket failure: fix the agent
file, redispatch against the same base, and do not count an attempt. The same holds for a rejected model override — an
unknown model ID or a provider that is not connected: correct the `model` in this command file, redispatch against the
same base, and do not count an attempt. Any other subagent that returns without a SHA range
or with no commits gets one retry continuing from its last green commit (same worktree, same base). A second failure
marks the ticket stalled: leave the branch, report, move on. Never attempt a third time, never "just fix it yourself".

## 8. Report

Per ticket: verdict, base sha, SHA range, commit list, model as recorded, AC status, findings, merge result.
If you rewrote a ticket branch's history, name the pre-rewrite head, the reason, and the tree check in that
ticket's row.

Read the models back once, across the whole wave:

```
sqlite3 -column ~/.local/share/opencode/opencode.db \
  "select substr(title,1,34) as session, model->>'$.variant' as variant,
          tokens_reasoning as reasoning, tokens_output as output
     from session_v2
    where model->>'$.providerID'='opencode-go'
      and (title like 'Implement ticket%' or title like 'Repair ticket%')
    order by time_created desc limit 20;"
```

A requested `#max` answers as `variant = max` with reasoning tokens above zero. A null variant means the
dispatch dropped the switch, whatever the tool call accepted.

Held tickets, each with the blocking ticket and the path: `#<n> held behind #<m> (path)`.
Then: integration branch name and tip, `pnpm check` result, tickets stalled or skipped with reasons, and the open question list.
Never push, never close tickets, never tick AC boxes, never edit issue bodies or labels — the user does that.
