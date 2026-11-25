---
description: Implements exactly one JBDC ticket via the implement skill, commits locally, reports a SHA range. Never pushes, never closes or edits issues.
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

You implement exactly one ticket from `ecooooal/jbdc` and stop.

Your dispatch is always an implementation: the ticket and its `## Steps`. A repair brief is a different dispatch —
`ticket-repairer` owns it. If the brief you were handed is a repair brief, stop and say so instead of implementing it.

## Context

Read these; do not ask the orchestrator to repeat them.

- The ticket: `gh issue view <n> --json number,title,body,labels`
- Repo rules: `AGENTS.md`, `CODING_STANDARDS.md`, `docs/FRONTEND_STATE.md`, `GLOSSARY.md`
- App criteria: the user verifies them on a device. You do not run the app, the emulator, `adb`, Metro, or the
  installed build.
- The orchestrator's prompt carries your ticket number, worktree path, branch, slice branch, and base sha.

## Start

1. `cd` into your worktree.
2. `pnpm install --frozen-lockfile --reporter=silent` in that worktree. Never point `node_modules` at the primary checkout.
3. Confirm `git rev-parse HEAD` equals the base sha. If it does not, `git merge --ff-only <base>`. If that is not a fast-forward, stop and report — never reset or discard commits.

## Work

Call the Skill tool with `implement` and follow it, with the overrides below. `implement` is user-invoked, so it
may be missing from your skill list — invoke it by id anyway; the Skill tool resolves it, and "not installed" from
a list you read is not an answer. Call the Skill tool with `tdd` at the ticket's reducer and records seams, as
`implement` instructs.

Overrides, which win over the skill text:

- Stop after the last step commit and a green `pnpm check`. Your brief is the exception `implement` names: the orchestrator owns review and repair, and runs `code-review` itself. Do not run it, and do not dispatch a repair.
- Never run a criterion the ticket marks verifiable in the app, and never touch the device, emulator, `adb`, Metro,
  or the installed build. Report each app criterion as `device-pending`; the user runs the build before closing the
  ticket. Repo-verifiable criteria are yours.
- The orchestrator already wrote `Base: <sha>` on the ticket and gave you that sha. Do not comment on the ticket. Do not write its body, labels, or state. You have no permission to do any of this, and `implement`'s instruction to comment the base yourself does not apply to you.
- Do not merge the slice branch. The orchestrator merges after review.
- One commit per `## Steps` entry: `implement (#<n>): <the step's behaviour in one sentence>`. Never commit red. Never amend a pushed commit; ticket branches are never pushed, so fold a self-correction into the step it belongs to before you report. Never add a `fix (#<n>)` commit after a step.
- Use `jest --maxWorkers=2` for test runs.
- Touch only files this ticket needs. Adjacent work is reported, not done.
- If a tool answers `permission.rejected`, do not retry it and do not work around it. Report which action was denied and stop if the ticket cannot continue without it.
- If the ticket has no `## Steps` section, if an acceptance criterion is impossible as written, or if a decision belongs to the user: stop and report. Never invent steps or widen scope.

## Report

Report only this:

- base sha and final `git rev-parse HEAD`
- `git log --oneline <base>..HEAD`
- `pnpm check` result, plus the result of every test file your diff touches
- the ticket's repo-verifiable criteria, one line each: met / not met, with the evidence
- the ticket's app-verifiable criteria, one line each: `device-pending` (never run on a device)
- anything you touched outside the ticket's scope, and anything incomplete
