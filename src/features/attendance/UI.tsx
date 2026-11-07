import { Text, View, StyleSheet } from "react-native";
import { DestinationRow, classroomStyles } from "@/components/ClassroomUI";
import { useAuth } from "@/features/account/AuthProvider";
import { router } from "expo-router";
import { useLocale } from "@/localization/LocaleProvider";
import { attendanceMessages } from "@/localization/attendance";
import { LearningError, styles } from "@/features/learning/UI";
import { colors } from "@/theme/tokens";
import type { AttendanceSession } from "./repository";
export const useAttendanceText = () => attendanceMessages[useLocale().locale];
export function AttendanceError({ error }: { error: unknown }) {
  const t = useAttendanceText();
  return <LearningError error={error} messages={t.errors} />;
}
export function SessionRows({ items }: { items: AttendanceSession[] }) {
  const teacher = useAuth().profile?.role === "teacher";
  const t = useAttendanceText(),
    { locale } = useLocale();
  return (
    <View style={classroomStyles.group}>
      {items.map((s) => (
        <DestinationRow
          key={s.id}
          title={s.title}
          subtitle={`${new Date(s.startsAt).toLocaleString(locale)} · ${t[s.status]}`}
          icon={s.record ? "check" : "qr"}
          tone={s.record ? "mint" : "lavender"}
          onPress={() =>
            router.push({
              pathname: "/attendance-session/[id]",
              params: { id: s.id },
            })
          }
          trailing={
            s.record ? (
              <Text style={styles.label}>
                {t[s.record.state]} ·{" "}
                {s.record.source === "qr" ? t.qr : t.manual}
              </Text>
            ) : !teacher ? (
              <Text style={styles.caption}>{t.unrecorded}</Text>
            ) : undefined
          }
        />
      ))}
    </View>
  );
}
export const attendanceStyles = StyleSheet.create({
  row: {
    minHeight: 72,
    paddingVertical: 16,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  qr: { alignItems: "center", paddingVertical: 24, gap: 16 },
  camera: {
    width: "100%",
    height: 320,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.onSurface,
  },
  success: {
    backgroundColor: colors.successContainer,
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
});
