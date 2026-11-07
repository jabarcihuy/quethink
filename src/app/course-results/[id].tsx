import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/Button";
import { Page } from "@/components/Page";
import { RequireAccount, TextAction } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useResource } from "@/features/account/useResource";
import { learningRepository } from "@/features/learning/repository";
import {
  useLearningText,
  Loading,
  Failure,
  LearningError,
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
  const { id, kind: raw } = useLocalSearchParams<{
      id: string;
      kind?: string;
    }>(),
    kind = raw === "POSTTEST" ? "POSTTEST" : "PRETEST",
    t = useLearningText(kind),
    auth = useAuth();
  const r = useResource(
    useCallback(() => learningRepository.results(id, null, kind), [id, kind]),
  );
  const [busy, setBusy] = useState(false),
    [moreError, setMoreError] = useState<unknown>(null);
  async function more() {
    setBusy(true);
    try {
      const page = await learningRepository.results(
        id,
        r.data?.nextCursor,
        kind,
      );
      r.setData((previous) =>
        previous
          ? {
              items: [...previous.items, ...page.items],
              nextCursor: page.nextCursor,
            }
          : page,
      );
    } catch (e) {
      setMoreError(e);
    } finally {
      setBusy(false);
    }
  }
  if (auth.profile?.role !== "teacher")
    return (
      <Failure
        error={{ code: "FORBIDDEN" }}
        retry={() => router.replace("/home")}
      />
    );
  if (r.loading) return <Loading />;
  if (r.error) return <Failure error={r.error} retry={r.refresh} />;
  return (
    <Page>
      <Stack.Screen options={{ title: t.results }} />
      {!r.data?.items.length ? (
        <Text style={styles.body}>{t.noResults}</Text>
      ) : null}
      {r.data?.items.map((a) => (
        <View key={a.id} style={styles.section}>
          <Text style={styles.subtitle}>{a.studentName}</Text>
          <Text style={styles.body}>NIM: {a.nim}</Text>
          <Text style={styles.body}>
            {a.status === "completed"
              ? `${t.score}: ${a.score}/100`
              : t.pending}
          </Text>
          {a.status === "completed" ? (
            <TextAction
              label={t.viewResult}
              onPress={() =>
                router.push({ pathname: "/result/[id]", params: { id: a.id } })
              }
            />
          ) : null}
          <View style={styles.separator} />
        </View>
      ))}
      <LearningError error={moreError} />
      {r.data?.nextCursor ? (
        <Button
          label={t.more}
          busy={busy}
          onPress={() => {
            void more();
          }}
        />
      ) : null}
    </Page>
  );
}
