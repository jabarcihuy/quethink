import { useCallback, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { LearningArt } from "@/components/LearningArt";
import { colors } from "@/theme/tokens";
import { useLocale } from "@/localization/LocaleProvider";
import {
  CategoryChoices,
  ForumError,
  ForumInput,
  errorCode,
  s,
  useForumText,
} from "@/features/forum/UI";
import {
  forumRepository,
  type Category,
  type Topic,
} from "@/features/forum/repository";
import { usePaged } from "@/features/forum/usePaged";

export default function Forum() {
  const { width, fontScale } = useWindowDimensions();
  const t = useForumText(),
    { locale } = useLocale(),
    insets = useSafeAreaInsets();
  const [category, setCategory] = useState<Category | null>(null),
    [draft, setDraft] = useState(""),
    [search, setSearch] = useState("");
  const fetchPage = useCallback(
    (offset: number) => forumRepository.topics(category, search, offset),
    [category, search],
  );
  const list = usePaged(fetchPage);
  const blocked = errorCode(list.error) === "OTHER_TEST_ACTIVE";
  const render = useCallback(
    ({ item }: { item: Topic }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${item.authorName}, ${t.replyCount(item.replyCount ?? 0)}`}
        onPress={() =>
          router.push({
            pathname: "/forum-topic/[id]",
            params: { id: item.id },
          })
        }
        style={({ pressed }) => [s.topic, pressed && { opacity: 0.7 }]}
      >
        <View style={s.row}>
          <Text style={[s.topicTitle, s.grow]}>{item.title}</Text>
          <Icon name="chevron" size={20} color={colors.onSurfaceVariant} />
        </View>
        <Text style={s.meta}>
          {t[item.category]} · {item.authorName} ·{" "}
          {new Date(item.createdAt).toLocaleDateString(locale)}
        </Text>
        <Text style={s.meta}>
          {t.replyCount(item.replyCount ?? 0)}
          {item.isLocked ? ` · ${t.locked}` : ""}
          {item.isHidden ? ` · ${t.hidden}` : ""}
        </Text>
      </Pressable>
    ),
    [locale, t],
  );
  return (
    <FlatList
      style={s.list}
      contentContainerStyle={[
        s.content,
        { paddingBottom: Math.max(insets.bottom, 40) },
      ]}
      data={list.items}
      renderItem={render}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      ListHeaderComponent={
        <View style={s.header}>
          <View style={s.row}>
            <View style={s.grow}>
              <Text accessibilityRole="header" style={s.headline}>
                {t.title}
              </Text>
              <Text style={s.muted}>{t.intro}</Text>
            </View>
            {width >= 350 && fontScale < 1.25 ? (
              <LearningArt name="forum" size={80} />
            ) : null}
          </View>
          {!blocked ? (
            <>
              <Button
                label={t.newTopic}
                onPress={() => router.push("/forum-new")}
              />
              <ForumInput
                label={t.search}
                placeholder={t.searchHint}
                value={draft}
                maxLength={100}
                returnKeyType="search"
                onSubmitEditing={() => setSearch(draft.trim())}
                onChangeText={setDraft}
              />
              <Button
                label={t.searchAction}
                onPress={() => setSearch(draft.trim())}
              />
              <CategoryChoices value={category} onChange={setCategory} all />
            </>
          ) : null}
          {list.loading ? (
            <ActivityIndicator
              accessibilityLabel={t.loading}
              color={colors.primary}
            />
          ) : null}
          <ForumError error={list.error} />
          {list.error && !list.moreLoading ? (
            <Button label={t.retry} onPress={list.refresh} />
          ) : null}
          {!list.loading && !list.error && list.items.length === 0 ? (
            <Text style={s.muted}>
              {search || category ? t.emptySearch : t.empty}
            </Text>
          ) : null}
        </View>
      }
      ListFooterComponent={
        list.hasMore && !list.error ? (
          <View style={s.footer}>
            <Button
              label={t.more}
              busy={list.moreLoading}
              onPress={list.more}
            />
          </View>
        ) : undefined
      }
    />
  );
}
