import { MATERIAL_USE_ROLES, type MaterialUseRole } from "@/features/database";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { materialUseRoleLabel } from "../lib/material-use-role";

/** The `main | secondary | other` picker shared by the add and edit forms. */
export function MaterialUseRoleSelect({
  value,
  onChange,
}: {
  value: MaterialUseRole;
  onChange: (role: MaterialUseRole) => void;
}) {
  return (
    <Select
      value={{ value, label: materialUseRoleLabel(value) }}
      onValueChange={(option) => {
        if (option) onChange(option.value as MaterialUseRole);
      }}
    >
      <SelectTrigger accessibilityLabel="Role">
        <SelectValue placeholder="Role" />
      </SelectTrigger>
      <SelectContent>
        {MATERIAL_USE_ROLES.map((role) => (
          <SelectItem key={role} value={role} label={materialUseRoleLabel(role)} />
        ))}
      </SelectContent>
    </Select>
  );
}
