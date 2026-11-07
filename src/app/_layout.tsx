import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text } from "react-native";
import { LocaleProvider, useLocale } from "@/localization/LocaleProvider";
import { colors, type } from "@/theme/tokens";
import { useAttendanceText } from "@/features/attendance/UI";
import { useLearningText } from "@/features/learning/UI";
import { AuthProvider } from "@/features/account/AuthProvider";
import { useAccountText } from "@/components/AccountUI";

function Navigation() {
  const { t } = useLocale();
  const account = useAccountText();
  const learning = useLearningText();
  const attendance = useAttendanceText();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          headerTitleStyle: { color: colors.onSurface },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Quethink",
            headerRight: () => (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/language")}
                style={styles.language}
              >
                <Text style={styles.languageLabel}>{t("language")}</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="journey" options={{ title: t("journeyTitle") }} />
        <Stack.Screen name="language" options={{ title: t("language") }} />
        <Stack.Screen
          name="login"
          options={{
            title: "Quethink",
            headerBackVisible: false,
            headerRight: () => (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/language")}
                style={styles.language}
              >
                <Text style={styles.languageLabel}>{t("language")}</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="register" options={{ title: account.register }} />
        <Stack.Screen
          name="forgot-password"
          options={{ title: account.forgot }}
        />
        <Stack.Screen
          name="reset-password"
          options={{ title: account.newPassword, headerBackVisible: false }}
        />
        <Stack.Screen
          name="auth/callback"
          options={{ title: "Quethink", headerBackVisible: false }}
        />
        <Stack.Screen
          name="complete-profile"
          options={{ title: account.completeProfile, headerBackVisible: false }}
        />
        <Stack.Screen name="lab/[id]" options={{ title: "SQL Lab" }} />
        <Stack.Screen name="ai-tutor" options={{ title: "AI tutor" }} />
        <Stack.Screen name="forum-new" options={{ title: "Forum" }} />
        <Stack.Screen name="forum-topic/[id]" options={{ title: "Forum" }} />
        <Stack.Screen
          name="question-bank/[id]"
          options={{ title: learning.questions }}
        />
        <Stack.Screen
          name="attendance-class/[id]"
          options={{ title: attendance.title }}
        />
        <Stack.Screen
          name="attendance-session/[id]"
          options={{ title: attendance.title }}
        />
        <Stack.Screen
          name="attendance-roster/[id]"
          options={{ title: attendance.roster }}
        />
        <Stack.Screen
          name="attendance-record/[id]"
          options={{ title: attendance.state }}
        />
        <Stack.Screen
          name="attendance-scan"
          options={{ title: attendance.scan }}
        />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen
          name="attempt/[id]"
          options={{
            title: "Pretest",
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="result/[id]"
          options={{ title: learning.results }}
        />
        <Stack.Screen
          name="material/[id]"
          options={{ title: learning.materials }}
        />
        <Stack.Screen
          name="material-editor/[id]"
          options={{ title: learning.edit }}
        />
        <Stack.Screen
          name="new-material/[id]"
          options={{ title: learning.addMaterial }}
        />
        <Stack.Screen
          name="course-materials/[id]"
          options={{ title: learning.materials }}
        />
        <Stack.Screen
          name="course-results/[id]"
          options={{ title: learning.results }}
        />
        <Stack.Screen
          name="course/[id]"
          options={{ title: account.classDetails }}
        />
        <Stack.Screen name="join" options={{ title: account.join }} />
        <Stack.Screen
          name="create-class"
          options={{ title: account.createClass }}
        />
        <Stack.Screen
          name="class/[id]"
          options={{ title: account.classDetails }}
        />
        <Stack.Screen name="+not-found" options={{ title: "Quethink" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </LocaleProvider>
  );
}

const styles = StyleSheet.create({
  language: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  languageLabel: { ...type.label, color: colors.primary },
});
