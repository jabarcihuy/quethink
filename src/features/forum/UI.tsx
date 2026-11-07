import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useLocale } from "@/localization/LocaleProvider";
import { colors, radius, space, type } from "@/theme/tokens";
import type { Category } from "./repository";
const copy = {
  en: {
    title: "Discussion forum",
    intro: "Learn together across classes. Ask questions and share ideas.",
    newTopic: "Start a discussion",
    search: "Search discussions",
    searchHint: "Search title or message",
    searchAction: "Search",
    all: "All",
    DATABASE: "Database",
    GENERAL: "General",
    empty: "No discussions yet. Start the first conversation.",
    emptySearch: "No discussions match your search.",
    replies: "Replies",
    newTitle: "New discussion",
    topicTitle: "Title",
    topicHint: "At least 6 characters",
    message: "Message",
    messageHint: "Share your question or idea",
    category: "Category",
    post: "Post discussion",
    posting: "Posting",
    reply: "Write a reply",
    replyHint: "Add a helpful response",
    sendReply: "Post reply",
    noReplies: "No replies yet. Start the conversation.",
    more: "Load more",
    retry: "Try again",
    locked: "Replies are closed",
    hidden: "Hidden",
    lock: "Close replies",
    unlock: "Reopen replies",
    hideTopic: "Hide discussion",
    showTopic: "Restore discussion",
    hideReply: "Hide reply",
    showReply: "Restore reply",
    validation: "Check the title, category and message lengths.",
    replyValidation: "Write at least 2 characters for your reply.",
    topicValidation:
      "Use at least 6 characters for the title and 10 for the message.",
    blocked: "The forum is unavailable while your test is in progress.",
    rate: "You have reached the posting limit. Try again later.",
    missing: "This discussion is unavailable or has been hidden.",
    forbidden: "You do not have access to this action.",
    error: "Could not load the forum. Check your connection and try again.",
    mutationError:
      "Could not confirm the change. Check the discussion before trying again to avoid duplicates.",
    loading: "Loading discussions",
    you: "You",
    teacher: "Moderation",
    replyCount: (n: number) => `${n} ${n === 1 ? "reply" : "replies"}`,
  },
  id: {
    title: "Forum diskusi",
    intro: "Belajar bersama lintas kelas. Ajukan pertanyaan dan berbagi ide.",
    newTopic: "Mulai diskusi",
    search: "Cari diskusi",
    searchHint: "Cari judul atau pesan",
    searchAction: "Cari",
    all: "Semua",
    DATABASE: "Basis data",
    GENERAL: "Umum",
    empty: "Belum ada diskusi. Mulai percakapan pertama.",
    emptySearch: "Tidak ada diskusi yang cocok.",
    replies: "Balasan",
    newTitle: "Diskusi baru",
    topicTitle: "Judul",
    topicHint: "Minimal 6 karakter",
    message: "Pesan",
    messageHint: "Tulis pertanyaan atau idemu",
    category: "Kategori",
    post: "Kirim diskusi",
    posting: "Mengirim",
    reply: "Tulis balasan",
    replyHint: "Tambahkan tanggapan yang membantu",
    sendReply: "Kirim balasan",
    noReplies: "Belum ada balasan. Mulai percakapan.",
    more: "Muat lagi",
    retry: "Coba lagi",
    locked: "Balasan ditutup",
    hidden: "Disembunyikan",
    lock: "Tutup balasan",
    unlock: "Buka balasan",
    hideTopic: "Sembunyikan diskusi",
    showTopic: "Tampilkan diskusi",
    hideReply: "Sembunyikan balasan",
    showReply: "Tampilkan balasan",
    validation: "Periksa panjang judul, kategori, dan pesan.",
    replyValidation: "Tulis setidaknya 2 karakter untuk balasan.",
    topicValidation: "Judul minimal 6 karakter dan pesan minimal 10 karakter.",
    blocked: "Forum tidak tersedia selama tes berlangsung.",
    rate: "Batas pengiriman tercapai. Coba lagi nanti.",
    missing: "Diskusi tidak tersedia atau telah disembunyikan.",
    forbidden: "Kamu tidak memiliki akses untuk tindakan ini.",
    error: "Forum tidak dapat dimuat. Periksa koneksi dan coba lagi.",
    mutationError:
      "Perubahan belum dapat dipastikan. Periksa diskusi sebelum mencoba lagi agar tidak terkirim dua kali.",
    loading: "Memuat diskusi",
    you: "Kamu",
    teacher: "Moderasi",
    replyCount: (n: number) => `${n} balasan`,
  },
} as const;
export const useForumText = () => copy[useLocale().locale];
export function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
}
export function ForumError({
  error,
  mutation = false,
}: {
  error: unknown;
  mutation?: boolean;
}) {
  const t = useForumText();
  if (!error) return null;
  const code = errorCode(error);
  const text =
    code === "OTHER_TEST_ACTIVE"
      ? t.blocked
      : code === "RATE_LIMITED"
        ? t.rate
        : code === "NOT_FOUND"
          ? t.missing
          : code === "FORBIDDEN"
            ? t.forbidden
            : code === "VALIDATION_ERROR"
              ? t.validation
              : mutation
                ? t.mutationError
                : t.error;
  return (
    <Text accessibilityLiveRegion="polite" style={s.error}>
      {text}
    </Text>
  );
}
export function CategoryChoices({
  value,
  onChange,
  all = false,
  disabled = false,
}: {
  value: Category | null;
  onChange: (v: Category | null) => void;
  all?: boolean;
  disabled?: boolean;
}) {
  const t = useForumText();
  const options: (Category | null)[] = all
    ? [null, "DATABASE", "GENERAL"]
    : ["DATABASE", "GENERAL"];
  return (
    <View accessibilityRole="radiogroup" style={s.chips}>
      {options.map((x) => (
        <Pressable
          key={x ?? "all"}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === x, disabled }}
          disabled={disabled}
          onPress={() => onChange(x)}
          style={[
            s.chip,
            value === x && s.chipSelected,
            disabled && { opacity: 0.55 },
          ]}
        >
          <Text style={[s.chipLabel, value === x && s.chipLabelSelected]}>
            {x === null ? t.all : t[x]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function ForumInput({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.onSurfaceVariant}
        selectionColor={colors.primary}
        textAlignVertical={props.multiline ? "top" : "auto"}
        {...props}
        style={[s.input, props.multiline && s.multiline, props.style]}
      />
    </View>
  );
}
export const s = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: space.xl,
    paddingBottom: space.section,
    alignSelf: "center",
    width: "100%",
    maxWidth: 608,
    flexGrow: 1,
  },
  header: { gap: space.lg, marginBottom: space.xl },
  section: { gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  grow: { flex: 1 },
  headline: { ...type.headline, color: colors.onSurface },
  title: { ...type.title, color: colors.onSurface },
  body: { ...type.body, color: colors.onSurface },
  muted: { ...type.body, color: colors.onSurfaceVariant },
  caption: { ...type.caption, color: colors.onSurfaceVariant },
  label: { ...type.label, color: colors.onSurface },
  error: { ...type.body, color: colors.error },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  chipLabel: { ...type.label, color: colors.onSurface },
  chipLabelSelected: { color: colors.primary },
  field: { gap: space.sm },
  input: {
    ...type.body,
    color: colors.onSurface,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    padding: space.md,
  },
  multiline: { minHeight: 120 },
  topic: {
    paddingVertical: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    gap: space.sm,
    minHeight: 80,
  },
  topicTitle: { ...type.subtitle, color: colors.onSurface },
  meta: { ...type.caption, color: colors.onSurfaceVariant },
  footer: { gap: space.lg, paddingTop: space.xl },
  replyCard: {
    paddingVertical: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    gap: space.sm,
  },
  banner: {
    backgroundColor: colors.primaryContainer,
    padding: space.lg,
    borderRadius: radius.surface,
    gap: space.sm,
  },
});
