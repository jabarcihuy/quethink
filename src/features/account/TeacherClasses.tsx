import { useCallback, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { LearningArt } from "@/components/LearningArt";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { ErrorText, useAccountText, ui } from "@/components/AccountUI";
import { accountRepository } from "./repository";
import { useResource } from "./useResource";
import {
  DestinationRow,
  classroomStyles,
  useVisualText,
} from "@/components/ClassroomUI";
import { colors } from "@/theme/tokens";
export function TeacherClasses() {
  const text = useAccountText(),
    v = useVisualText();
  const resource = useResource(
    useCallback(() => accountRepository.classes(), []),
  );
  const [moreBusy, setMoreBusy] = useState(false),
    [moreError, setMoreError] = useState<unknown>(null);
  async function more() {
    setMoreBusy(true);
    setMoreError(null);
    try {
      const next = await accountRepository.classes(resource.data?.nextCursor);
      resource.setData((previous) =>
        previous
          ? {
              data: [...previous.data, ...next.data],
              nextCursor: next.nextCursor,
            }
          : next,
      );
    } catch (error) {
      setMoreError(error);
    } finally {
      setMoreBusy(false);
    }
  }
  return (
    <Page>
      <View style={classroomStyles.header}>
        <View style={classroomStyles.grow}>
          <Text accessibilityRole="header" style={classroomStyles.headline}>
            {v.teacherClasses}
          </Text>
        </View>
        <LearningArt name="learn" size={96} />
      </View>
      <Button
        label={text.createClass}
        onPress={() => router.push("/create-class")}
      />
      {resource.loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : resource.error ? (
        <>
          <ErrorText error={resource.error} />
          <Button label={text.retry} onPress={resource.refresh} />
        </>
      ) : (
        <>
          {!resource.data?.data.length ? (
            <>
              <Text style={ui.cardTitle}>{text.noTeacherClass}</Text>
              <Text style={ui.body}>{text.noTeacherClassBody}</Text>
            </>
          ) : null}
          <View style={classroomStyles.group}>
            {resource.data?.data.map((c) => (
              <DestinationRow
                key={c.id}
                title={c.name}
                subtitle={`${text.students}: ${c.studentCount} · ${c.status === "archived" ? text.archived : text.active}`}
                icon="users"
                tone={c.status === "archived" ? "lavender" : "apricot"}
                onPress={() =>
                  router.push({ pathname: "/class/[id]", params: { id: c.id } })
                }
              />
            ))}
          </View>
          <ErrorText error={moreError} />
          {resource.data?.nextCursor ? (
            <Button
              label={text.more}
              busy={moreBusy}
              onPress={() => {
                void more();
              }}
            />
          ) : null}
        </>
      )}
    </Page>
  );
}
