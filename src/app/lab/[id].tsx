import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { RequireAccount, TextAction } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useResource } from "@/features/account/useResource";
import {
  learningRepository,
  type LabResult,
} from "@/features/learning/repository";
import {
  useCycleText,
  useLearningText,
  Loading,
  Failure,
  LearningError,
  styles,
} from "@/features/learning/UI";
import { SqlDataset, SqlEditor, QueryTable } from "@/features/learning/Sql";
export default function Screen() {
  return (
    <RequireAccount complete>
      <Lab />
    </RequireAccount>
  );
}
function requestId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}
function Lab() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    c = useCycleText(),
    t = useLearningText(),
    auth = useAuth();
  const r = useResource(
    useCallback(() => learningRepository.material(id), [id]),
  );
  const [query, setQuery] = useState(""),
    [result, setResult] = useState<LabResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [checked, setChecked] = useState(false);
  const retry = useRef<{ query: string; check: boolean; id: string } | null>(
    null,
  );
  function change(value: string) {
    setQuery(value);
    setResult(null);
    setError(null);
    retry.current = null;
  }
  async function run(check: boolean) {
    setBusy(true);
    setError(null);
    setResult(null);
    setChecked(check);
    try {
      if (
        !retry.current ||
        retry.current.query !== query ||
        retry.current.check !== check
      )
        retry.current = { query, check, id: requestId() };
      setResult(
        await learningRepository.lab(id, query, check, retry.current.id),
      );
      retry.current = null;
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (r.loading) return <Loading />;
  if (r.error || !r.data) return <Failure error={r.error} retry={r.refresh} />;
  if (auth.profile?.role !== "student" || !r.data.requiresLab)
    return (
      <Failure
        error={{ code: "FORBIDDEN" }}
        retry={() => router.replace("/home")}
      />
    );
  const m = r.data;
  return (
    <Page>
      <Stack.Screen options={{ title: c.labTitle }} />
      <Text accessibilityRole="header" style={styles.title}>
        {m.title}
      </Text>
      <Text style={styles.body}>
        {m.labKind === "update" ? c.updatePrompt : c.filterPrompt}
      </Text>
      <Text style={styles.caption}>{c.labHelp}</Text>
      {m.archived ? <Text style={styles.body}>{c.readOnly}</Text> : null}
      <SqlDataset />
      <SqlEditor
        value={query}
        onChangeText={change}
        disabled={busy || m.archived}
      />
      <View style={styles.section}>
        <Button
          label={c.run}
          busy={busy && !checked}
          disabled={busy || m.archived || !query.trim()}
          onPress={() => {
            void run(false);
          }}
        />
        <Button
          label={c.check}
          busy={busy && checked}
          disabled={busy || m.archived || !query.trim()}
          onPress={() => {
            void run(true);
          }}
        />
        <TextAction
          label={c.reset}
          disabled={busy || m.archived}
          onPress={() => change("")}
        />
      </View>
      {result ? (
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.subtitle}>
            {c.output}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={result.error ? styles.error : styles.body}
          >
            {result.error
              ? c.queryRejected
              : result.passed
                ? c.passed
                : checked
                  ? c.notPassed
                  : c.preview}
          </Text>
          {!result.error ? (
            <QueryTable names={result.names} rows={result.rows} />
          ) : null}
        </View>
      ) : null}
      <LearningError error={error} />
      {error ? <Text style={styles.caption}>{c.runFailed}</Text> : null}
      <TextAction
        label={c.backMaterials}
        disabled={busy}
        onPress={() => router.replace("/learn")}
      />
    </Page>
  );
}
