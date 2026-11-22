import type { MaterialUseRole } from "@/features/database";

const ROLE_LABELS: Record<MaterialUseRole, string> = {
  main: "Main",
  secondary: "Secondary",
  other: "Other",
};

/** The owner-facing name of a Material use's role. */
export function materialUseRoleLabel(role: MaterialUseRole): string {
  return ROLE_LABELS[role];
}
