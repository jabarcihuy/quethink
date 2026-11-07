import { Stack, router } from "expo-router";
import { TextAction } from "@/components/AccountUI";
import { useLocale } from "@/localization/LocaleProvider";
import { colors } from "@/theme/tokens";
export function TabStack({
  title,
  language = false,
}: {
  title: string;
  language?: boolean;
}) {
  const { t } = useLocale();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.onSurface },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title,
          headerRight: language
            ? () => (
                <TextAction
                  label={t("language")}
                  onPress={() => router.push("/language")}
                />
              )
            : undefined,
        }}
      />
    </Stack>
  );
}
