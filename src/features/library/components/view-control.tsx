import { ChevronDown } from "lucide-react-native";
import { View } from "react-native";
import { GROUPINGS, type Grouping } from "@/features/settings";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Icon } from "@/shared/components/ui/icon";
import { Text } from "@/shared/components/ui/text";
import type { LibraryView } from "../lib/library-screen-reducer";

/** Each view, written as the Owner reads it on the control. */
const VIEW_LABELS: Record<LibraryView, string> = {
  library: "Library",
  rejected: "Rejected designs",
};

/** The two grouping choices, written as the Owner reads them. */
const GROUPING_LABELS: Record<Grouping, string> = {
  "per-design": "Design",
  "per-collection": "Collection",
};

/**
 * The Library's header control: one outlined button labelled View and showing
 * the view the screen is on, opening the menu that changes it. The label sits
 * above the value so the control still names its job after the value changes
 * from Library to the longer Rejected designs. The menu holds both of the
 * Library's arrangement choices: Group by, a radio between the flat Design
 * stream and Collection sections, and View, the Rejected designs checkbox that
 * swaps the body; the unchecked row draws its empty box, so the menu reads as a
 * choice before the first check. Grouping is a stored preference; the view is
 * not, so the control always opens on Library.
 */
export function ViewControl({
  view,
  grouping,
  onViewChange,
  onGroupingChange,
}: {
  view: LibraryView;
  grouping: Grouping;
  onViewChange: (checked: boolean) => void;
  onGroupingChange: (grouping: Grouping) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="default"
          variant="outline"
          accessibilityLabel={`View: ${VIEW_LABELS[view]}`}
          accessibilityHint="Opens the view and grouping choices"
          className="h-auto min-h-12 flex-col items-start justify-center gap-0.5 px-4 py-1 sm:h-auto"
        >
          <Text className="text-muted-foreground text-xs font-normal leading-4">View</Text>
          <View className="flex-row items-center gap-2">
            <Text>{VIEW_LABELS[view]}</Text>
            <Icon as={ChevronDown} className="size-4" />
          </View>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Group by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={grouping}
          onValueChange={(value) => {
            const next = GROUPINGS.find((choice) => choice === value);

            if (next) onGroupingChange(next);
          }}
        >
          {GROUPINGS.map((option) => (
            <DropdownMenuRadioItem key={option} value={option} textValue={GROUPING_LABELS[option]}>
              <Text>{GROUPING_LABELS[option]}</Text>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>View</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={view === "rejected"}
          onCheckedChange={onViewChange}
          textValue={VIEW_LABELS.rejected}
        >
          {view !== "rejected" ? (
            // The primitive only mounts an indicator once checked; the empty
            // box keeps the row reading as a choice before the first check.
            <View className="border-input absolute left-2 h-4 w-4 rounded-sm border" />
          ) : null}
          <Text>{VIEW_LABELS.rejected}</Text>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
