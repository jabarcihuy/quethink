import { useState } from "react";
import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import type { ReactNode } from "react";
import { useAuth } from "@/features/account/AuthProvider";
import { useLocale } from "@/localization/LocaleProvider";
import { accountMessages, accountError } from "@/localization/account";
import { colors, radius, space, type } from "@/theme/tokens";
import { Page } from "./Page";
import { Button } from "./Button";
export function useAccountText() {
  const { locale } = useLocale();
  return accountMessages[locale];
}
export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={ui.field}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.onSurfaceVariant}
        selectionColor={colors.primary}
        style={[
          ui.input,
          focused
            ? { borderColor: colors.primary, backgroundColor: colors.surface }
            : null,
          style,
        ]}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
      />
    </View>
  );
}
export function TextAction({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={ui.textButton}
    >
      <Text style={[ui.link, disabled ? ui.muted : null]}>{label}</Text>
    </Pressable>
  );
}
export function ErrorText({ error }: { error: unknown }) {
  const text = useAccountText();
  return error ? (
    <Text accessibilityLiveRegion="polite" style={ui.error}>
      {accountError(error, text)}
    </Text>
  ) : null;
}
export function RequireAccount({
  children,
  complete = false,
}: {
  children: ReactNode;
  complete?: boolean;
}) {
  const auth = useAuth(),
    text = useAccountText();
  if (auth.loading)
    return (
      <Page>
        <ActivityIndicator
          color={colors.primary}
          accessibilityLabel={text.loading}
        />
      </Page>
    );
  if (!auth.session) return <Redirect href="/login" />;
  if (auth.recovery) return <Redirect href="/reset-password" />;
  if (auth.error || !auth.profile)
    return (
      <Page>
        <ErrorText error={auth.error ?? new Error("REQUEST_FAILED")} />
        <Button
          label={text.retry}
          onPress={() => {
            void auth.refresh();
          }}
        />
        <TextAction
          label={text.signOut}
          onPress={() => {
            void auth.signOut().catch(() => undefined);
          }}
        />
      </Page>
    );
  if (auth.profile.role === "admin")
    return (
      <Page>
        <Text style={ui.body}>{text.adminOnly}</Text>
        <Button
          label={text.signOut}
          onPress={() => {
            void auth.signOut().catch(() => undefined);
          }}
        />
      </Page>
    );
  if (complete && !auth.profile.profileComplete)
    return <Redirect href="/complete-profile" />;
  return children;
}
export const ui = StyleSheet.create({
  title: { ...type.title, color: colors.onSurface },
  body: { ...type.body, color: colors.onSurfaceVariant },
  label: { ...type.label, color: colors.onSurface },
  field: { gap: space.sm },
  input: {
    ...type.body,
    color: colors.onSurface,
    minHeight: 52,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.control,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
  },
  error: { ...type.body, color: colors.error },
  link: { ...type.label, color: colors.primary, textAlign: "center" },
  textButton: { minHeight: 48, justifyContent: "center", padding: space.sm },
  muted: { color: colors.onSurfaceVariant },
  card: {
    padding: space.xl,
    gap: space.md,
    borderRadius: radius.surface,
    borderCurve: "continuous",
    backgroundColor: colors.primaryContainer,
  },
  warm: { backgroundColor: colors.secondaryContainer },
  cardTitle: { ...type.subtitle, color: colors.onSurface },
  row: { flexDirection: "row", gap: space.md, alignItems: "center" },
  column: { gap: space.md },
  code: { ...type.title, color: colors.primary, letterSpacing: 2 },
  separator: { height: 1, backgroundColor: colors.outline },
});
