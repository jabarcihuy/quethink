import { useCallback, useState } from "react";
import { Text, Pressable } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { RequireAccount, TextAction } from "@/components/AccountUI";
import { useResource } from "@/features/account/useResource";
import { Loading, styles } from "@/features/learning/UI";
import { attendanceRepository } from "@/features/attendance/repository";
import {
  AttendanceError,
  attendanceStyles,
  useAttendanceText,
} from "@/features/attendance/UI";
export default function Screen() {
  return (
    <RequireAccount complete>
      <Roster />
    </RequireAccount>
  );
}
function Roster() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    t = useAttendanceText(),
    r = useResource(useCallback(() => attendanceRepository.roster(id), [id]));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function more() {
    if (!r.data?.nextCursor) return;
    setBusy(true);
    setError(null);
    try {
      const n = await attendanceRepository.roster(id, r.data.nextCursor);
      r.setData((v) => (v ? { ...n, items: [...v.items, ...n.items] } : n));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (r.loading) return <Loading />;
  return (
    <Page>
      <Stack.Screen options={{ title: t.roster }} />
      <Text style={styles.title}>{r.data?.session.title ?? t.roster}</Text>
      <AttendanceError error={r.error || error} />
      {r.data?.archived ? <Text style={styles.body}>{t.archived}</Text> : null}
      {r.data?.items.map((s) => (
        <Pressable
          key={s.id}
          style={attendanceStyles.row}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/attendance-record/[id]",
              params: { id, studentId: s.id },
            })
          }
        >
          <Text style={styles.subtitle}>{s.name}</Text>
          <Text style={styles.caption}>{s.nim}</Text>
          <Text style={styles.label}>
            {s.state ? t[s.state] : t.unrecorded}
            {s.source ? ` · ${s.source === "qr" ? t.qr : t.manual}` : ""}
          </Text>
        </Pressable>
      ))}
      {r.data && !r.data.items.length ? (
        <Text style={styles.body}>{t.empty}</Text>
      ) : null}
      {r.data?.nextCursor ? (
        <Button label={t.more} busy={busy} onPress={() => void more()} />
      ) : null}
      <TextAction label={t.refresh} onPress={r.refresh} />
    </Page>
  );
}
