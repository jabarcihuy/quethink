import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { RequireAccount, Field, TextAction } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useResource } from "@/features/account/useResource";
import { Loading, styles } from "@/features/learning/UI";
import { attendanceRepository } from "@/features/attendance/repository";
import {
  AttendanceError,
  SessionRows,
  useAttendanceText,
} from "@/features/attendance/UI";
export default function Screen() {
  return (
    <RequireAccount complete>
      <Sessions />
    </RequireAccount>
  );
}
function Sessions() {
  const teacher = useAuth().profile?.role === "teacher";
  const { id } = useLocalSearchParams<{ id: string }>(),
    t = useAttendanceText(),
    r = useResource(useCallback(() => attendanceRepository.list(id), [id]));
  const [title, setTitle] = useState(""),
    [minutes, setMinutes] = useState("15"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function start() {
    setBusy(true);
    setError(null);
    try {
      const n = await attendanceRepository.start(
        id,
        title.trim(),
        Number(minutes),
      );
      router.push({
        pathname: "/attendance-session/[id]",
        params: { id: n.session.id },
      });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function more() {
    if (!r.data?.nextCursor) return;
    setBusy(true);
    setError(null);
    try {
      const n = await attendanceRepository.list(id, r.data.nextCursor);
      r.setData((v) => (v ? { ...n, items: [...v.items, ...n.items] } : n));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (!teacher)
    return (
      <Page>
        <AttendanceError error={{ code: "FORBIDDEN" }} />
      </Page>
    );
  if (r.loading) return <Loading />;
  const activeSession = r.data?.items.find((s) => s.status === "active");
  return (
    <Page>
      <Stack.Screen options={{ title: t.title }} />
      <Text style={styles.title}>{r.data?.class?.name ?? t.title}</Text>
      <AttendanceError error={r.error || error} />
      {r.data?.class?.status === "active" && activeSession ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>{activeSession.title}</Text>
          <Button
            label={t.viewSession}
            onPress={() =>
              router.push({
                pathname: "/attendance-session/[id]",
                params: { id: activeSession.id },
              })
            }
          />
        </View>
      ) : r.data?.class?.status === "active" ? (
        <View style={styles.section}>
          <Text style={styles.subtitle}>{t.start}</Text>
          <Field
            label={t.sessionTitle}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <Field
            label={t.minutes}
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Button
            label={t.open}
            busy={busy}
            disabled={
              !title.trim() ||
              !/^\d+$/.test(minutes) ||
              Number(minutes) < 1 ||
              Number(minutes) > 180 ||
              r.data.items.some((s) => s.status === "active")
            }
            onPress={() => void start()}
          />
        </View>
      ) : r.data?.class ? (
        <Text style={styles.body}>{t.archived}</Text>
      ) : null}
      <Text style={styles.subtitle}>{t.history}</Text>
      <SessionRows items={r.data?.items ?? []} />
      {!r.error && !r.data?.items.length ? (
        <Text style={styles.body}>{t.empty}</Text>
      ) : null}
      {r.data?.nextCursor ? (
        <Button label={t.more} busy={busy} onPress={() => void more()} />
      ) : null}
      <TextAction label={t.refresh} onPress={r.refresh} />
    </Page>
  );
}
