import { useState } from "react";
import { Stack } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import { RequireAccount } from "@/components/AccountUI";
import { Page } from "@/components/Page";
import { useLocale } from "@/localization/LocaleProvider";
import { requireSupabase } from "@/lib/supabase/client";
import { colors, radius, space, type } from "@/theme/tokens";

const copy = {
  en: {
    title: "AI tutor",
    intro:
      "Ask about databases or SQL. Do not include personal or sensitive information.",
    question: "Your question",
    placeholder: "For example: how does a JOIN work?",
    send: "Ask tutor",
    answer: "Answer",
    failed: "Unable to reach the tutor. Check your connection and try again.",
    blocked: "The tutor is unavailable while a test is in progress.",
    limited: "You have reached the hourly limit. Please try again later.",
    required: "Enter a question first.",
    unavailable: "The AI tutor is being prepared and is not available yet.",
  },
  id: {
    title: "Tutor AI",
    intro:
      "Tanyakan tentang basis data atau SQL. Jangan sertakan informasi pribadi atau sensitif.",
    question: "Pertanyaanmu",
    placeholder: "Contoh: bagaimana cara kerja JOIN?",
    send: "Tanya tutor",
    answer: "Jawaban",
    failed: "Tutor tidak dapat dihubungi. Periksa koneksi dan coba lagi.",
    blocked: "Tutor tidak tersedia selama tes berlangsung.",
    limited: "Batas penggunaan per jam tercapai. Coba lagi nanti.",
    required: "Tulis pertanyaan terlebih dahulu.",
    unavailable: "Tutor AI sedang disiapkan dan belum tersedia.",
  },
};

export default function Screen() {
  return (
    <RequireAccount complete>
      <Tutor />
    </RequireAccount>
  );
}
function Tutor() {
  const { locale } = useLocale();
  const t = copy[locale];
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const enabled = process.env.EXPO_PUBLIC_AI_ENABLED === "true";
  async function ask() {
    if (!question.trim()) {
      setError(t.required);
      return;
    }
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const result = await requireSupabase().functions.invoke("mobile-ai", {
        body: { message: question.trim(), language: locale },
      });
      if (result.error) {
        let code = "";
        const context = "context" in result.error ? result.error.context : null;
        if (context instanceof Response) {
          const body = await context.json().catch(() => null);
          code = body?.error?.code ?? "";
        }
        setError(
          code === "TEST_ACTIVE"
            ? t.blocked
            : code === "RATE_LIMITED"
              ? t.limited
              : t.failed,
        );
      } else if (typeof result.data?.data?.answer === "string")
        setAnswer(result.data.data.answer);
      else setError(t.failed);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Stack.Screen options={{ title: t.title }} />
      <Text accessibilityRole="header" style={s.title}>
        {t.title}
      </Text>
      <Text style={s.body}>{t.intro}</Text>
      {!enabled ? <Text style={s.body}>{t.unavailable}</Text> : null}
      <View style={s.group}>
        <Text style={s.label}>{t.question}</Text>
        <TextInput
          accessibilityLabel={t.question}
          multiline
          maxLength={2000}
          editable={enabled && !busy}
          value={question}
          onChangeText={setQuestion}
          placeholder={t.placeholder}
          placeholderTextColor={colors.onSurfaceVariant}
          textAlignVertical="top"
          style={s.input}
        />
        <Button
          label={t.send}
          busy={busy}
          disabled={!enabled || busy}
          onPress={() => {
            void ask();
          }}
        />
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={s.error}>
          {error}
        </Text>
      ) : null}
      {answer ? (
        <View style={s.group}>
          <Text accessibilityRole="header" style={s.label}>
            {t.answer}
          </Text>
          <Text selectable style={s.body}>
            {answer}
          </Text>
        </View>
      ) : null}
    </Page>
  );
}
const s = StyleSheet.create({
  title: { ...type.headline, color: colors.onSurface },
  body: { ...type.body, color: colors.onSurface },
  label: { ...type.subtitle, color: colors.onSurface },
  group: { gap: space.md },
  input: {
    ...type.body,
    color: colors.onSurface,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.control,
    padding: space.md,
    backgroundColor: colors.surface,
  },
  error: { ...type.body, color: colors.error },
});
