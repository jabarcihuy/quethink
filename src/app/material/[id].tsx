import { useCallback, useState } from "react";
import { Text } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { RequireAccount, TextAction } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useResource } from "@/features/account/useResource";
import { learningRepository } from "@/features/learning/repository";
import { Reading, openHttps } from "@/features/learning/Reading";
import {
  useLearningText,
  useCycleText,
  Loading,
  Failure,
  LearningError,
  styles,
} from "@/features/learning/UI";
export default function Screen() {
  return (
    <RequireAccount complete>
      <Reader />
    </RequireAccount>
  );
}
function Reader() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    t = useLearningText(),
    auth = useAuth(),
    c = useCycleText();
  const r = useResource(
    useCallback(() => learningRepository.material(id), [id]),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function read() {
    setBusy(true);
    setError(null);
    try {
      r.setData(await learningRepository.read(id));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (r.loading) return <Loading />;
  if (r.error || !r.data) return <Failure error={r.error} retry={r.refresh} />;
  const m = r.data,
    teacher = auth.profile?.role === "teacher";
  return (
    <Page>
      <Stack.Screen options={{ title: t.materials }} />
      <Text accessibilityRole="header" style={styles.title}>
        {m.title}
      </Text>
      <Text style={styles.caption}>{t.contentLanguage}</Text>
      {m.archived ? <Text style={styles.body}>{t.archived}</Text> : null}
      <Reading body={m.body} onError={setError} />
      {m.attachments.map((a, i) => (
        <TextAction
          key={i}
          label={`${a.type === "pdf" ? t.openPdf : t.openVideo}: ${a.title}`}
          onPress={() => {
            void openHttps(a.url).catch(setError);
          }}
        />
      ))}
      <LearningError error={error} />
      {teacher && !m.archived ? (
        <TextAction
          label={t.edit}
          onPress={() =>
            router.push({ pathname: "/material-editor/[id]", params: { id } })
          }
        />
      ) : null}
      {!teacher ? (
        m.completed ? (
          <Text style={styles.body}>{t.completed}</Text>
        ) : m.requiresLab ? (
          <>
            <Text style={styles.body}>{c.labRequired}</Text>
            {!m.archived ? (
              <Button
                label={c.openLab}
                onPress={() =>
                  router.push({ pathname: "/lab/[id]", params: { id: m.id } })
                }
              />
            ) : null}
          </>
        ) : !m.archived ? (
          <Button
            label={t.markRead}
            busy={busy}
            onPress={() => {
              void read();
            }}
          />
        ) : null
      ) : null}
      <TextAction
        label={t.back}
        onPress={() => (teacher ? router.back() : router.replace("/learn"))}
      />
    </Page>
  );
}
