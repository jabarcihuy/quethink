import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Text } from "react-native";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import {
  Field,
  TextAction,
  ErrorText,
  useAccountText,
  ui,
} from "@/components/AccountUI";
import { requireSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/account/AuthProvider";
export default function ResetPassword() {
  const auth = useAuth(),
    text = useAccountText();
  const [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [saved, setSaved] = useState(false);
  if (!auth.session && !saved) return <Redirect href="/forgot-password" />;
  if (auth.session && !auth.recovery && !saved)
    return <Redirect href="/home" />;
  async function submit() {
    if (password.length < 8) {
      setError(new Error("weak_password"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: failure } = await requireSupabase().auth.updateUser({
        password,
      });
      if (failure) throw failure;
      setSaved(true);
      await auth.signOut();
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Text accessibilityRole="header" style={ui.title}>
        {saved ? text.passwordSaved : text.newPassword}
      </Text>
      {!saved ? (
        <>
          <Field
            label={text.newPassword}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
          />
          <ErrorText error={error} />
          <Button
            label={text.savePassword}
            busy={busy}
            onPress={() => {
              void submit();
            }}
          />
          <TextAction
            label={text.cancel}
            disabled={busy}
            onPress={() => {
              void auth.signOut().catch(setError);
            }}
          />
        </>
      ) : (
        <>
          <ErrorText error={error} />
          <TextAction
            label={text.backLogin}
            onPress={() => router.replace("/login")}
          />
        </>
      )}
    </Page>
  );
}
