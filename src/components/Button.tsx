import { Pressable, StyleSheet, Text, ActivityIndicator } from "react-native";
import { colors, radius, space, type } from "@/theme/tokens";

type Props = {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
}: Props) {
  const unavailable = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: unavailable, busy }}
      onPress={onPress}
      disabled={unavailable}
      android_ripple={{ color: "#FFFFFF30" }}
      style={({ pressed }) => [
        styles.button,
        pressed ? styles.pressed : null,
        unavailable ? styles.disabled : null,
      ]}
    >
      {busy ? <ActivityIndicator color={colors.onPrimary} /> : null}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.primary,
    borderRadius: radius.control,
    borderCurve: "continuous",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: space.sm,
    overflow: "hidden",
  },
  label: {
    ...type.body,
    fontWeight: "700",
    color: colors.onPrimary,
    textAlign: "center",
    flexShrink: 1,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.55 },
});
