/**
 * A stand-in for the shared Select primitives, used by the Edit row-grammar
 * render suite. The native select's content needs the trigger's on-device
 * measurement, which Jest never runs, so this keeps the root's `onValueChange`
 * wiring real and turns each option into a button a test can press.
 */
import { createContext, useContext, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type Option = { value: string; label: string };
type Choose = (option: Option) => void;

const ChooseContext = createContext<Choose>(() => {});

export function Select({
  onValueChange,
  children,
}: {
  value?: unknown;
  disabled?: boolean;
  onValueChange?: Choose;
  children?: ReactNode;
}) {
  return (
    <ChooseContext.Provider value={onValueChange ?? (() => {})}>{children}</ChooseContext.Provider>
  );
}

export function SelectTrigger({
  accessibilityLabel,
  children,
}: {
  accessibilityLabel?: string;
  children?: ReactNode;
}) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

export function SelectValue() {
  return null;
}

export function SelectContent({ children }: { children?: ReactNode }) {
  return <View>{children}</View>;
}

export function SelectItem({ value, label }: { value: string; label: string }) {
  const choose = useContext(ChooseContext);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => choose({ value, label })}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}

export function SelectSeparator() {
  return null;
}
