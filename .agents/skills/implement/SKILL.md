---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.

Capture the base at the start, before any commit that belongs to the ticket: `git rev-parse HEAD`, then comment it on the ticket as `Base: <sha>`. Pass that sha to "code-review" at the end; never let it infer the base from the branch.

Call the Skill tool with "tdd" at the reducer and records seams. If no seams are pre-agreed, name up to three in one line in your first response and proceed unless the user redirects.

State the ticket's `## Steps` and their commit boundaries in that same first response. Work one step at a time: commit a step before touching the next step's files.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

## Commits

Commit when a step is green, not when a test is green. The ticket's `## Steps` list is the commit list: up to four, inside out. No `## Steps` section means stop and report — never invent boundaries at commit time. Inside a step the loop is unchanged: red, green, refactor, repeat, no commit.

A step is green when three things pass: the step's test files, every test file its diff touches, and `pnpm typecheck && pnpm lint`. Then commit once, `<type> (#<n>): <the step's behaviour in one sentence>`, holding that step's tests, its code, and any prose the step describes — the comment, the glossary line, the ADR line.

Run `pnpm check` once, at the end of the ticket.

Four rules override the step boundary: generated files travel alone, a rename travels alone, steering and tooling config travels alone (`AGENTS.md`, `CLAUDE.md`, `.opencode/**`, `.agents/**`), and a broken baseline gets its own commit before the ticket. The pre-commit hook rejects a staged commit that mixes steering with anything else.

Never amend a pushed commit, never `rebase -i` to tidy, never commit red, and never leave the tree dirty across a review. Prose that arrives after its step is pushed waits for the repair commit.

Once done, call the Skill tool with "code-review" to review the work since `Base`.

After the review returns, write the repair brief as a comment on the ticket, then dispatch one fresh repair subagent on the same branch with that brief and the review report attached as context that adds no scope. It lands one repair commit per ticket, typed `fix (#<n>)`, with every item it repaired listed in the body — prose items in that same commit — and reports back the SHA plus any item it could not complete. Then re-review the delta per `code-review` §6. This step is done when the subagent's SHA range is in hand and the delta re-review has returned, not when the dispatch is announced. A subagent that fails to start follows `code-review`'s retry rule.

<repair-brief>

```
Repair brief — #<n>, reviewed at <sha>

Fix         — <item>. [Standards: <file:line>] | [Spec: AC n]
Skip        — <item>. Cosmetic; not re-reviewed.
Reject      — <item>. <why the finding is wrong>.
Split       — <item>. Real, out of scope → new ticket.
Constraints — touch only these items; one `fix (#<n>)` commit for the ticket, items in the body.
Report back — SHA range, and any item you could not complete.
Scope       — items 1-N only. Report anything else; do not change it.
```

</repair-brief>

Six numbered items is the maximum. More than that means the review brief was too vague or the ticket was too coarse: do not write a longer brief.
