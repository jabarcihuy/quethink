import { useCallback } from "react";
import { Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { RequireAccount } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useResource } from "@/features/account/useResource";
import { learningRepository } from "@/features/learning/repository";
import {
  useLearningText,
  Loading,
  Failure,
  styles,
} from "@/features/learning/UI";
export default function Screen() {
  return (
    <RequireAccount complete>
      <Results />
    </RequireAccount>
  );
}
function Results() {
  const teacher = useAuth().profile?.role === "teacher";
  const { id } = useLocalSearchParams<{ id: string }>(),
    base = useLearningText();
  const post = useLearningText("POSTTEST");
  const r = useResource(useCallback(() => learningRepository.result(id), [id]));
  if (r.loading) return <Loading />;
  if (r.error || !r.data) return <Failure error={r.error} retry={r.refresh} />;
  const result = r.data,
    t = result.kind === "POSTTEST" ? post : base;
  function answer(q: (typeof result.feedback)[number], value: string | null) {
    return q.options?.find((o) => o.id === value)?.text ?? value ?? t.noAnswer;
  }
  return (
    <Page>
      <Stack.Screen options={{ title: t.results }} />
      <Text accessibilityRole="header" style={styles.title}>
        {t.score}: {result.score}/100
      </Text>
      <Text style={styles.body}>
        {teacher ? t.teacherResultBody : t.resultBody}
      </Text>
      <Button label={t.home} onPress={() => router.replace("/home")} />
      {result.feedback.map((q, i) => (
        <View key={q.id} style={styles.section}>
          <Text style={styles.caption}>
            {t.question} {i + 1} · {q.correct ? t.correct : t.review}
          </Text>
          <Text style={styles.subtitle}>{q.prompt}</Text>
          <Text style={styles.label}>{t.yourAnswer}</Text>
          <Text selectable style={q.kind === "sql" ? styles.code : styles.body}>
            {answer(q, q.answer)}
          </Text>
          <Text style={styles.label}>{t.correctAnswer}</Text>
          <Text selectable style={q.kind === "sql" ? styles.code : styles.body}>
            {answer(q, q.correctAnswer)}
          </Text>
          <Text style={styles.body}>{q.explanation}</Text>
          <View style={styles.separator} />
        </View>
      ))}
    </Page>
  );
}
