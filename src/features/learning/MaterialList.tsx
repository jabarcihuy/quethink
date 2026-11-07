import { useCallback } from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { LearningArt } from "@/components/LearningArt";
import { Page } from "@/components/Page";
import { TextAction } from "@/components/AccountUI";
import { Icon } from "@/components/Icon";
import {
  ProgressTrack,
  SectionHeading,
  classroomStyles,
  useVisualText,
} from "@/components/ClassroomUI";
import { colors, radius, type } from "@/theme/tokens";
import { useResource } from "@/features/account/useResource";
import { learningRepository } from "./repository";
import { useLearningText, Loading, Failure, styles } from "./UI";
export function MaterialList({ classId }: { classId?: string }) {
  const t = useLearningText(),
    v = useVisualText(),
    r = useResource(
      useCallback(() => learningRepository.materials(classId), [classId]),
    );
  if (r.loading) return <Loading />;
  if (r.error) return <Failure error={r.error} retry={r.refresh} />;
  const completed = r.data?.filter((m) => m.completed).length ?? 0;
  return (
    <Page>
      <View style={classroomStyles.header}>
        <View style={classroomStyles.grow}>
          <Text accessibilityRole="header" style={classroomStyles.headline}>
            {classId ? t.materials : v.path}
          </Text>
        </View>
        <LearningArt name="learn" size={96} />
      </View>
      <Text style={styles.body}>{t.materialBody}</Text>
      {!classId && r.data?.length ? (
        <ProgressTrack
          value={completed}
          total={r.data.length}
          label={t.progress}
        />
      ) : null}
      {classId ? (
        <TextAction
          label={t.addMaterial}
          onPress={() =>
            router.push({
              pathname: "/new-material/[id]",
              params: { id: classId },
            })
          }
        />
      ) : null}
      {!r.data?.length ? (
        <Text style={styles.body}>{t.noMaterials}</Text>
      ) : null}
      {!classId ? <SectionHeading>{t.materials}</SectionHeading> : null}
      <View style={s.path}>
        {r.data?.map((m, index) => (
          <View key={m.id} style={s.step}>
            <View style={s.rail}>
              <View
                style={[
                  s.node,
                  {
                    backgroundColor: m.completed
                      ? colors.success
                      : m.available
                        ? colors.primary
                        : colors.primaryContainer,
                  },
                ]}
              >
                {m.completed ? (
                  <Icon name="check" color={colors.onPrimary} size={20} />
                ) : (
                  <Text
                    style={[
                      s.number,
                      {
                        color: m.available ? colors.onPrimary : colors.primary,
                      },
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              {index < (r.data?.length ?? 0) - 1 ? (
                <View style={s.line} />
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${m.title}. ${m.completed ? t.completed : m.available ? t.available : t.locked}`}
              accessibilityState={{ disabled: !m.available }}
              disabled={!m.available}
              onPress={() =>
                router.push({
                  pathname: "/material/[id]",
                  params: { id: m.id },
                })
              }
              android_ripple={{ color: colors.primaryContainer }}
              style={({ pressed }) => [
                s.lesson,
                m.available && !m.completed ? s.current : null,
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <View style={styles.row}>
                <Text style={[styles.subtitle, { flex: 1 }]}>{m.title}</Text>
                <Icon
                  name={m.available ? "chevron" : "lock"}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: m.completed ? colors.success : colors.primary },
                ]}
              >
                {m.completed
                  ? t.completed
                  : m.available
                    ? t.available
                    : t.locked}
                {m.requiresLab ? " · " + t.practice : ""}
              </Text>
              {!m.available ? (
                <Text style={styles.caption}>
                  {m.position === 1 ? t.lockedPretest : t.lockedPrevious}
                </Text>
              ) : null}
            </Pressable>
          </View>
        ))}
      </View>
    </Page>
  );
}
const s = StyleSheet.create({
  path: { gap: 0 },
  step: { flexDirection: "row", gap: 12 },
  rail: { width: 36, alignItems: "center" },
  node: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  number: { ...type.label, fontWeight: "700" },
  line: { width: 2, backgroundColor: colors.outline, flex: 1, minHeight: 40 },
  lesson: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.surface,
    padding: 16,
    gap: 10,
    marginBottom: 16,
    minHeight: 112,
  },
  current: { backgroundColor: colors.primaryContainer },
});
