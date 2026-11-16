## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
pnpm expo install <package>  # ALWAYS use instead of pnpm add — resolves SDK-compatible versions
pnpm start                   # start the dev server
pnpm lint                    # lint
pnpm typecheck               # typecheck
pnpm test                    # jest
pnpm check                   # typecheck + lint + both guards + tests
pnpm db:generate             # drizzle-kit generate + idempotency rewrite
npx expo-doctor              # diagnose dependency and config issues
pnpm expo install --fix      # fix incompatible package versions
npx @expo/agent-cli docs:search <query>  # search the synced SDK docs, file:line
npx @expo/agent-cli docs:sync            # refresh ~/.expo/agent-cli/docs
```

Run `pnpm check` before declaring any task done. It runs `pnpm typecheck`,
`pnpm lint`, both guard scripts, and `pnpm test`; the pre-commit hook runs it,
and CI runs the same five checks.
