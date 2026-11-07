import { StyleSheet, Text, View } from "react-native";
import { Page } from "@/components/Page";
import { useLocale } from "@/localization/LocaleProvider";
import { colors, space, type } from "@/theme/tokens";
import type { MessageKey } from "@/localization/messages";

const steps: { title: MessageKey; body: MessageKey }[] = [
  { title: "pretestTitle", body: "pretestBody" },
  { title: "materialsTitle", body: "materialsBody" },
  { title: "practiceTitle", body: "practiceBody" },
  { title: "posttestTitle", body: "posttestBody" },
];

export default function JourneyScreen() {
  const { t } = useLocale();
  return (
    <Page>
      <Text style={styles.body}>{t("journeyBody")}</Text>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <View key={step.title} style={styles.step}>
            <View
              style={styles.numberContainer}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={styles.number}>{index + 1}</Text>
            </View>
            <View style={styles.copy}>
              <Text accessibilityRole="header" style={styles.title}>
                {t(step.title)}
              </Text>
              <Text style={styles.body}>{t(step.body)}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.note}>{t("testRule")}</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, color: colors.onSurfaceVariant },
  steps: { gap: space.xxl },
  step: { flexDirection: "row", gap: space.lg, alignItems: "flex-start" },
  numberContainer: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xs,
  },
  number: { ...type.label, color: colors.primary },
  copy: { flex: 1, gap: space.sm },
  title: { ...type.subtitle, color: colors.onSurface },
  note: {
    ...type.caption,
    color: colors.onSurfaceVariant,
    paddingTop: space.sm,
  },
});
