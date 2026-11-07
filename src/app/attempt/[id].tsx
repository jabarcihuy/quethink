import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  ScrollView,
  type ScrollViewInstance,
  Text,
  View,
} from "react-native";
import { router, Stack, Redirect, useLocalSearchParams } from "expo-router";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { RequireAccount, Field, TextAction } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useResource } from "@/features/account/useResource";
import {
  learningRepository,
  type Attempt,
} from "@/features/learning/repository";
import { useAnswers } from "@/features/learning/useAnswers";
import {
  useLearningText,
  Loading,
  Failure,
  LearningError,
  Radio,
  styles,
} from "@/features/learning/UI";
import { colors } from "@/theme/tokens";
export default function Screen() {
  return (
    <RequireAccount complete>
      <AttemptScreen />
    </RequireAccount>
  );
}
function AttemptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    auth = useAuth();
  const r = useResource(
    useCallback(() => learningRepository.attempt(id), [id]),
  );
  if (auth.profile?.role !== "student")
    return (
      <Failure
        error={{ code: "FORBIDDEN" }}
        retry={() => router.replace("/home")}
      />
    );
  if (r.loading) return <Loading />;
  if (r.error || !r.data) return <Failure error={r.error} retry={r.refresh} />;
  if (r.data.status === "completed")
    return <Redirect href={{ pathname: "/result/[id]", params: { id } }} />;
  return r.data.status === "grading" ? (
    <Grading kind={r.data.kind} attemptId={id} onReady={() => r.refresh()} />
  ) : (
    <Exam key={id} initial={r.data} onSubmitted={(a) => r.setData(a)} />
  );
}
function Grading({
  attemptId,
  kind,
  onReady,
}: {
  attemptId: string;
  kind: "PRETEST" | "POSTTEST";
  onReady: () => void;
}) {
  const t = useLearningText(kind),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  }, [onReady]);
  const check = useCallback(async () => {
    try {
      const a = await learningRepository.attempt(attemptId);
      if (a.status === "completed") ready.current();
    } catch (e) {
      setError(e);
    }
  }, [attemptId]);
  async function kick() {
    setBusy(true);
    setError(null);
    try {
      await learningRepository.grade(attemptId);
      await check();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void learningRepository.grade(attemptId).then(check).catch(setError);
    const timer = setInterval(() => {
      void check();
    }, 5000);
    return () => clearInterval(timer);
  }, [attemptId, check]);
  return (
    <Page>
      <Stack.Screen options={{ title: t.pretest }} />
      <Text accessibilityRole="header" style={styles.title}>
        {t.grading}
      </Text>
      <Text style={styles.body}>{t.gradingBody}</Text>
      <ActivityIndicator color={colors.primary} />
      <LearningError error={error} />
      <Button
        label={t.checkResult}
        busy={busy}
        onPress={() => {
          void kick();
        }}
      />
      <TextAction label={t.home} onPress={() => router.replace("/home")} />
    </Page>
  );
}
function Exam({
  initial,
  onSubmitted,
}: {
  initial: Attempt;
  onSubmitted: (a: Attempt) => void;
}) {
  const t = useLearningText(initial.kind),
    draft = useAnswers(initial),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [left, setLeft] = useState(0);
  const clock = useRef({ server: Date.parse(initial.serverTime!), at: 0 }),
    expired = useRef(false),
    onFinish = useRef(onSubmitted);
  useEffect(() => {
    onFinish.current = onSubmitted;
  }, [onSubmitted]);
  const pageRef = useRef<ScrollViewInstance>(null);
  const deadline = Date.parse(initial.expiresAt),
    questions = initial.questions ?? [],
    q = questions[index];
  const synchronize = useCallback(async () => {
    try {
      const a = await learningRepository.attempt(initial.id);
      if (a.status !== "active") onFinish.current(a);
      else if (a.serverTime)
        clock.current = {
          server: Date.parse(a.serverTime),
          at: performance.now(),
        };
    } catch (e) {
      setError(e);
    }
  }, [initial.id]);
  useEffect(() => {
    clock.current = {
      server: Date.parse(initial.serverTime!),
      at: performance.now(),
    };
    const tick = () => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (deadline -
            clock.current.server -
            (performance.now() - clock.current.at)) /
            1000,
        ),
      );
      setLeft(seconds);
      if (!seconds && !expired.current) {
        expired.current = true;
        void learningRepository
          .submit(initial.id)
          .then((a) => onFinish.current(a))
          .catch(setError);
      }
    };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000),
      poll = setInterval(() => {
        void synchronize();
      }, 15000),
      app = AppState.addEventListener("change", (state) => {
        if (state === "active") void synchronize();
      });
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      clearInterval(poll);
      app.remove();
    };
  }, [deadline, initial.id, initial.serverTime, synchronize]);
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await draft.flush();
      onSubmitted(await learningRepository.submit(initial.id));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (!q)
    return (
      <Failure
        error={new Error("INVALID_RESPONSE")}
        retry={() => router.replace("/home")}
      />
    );
  return (
    <Page scrollRef={pageRef}>
      <Stack.Screen options={{ title: t.pretest }} />
      <View style={styles.card}>
        <Text style={styles.label}>{t.timeLeft}</Text>
        <Text accessibilityLiveRegion="none" style={styles.title}>
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </Text>
        <Text style={styles.body}>{t.once}</Text>
      </View>
      <Text style={styles.caption}>
        {t.question} {index + 1} {t.of} {questions.length}
      </Text>
      <Text accessibilityRole="header" style={styles.subtitle}>
        {q.prompt}
      </Text>
      {q.kind === "choice" ? (
        q.options?.map((o) => (
          <Radio
            key={o.id}
            selected={draft.answers[q.id] === o.id}
            label={o.text}
            disabled={busy || left <= 0}
            onPress={() => draft.change(q.id, o.id)}
          />
        ))
      ) : (
        <>
          <Text style={styles.label}>{t.dataset}</Text>
          <ScrollView horizontal>
            <Text selectable style={styles.code}>
              {
                "students(id INTEGER PRIMARY KEY, name TEXT, cohort INTEGER)\n1 | Alya | 2025\n2 | Bima | 2024\n3 | Citra | 2025"
              }
            </Text>
          </ScrollView>
          <Field
            label={t.sqlAnswer}
            value={draft.answers[q.id] ?? ""}
            onChangeText={(value) => draft.change(q.id, value)}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={4096}
            editable={!busy && left > 0}
            style={[
              styles.code,
              {
                minHeight: 144,
                textAlignVertical: "top",
                padding: 12,
                borderWidth: 1,
                borderColor: colors.outline,
                borderRadius: 12,
                backgroundColor: colors.surface,
              },
            ]}
          />
        </>
      )}
      <Text accessibilityLiveRegion="polite" style={styles.caption}>
        {draft.error
          ? t.saveFailed
          : draft.saving
            ? t.saving
            : draft.dirty
              ? t.unsaved
              : t.saved}
      </Text>
      <LearningError error={draft.error ?? error} />
      {draft.error ? (
        <TextAction label={t.reload} onPress={() => router.replace("/home")} />
      ) : null}
      {draft.error ? (
        <Button
          label={t.retrySave}
          onPress={() => {
            void draft.flush().catch(() => undefined);
          }}
        />
      ) : null}
      <View style={styles.column}>
        <TextAction
          label={t.previous}
          disabled={index === 0 || busy}
          onPress={() => {
            setIndex(index - 1);
            pageRef.current?.scrollTo({ y: 0, animated: false });
          }}
        />
        <TextAction
          label={t.next}
          disabled={index === questions.length - 1 || busy}
          onPress={() => {
            setIndex(index + 1);
            pageRef.current?.scrollTo({ y: 0, animated: false });
          }}
        />
      </View>
      <Button
        label={t.submit}
        busy={busy}
        disabled={left <= 0}
        onPress={() =>
          Alert.alert(t.submitTitle, t.submitBody, [
            { text: t.cancel, style: "cancel" },
            {
              text: t.submit,
              onPress: () => {
                void submit();
              },
            },
          ])
        }
      />
    </Page>
  );
}
