import {
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
  type ScrollViewInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode, Ref } from "react";
import { colors, space } from "@/theme/tokens";

export function Page({
  children,
  scrollRef,
  extraBottom = 0,
  onContentSizeChange,
}: {
  children: ReactNode;
  scrollRef?: Ref<ScrollViewInstance>;
  extraBottom?: number;
  onContentSizeChange?: (width: number, height: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const bottomInset: ViewStyle = {
    paddingBottom: Math.max(insets.bottom, space.xl),
  };
  return (
    <ScrollView
      ref={scrollRef}
      onContentSizeChange={onContentSizeChange}
      style={[
        styles.scroll,
        extraBottom ? { marginBottom: extraBottom } : null,
      ]}
      contentContainerStyle={[styles.container, bottomInset]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: space.xl, alignItems: "center" },
  content: { width: "100%", maxWidth: 560, gap: space.xl },
});
