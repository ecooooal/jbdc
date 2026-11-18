import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import type { MaterialUseRole } from '@/features/database';
import type { MaterialUse } from '@/features/designs';
import type { EditMaterialUseState } from '../lib/edit-material-use-reducer';
import type { MaterialUsePanel } from '../lib/edit-design-reducer';
import { AddMaterialUseForm } from './add-material-use-form';
import { EditMaterialUseForm } from './edit-material-use-form';
import { MaterialUsesTable } from './material-uses-table';

/**
 * The Specification tab's Materials block: the recorded uses, then
 * `＋ Add material`. Tapping a row opens the same in-place editor with that
 * use's Material, colour, and role; every change writes at once and the use can
 * be removed. The visit still records its one Event at close, as the rest of
 * Edit does.
 */
export function MaterialUsesSection({
  uses,
  panel,
  onOpenUse,
  onOpenAdd,
  onClosePanel,
  onMaterialChosen,
  onColourChanged,
  onColourCommitted,
  onRoleChosen,
  onRemoveUse,
  onInlineCreationOpened,
  onInlineCreationClosed,
  onInlineNameChanged,
  onMaterialCreated,
  onInlineCreationRefused,
  onAddConfirmed,
}: {
  uses: MaterialUse[];
  panel: MaterialUsePanel | null;
  onOpenUse: (materialUse: MaterialUse) => void;
  onOpenAdd: () => void;
  onClosePanel: () => void;
  onMaterialChosen: (materialId: string | null) => void;
  onColourChanged: (colour: string) => void;
  onColourCommitted: () => void;
  onRoleChosen: (role: MaterialUseRole) => void;
  onRemoveUse: () => void;
  onInlineCreationOpened: () => void;
  onInlineCreationClosed: () => void;
  onInlineNameChanged: (name: string) => void;
  onMaterialCreated: (materialId: string) => void;
  onInlineCreationRefused: (message: string) => void;
  onAddConfirmed: () => void;
}) {
  const editor: EditMaterialUseState | null = panel?.kind === 'edit' ? panel.editor : null;

  return (
    <View className="gap-2">
      <MaterialUsesTable
        uses={uses}
        onUsePress={panel?.kind === 'add' ? undefined : onOpenUse}
      />

      {editor ? (
        <EditMaterialUseForm
          state={editor}
          onMaterialChosen={onMaterialChosen}
          onColourChanged={onColourChanged}
          onColourCommitted={onColourCommitted}
          onRoleChosen={onRoleChosen}
          onRemove={onRemoveUse}
          onClose={onClosePanel}
        />
      ) : panel?.kind === 'add' ? (
        <AddMaterialUseForm
          state={panel.editor}
          onMaterialChosen={onMaterialChosen}
          onColourChanged={onColourChanged}
          onRoleChosen={onRoleChosen}
          onInlineCreationOpened={onInlineCreationOpened}
          onInlineCreationClosed={onInlineCreationClosed}
          onInlineNameChanged={onInlineNameChanged}
          onMaterialCreated={onMaterialCreated}
          onInlineCreationRefused={onInlineCreationRefused}
          onConfirm={onAddConfirmed}
          onCancel={onClosePanel}
        />
      ) : (
        <Button size="sm" variant="ghost" className="self-start" onPress={onOpenAdd}>
          <Icon as={Plus} />
          <Text>Add material</Text>
        </Button>
      )}
    </View>
  );
}
