import { useCallback, type ReactNode } from "react";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { RequireAccount } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useResource } from "@/features/account/useResource";
import { learningRepository } from "@/features/learning/repository";
import { useLearningText, Loading } from "@/features/learning/UI";
import { colors } from "@/theme/tokens";
export default function Layout() {
  return (
    <RequireAccount complete>
      <Shell />
    </RequireAccount>
  );
}
function TestGate({ children }: { children: ReactNode }) {
  const r = useResource(useCallback(() => learningRepository.status(), []));
  if (r.loading && !r.data && !r.error) return <Loading />;
  const active = [r.data?.attempt, r.data?.posttest].find(
    (a) => a && a.status !== "completed",
  );
  if (active)
    return (
      <Redirect
        href={{ pathname: "/attempt/[id]", params: { id: active.id } }}
      />
    );
  return children;
}
function Shell() {
  const auth = useAuth(),
    t = useLearningText(),
    teacher = auth.profile?.role === "teacher";
  const tabs = (
    <NativeTabs
      labelVisibilityMode="labeled"
      backgroundColor={colors.background}
      tintColor={colors.primary}
      iconColor={{ default: colors.onSurfaceVariant, selected: colors.primary }}
      indicatorColor={colors.primaryContainer}
      labelStyle={{ fontSize: 12 }}
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>{t.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon drawable="quethink_home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="learn" hidden={teacher}>
        <NativeTabs.Trigger.Label>{t.learn}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon drawable="quethink_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="classes" hidden={!teacher}>
        <NativeTabs.Trigger.Label>{t.classes}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon drawable="quethink_users" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="attend">
        <NativeTabs.Trigger.Label>{t.attend}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon drawable="quethink_qr" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="forum">
        <NativeTabs.Trigger.Label>{t.forum}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon drawable="quethink_forum" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t.profile}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon drawable="quethink_user" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
  return teacher ? tabs : <TestGate>{tabs}</TestGate>;
}
