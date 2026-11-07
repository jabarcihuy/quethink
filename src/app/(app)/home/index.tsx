import { useCallback, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { LearningArt } from "@/components/LearningArt";
import { Icon } from "@/components/Icon";
import {
  IconBadge,
  TonalPanel,
  SectionHeading,
  ProgressTrack,
  DestinationRow,
  classroomStyles,
  useVisualText,
} from "@/components/ClassroomUI";
import { colors } from "@/theme/tokens";
import { MenuGrid } from "@/components/MenuGrid";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { TextAction } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useResource } from "@/features/account/useResource";
import { accountRepository } from "@/features/account/repository";
import { learningRepository } from "@/features/learning/repository";
import {
  useLearningText,
  useCycleText,
  Loading,
  Failure,
  LearningError,
  styles,
} from "@/features/learning/UI";
export default function Home() {
  return useAuth().profile?.role === "teacher" ? (
    <TeacherOverview />
  ) : (
    <StudentHome />
  );
}
function TeacherOverview() {
  const t = useLearningText(),
    v = useVisualText(),
    auth = useAuth();
  const r = useResource(useCallback(() => accountRepository.classes(), []));
  if (r.loading) return <Loading />;
  if (r.error) return <Failure error={r.error} retry={r.refresh} />;
  return (
    <Page>
      <View style={classroomStyles.header}>
        <View style={classroomStyles.grow}>
          <Text accessibilityRole="header" style={classroomStyles.headline}>
            {`${v.hello}, ${auth.profile?.displayName?.trim().split(/\s+/)[0] ?? ""}.`}
          </Text>
        </View>
        <IconBadge name="users" tone="apricot" />
      </View>
      <TonalPanel>
        <View style={classroomStyles.header}>
          <View style={classroomStyles.grow}>
            <Text style={classroomStyles.inverseTitle}>{v.teacherHome}</Text>
            <Text style={classroomStyles.inverseBody}>{t.manage}</Text>
          </View>
          <LearningArt name="learn" size={112} />
        </View>
      </TonalPanel>
      <MenuGrid
        items={[
          {
            key: "classes",
            label: t.classes,
            icon: "users",
            tone: "apricot",
            onPress: () => router.navigate("/classes"),
          },
          {
            key: "attendance",
            label: t.attend,
            icon: "qr",
            tone: "mint",
            onPress: () => router.navigate("/attend"),
          },
        ]}
      />
      <DestinationRow
        title={v.tutor}
        subtitle={v.tutorHelp}
        icon="chat"
        onPress={() => router.push("/ai-tutor")}
      />
      <SectionHeading>{t.classes}</SectionHeading>
      {!r.data?.data.length ? (
        <Text style={styles.body}>{t.noTeacherClasses}</Text>
      ) : null}
      <View style={classroomStyles.group}>
        {r.data?.data.map((c) => (
          <DestinationRow
            key={c.id}
            title={c.name}
            subtitle={c.status === "archived" ? t.archived : t.manage}
            icon="users"
            onPress={() =>
              router.push({ pathname: "/course/[id]", params: { id: c.id } })
            }
          />
        ))}
      </View>
    </Page>
  );
}
function StudentHome() {
  const { width, fontScale } = useWindowDimensions();
  const t = useLearningText(),
    c = useCycleText(),
    v = useVisualText(),
    auth = useAuth();
  const r = useResource(useCallback(() => learningRepository.status(), []));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function start(kind: "PRETEST" | "POSTTEST" = "PRETEST") {
    setBusy(true);
    setError(null);
    try {
      const a = await learningRepository.start(kind);
      router.push({
        pathname: a.status === "completed" ? "/result/[id]" : "/attempt/[id]",
        params: { id: a.id },
      });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (r.loading) return <Loading />;
  if (r.error) return <Failure error={r.error} retry={r.refresh} />;
  const s = r.data;
  return (
    <Page>
      <View style={classroomStyles.header}>
        <View style={classroomStyles.grow}>
          <Text accessibilityRole="header" style={classroomStyles.headline}>
            {`${v.hello}, ${auth.profile?.displayName?.trim().split(/\s+/)[0] ?? ""}.`}
          </Text>
        </View>
        <IconBadge name="database" tone="apricot" />
      </View>
      {!s ? (
        <>
          <TonalPanel tone="apricot">
            <View style={classroomStyles.header}>
              <View style={classroomStyles.grow}>
                <Text style={styles.warmTitle}>{t.noClass}</Text>
              </View>
              <LearningArt name="study" size={96} />
            </View>
            <Button label={t.join} onPress={() => router.push("/join")} />
          </TonalPanel>
        </>
      ) : (
        <>
          <TonalPanel>
            <View style={classroomStyles.header}>
              <View style={classroomStyles.grow}>
                <Text style={classroomStyles.inverseTitle}>{s.class.name}</Text>
                <Text style={classroomStyles.inverseBody}>
                  {s.class.teacherName}
                </Text>
              </View>
              {width >= 350 && fontScale < 1.25 ? (
                <LearningArt name="study" size={104} />
              ) : null}
            </View>
            {s.class.status === "archived" ? (
              <Text style={classroomStyles.inverseBody}>{t.archived}</Text>
            ) : null}
          </TonalPanel>

          {s.class.status === "archived" ? (
            <Text style={styles.body}>{t.archiveBody}</Text>
          ) : null}
          {!s.attempt && s.class.status === "active" ? (
            <View style={[styles.card, styles.warm, { padding: 20, gap: 12 }]}>
              <View style={classroomStyles.header}>
                <IconBadge name="list" tone="inverse" />
                <Text
                  accessibilityRole="header"
                  style={[styles.warmTitle, { flex: 1 }]}
                >
                  {t.pretest}
                </Text>
              </View>
              <Text
                style={[styles.caption, { color: colors.onSecondaryContainer }]}
              >
                {t.intro}
              </Text>
              <Text
                style={[styles.caption, { color: colors.onSecondaryContainer }]}
              >
                {t.once}
              </Text>
              <View style={classroomStyles.meta}>
                <View style={classroomStyles.metaItem}>
                  <Icon
                    name="clock"
                    size={18}
                    color={colors.onSecondaryContainer}
                  />
                  <Text style={styles.warmBody}>
                    {s.pretestMinutes} {v.minutes}
                  </Text>
                </View>
                <View style={classroomStyles.metaItem}>
                  <Icon
                    name="list"
                    size={18}
                    color={colors.onSecondaryContainer}
                  />
                  <Text style={styles.warmBody}>
                    {s.questionCount} {t.questions.toLowerCase()}
                  </Text>
                </View>
              </View>
              <Button
                label={t.start}
                busy={busy}
                onPress={() => {
                  void start();
                }}
              />
            </View>
          ) : null}
          {s.attempt ? (
            <>
              <SectionHeading>{v.progress}</SectionHeading>
              <ProgressTrack
                value={s.completedCount}
                total={s.materialCount}
                label={t.progress}
              />
              {s.attempt.status === "completed" ? (
                <>
                  <Text style={styles.body}>
                    {t.score}: {s.attempt.score}/100
                  </Text>
                  <Button
                    label={
                      s.completedCount === s.materialCount &&
                      s.materialCount > 0
                        ? c.reviewMaterials
                        : t.continue
                    }
                    onPress={() => router.navigate("/learn")}
                  />
                  {s.posttest?.status !== "completed" ? (
                    <TextAction
                      label={t.viewResult}
                      onPress={() =>
                        router.push({
                          pathname: "/result/[id]",
                          params: { id: s.attempt!.id },
                        })
                      }
                    />
                  ) : null}
                </>
              ) : (
                <Button
                  label={
                    s.attempt.status === "active" ? t.resume : t.checkResult
                  }
                  onPress={() =>
                    router.push({
                      pathname: "/attempt/[id]",
                      params: { id: s.attempt!.id },
                    })
                  }
                />
              )}
            </>
          ) : null}
          {s.attempt?.status === "completed" ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.subtitle}>
                {c.posttest}
              </Text>
              {s.posttest ? (
                <>
                  {s.posttest.status === "completed" ? (
                    <>
                      <Text style={styles.body}>
                        {c.postScore}: {s.posttest.score}/100
                      </Text>
                      <Text style={styles.body}>
                        {c.change}:{" "}
                        {Number(s.posttest.score) - Number(s.attempt.score)}{" "}
                        {c.points}
                      </Text>
                      <Text style={styles.body}>{c.cycleDone}</Text>
                    </>
                  ) : null}
                  {s.posttest.status === "completed" ? (
                    <MenuGrid
                      items={[
                        {
                          key: "pretest",
                          label: t.results,
                          icon: "check",
                          onPress: () =>
                            router.push({
                              pathname: "/result/[id]",
                              params: { id: s.attempt!.id },
                            }),
                        },
                        {
                          key: "posttest",
                          label: c.postResults,
                          icon: "check",
                          onPress: () =>
                            router.push({
                              pathname: "/result/[id]",
                              params: { id: s.posttest!.id },
                            }),
                        },
                      ]}
                    />
                  ) : (
                    <Button
                      label={
                        s.posttest.status === "active"
                          ? c.resumePost
                          : t.checkResult
                      }
                      onPress={() =>
                        router.push({
                          pathname: "/attempt/[id]",
                          params: { id: s.posttest!.id },
                        })
                      }
                    />
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.body}>
                    {s.posttestAvailable ? c.postIntro : c.postLocked}
                  </Text>
                  <Text style={styles.caption}>
                    {s.posttestMinutes} {t.minutes} · {s.postQuestionCount}{" "}
                    {t.questions.toLowerCase()}
                  </Text>
                  {s.class.status === "active" ? (
                    <Button
                      label={c.startPost}
                      disabled={!s.posttestAvailable}
                      busy={busy}
                      onPress={() => {
                        void start("POSTTEST");
                      }}
                    />
                  ) : null}
                </>
              )}
            </View>
          ) : null}
          <SectionHeading>{v.shortcuts}</SectionHeading>
          <MenuGrid
            items={[
              {
                key: "learn",
                label: t.learn,
                icon: "book",
                tone: "apricot",
                onPress: () => router.navigate("/learn"),
              },
              {
                key: "attendance",
                label: t.attend,
                icon: "qr",
                tone: "mint",
                onPress: () => router.navigate("/attend"),
              },
            ]}
          />
          <LearningError error={error} />
        </>
      )}
      <DestinationRow
        title={v.tutor}
        subtitle={v.tutorHelp}
        icon="chat"
        onPress={() => router.push("/ai-tutor")}
      />
    </Page>
  );
}
