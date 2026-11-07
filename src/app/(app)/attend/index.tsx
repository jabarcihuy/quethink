import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { LearningArt } from "@/components/LearningArt";
import {
  TonalPanel,
  SectionHeading,
  DestinationRow,
  classroomStyles,
  useVisualText,
} from "@/components/ClassroomUI";
import { colors } from "@/theme/tokens";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { RequireAccount, TextAction } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { accountRepository } from "@/features/account/repository";
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
      <Attendance />
    </RequireAccount>
  );
}
function Attendance() {
  const teacher = useAuth().profile?.role === "teacher";
  return teacher ? <Classes /> : <Sessions />;
}
function Classes() {
  const t = useAttendanceText(),
    v = useVisualText(),
    r = useResource(useCallback(() => accountRepository.classes(), []));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function more() {
    if (!r.data?.nextCursor) return;
    setBusy(true);
    setError(null);
    try {
      const n = await accountRepository.classes(r.data.nextCursor);
      r.setData((v) =>
        v ? { data: [...v.data, ...n.data], nextCursor: n.nextCursor } : n,
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (r.loading) return <Loading />;
  return (
    <Page>
      <Text accessibilityRole="header" style={classroomStyles.headline}>
        {t.title}
      </Text>
      <View style={classroomStyles.header}>
        <View style={classroomStyles.grow}>
          <Text style={styles.body}>{v.teacherAttendance}</Text>
        </View>
        <LearningArt name="attend" size={96} />
      </View>
      <SectionHeading>{t.choose}</SectionHeading>
      <AttendanceError error={r.error || error} />
      {r.error ? <Button label={t.retry} onPress={r.refresh} /> : null}
      <View style={classroomStyles.group}>
        {r.data?.data.map((c) => (
          <DestinationRow
            key={c.id}
            title={c.name}
            subtitle={c.status === "archived" ? t.archived : t.history}
            icon="qr"
            tone="mint"
            onPress={() =>
              router.push({
                pathname: "/attendance-class/[id]",
                params: { id: c.id },
              })
            }
          />
        ))}
      </View>
      {!r.error && !r.data?.data.length ? (
        <Text style={styles.body}>{t.empty}</Text>
      ) : null}
      {r.data?.nextCursor ? (
        <Button label={t.more} busy={busy} onPress={() => void more()} />
      ) : null}
    </Page>
  );
}
function Sessions() {
  const t = useAttendanceText(),
    v = useVisualText(),
    r = useResource(useCallback(() => attendanceRepository.list(), []));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function more() {
    if (!r.data?.nextCursor) return;
    setBusy(true);
    setError(null);
    try {
      const n = await attendanceRepository.list(undefined, r.data.nextCursor);
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
      <Text accessibilityRole="header" style={classroomStyles.headline}>
        {v.attendanceTitle}
      </Text>
      <AttendanceError error={r.error || error} />
      {r.data?.class?.status === "archived" ? (
        <Text style={styles.body}>{t.archived}</Text>
      ) : r.data?.class ? (
        <TonalPanel tone="mint">
          <View style={classroomStyles.header}>
            <View style={classroomStyles.grow}>
              <Text style={styles.subtitle}>{r.data.class.name}</Text>
            </View>
            <LearningArt name="attend" size={96} />
          </View>
          <Text style={[styles.body, { color: colors.success }]}>
            {v.attendanceBody}
          </Text>
          <Button
            label={t.scan}
            onPress={() => router.push("/attendance-scan")}
          />
        </TonalPanel>
      ) : !r.error ? (
        <Text style={styles.body}>{t.noClass}</Text>
      ) : null}
      <View style={styles.section}>
        <SectionHeading>{t.history}</SectionHeading>
        {r.data?.items.length ? (
          <SessionRows items={r.data.items} />
        ) : !r.error ? (
          <Text style={styles.body}>{t.empty}</Text>
        ) : null}
      </View>
      {r.data?.nextCursor ? (
        <Button label={t.more} busy={busy} onPress={() => void more()} />
      ) : null}
      <TextAction label={t.refresh} onPress={r.refresh} />
    </Page>
  );
}
