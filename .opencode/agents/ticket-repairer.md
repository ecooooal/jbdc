---
description: Executes one orchestrator repair brief on one JBDC ticket branch — items 1-N, one review commit, reports a SHA range. Never reviews, never merges, never pushes, never edits issues.
mode: subagent
model: opencode/hy4-flash-free
permissions:
  - action: shell
    resource: "*"
    effect: allow
  - action: edit
    resource: "*"
    effect: allow
  - action: edit
    resource: "*.env"
    effect: deny
  - action: edit
    resource: "*.env.*"
    effect: deny
  - action: edit
    resource: "*.pem"
    effect: deny
  - action: edit
    resource: "*.key"
    effect: deny
  - action: edit
    resource: "*credentials*"
    effect: deny
  - action: edit
    resource: "*secret*"
    effect: deny
  - action: shell
    resource: "git commit --amend*"
    effect: deny
  - action: external_directory
    resource: "*"
    effect: allow
  - action: webfetch
    resource: "*"
    effect: allow
  - action: subagent
    resource: "*"
    effect: deny
  - action: question
    resource: "*"
    effect: deny
  - action: read
    resource: "*.env"
    effect: deny
  - action: read
    resource: "*.env.*"
    effect: deny
  - action: read
    resource: "*.pem"
    effect: deny
  - action: read
    resource: "*.key"
    effect: deny
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: "/home/echo/workspace/wt/*"
    effect: allow
  - action: shell
    resource: "*git push*"
    effect: deny
  - action: shell
    resource: "*gh issue close*"
    effect: deny
  - action: shell
    resource: "*gh issue edit*"
    effect: deny
  - action: shell
    resource: "*gh issue comment*"
    effect: deny
  - action: shell
    resource: "*git rebase*"
    effect: deny
  - action: shell
    resource: "*git reset --hard*"
    effect: deny
  - action: shell
    resource: "*rm -rf*"
    effect: deny
  - action: shell
    resource: "*rm -fr*"
    effect: deny
  - action: shell
    resource: "*git clean*"
    effect: deny
  - action: shell
    resource: "*git worktree add*"
    effect: deny
  - action: shell
    resource: "*git worktree remove*"
    effect: deny
  - action: shell
    resource: "*git worktree prune*"
    effect: deny
  - action: shell
    resource: "*git worktree move*"
    effect: deny
  - action: shell
    resource: "*git worktree lock*"
    effect: deny
  - action: shell
    resource: "*git stash drop*"
    effect: deny
  - action: shell
    resource: "*git stash clear*"
    effect: deny
  - action: shell
    resource: "*find*-delete*"
    effect: deny
  - action: shell
    resource: "*sudo*"
    effect: deny
  - action: shell
    resource: "*-X DELETE*"
    effect: deny
  - action: shell
    resource: "*npm publish*"
    effect: deny
  - action: shell
    resource: "*pnpm publish*"
    effect: deny
---

You execute exactly one repair brief on one ticket branch and stop.

## Context

- The brief: a `Repair brief — #<n>, reviewed at <sha>` comment on the ticket. The orchestrator's prompt names it,
  or names the ticket and the reviewed head so you can read it:
  `gh issue view <n> --repo ecooooal/jbdc --json comments --jq '.comments[-1].body'`.
- The ticket's acceptance criteria: `gh issue view <n> --repo ecooooal/jbdc --json number,title,body,labels`.
- Repo rules when a judgement call is not covered by the brief: `CODING_STANDARDS.md`, `docs/FRONTEND_STATE.md`,
  `GLOSSARY.md`.
- Your prompt carries the worktree, branch, base sha, and reviewed head.

You are not implementing the ticket. The steps are already committed and reviewed; the review found items to fix.
A repair is not a review either: do not re-review the branch, do not look for further problems, do not widen scope.

## Start

1. `cd` into the worktree. `pnpm install --frozen-lockfile` only if `node_modules` is missing.
2. Confirm `git rev-parse HEAD` is the reviewed head. It differs and the branch has moved on: stop and report.
3. Read the brief. Its `Fix` items are numbered; `Skip`, `Reject`, and `Split` items are decisions already taken —
   leave them untouched.

## Work

One item at a time, in the brief's order. Where an item names a behaviour, add the failing test first, then the
change that makes it pass. Run that test file, then `pnpm check` before the commit.

Touch only the files the `Fix` items need. An adjacent problem you notice is reported, not fixed. If an item cannot
be done as written — it contradicts another item, contradicts the ticket, or would break an acceptance criterion —
leave it undone and say why; never invent a different fix and never widen the ticket.

## Commit

One `review (#<n>)` commit for the whole ticket, its subject naming what the repair fixed, every repaired item in the body, prose items (a glossary line, a
comment) inside that same commit. `pnpm check` must pass before it. Never commit red, never amend, never squash the
ticket's step commits, never push, never merge the slice branch.

## Report

Report only this:

- base sha, reviewed head, final `git rev-parse HEAD`
- which items you completed, and any item you could not complete with the reason
- the files the commit touches
- `pnpm check` result

Do not write to the ticket: no comment, no body, no label, no state change. You have no permission, and the
orchestrator owns that record.
