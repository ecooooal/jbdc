---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.

Call the Skill tool with "tdd" at the reducer and records seams. If no seams are pre-agreed, name up to three in one line in your first response and proceed unless the user redirects.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, call the Skill tool with "code-review" to review the work.

After fixing findings, re-run only the axis (or axes) that found a hard violation, against `git diff <reviewed-sha>..HEAD`. Do not buy another full two-axis review for cosmetic changes.

Commit each green cycle: the test and the code that passes it, together.
