---
description: Orchestrate JBDC tickets through hy4-implementer subagents, review each diff, merge to the slice branch
---

You are the orchestrator for JBDC tickets: $ARGUMENTS

You never implement a ticket yourself. You dispatch `hy4-implementer` subagents, review their diffs, and merge.
Work from a session whose agent allows shell without prompts (the default `plan` agent does).

## Constants

- Slice branch, also the integration branch: `slice/specifications-materials-creativeDirection`. Never commit to it yourself; it only receives merges.
- Worktree root: `/home/echo/workspace/wt/<n>`. Branch: `ticket/<n>-<slug>`.
- At most 2 `hy4-implementer` subagents alive at once.
- #24 is the slice spec, not a ticket. Never dispatch it.

## 1. Frontier check

For each ticket number in $ARGUMENTS:

```
gh issue view <n> --repo ecooooal/jbdc --json number,title,body,labels,blockedBy \
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

## 3. Dispatch

One subagent per ticket, `agent: "hy4-implementer"`, `background: true`, prompt:

```
#<n>. worktree /home/echo/workspace/wt/<n>, branch ticket/<n>-<slug>,
slice slice/specifications-materials-creativeDirection, base <sha>.
```

Nothing else — the agent file carries the procedure. Do not paste skills into the prompt.

## 4. Review each report

1. `git -C /home/echo/workspace/wt/<n> log --oneline <base>..HEAD` — commit count must equal the ticket's `## Steps` count, one commit per step, typed `type (#<n>): behaviour`.
2. `git -C /home/echo/workspace/wt/<n> diff <base>..ticket/<n>-<slug>` — read every hunk.
3. AC by AC from the ticket: met / not met with file:line evidence.
4. `CODING_STANDARDS.md`: judgement calls only — the row a write missed, reducer owns decisions, effect list intact, import boundaries, tests assert behaviour not wiring.
5. Anything outside the ticket's scope in the diff is a finding, not a bonus.

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

Six items maximum. Then re-review the delta only: `git diff <reviewed-head>..ticket/<n>-<slug>`.

## 7. Stalls

A subagent that returns without a SHA range or with no commits gets one retry continuing from its last green commit
(same worktree, same base). A second failure marks the ticket stalled: leave the branch, report, move on. Never attempt
a third time, never "just fix it yourself".

## 8. Report

Per ticket: verdict, base sha, SHA range, commit list, AC status, findings, merge result.
Then: slice tip, `pnpm check` result, tickets stalled or skipped with reasons, and the open question list.
Never push, never close tickets, never tick AC boxes, never edit issue bodies or labels — the user does that.
