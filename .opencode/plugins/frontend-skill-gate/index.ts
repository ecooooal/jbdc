/**
 * Frontend Skill Gate.
 *
 * The repo requires the Expo frontend skills before any frontend edit:
 * `expo-design-system`, `expo-animation`, and `uniwind`. This plugin makes that
 * requirement real instead of advisory: an `edit` that touches a frontend file
 * is denied until all three skills have completed in the current session.
 *
 * The gate is intentionally narrow for now: `.tsx` anywhere under `src/`, `.ts`
 * under `src/app/` or a `components/` folder, and `.css` under `src/`. Tests and
 * domain logic are not UI edits. `expo-data-fetching` and `expo-sqlite` stay
 * outside the gate until their own triggers are enforced.
 */

type SessionMessage = {
  type?: string;
  content?: readonly SessionToolPart[];
};

type SessionToolPart = {
  type?: string;
  name?: string;
  state?: {
    status?: string;
    input?: {
      id?: unknown;
    };
  };
};

type SessionContextResult = readonly SessionMessage[] | { readonly data: readonly SessionMessage[] };

type PermissionEvent = {
  readonly sessionID: string;
  readonly action: string;
  readonly resources: readonly string[];
  effect: "allow" | "ask" | "deny";
  message?: string;
};

type PluginContext = {
  permission: {
    hook(
      name: "evaluate",
      callback: (event: PermissionEvent) => Promise<void> | void,
    ): Promise<unknown>;
  };
  session: {
    context(input: { sessionID: string }): Promise<SessionContextResult>;
  };
};

const REQUIRED_SKILLS = ["expo-design-system", "expo-animation", "uniwind"] as const;

function relativePath(resource: string): string {
  const path = resource.replaceAll("\\", "/");
  const marker = path.indexOf("/src/");

  return (marker >= 0 ? path.slice(marker + 1) : path).replace(/^\.\//, "");
}

function isFrontendFile(resource: string): boolean {
  const path = relativePath(resource);

  if (!path.startsWith("src/") || path.includes("/tests/")) return false;
  if (path.endsWith(".css")) return true;
  if (path.endsWith(".tsx") || path.endsWith(".jsx")) return true;
  if (path.startsWith("src/app/") && path.endsWith(".ts")) return true;
  if (path.includes("/components/") && path.endsWith(".ts")) return true;

  return false;
}

function messagesFrom(result: SessionContextResult): readonly SessionMessage[] {
  return Array.isArray(result) ? result : result.data;
}

function loadedSkills(messages: readonly SessionMessage[]): Set<string> {
  const loaded = new Set<string>();

  for (const message of messages) {
    if (message.type !== "assistant") continue;

    for (const part of message.content ?? []) {
      if (part.type !== "tool" || part.name !== "skill") continue;
      if (part.state?.status !== "completed") continue;

      const id = part.state.input?.id;

      if (typeof id === "string") loaded.add(id);
    }
  }

  return loaded;
}

export default {
  id: "frontend-skill-gate",
  async setup(ctx: PluginContext) {
    await ctx.permission.hook("evaluate", async (event) => {
      if (event.action !== "edit") return;

      const frontendFiles = event.resources.filter(isFrontendFile);
      if (frontendFiles.length === 0) return;

      const messages = messagesFrom(await ctx.session.context({ sessionID: event.sessionID }));
      const loaded = loadedSkills(messages);
      const missing = REQUIRED_SKILLS.filter((skill) => !loaded.has(skill));

      if (missing.length === 0) return;

      const paths = frontendFiles.map(relativePath).join(", ");

      event.effect = "deny";
      event.message =
        `Frontend Skill Gate: load ${missing.map((skill) => `\`${skill}\``).join(", ")} ` +
        `with the skill tool before editing ${paths}. ` +
        `This gate requires all three frontend skills: ${REQUIRED_SKILLS.map((skill) => `\`${skill}\``).join(", ")}.`;
    });
  },
};
