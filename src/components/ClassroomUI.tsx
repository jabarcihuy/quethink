import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./Icon";
import { colors, radius, space, type } from "@/theme/tokens";
import { useLocale } from "@/localization/LocaleProvider";
import { visualMessages } from "@/localization/visual";
export const useVisualText = () => visualMessages[useLocale().locale];
export function IconBadge({
  name,
  tone = "lavender",
  size = 24,
}: {
  name: ComponentProps<typeof Icon>["name"];
  tone?: "lavender" | "apricot" | "mint" | "inverse";
  size?: number;
}) {
  const backgroundColor =
    tone === "apricot"
      ? colors.secondaryContainer
      : tone === "mint"
        ? colors.successContainer
        : tone === "inverse"
          ? colors.onPrimary
          : colors.primaryContainer;
  const color =
    tone === "apricot"
      ? colors.onSecondaryContainer
      : tone === "mint"
        ? colors.success
        : colors.primary;
  return (
    <View style={[s.badge, { backgroundColor }]}>
      <Icon name={name} size={size} color={color} />
    </View>
  );
}
export function SectionHeading({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <View style={s.sectionHeading}>
      <Text accessibilityRole="header" style={s.sectionTitle}>
        {children}
      </Text>
      {trailing}
    </View>
  );
}
export function DestinationRow({
  title,
  subtitle,
  icon,
  onPress,
  tone = "lavender",
  trailing,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  icon: ComponentProps<typeof Icon>["name"];
  onPress?: () => void;
  tone?: "lavender" | "apricot" | "mint";
  trailing?: ReactNode;
  disabled?: boolean;
}) {
  const content = (
    <>
      <IconBadge name={icon} tone={tone} />
      <View style={s.grow}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowBody}>{subtitle}</Text> : null}
        {trailing}
      </View>
      {onPress ? (
        <Icon
          name={disabled ? "lock" : "chevron"}
          size={20}
          color={colors.onSurfaceVariant}
        />
      ) : null}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: colors.primaryContainer }}
      style={({ pressed }) => [s.destination, pressed && s.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={s.destination}>{content}</View>
  );
}
export function TonalPanel({
  children,
  tone = "indigo",
  style,
}: {
  children: ReactNode;
  tone?: "indigo" | "apricot" | "mint";
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        s.panel,
        {
          backgroundColor:
            tone === "apricot"
              ? colors.secondaryContainer
              : tone === "mint"
                ? colors.successContainer
                : colors.primary,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function ProgressTrack({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label: string;
}) {
  const percent =
    total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  return (
    <View style={s.progressGroup}>
      <View style={s.progressHeading}>
        <Text style={s.rowBody}>{label}</Text>
        <Text style={s.rowTitle}>
          {value}/{total}
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: Math.max(1, total), now: value }}
        style={s.track}
      >
        <View style={[s.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}
export const classroomStyles = StyleSheet.create({
  headline: { ...type.headline, color: colors.onSurface, letterSpacing: -0.6 },
  inverseTitle: { ...type.title, color: colors.onPrimary },
  inverseBody: { ...type.body, color: colors.onPrimary },
  header: { flexDirection: "row", alignItems: "center", gap: 16 },
  grow: { flex: 1, gap: 4 },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.surface,
    overflow: "hidden",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  status: { ...type.label, color: colors.primary },
});
const s = StyleSheet.create({
  badge: {
    width: 48,
    height: 48,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: { ...type.subtitle, color: colors.onSurface, flex: 1 },
  grow: { flex: 1, gap: 6 },
  rowTitle: { ...type.body, fontWeight: "600", color: colors.onSurface },
  rowBody: { ...type.caption, color: colors.onSurfaceVariant },
  destination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    minHeight: 88,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  pressed: { opacity: 0.8 },
  panel: { borderRadius: radius.surface, padding: space.xl, gap: space.lg },
  progressGroup: { gap: 12 },
  progressHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryContainer,
    overflow: "hidden",
  },
  fill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
});
