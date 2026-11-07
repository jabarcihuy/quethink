import { useCallback, useRef, useState } from "react";
import { Alert, Text, View, type ScrollViewInstance } from "react-native";
import {
  Stack,
  router,
  useLocalSearchParams,
  usePreventRemove,
} from "expo-router";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { Field, RequireAccount, TextAction } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useResource } from "@/features/account/useResource";
import {
  learningRepository,
  type QuestionBank,
  type BankQuestion,
  type TestKind,
} from "@/features/learning/repository";
import {
  useCycleText,
  useLearningText,
  Loading,
  Failure,
  LearningError,
  Radio,
  styles,
} from "@/features/learning/UI";
import { SqlDataset, SqlEditor } from "@/features/learning/Sql";
export default function Screen() {
  return (
    <RequireAccount complete>
      <Bank />
    </RequireAccount>
  );
}
function Bank() {
  const { id, kind: raw } = useLocalSearchParams<{
      id: string;
      kind?: string;
    }>(),
    auth = useAuth();
  const kind: TestKind = raw === "POSTTEST" ? "POSTTEST" : "PRETEST";
  const r = useResource(
    useCallback(() => learningRepository.bank(id, kind), [id, kind]),
  );
  if (auth.profile?.role !== "teacher")
    return (
      <Failure
        error={{ code: "FORBIDDEN" }}
        retry={() => router.replace("/home")}
      />
    );
  if (r.loading) return <Loading />;
  if (r.error || !r.data) return <Failure error={r.error} retry={r.refresh} />;
  return <Editor key={id + kind} classId={id} initial={r.data} />;
}
function Editor({
  classId,
  initial,
}: {
  classId: string;
  initial: QuestionBank;
}) {
  const c = useCycleText(),
    t = useLearningText(initial.kind),
    [bank, setBank] = useState(initial),
    [minutes, setMinutes] = useState(String(initial.minutes)),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState<unknown>(null);
  const page = useRef<ScrollViewInstance>(null),
    q = bank.questions[index],
    locked = initial.locked;
  usePreventRemove(dirty, ({ repeat }) =>
    Alert.alert(c.leaveTitle, c.leaveBody, [
      { text: c.stay, style: "cancel" },
      {
        text: c.discard,
        style: "destructive",
        onPress: () => {
          setDirty(false);
          repeat();
        },
      },
    ]),
  );
  function change(update: Partial<BankQuestion>) {
    setBank((v) => ({
      ...v,
      questions: v.questions.map((q, i) =>
        i === index ? { ...q, ...update } : q,
      ),
    }));
    setDirty(true);
    setSaved(false);
  }
  function move(i: number) {
    setIndex(i);
    page.current?.scrollTo({ y: 0, animated: false });
  }
  function add(kind: "choice" | "sql") {
    const next: BankQuestion = {
      id:
        "q_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 6),
      kind,
      prompt: "",
      explanation: "",
      ...(kind === "choice"
        ? {
            options: [
              { id: "a", text: "" },
              { id: "b", text: "" },
              { id: "c", text: "" },
            ],
            correct: "a",
          }
        : { reference: "" }),
    };
    setBank((v) => ({ ...v, questions: [...v.questions, next] }));
    setDirty(true);
    setSaved(false);
    move(bank.questions.length);
  }
  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      if (!/^\d+$/.test(minutes)) throw { code: "VALIDATION_ERROR" };
      await learningRepository.saveBank(classId, {
        ...bank,
        minutes: Number(minutes),
      });
      setBank({
        ...bank,
        minutes: Number(minutes),
        revision: bank.revision + 1,
      });
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page scrollRef={page}>
      <Stack.Screen options={{ title: `${t.pretest} · ${t.questions}` }} />
      <Text style={styles.body}>{c.bankHelp}</Text>
      <Text style={styles.caption}>{c.bankRules}</Text>
      {locked ? (
        <Text style={styles.body}>{c.bankLocked}</Text>
      ) : (
        <Text style={styles.caption}>{c.bankDraft}</Text>
      )}
      <Field
        label={t.duration}
        value={minutes}
        keyboardType="number-pad"
        maxLength={3}
        editable={!locked && !busy}
        onChangeText={(v) => {
          setMinutes(v);
          setDirty(true);
          setSaved(false);
        }}
      />
      <View style={styles.separator} />
      <Text accessibilityRole="header" style={styles.subtitle}>
        {t.question} {index + 1} {t.of} {bank.questions.length}
      </Text>
      {q ? (
        <View style={styles.section}>
          <Text style={styles.label}>
            {q.kind === "choice" ? c.choice : c.sql}
          </Text>
          <Field
            label={c.prompt}
            value={q.prompt}
            multiline
            maxLength={2000}
            editable={!locked && !busy}
            style={{ minHeight: 104, maxHeight: 208, textAlignVertical: "top" }}
            onChangeText={(prompt) => change({ prompt })}
          />
          {q.kind === "choice" ? (
            <>
              {q.options?.map((o, i) => (
                <Field
                  key={o.id}
                  label={`${c.option} ${i + 1}`}
                  value={o.text}
                  multiline
                  maxLength={500}
                  editable={!locked && !busy}
                  onChangeText={(text) =>
                    change({
                      options: q.options!.map((v) =>
                        v.id === o.id ? { ...v, text } : v,
                      ),
                    })
                  }
                />
              ))}
              <Text style={styles.label}>{c.correct}</Text>
              {q.options?.map((o, i) => (
                <Radio
                  key={o.id}
                  label={`${c.option} ${i + 1}: ${o.text}`}
                  selected={q.correct === o.id}
                  disabled={locked || busy}
                  onPress={() => change({ correct: o.id })}
                />
              ))}
            </>
          ) : (
            <>
              <SqlDataset />
              <SqlEditor
                label={c.reference}
                value={q.reference ?? ""}
                disabled={locked || busy}
                onChangeText={(reference) => change({ reference })}
              />
            </>
          )}
          <Field
            label={c.explanation}
            value={q.explanation}
            multiline
            maxLength={2000}
            style={{ minHeight: 104, maxHeight: 208, textAlignVertical: "top" }}
            editable={!locked && !busy}
            onChangeText={(explanation) => change({ explanation })}
          />
          {!locked ? (
            <TextAction
              label={c.remove}
              disabled={busy || bank.questions.length <= 2}
              onPress={() =>
                Alert.alert(c.removeTitle, c.removeBody, [
                  { text: t.cancel, style: "cancel" },
                  {
                    text: c.remove,
                    style: "destructive",
                    onPress: () => {
                      setBank((v) => ({
                        ...v,
                        questions: v.questions.filter((_, i) => i !== index),
                      }));
                      setDirty(true);
                      setSaved(false);
                      move(Math.max(0, index - 1));
                    },
                  },
                ])
              }
            />
          ) : null}
        </View>
      ) : null}
      <View style={styles.section}>
        <TextAction
          label={t.previous}
          disabled={busy || index <= 0}
          onPress={() => move(index - 1)}
        />
        <TextAction
          label={t.next}
          disabled={busy || index >= bank.questions.length - 1}
          onPress={() => move(index + 1)}
        />
      </View>
      {!locked ? (
        <>
          <TextAction
            label={c.addChoice}
            disabled={busy || bank.questions.length >= 30}
            onPress={() => add("choice")}
          />
          <TextAction
            label={c.addSql}
            disabled={
              busy ||
              bank.questions.length >= 30 ||
              bank.questions.filter((q) => q.kind === "sql").length >= 2
            }
            onPress={() => add("sql")}
          />
          <LearningError
            error={error}
            messages={{
              VALIDATION_ERROR: c.bankRules,
              REVISION_CONFLICT: c.bankConflict,
            }}
          />
          {saved ? (
            <Text accessibilityLiveRegion="polite" style={styles.body}>
              {c.bankSaved}
            </Text>
          ) : null}
          <Button
            label={c.saveBank}
            disabled={busy || !dirty}
            busy={busy}
            onPress={() => {
              void save();
            }}
          />
        </>
      ) : null}
    </Page>
  );
}
