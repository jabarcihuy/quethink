import { useEffect, useRef, useState } from "react";
import { router, Stack } from "expo-router";
import { Text, View, type ScrollViewInstance } from "react-native";
import { RequireAccount } from "@/components/AccountUI";
import { Button } from "@/components/Button";
import { Page } from "@/components/Page";
import {
  CategoryChoices,
  ForumError,
  ForumInput,
  errorCode,
  s,
  useForumText,
} from "@/features/forum/UI";
import { forumRepository, type Category } from "@/features/forum/repository";
import { useForumKeyboard } from "@/features/forum/useForumKeyboard";
export default function Screen() {
  return (
    <RequireAccount complete>
      <NewTopic />
    </RequireAccount>
  );
}
function NewTopic() {
  const t = useForumText(),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [category, setCategory] = useState<Category | null>("DATABASE"),
    [error, setError] = useState<unknown>(null),
    [validation, setValidation] = useState(false),
    [busy, setBusy] = useState(false),
    [testGate, setTestGate] = useState(false);
  const submitting = useRef(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageFocused = useRef(false);
  const keyboardHeight = useForumKeyboard();
  useEffect(
    () => () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
    },
    [],
  );
  async function submit() {
    if (submitting.current) return;
    if (title.trim().length < 6 || body.trim().length < 10 || !category) {
      setValidation(true);
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    setValidation(false);
    try {
      const id = await forumRepository.createTopic(
        title.trim(),
        body.trim(),
        category,
      );
      router.replace({ pathname: "/forum-topic/[id]", params: { id } });
    } catch (e) {
      setError(e);
      if (errorCode(e) === "OTHER_TEST_ACTIVE") setTestGate(true);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function retryAccess() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await forumRepository.topics(null, "", 0);
      setError(null);
      setTestGate(false);
    } catch (e) {
      setError(e);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const blocked = testGate || errorCode(error) === "OTHER_TEST_ACTIVE";
  return (
    <Page
      scrollRef={scrollRef}
      extraBottom={keyboardHeight}
      onContentSizeChange={() => {
        if (keyboardHeight && messageFocused.current)
          scrollRef.current?.scrollToEnd({ animated: true });
      }}
    >
      <Stack.Screen options={{ title: t.title }} />
      <Text accessibilityRole="header" style={s.title}>
        {t.newTitle}
      </Text>
      {!blocked ? (
        <>
          <ForumInput
            label={t.topicTitle}
            placeholder={t.topicHint}
            value={title}
            onChangeText={setTitle}
            editable={!busy}
            maxLength={140}
          />
          <View style={s.section}>
            <Text style={s.label}>{t.category}</Text>
            <CategoryChoices
              value={category}
              onChange={setCategory}
              disabled={busy}
            />
          </View>
          <ForumInput
            label={t.message}
            placeholder={t.messageHint}
            value={body}
            onChangeText={setBody}
            editable={!busy}
            multiline
            maxLength={6000}
            onFocus={() => {
              messageFocused.current = true;
              if (focusTimer.current) clearTimeout(focusTimer.current);
              focusTimer.current = setTimeout(
                () => scrollRef.current?.scrollToEnd({ animated: true }),
                350,
              );
            }}
            onBlur={() => {
              messageFocused.current = false;
            }}
          />
          {validation ? (
            <Text accessibilityLiveRegion="polite" style={s.error}>
              {t.topicValidation}
            </Text>
          ) : null}
          <Button
            label={t.post}
            busy={busy}
            onPress={() => {
              void submit();
            }}
          />
        </>
      ) : null}
      <ForumError error={error} mutation />
      {blocked ? (
        <Button
          label={t.retry}
          busy={busy}
          onPress={() => {
            void retryAccess();
          }}
        />
      ) : null}
    </Page>
  );
}
