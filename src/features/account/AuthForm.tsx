import { useState } from "react";
import { Redirect, router } from "expo-router";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LearningArt } from "@/components/LearningArt";
import { classroomStyles, TonalPanel } from "@/components/ClassroomUI";
import { colors, space, type } from "@/theme/tokens";
import { useLocale } from "@/localization/LocaleProvider";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import {
  Field,
  TextAction,
  ErrorText,
  useAccountText,
  ui,
} from "@/components/AccountUI";
import { authRedirect, requireSupabase } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";

export function AuthForm({ mode }: { mode: "login" | "register" | "forgot" }) {
  const auth = useAuth(),
    text = useAccountText(),
    { locale } = useLocale();
  const { width, fontScale } = useWindowDimensions();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [sent, setSent] = useState(false);
  if (auth.session && !auth.recovery) return <Redirect href="/home" />;
  if (auth.recovery) return <Redirect href="/reset-password" />;
  const title =
    mode === "login"
      ? text.signIn
      : mode === "register"
        ? text.register
        : text.forgot;
  async function submit() {
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      (mode !== "forgot" &&
        (!password || (mode === "register" && password.length < 8)))
    ) {
      setError(new Error("weak_password"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const client = requireSupabase();
      if (mode === "forgot") {
        const { error: failure } = await client.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: authRedirect },
        );
        if (failure) throw failure;
        setSent(true);
      } else if (mode === "register") {
        const { data, error: failure } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: authRedirect },
        });
        if (failure) throw failure;
        if (data.session) router.replace("/home");
        else setSent(true);
      } else {
        const { error: failure } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (failure) throw failure;
        router.replace("/home");
      }
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      {mode === "login" ? (
        <TonalPanel style={loginStyles.hero}>
          <View style={classroomStyles.header}>
            <View style={classroomStyles.grow}>
              <Text accessibilityRole="header" style={loginStyles.heading}>
                {locale === "id" ? "Selamat datang kembali" : "Welcome back"}
              </Text>
              <Text style={loginStyles.description}>{text.signInBody}</Text>
            </View>
            {width >= 350 && fontScale < 1.25 ? (
              <LearningArt name="study" size={80} />
            ) : null}
          </View>
        </TonalPanel>
      ) : (
        <View style={classroomStyles.header}>
          <View style={classroomStyles.grow}>
            <Text accessibilityRole="header" style={classroomStyles.headline}>
              {sent && mode === "register" ? text.confirmEmail : title}
            </Text>
          </View>
          <LearningArt name="study" size={104} />
        </View>
      )}
      {mode !== "login" ? (
        <Text style={ui.body}>
          {sent
            ? mode === "forgot"
              ? text.resetSent
              : text.confirmBody
            : mode === "register"
              ? text.registerBody
              : text.forgotBody}
        </Text>
      ) : null}
      {!sent ? (
        <>
          <Field
            label={text.email}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!busy}
          />
          {mode !== "forgot" ? (
            <Field
              label={text.password}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              editable={!busy}
            />
          ) : null}
          <ErrorText error={error} />
          <Button
            label={mode === "forgot" ? text.reset : title}
            busy={busy}
            onPress={() => {
              void submit();
            }}
          />
        </>
      ) : null}
      {mode === "login" ? (
        <>
          <TextAction
            label={text.forgot}
            disabled={busy}
            onPress={() => router.push("/forgot-password")}
          />
          <TextAction
            label={text.openRegister}
            disabled={busy}
            onPress={() => router.push("/register")}
          />
        </>
      ) : (
        <TextAction
          label={text.backLogin}
          disabled={busy}
          onPress={() => router.replace("/login")}
        />
      )}
    </Page>
  );
}

const loginStyles = StyleSheet.create({
  hero: { padding: space.lg },
  heading: { ...type.title, color: colors.onPrimary },
  description: { ...type.body, color: colors.onPrimary, marginTop: space.sm },
});
