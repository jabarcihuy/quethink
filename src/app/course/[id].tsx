import { useCallback } from "react";
import { Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { MenuGrid } from "@/components/MenuGrid";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { useAttendanceText } from "@/features/attendance/UI";
import { RequireAccount, TextAction } from "@/components/AccountUI";
import { useResource } from "@/features/account/useResource";
import { useAuth } from "@/features/account/AuthProvider";
import {
  learningRepository,
  type LearningStatus,
} from "@/features/learning/repository";
import {
  useLearningText,
  useCycleText,
  Loading,
  Failure,
  styles,
} from "@/features/learning/UI";
export default function Screen() {
  return (
    <RequireAccount complete>
      <Course />
    </RequireAccount>
  );
}
function Course() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    auth = useAuth();
  const r = useResource(useCallback(() => learningRepository.status(id), [id]));
  if (auth.profile?.role !== "teacher")
    return (
      <Failure
        error={{ code: "FORBIDDEN" }}
        retry={() => router.replace("/home")}
      />
    );
  if (r.loading) return <Loading />;
  if (r.error || !r.data) return <Failure error={r.error} retry={r.refresh} />;
  return <Settings key={id} status={r.data} />;
}
function Settings({ status: s }: { status: LearningStatus }) {
  const t = useLearningText(),
    attendance = useAttendanceText(),
    c = useCycleText();
  return (
    <Page>
      <Stack.Screen options={{ title: t.manage }} />
      <Text accessibilityRole="header" style={styles.title}>
        {s.class.name}
      </Text>
      <Button
        label={t.materials}
        onPress={() =>
          router.push({
            pathname: "/course-materials/[id]",
            params: { id: s.class.id },
          })
        }
      />
      <TextAction
        label={attendance.title}
        onPress={() =>
          router.push({
            pathname: "/attendance-class/[id]",
            params: { id: s.class.id },
          })
        }
      />
      {(["PRETEST", "POSTTEST"] as const).map((kind) => (
        <View key={kind} style={styles.section}>
          <Text accessibilityRole="header" style={styles.subtitle}>
            {kind === "PRETEST" ? t.pretest : c.posttest}
          </Text>
          <Text style={styles.body}>
            {kind === "PRETEST" ? s.questionCount : s.postQuestionCount}{" "}
            {t.questions.toLowerCase()} ·{" "}
            {kind === "PRETEST" ? s.pretestMinutes : s.posttestMinutes}{" "}
            {t.minutes}
          </Text>
          <MenuGrid
            items={[
              {
                key: "questions",
                label: c.manageQuestions,
                accessibilityLabel: `${c.manageQuestions} · ${kind === "PRETEST" ? t.pretest : c.posttest}`,
                icon: "book",
                tone: "apricot",
                onPress: () =>
                  router.push({
                    pathname: "/question-bank/[id]",
                    params: { id: s.class.id, kind },
                  }),
              },
              {
                key: "results",
                label: kind === "PRETEST" ? t.results : c.postResults,
                icon: "check",
                onPress: () =>
                  router.push({
                    pathname: "/course-results/[id]",
                    params: { id: s.class.id, kind },
                  }),
              },
            ]}
          />
          <View style={styles.separator} />
        </View>
      ))}
    </Page>
  );
}
