import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import {
  Field,
  RequireAccount,
  TextAction,
  ErrorText,
  useAccountText,
  ui,
} from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import {
  accountRepository,
  type ResolvedClass,
} from "@/features/account/repository";
export default function Join() {
  return (
    <RequireAccount complete>
      <JoinForm />
    </RequireAccount>
  );
}
function JoinForm() {
  const auth = useAuth(),
    text = useAccountText();
  const [code, setCode] = useState(""),
    [resolved, setResolved] = useState<ResolvedClass | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  if (auth.profile?.role !== "student") return <Redirect href="/home" />;
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (resolved) {
        await accountRepository.join(code);
        router.replace("/home");
      } else {
        setResolved(await accountRepository.resolveCode(code));
      }
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Text accessibilityRole="header" style={ui.title}>
        {resolved ? text.confirmClass : text.joinTitle}
      </Text>
      <Text style={ui.body}>{text.joinBody}</Text>
      {resolved ? (
        <View style={ui.card}>
          <Text style={ui.cardTitle}>{resolved.name}</Text>
          <Text style={ui.body}>
            {text.teacher}: {resolved.teacherName}
          </Text>
        </View>
      ) : (
        <Field
          label={text.code}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={32}
          editable={!busy}
        />
      )}
      <ErrorText error={error} />
      <Button
        label={resolved ? text.join : text.findClass}
        busy={busy}
        disabled={!code.trim()}
        onPress={() => {
          void submit();
        }}
      />
      {resolved ? (
        <TextAction
          label={text.changeCode}
          disabled={busy}
          onPress={() => {
            setResolved(null);
            setError(null);
          }}
        />
      ) : null}
    </Page>
  );
}
