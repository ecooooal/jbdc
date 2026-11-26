import { Sheet } from "@/shared/components/sheet";
import type { EditDesignGesture, MaterialUsePanel } from "../lib/edit-design-reducer";
import { AddMaterialUseForm } from "./add-material-use-form";
import { EditMaterialUseForm } from "./edit-material-use-form";
import { NewMaterialForm } from "./new-material-form";

/**
 * The three Material sheets, rendered beside the screen on the shared wrapper.
 * Add and Edit are the visit's one panel, so only one of them can be open; the
 * New material sheet stacks above Add material and keeps its own `inline.open`
 * state, so cancelling it returns to the choices the Add sheet still holds.
 *
 * They sit outside the scroll view because a sheet follows the screen, not the
 * page: every way it closes — its Close, a drag, the scrim, a screen reader's
 * dismiss, or Android Back — reports the same panel fact the visit handles.
 */
export function MaterialUseSheets({
  panel,
  send,
}: {
  panel: MaterialUsePanel | null;
  send: (gesture: EditDesignGesture) => void;
}) {
  function closePanel(): void {
    send({ type: "material-use-panel-fact", fact: { type: "closed" } });
  }

  const adding = panel?.kind === "add" ? panel.editor : null;

  return (
    <>
      <Sheet open={panel?.kind === "edit"} onClose={closePanel}>
        {panel?.kind === "edit" ? <EditMaterialUseForm state={panel} send={send} /> : null}
      </Sheet>

      <Sheet open={panel?.kind === "add"} onClose={closePanel}>
        {adding ? <AddMaterialUseForm state={adding} send={send} /> : null}
      </Sheet>

      <Sheet
        open={adding?.inline.open ?? false}
        onClose={() => send({ type: "material-use-inline-fact", fact: { type: "closed" } })}
      >
        {adding?.inline.open ? (
          <NewMaterialForm
            inline={adding.inline}
            onFact={(fact) => send({ type: "material-use-inline-fact", fact })}
          />
        ) : null}
      </Sheet>
    </>
  );
}
