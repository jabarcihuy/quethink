import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { useLocale } from "@/localization/LocaleProvider";
import { colors, type } from "@/theme/tokens";

export default function NotFoundScreen() {
  const { t } = useLocale();
  return (
    <Page>
      <Text accessibilityRole="header" style={styles.title}>
        {t("notFoundTitle")}
      </Text>
      <Text style={styles.body}>{t("notFoundBody")}</Text>
      <Button label={t("returnHome")} onPress={() => router.dismissTo("/")} />
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.onSurface },
  body: { ...type.body, color: colors.onSurfaceVariant },
});
