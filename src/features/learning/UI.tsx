import {
  Text,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocale } from "@/localization/LocaleProvider";
import { cycleMessages } from "@/localization/cycle";
import { learningMessages } from "@/localization/learning";
import { colors, space, radius, type } from "@/theme/tokens";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
export function useLearningText(kind: "PRETEST" | "POSTTEST" = "PRETEST") {
  const locale = useLocale().locale;
  const base = learningMessages[locale];
  if (kind !== "POSTTEST") return base;
  const c = cycleMessages[locale];
  return {
    ...base,
    pretest: c.posttest,
    start: c.startPost,
    resume: c.resumePost,
    results: c.postResults,
    score: c.postScore,
    intro: c.postIntro,
    submit: c.submitPost,
    submitTitle: c.submitPostTitle,
    submitBody: c.submitPostBody,
    grading: c.gradingPost,
    resultBody: c.cycleDone,
  };
}
export function useCycleText() {
  return cycleMessages[useLocale().locale];
}
export function LearningError({
  error,
  messages = {},
}: {
  error: unknown;
  messages?: Record<string, string>;
}) {
  const t = useLearningText(),
    c = useCycleText();
  if (!error) return null;
  const code =
    typeof error === "object" && "code" in error ? String(error.code) : "";
  const map: Record<string, string> = {
    SQL_REFERENCE_INVALID: c.referenceInvalid,
    POSTTEST_LOCKED: c.postLocked,
    DISTINCT_PACKAGES_REQUIRED: c.distinct,
    OTHER_TEST_ACTIVE: c.testBlocked,
    RATE_LIMITED: c.rate,
    FORBIDDEN: t.forbidden,
    MATERIAL_LOCKED: t.lockedPrevious,
    ATTEMPT_CLOSED: t.closed,
    REVISION_CONFLICT: t.conflict,
    CLASS_ARCHIVED: t.archived,
    LAB_REQUIRED: t.labPending,
    MATERIAL_IN_USE: t.materialInUse,
    ASSESSMENT_IN_USE: t.settingsLocked,
    VALIDATION_ERROR: t.validation,
  };
  return (
    <Text accessibilityLiveRegion="polite" style={styles.error}>
      {messages[code] ?? map[code] ?? t.error}
    </Text>
  );
}
export function Loading() {
  return (
    <Page>
      <ActivityIndicator color={colors.primary} />
    </Page>
  );
}
export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const t = useLearningText();
  return (
    <Page>
      <LearningError error={error} />
      <Button label={t.retry} onPress={retry} />
    </Page>
  );
}
export function Radio({
  selected,
  label,
  onPress,
  disabled = false,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.option, selected ? styles.selected : null]}
    >
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.circle, selected ? styles.circleSelected : null]}
      >
        {selected ? <View style={styles.dot} /> : null}
      </View>
      <Text style={styles.optionText}>{label}</Text>
    </Pressable>
  );
}
export const styles = StyleSheet.create({
  column: { gap: space.md },
  section: { gap: space.lg },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  grow: { flex: 1 },
  title: { ...type.title, color: colors.onSurface },
  subtitle: { ...type.subtitle, color: colors.onSurface },
  body: { ...type.body, color: colors.onSurfaceVariant },
  label: { ...type.label, color: colors.onSurface },
  caption: { ...type.caption, color: colors.onSurfaceVariant },
  error: { ...type.body, color: colors.error },
  card: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.surface,
    padding: space.xl,
    gap: space.md,
  },
  warm: { backgroundColor: colors.secondaryContainer },
  warmTitle: { ...type.title, color: colors.onSecondaryContainer },
  warmBody: { ...type.body, color: colors.secondaryText },
  separator: { height: 1, backgroundColor: colors.outline },
  option: {
    minHeight: 52,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.control,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.onSurfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  circleSelected: { borderColor: colors.primary },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionText: { ...type.body, color: colors.onSurface, flex: 1 },
  code: { ...type.body, color: colors.onSurface, fontFamily: "monospace" },
});
