import { useCallback, useState } from "react";
import { Alert, Text, View, useWindowDimensions } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { TonalPanel, classroomStyles } from "@/components/ClassroomUI";
import { AttendanceReceipt } from "@/features/attendance/AttendanceReceipt";
import { colors } from "@/theme/tokens";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { RequireAccount, TextAction } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useLocale } from "@/localization/LocaleProvider";
import { useResource } from "@/features/account/useResource";
import { Loading, styles } from "@/features/learning/UI";
import {
  attendanceRepository,
  type SessionDetail,
} from "@/features/attendance/repository";
import {
  AttendanceError,
  attendanceStyles,
  useAttendanceText,
} from "@/features/attendance/UI";
import { useLiveQR } from "@/features/attendance/useLiveQR";
export default function Screen() {
  return (
    <RequireAccount complete>
      <Session />
    </RequireAccount>
  );
}
function Session() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    t = useAttendanceText(),
    { locale } = useLocale(),
    teacher = useAuth().profile?.role === "teacher",
    width = useWindowDimensions().width;
  const r = useResource(
    useCallback(() => attendanceRepository.session(id), [id]),
  );
  const setData = r.setData;
  const onSession = useCallback((v: SessionDetail) => setData(v), [setData]);
  const qr = useLiveQR(
    id,
    teacher &&
      r.data?.session.status === "active" &&
      r.data.class.status === "active",
    onSession,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function close() {
    setBusy(true);
    setError(null);
    try {
      r.setData(await attendanceRepository.close(id));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (r.loading) return <Loading />;
  const s = r.data?.session;
  return (
    <Page>
      <Stack.Screen options={{ title: t.title }} />
      <AttendanceError error={r.error || error || qr.error} />
      {s ? (
        <>
          {teacher || !s.record ? (
            <TonalPanel>
              <Text style={classroomStyles.inverseTitle}>{s.title}</Text>
              <Text style={classroomStyles.inverseBody}>
                {r.data?.class.name} · {t[s.status]}
              </Text>
              <Text style={classroomStyles.inverseBody}>
                {t.ends}: {new Date(s.expiresAt).toLocaleString(locale)}
              </Text>
            </TonalPanel>
          ) : null}
          {r.data?.class.status === "archived" ? (
            <Text style={styles.body}>{t.archived}</Text>
          ) : null}
          {teacher ? (
            <>
              {s.status === "active" && r.data?.class.status === "active" ? (
                <>
                  <View
                    style={attendanceStyles.qr}
                    accessible
                    accessibilityLabel={t.rotating}
                  >
                    {qr.value ? (
                      <QRCode
                        value={qr.value}
                        size={Math.max(160, Math.min(248, width - 112))}
                        quietZone={16}
                        color="#24243A"
                        backgroundColor="#FFFFFF"
                      />
                    ) : (
                      <Text style={styles.body}>
                        {qr.error ? t.qrStale : t.qrLoading}
                      </Text>
                    )}
                    {qr.value ? (
                      <Text style={styles.label}>
                        {t.codeEnds} {qr.seconds} {t.seconds}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.body}>{t.rotating}</Text>
                  <TextAction label={t.refresh} onPress={qr.refresh} />
                  <TextAction
                    disabled={busy}
                    label={t.close}
                    onPress={() =>
                      Alert.alert(t.close, t.closeBody, [
                        { text: t.cancel, style: "cancel" },
                        {
                          text: t.close,
                          style: "destructive",
                          onPress: () => void close(),
                        },
                      ])
                    }
                  />
                </>
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {r.data?.counts
                  ? (["present", "absent", "excused", "sick"] as const).map(
                      (state) => (
                        <View
                          key={state}
                          style={{
                            flexGrow: 1,
                            flexBasis: 120,
                            padding: 16,
                            borderRadius: 12,
                            backgroundColor:
                              state === "present"
                                ? colors.successContainer
                                : colors.surface,
                            gap: 4,
                          }}
                        >
                          <Text style={styles.title}>
                            {r.data!.counts![state]}
                          </Text>
                          <Text
                            style={[
                              styles.caption,
                              state === "present" && { color: colors.success },
                            ]}
                          >
                            {t[state]}
                          </Text>
                        </View>
                      ),
                    )
                  : null}
              </View>
              <Button
                label={t.roster}
                onPress={() =>
                  router.push({
                    pathname: "/attendance-roster/[id]",
                    params: { id },
                  })
                }
              />
            </>
          ) : s.record ? (
            <AttendanceReceipt
              session={s}
              title={t.current}
              onDone={() => router.navigate("/attend")}
              doneLabel={t.history}
            />
          ) : (
            <View style={styles.section}>
              <Text style={styles.subtitle}>{t.unrecorded}</Text>
              {s.status === "active" && r.data?.class.status === "active" ? (
                <Button
                  label={t.scan}
                  onPress={() => router.push("/attendance-scan")}
                />
              ) : null}
            </View>
          )}
        </>
      ) : null}
      <TextAction label={t.refresh} onPress={r.refresh} />
    </Page>
  );
}
