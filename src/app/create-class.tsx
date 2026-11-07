import { useState, useCallback } from "react";
import { Redirect, router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import {
  Field,
  RequireAccount,
  ErrorText,
  useAccountText,
  ui,
} from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { accountRepository } from "@/features/account/repository";
import { useResource } from "@/features/account/useResource";
import { colors, space } from "@/theme/tokens";
export default function CreateClass() {
  return (
    <RequireAccount complete>
      <CreateForm />
    </RequireAccount>
  );
}
function CreateForm() {
  const text = useAccountText(),
    auth = useAuth();
  const resource = useResource(
    useCallback(() => accountRepository.templates(), []),
  );
  const [name, setName] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  if (auth.profile?.role !== "teacher") return <Redirect href="/home" />;
  const template = selected ?? resource.data?.[0]?.id;
  async function submit() {
    if (!template) return;
    setBusy(true);
    setError(null);
    try {
      const c = await accountRepository.createClass(name.trim(), template);
      router.replace({ pathname: "/class/[id]", params: { id: c.id } });
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Text accessibilityRole="header" style={ui.title}>
        {text.createClass}
      </Text>
      <Field
        label={text.className}
        value={name}
        onChangeText={setName}
        maxLength={120}
        editable={!busy}
      />
      <Text style={ui.label}>{text.template}</Text>
      {resource.loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : resource.error ? (
        <>
          <ErrorText error={resource.error} />
          <Button label={text.retry} onPress={resource.refresh} />
        </>
      ) : (
        <View style={ui.column}>
          {resource.data?.map((t) => (
            <Pressable
              key={t.id}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{ checked: template === t.id }}
              onPress={() => setSelected(t.id)}
              style={[
                ui.input,
                styles.option,
                template === t.id
                  ? {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryContainer,
                    }
                  : null,
              ]}
            >
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.radio,
                  template === t.id ? styles.radioSelected : null,
                ]}
              >
                {template === t.id ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[ui.body, styles.optionText]}>{t.title}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <ErrorText error={error} />
      <Button
        label={text.createClass}
        disabled={!name.trim() || !template || Boolean(resource.error)}
        busy={busy}
        onPress={() => {
          void submit();
        }}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: "row", alignItems: "center", gap: space.md },
  optionText: { flex: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.onSurfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
