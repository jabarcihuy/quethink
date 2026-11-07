import { Text, View } from "react-native";
import { LearningArt } from "@/components/LearningArt";
import { Button } from "@/components/Button";
import { useLocale } from "@/localization/LocaleProvider";
import { colors } from "@/theme/tokens";
import { styles } from "@/features/learning/UI";
import { attendanceStyles, useAttendanceText } from "./UI";
import type { AttendanceSession } from "./repository";
export function AttendanceReceipt({
  session,
  title,
  onDone,
  doneLabel,
}: {
  session: AttendanceSession;
  title: string;
  onDone: () => void;
  doneLabel: string;
}) {
  const t = useAttendanceText(),
    { locale } = useLocale();
  return (
    <View style={attendanceStyles.success}>
      <View style={{ alignItems: "center" }}>
        <LearningArt name="attend" size={112} />
      </View>
      <Text
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={[styles.title, { textAlign: "center", color: colors.success }]}
      >
        {title}
      </Text>
      <Text
        style={[styles.body, { textAlign: "center", color: colors.success }]}
      >
        {session.title}
      </Text>
      <Text
        style={[
          styles.subtitle,
          { textAlign: "center", color: colors.success },
        ]}
      >
        {session.record ? t[session.record.state] : t.unrecorded}
      </Text>
      {session.record ? (
        <>
          <Text
            style={[
              styles.caption,
              { textAlign: "center", color: colors.success },
            ]}
          >
            {session.record.source === "qr" ? t.qr : t.manual}
          </Text>
          <Text
            style={[
              styles.caption,
              { textAlign: "center", color: colors.success },
            ]}
          >
            {new Date(session.record.updated_at).toLocaleString(locale)}
          </Text>
        </>
      ) : null}
      <Button label={doneLabel} onPress={onDone} />
    </View>
  );
}
