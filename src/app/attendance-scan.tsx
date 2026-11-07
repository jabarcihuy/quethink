import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Text, View } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { AttendanceReceipt } from "@/features/attendance/AttendanceReceipt";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { RequireAccount, TextAction } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { styles } from "@/features/learning/UI";
import { AccountError } from "@/features/account/repository";
import {
  attendanceRepository,
  type AttendanceSession,
} from "@/features/attendance/repository";
import { parseAttendanceQR } from "@/features/attendance/qr";
import {
  AttendanceError,
  attendanceStyles,
  useAttendanceText,
} from "@/features/attendance/UI";
export default function Screen() {
  return (
    <RequireAccount complete>
      <Scanner />
    </RequireAccount>
  );
}
function Scanner() {
  const t = useAttendanceText(),
    teacher = useAuth().profile?.role !== "student",
    [permission, requestPermission, getPermission] = useCameraPermissions();
  const [active, setActive] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [cameraError, setCameraError] = useState(false),
    [cameraReady, setCameraReady] = useState(false),
    [cameraVersion, setCameraVersion] = useState(0),
    [result, setResult] = useState<{
      session: AttendanceSession;
      alreadyRecorded: boolean;
    } | null>(null);
  const locked = useRef(false),
    mounted = useRef(false),
    focusVersion = useRef(0);
  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      focusVersion.current++;
      locked.current = false;
      setBusy(false);
      setCameraReady(false);
      setError(null);
      setActive(AppState.currentState === "active");
      void getPermission().catch(() => undefined);
      const sub = AppState.addEventListener("change", (v) => {
        setCameraReady(false);
        setActive(v === "active");
        if (v === "active") void getPermission().catch(() => undefined);
      });
      return () => {
        mounted.current = false;
        focusVersion.current++;
        setActive(false);
        sub.remove();
      };
    }, [getPermission]),
  );
  useEffect(() => {
    if (
      !active ||
      !permission?.granted ||
      cameraReady ||
      cameraError ||
      error ||
      result
    )
      return;
    const timer = setTimeout(() => {
      locked.current = true;
      setCameraError(true);
    }, 20000);
    return () => clearTimeout(timer);
  }, [active, permission?.granted, cameraReady, cameraError, error, result]);
  async function scan(value: string) {
    if (locked.current || !active || AppState.currentState !== "active") return;
    const current = focusVersion.current;
    locked.current = true;
    setBusy(true);
    setError(null);
    const parsed = parseAttendanceQR(value);
    try {
      if (!parsed) throw new AccountError("INVALID_QR");
      const next = await attendanceRepository.scan(
        parsed.sessionId,
        parsed.token,
      );
      if (mounted.current && current === focusVersion.current) setResult(next);
    } catch (e) {
      if (mounted.current && current === focusVersion.current) setError(e);
    } finally {
      if (mounted.current && current === focusVersion.current) setBusy(false);
    }
  }
  function retry() {
    locked.current = false;
    setCameraError(false);
    setCameraReady(false);
    setError(null);
    setCameraVersion((v) => v + 1);
  }
  if (teacher)
    return (
      <Page>
        <AttendanceError error={{ code: "FORBIDDEN" }} />
      </Page>
    );
  return (
    <Page>
      <Stack.Screen options={{ title: t.scan }} />
      {result ? (
        <AttendanceReceipt
          session={result.session}
          title={result.alreadyRecorded ? t.duplicate : t.success}
          onDone={() =>
            router.replace({
              pathname: "/attendance-session/[id]",
              params: { id: result.session.id },
            })
          }
          doneLabel={t.done}
        />
      ) : (
        <>
          <Text style={styles.title}>{t.cameraTitle}</Text>
          <AttendanceError error={error} />
          {permission?.granted ? (
            <>
              {cameraError ? (
                <Text style={styles.body}>{t.cameraFailed}</Text>
              ) : active && !error ? (
                <View style={attendanceStyles.camera}>
                  <CameraView
                    key={cameraVersion}
                    style={{ flex: 1 }}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={
                      busy ? undefined : (event) => void scan(event.data)
                    }
                    onCameraReady={() => setCameraReady(true)}
                    onMountError={() => {
                      locked.current = true;
                      setCameraError(true);
                    }}
                  />
                  {!cameraReady ? (
                    <View
                      style={{
                        position: "absolute",
                        inset: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                        padding: 16,
                      }}
                    >
                      <ActivityIndicator color="#FFFFFF" />
                      <Text
                        accessibilityLiveRegion="polite"
                        style={[
                          styles.body,
                          { color: "#FFFFFF", textAlign: "center" },
                        ]}
                      >
                        {t.cameraStarting}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <Text style={styles.body}>{t.scanHint}</Text>
              {busy ? (
                <Button label={t.scan} busy onPress={() => undefined} />
              ) : error || cameraError ? (
                <Button label={t.retry} onPress={retry} />
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.body}>
                {permission?.canAskAgain === false ? t.denied : t.cameraBody}
              </Text>
              <Button
                label={permission?.canAskAgain === false ? t.settings : t.allow}
                onPress={() => {
                  setError(null);
                  void (
                    permission?.canAskAgain === false
                      ? Linking.openSettings()
                      : requestPermission()
                  ).catch(setError);
                }}
              />
            </>
          )}
          <TextAction
            label={t.cancel}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/attend")
            }
          />
        </>
      )}
    </Page>
  );
}
