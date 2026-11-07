import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { RequireAccount, Field, TextAction } from "@/components/AccountUI";
import { useResource } from "@/features/account/useResource";
import { useLocale } from "@/localization/LocaleProvider";
import { Loading, Radio, styles } from "@/features/learning/UI";
import {
  attendanceRepository,
  type AttendanceState,
  type RecordDetail,
} from "@/features/attendance/repository";
import { AttendanceError, useAttendanceText } from "@/features/attendance/UI";
export default function Screen() {
  return (
    <RequireAccount complete>
      <RecordScreen />
    </RequireAccount>
  );
}
function RecordScreen() {
  const { id, studentId } = useLocalSearchParams<{
      id: string;
      studentId: string;
    }>(),
    t = useAttendanceText(),
    r = useResource(
      useCallback(
        () => attendanceRepository.record(id, studentId),
        [id, studentId],
      ),
    );
  if (r.loading) return <Loading />;
  return r.data ? (
    <Editor
      key={`${studentId}-${r.data.session.id}`}
      id={id}
      studentId={studentId}
      data={r.data}
      update={r.setData}
      refresh={r.refresh}
    />
  ) : (
    <Page>
      <AttendanceError error={r.error} />
      <Button label={t.retry} onPress={r.refresh} />
    </Page>
  );
}
function Editor({
  id,
  studentId,
  data,
  update,
  refresh,
}: {
  id: string;
  studentId: string;
  data: RecordDetail;
  update: (v: RecordDetail) => void;
  refresh: () => void;
}) {
  const t = useAttendanceText(),
    { locale } = useLocale();
  const [state, setState] = useState<AttendanceState | null>(
      data.record?.state ?? null,
    ),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [saved, setSaved] = useState(false),
    [audit, setAudit] = useState(data.audit),
    [cursor, setCursor] = useState(data.nextCursor);
  async function save() {
    if (!state) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const v = await attendanceRepository.correct(
        id,
        studentId,
        state,
        reason.trim(),
        data.record?.revision ?? 0,
      );
      update(v);
      setAudit(v.audit);
      setCursor(v.nextCursor);
      setSaved(true);
      setReason("");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function more() {
    if (!cursor) return;
    setBusy(true);
    setError(null);
    try {
      const v = await attendanceRepository.record(id, studentId, cursor);
      setAudit((a) => [...a, ...v.audit]);
      setCursor(v.nextCursor);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const conflict =
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "REVISION_CONFLICT";
  return (
    <Page>
      <Stack.Screen options={{ title: t.state }} />
      <Text style={styles.title}>{data.name}</Text>
      <Text style={styles.body}>{data.session.title}</Text>
      <Text style={styles.label}>
        {t.current}: {data.record ? t[data.record.state] : t.unrecorded}
      </Text>
      <AttendanceError error={error} />
      {saved ? (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {t.saved}
        </Text>
      ) : null}
      {data.archived ? (
        <Text style={styles.body}>{t.archived}</Text>
      ) : (
        <View style={styles.section}>
          <Text style={styles.subtitle}>{t.select}</Text>
          {(["present", "absent", "excused", "sick"] as const).map((v) => (
            <Radio
              key={v}
              label={t[v]}
              selected={state === v}
              disabled={busy || conflict}
              onPress={() => {
                setState(v);
                setSaved(false);
              }}
            />
          ))}
          <Field
            label={t.reason}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={500}
            editable={!busy && !conflict}
          />
          <Button
            label={t.save}
            busy={busy}
            disabled={!state || reason.trim().length < 3 || conflict}
            onPress={() => void save()}
          />
        </View>
      )}
      <Text style={styles.subtitle}>{t.audit}</Text>
      {audit.length ? (
        audit.map((a) => (
          <View key={a.id} style={styles.section}>
            <Text style={styles.label}>
              {a.old_state ? t[a.old_state] : t.unrecorded} → {t[a.new_state]}
            </Text>
            <Text style={styles.body}>{a.reason}</Text>
            <Text style={styles.caption}>
              {new Date(a.created_at).toLocaleString(locale)}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.body}>{t.noAudit}</Text>
      )}
      {cursor ? (
        <Button label={t.more} busy={busy} onPress={() => void more()} />
      ) : null}
      <TextAction label={t.refresh} onPress={refresh} />
    </Page>
  );
}
