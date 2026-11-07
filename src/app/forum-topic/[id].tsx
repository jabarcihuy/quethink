import { useCallback, useEffect, useRef, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { RequireAccount, TextAction } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useResource } from "@/features/account/useResource";
import { useLocale } from "@/localization/LocaleProvider";
import { colors } from "@/theme/tokens";
import {
  ForumError,
  ForumInput,
  errorCode,
  s,
  useForumText,
} from "@/features/forum/UI";
import { forumRepository, type Reply } from "@/features/forum/repository";
import { usePaged } from "@/features/forum/usePaged";
import { useForumKeyboard } from "@/features/forum/useForumKeyboard";
export default function Screen() {
  return (
    <RequireAccount complete>
      <TopicScreen />
    </RequireAccount>
  );
}
function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    t = useForumText(),
    { locale } = useLocale(),
    insets = useSafeAreaInsets(),
    teacher = useAuth().profile?.role === "teacher";
  const topic = useResource(useCallback(() => forumRepository.topic(id), [id]));
  const fetchReplies = useCallback(
    (offset: number) => forumRepository.replies(id, offset),
    [id],
  );
  const replies = usePaged(fetchReplies);
  const { refresh: refreshTopic } = topic;
  const { refresh: refreshReplies } = replies;
  const [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [invalid, setInvalid] = useState(false);
  const submitting = useRef(false);
  const keyboardHeight = useForumKeyboard();
  const listRef = useRef<FlatList<Reply>>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyFocused = useRef(false);
  useEffect(() => {
    if (keyboardHeight && replyFocused.current) {
      const timer = setTimeout(
        () => listRef.current?.scrollToEnd({ animated: true }),
        150,
      );
      return () => clearTimeout(timer);
    }
  }, [keyboardHeight]);
  useEffect(
    () => () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
    },
    [],
  );
  const blocked = [topic.error, replies.error, error].some(
    (e) => errorCode(e) === "OTHER_TEST_ACTIVE",
  );
  const refresh = useCallback(() => {
    refreshTopic();
    refreshReplies();
  }, [refreshTopic, refreshReplies]);
  const mutate = useCallback(
    async (fn: () => Promise<unknown>, clear = false) => {
      if (submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setError(null);
      try {
        await fn();
        if (clear) setBody("");
        refresh();
      } catch (e) {
        setError(e);
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    },
    [refresh],
  );
  function send() {
    if (body.trim().length < 2) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void mutate(() => forumRepository.createReply(id, body.trim()), true);
  }
  const render = useCallback(
    ({ item }: { item: Reply }) => (
      <View style={s.replyCard}>
        <Text style={s.label}>
          {item.isMine ? t.you : item.authorName} ·{" "}
          {new Date(item.createdAt).toLocaleString(locale)}
          {item.isHidden ? ` · ${t.hidden}` : ""}
        </Text>
        <Text selectable style={s.body}>
          {item.body}
        </Text>
        {teacher ? (
          <TextAction
            label={item.isHidden ? t.showReply : t.hideReply}
            disabled={busy}
            onPress={() => {
              void mutate(() =>
                forumRepository.moderate(item.id, "hide_reply", !item.isHidden),
              );
            }}
          />
        ) : null}
      </View>
    ),
    [busy, locale, t, teacher, mutate],
  );
  const ready =
    !blocked &&
    !topic.error &&
    !replies.error &&
    !topic.loading &&
    !replies.loading &&
    !!topic.data;
  const data = ready ? replies.items : [];
  return (
    <>
      <Stack.Screen options={{ title: t.title }} />
      <FlatList
        ref={listRef}
        onContentSizeChange={() => {
          if (keyboardHeight && replyFocused.current) {
            listRef.current?.scrollToEnd({ animated: true });
          }
        }}
        style={[
          s.list,
          { marginBottom: keyboardHeight || Math.max(insets.bottom, 16) },
        ]}
        contentContainerStyle={[
          s.content,
          { paddingBottom: Math.max(insets.bottom, 40) },
        ]}
        data={data}
        renderItem={render}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View style={s.header}>
            {topic.loading || replies.loading ? (
              <ActivityIndicator
                accessibilityLabel={t.loading}
                color={colors.primary}
              />
            ) : null}
            <ForumError
              error={topic.error ?? replies.error ?? (blocked ? error : null)}
            />
            {topic.error || replies.error || blocked ? (
              <Button
                label={t.retry}
                onPress={() => {
                  setError(null);
                  refresh();
                }}
              />
            ) : null}
            {ready && topic.data ? (
              <>
                <View style={s.banner}>
                  <Text accessibilityRole="header" style={s.title}>
                    {topic.data.title}
                  </Text>
                  <Text style={[s.meta, { color: colors.primary }]}>
                    {t[topic.data.category]} ·{" "}
                    {topic.data.isMine ? t.you : topic.data.authorName} ·{" "}
                    {new Date(topic.data.createdAt).toLocaleDateString(locale)}
                    {topic.data.isHidden ? ` · ${t.hidden}` : ""}
                  </Text>
                  <Text selectable style={s.body}>
                    {topic.data.body}
                  </Text>
                </View>
                {teacher ? (
                  <View style={s.section}>
                    <Text accessibilityRole="header" style={s.label}>
                      {t.teacher}
                    </Text>
                    <TextAction
                      disabled={busy}
                      label={topic.data.isLocked ? t.unlock : t.lock}
                      onPress={() => {
                        void mutate(() =>
                          forumRepository.moderate(
                            id,
                            "lock_topic",
                            !topic.data!.isLocked,
                          ),
                        );
                      }}
                    />
                    <TextAction
                      disabled={busy}
                      label={topic.data.isHidden ? t.showTopic : t.hideTopic}
                      onPress={() => {
                        void mutate(() =>
                          forumRepository.moderate(
                            id,
                            "hide_topic",
                            !topic.data!.isHidden,
                          ),
                        );
                      }}
                    />
                  </View>
                ) : null}
                <Text accessibilityRole="header" style={s.title}>
                  {t.replies}
                </Text>
                {!replies.loading &&
                !replies.error &&
                replies.items.length === 0 ? (
                  <Text style={s.muted}>{t.noReplies}</Text>
                ) : null}
              </>
            ) : null}
          </View>
        }
        ListFooterComponent={
          ready && topic.data ? (
            <View style={s.footer}>
              {replies.hasMore && !replies.error ? (
                <Button
                  label={t.more}
                  busy={replies.moreLoading}
                  onPress={replies.more}
                />
              ) : null}
              {topic.data.isLocked || topic.data.isHidden ? (
                <Text style={s.muted}>
                  {topic.data.isHidden ? t.hidden : t.locked}
                </Text>
              ) : (
                <>
                  <ForumInput
                    label={t.reply}
                    placeholder={t.replyHint}
                    multiline
                    maxLength={4000}
                    value={body}
                    onChangeText={setBody}
                    editable={!busy}
                    onFocus={() => {
                      replyFocused.current = true;
                      if (focusTimer.current) clearTimeout(focusTimer.current);
                      focusTimer.current = setTimeout(
                        () => listRef.current?.scrollToEnd({ animated: true }),
                        350,
                      );
                    }}
                    onBlur={() => {
                      replyFocused.current = false;
                    }}
                  />
                  {invalid ? (
                    <Text accessibilityLiveRegion="polite" style={s.error}>
                      {t.replyValidation}
                    </Text>
                  ) : null}
                  <Button label={t.sendReply} busy={busy} onPress={send} />
                </>
              )}
              <ForumError error={error} mutation />
            </View>
          ) : undefined
        }
      />
    </>
  );
}
