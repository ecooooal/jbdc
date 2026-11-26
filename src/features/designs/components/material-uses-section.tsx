import type { MaterialUse } from "@/features/designs";
import type { EditDesignGesture, MaterialUsePanel } from "../lib/edit-design-reducer";
import { MaterialUsesTable } from "./material-uses-table";

/**
 * The Specification tab's Materials block: the recorded uses, then
 * `＋ Add material` as the block's last row. Tapping a use opens its Edit
 * material sheet; the add row opens the Add material sheet. Both sheets render
 * beside the screen on the shared wrapper, so this section only reads the rows
 * and reports the gesture.
 *
 * The visit owns the one open panel, so this section takes that value and the
 * gesture dispatcher: it has no pass-through callbacks of its own.
 */
export function MaterialUsesSection({
  uses,
  panel,
  send,
}: {
  uses: MaterialUse[];
  panel: MaterialUsePanel | null;
  send: (gesture: EditDesignGesture) => void;
}) {
  return (
    <MaterialUsesTable
      uses={uses}
      variant="edit"
      onUsePress={
        panel?.kind === "add"
          ? undefined
          : (materialUse) => send({ type: "material-use-editor-opened", materialUse })
      }
      onAddPress={() => send({ type: "material-use-add-opened" })}
    />
  );
}
