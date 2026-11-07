import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Page } from "@/components/Page";
import { Icon } from "@/components/Icon";
import { useLocale } from "@/localization/LocaleProvider";
import type { Locale } from "@/localization/messages";
import { colors, radius, space, type } from "@/theme/tokens";

const choices: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
];

export default function LanguageScreen() {
  const { t, locale, setLocale, saving, error } = useLocale();
  return (
    <Page>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("languageTitle")}
        </Text>
        <Text style={styles.body}>{t("languageBody")}</Text>
      </View>
      <View style={styles.choices}>
        {choices.map((choice) => (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityState={{
              checked: locale === choice.value,
              disabled: saving,
            }}
            disabled={saving}
            onPress={() => {
              void setLocale(choice.value);
            }}
            android_ripple={{ color: colors.primaryContainer }}
            style={({ pressed }) => [
              styles.choice,
              locale === choice.value ? styles.selected : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.choiceText}>{choice.label}</Text>
            {locale === choice.value ? (
              <Icon name="check" color={colors.primary} />
            ) : null}
          </Pressable>
        ))}
      </View>
      {saving ? (
        <ActivityIndicator
          color={colors.primary}
          accessibilityLabel={t("loading")}
        />
      ) : null}
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.body, error ? styles.error : null]}
      >
        {t(error ?? "languageStorageHint")}
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  copy: { gap: space.md },
  title: { ...type.title, color: colors.onSurface },
  body: { ...type.body, color: colors.onSurfaceVariant },
  choices: { gap: space.md },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.control,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: "hidden",
  },
  choiceText: { ...type.body, color: colors.onSurface, flex: 1 },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  pressed: { opacity: 0.8 },
  error: { color: colors.error },
});
