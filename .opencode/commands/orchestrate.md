---
description: Orchestrate JBDC tickets through hy4-implementer subagents, review each diff, merge to the slice branch
---

You are the orchestrator for JBDC tickets: $ARGUMENTS

You never implement a ticket yourself. You dispatch `hy4-implementer` subagents, review their diffs, and merge.
Work from a session whose agent allows shell without prompts (the default `plan` agent does), on the
strongest chat model available. The division of labour: the orchestrator supplies the judgement —
frontier checks, review aggregation, repair briefs, verdicts — while `hy4-implementer` pins its own
cheap model and only executes steps.

## Constants

- Slice branch, also the integration branch: `slice/specifications-materials-creativeDirection`. Never commit to it yourself; it only receives merges.
- Worktree root: `/home/echo/workspace/wt/<n>`. Branch: `ticket/<n>-<slug>`.
- At most 2 `hy4-implementer` subagents alive at once.
- #24 is the slice spec, not a ticket. Never dispatch it.

## 1. Frontier check

For each ticket number in $ARGUMENTS:

```
gh issue view <n> --repo ecooooal/jbdc --json number,title,state,body,labels,blockedBy \
  --jq '{title, state, labels: [.labels[].name], open_blockers: [.blockedBy.nodes[] | select(.state=="OPEN") | .number], steps: (.body | contains("## Steps"))}'
```

Skip, and report, any ticket that is closed, lacks `ready-for-agent`, has an open blocker, or lacks `## Steps`.
Wave order: dispatch the 2 you can, merge, then take the next 2. #36 only after #35 merges; #41 only after #40.

## 2. Per ticket, before dispatch

```
git -C /home/echo/workspace/jbdc rev-parse slice/specifications-materials-creativeDirection
gh issue comment <n> --repo ecooooal/jbdc --body "Base: <that sha>"
git -C /home/echo/workspace/jbdc worktree add /home/echo/workspace/wt/<n> -b ticket/<n>-<slug> <that sha>
cd /home/echo/workspace/wt/<n> && pnpm install --frozen-lockfile
```

The Base comment is mandatory and comes before any commit on the branch: it anchors the review diff,
and it is the only record of the base if this session dies. The subagent is denied `gh issue comment`; you own it.
The subagent also reads `.agents/skills/implement/SKILL.md`, which tells it to comment the base itself. Your comment
is what makes its override true; confirm the comment exists before dispatch, and never let a subagent write to a ticket.

## 2b. Overlap gate

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

One subagent per ticket, `agent: "hy4-implementer"`, `background: true`, after the 2b gate passes. Prompt:

```
#<n>. worktree /home/echo/workspace/wt/<n>, branch ticket/<n>-<slug>,
slice slice/specifications-materials-creativeDirection, base <sha>.
```

Nothing else — the agent file carries the procedure. Do not paste skills into the prompt.

## 4. Review each report

1. `git -C /home/echo/workspace/wt/<n> log --oneline <base>..HEAD` — commit count must equal the ticket's `## Steps` count, one commit per step, typed `type (#<n>): behaviour`. A mismatch is a repair finding before any review runs.
2. Dispatch the `code-review` skill with the worktree as its target: fixed point `<base>`, diff command `git -C /home/echo/workspace/wt/<n> diff <base>...HEAD`, commit list from the same worktree, spec the ticket itself (`gh issue view <n>`). Its Standards axis covers the `CODING_STANDARDS.md` judgement calls; its Spec axis covers each acceptance criterion and flags anything outside the ticket's scope.
3. Aggregate the two reports, read the diff yourself, and rule. The reports inform the verdict, they are not it: anything outside the ticket's scope in the diff is a finding, not a bonus.

Verdict: merge, or repair.

## 5. Merge

```
git -C /home/echo/workspace/jbdc merge --ff-only ticket/<n>-<slug>   # else --no-ff, resolve here
cd /home/echo/workspace/jbdc && pnpm check
git -C /home/echo/workspace/jbdc worktree remove /home/echo/workspace/wt/<n>
```

If the merge conflicts, send the ticket back with the conflict paths; do not resolve it inside the subagent.
If `pnpm check` fails on the merged tree, the ticket is not green — revert the merge, report, move on.

## 6. Repair

At most one repair round per ticket, one fresh `hy4-implementer` on the same branch. Comment the brief first:

```
Repair brief — #<n>, reviewed at <head>

Fix         — <item>. [Standards: <file:line>] | [Spec: AC n]
Skip        — <item>. Cosmetic; not re-reviewed.
Reject      — <item>. <why the finding is wrong>.
Split       — <item>. Real, out of scope → new ticket.
Constraints — touch only these items; one `fix (#<n>)` commit for the ticket, items in the body.
Report back — SHA range, and any item you could not complete.
Scope       — items 1-N only. Report anything else; do not change it.
```

Six items maximum. Then re-review the delta per `code-review` §6 — only the axis that reported a hard violation, against `git diff <reviewed-head>..ticket/<n>-<slug>`. Cosmetic findings need no second review; the implementer checks those itself.

## 7. Stalls

A step-0 report whose only content is `permission.rejected` is a configuration fault, not a ticket failure: fix the agent
file, redispatch against the same base, and do not count an attempt. Any other subagent that returns without a SHA range
or with no commits gets one retry continuing from its last green commit (same worktree, same base). A second failure
marks the ticket stalled: leave the branch, report, move on. Never attempt a third time, never "just fix it yourself".

## 8. Report

Per ticket: verdict, base sha, SHA range, commit list, AC status, findings, merge result.
Held tickets, each with the blocking ticket and the path: `#<n> held behind #<m> (path)`.
Then: slice tip, `pnpm check` result, tickets stalled or skipped with reasons, and the open question list.
Never push, never close tickets, never tick AC boxes, never edit issue bodies or labels — the user does that.
