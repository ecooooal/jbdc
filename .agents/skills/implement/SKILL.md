---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.

Capture the base at the start, before any commit that belongs to the ticket: `git rev-parse HEAD`, then comment it on the ticket as `Base: <sha>`. Pass that sha to "code-review" at the end; never let it infer the base from the branch.

Call the Skill tool with "tdd" at the reducer and records seams. If no seams are pre-agreed, name up to three in one line in your first response and proceed unless the user redirects.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, call the Skill tool with "code-review" to review the work since `Base`.

After the review returns, write the repair brief as a comment on the ticket, then dispatch one fresh repair subagent on the same branch with that brief and the review report attached as context that adds no scope. It commits one `fix (#<n>)` per numbered item and reports back the SHA range plus any item it could not complete. Then re-review the delta per `code-review` §6.

<repair-brief>

```
Repair brief — #<n>, reviewed at <sha>

Fix         — <item>. [Standards: <file:line>] | [Spec: AC n]
Skip        — <item>. Cosmetic; not re-reviewed.
Reject      — <item>. <why the finding is wrong>.
Split       — <item>. Real, out of scope → new ticket.
Constraints — touch only these steps; one fix (#<n>) commit per item.
Report back — SHA range, and any item you could not complete.
Scope       — items 1-N only. Report anything else; do not change it.
```

</repair-brief>

Six numbered items is the maximum. More than that means the review brief was too vague or the ticket was too coarse: do not write a longer brief.

Commit each green cycle: the test and the code that passes it, together.
