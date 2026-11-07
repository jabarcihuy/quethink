import { useState, useCallback } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Share, Text, View } from "react-native";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import {
  RequireAccount,
  TextAction,
  ErrorText,
  useAccountText,
  ui,
} from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { accountRepository } from "@/features/account/repository";
import { useResource } from "@/features/account/useResource";
import { useLearningText } from "@/features/learning/UI";
import { colors } from "@/theme/tokens";
export default function ClassScreen() {
  return (
    <RequireAccount complete>
      <ClassDetail />
    </RequireAccount>
  );
}
function ClassDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    text = useAccountText(),
    learning = useLearningText(),
    auth = useAuth();
  const resource = useResource(
    useCallback(async () => {
      const [dashboard, roster] = await Promise.all([
        accountRepository.dashboard(id),
        accountRepository.roster(id),
      ]);
      return { dashboard, roster };
    }, [id]),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  if (auth.profile?.role !== "teacher") return <Redirect href="/home" />;
  async function archive() {
    setBusy(true);
    setError(null);
    try {
      await accountRepository.archive(id);
      resource.refresh();
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  async function more() {
    setBusy(true);
    setError(null);
    try {
      const next = await accountRepository.roster(
        id,
        resource.data?.roster.nextCursor,
      );
      resource.setData((prev) =>
        prev
          ? {
              ...prev,
              roster: {
                data: [...prev.roster.data, ...next.data],
                nextCursor: next.nextCursor,
              },
            }
          : null,
      );
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  if (resource.loading)
    return (
      <Page>
        <ActivityIndicator color={colors.primary} />
      </Page>
    );
  if (resource.error || !resource.data)
    return (
      <Page>
        <ErrorText error={resource.error} />
        <Button label={text.retry} onPress={resource.refresh} />
      </Page>
    );
  const c = resource.data.dashboard.class;
  return (
    <Page>
      <Text accessibilityRole="header" style={ui.title}>
        {c.name}
      </Text>
      <Text style={ui.body}>
        {c.status === "archived" ? text.archived : text.active}
      </Text>
      {c.status === "active" ? (
        <View style={ui.card}>
          <Text style={ui.label}>{text.classCode}</Text>
          <Text selectable style={ui.code}>
            {c.joinCode}
          </Text>
          <TextAction
            label={text.shareCode}
            onPress={() => {
              void Share.share({
                message: `${c.name}\n${text.classCode}: ${c.joinCode}`,
              }).catch(setError);
            }}
          />
        </View>
      ) : (
        <Text style={ui.body}>{text.historyBody}</Text>
      )}
      <TextAction
        label={learning.manage}
        onPress={() =>
          router.push({ pathname: "/course/[id]", params: { id: c.id } })
        }
      />
      <Text accessibilityRole="header" style={ui.cardTitle}>
        {text.students}: {c.studentCount}
      </Text>
      {!resource.data.roster.data.length ? (
        <Text style={ui.body}>{text.noStudents}</Text>
      ) : null}
      {resource.data.roster.data.map((s) => (
        <View key={s.id} style={ui.column}>
          <Text style={ui.cardTitle}>{s.displayName}</Text>
          <Text style={ui.body}>
            {text.nim}: {s.nim}
          </Text>
          <View style={ui.separator} />
        </View>
      ))}
      {resource.data.roster.nextCursor ? (
        <Button
          label={text.more}
          busy={busy}
          onPress={() => {
            void more();
          }}
        />
      ) : null}
      <ErrorText error={error} />
      {c.status === "active" ? (
        <Button
          label={text.archive}
          busy={busy}
          onPress={() =>
            Alert.alert(text.archiveTitle, text.archiveBody, [
              { text: text.cancel, style: "cancel" },
              {
                text: text.archive,
                onPress: () => {
                  void archive();
                },
              },
            ])
          }
        />
      ) : null}
    </Page>
  );
}
