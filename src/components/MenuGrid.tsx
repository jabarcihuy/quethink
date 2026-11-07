import { useState, type ComponentProps } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Icon } from "./Icon";
import { colors, radius, space, type } from "@/theme/tokens";
type Item = {
  key: string;
  label: string;
  accessibilityLabel?: string;
  icon: ComponentProps<typeof Icon>["name"];
  onPress: () => void;
  tone?: "apricot" | "lavender" | "mint";
  disabled?: boolean;
};
/** Parallel destinations only; reading sequences remain lists. */
export function MenuGrid({ items }: { items: Item[] }) {
  const window = useWindowDimensions();
  const [width, setWidth] = useState(
    Math.min(560, window.width - space.xl * 2),
  );
  const two = items.length > 1 && width >= 300 && window.fontScale < 1.25;
  return (
    <View
      onLayout={(e) => {
        const next = e.nativeEvent.layout.width;
        if (next > 0 && next !== width) setWidth(next);
      }}
      style={s.grid}
    >
      {items.map((item) => {
        const warm = item.tone === "apricot",
          mint = item.tone === "mint";
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            accessibilityState={{ disabled: !!item.disabled }}
            disabled={item.disabled}
            onPress={item.onPress}
            android_ripple={{ color: colors.outline }}
            style={({ pressed }) => [
              s.tile,
              {
                width: two ? (width - space.md) / 2 : width,
                backgroundColor: warm
                  ? colors.secondaryContainer
                  : mint
                    ? colors.successContainer
                    : colors.primaryContainer,
                opacity: item.disabled ? 0.55 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={s.tileTop}>
              <Icon
                name={item.icon}
                size={28}
                color={
                  warm
                    ? colors.onSecondaryContainer
                    : mint
                      ? colors.success
                      : colors.primary
                }
              />
              <Icon
                name="chevron"
                size={18}
                color={
                  warm
                    ? colors.onSecondaryContainer
                    : mint
                      ? colors.success
                      : colors.primary
                }
              />
            </View>
            <Text
              style={[
                s.label,
                {
                  color: warm ? colors.onSecondaryContainer : colors.onSurface,
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const s = StyleSheet.create({
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  tile: {
    minHeight: 124,
    justifyContent: "space-between",
    padding: space.lg,
    borderRadius: radius.control,
    gap: space.sm,
    overflow: "hidden",
  },
  tileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: { ...type.body, fontWeight: "700", flexShrink: 1 },
});
