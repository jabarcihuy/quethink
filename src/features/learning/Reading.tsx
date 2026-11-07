import { Fragment } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { styles } from "./UI";
import { colors, space } from "@/theme/tokens";
export async function openHttps(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password)
    throw Error("INVALID_LINK");
  await Linking.openURL(parsed.href);
}
function Inline({
  text,
  onError,
}: {
  text: string;
  onError: (e: unknown) => void;
}) {
  const parts = text.split(
    /(\[[^\]]+\]\(https:\/\/[^\s)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g,
  );
  return (
    <>
      {parts.map((part, i) => {
        const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/);
        if (link)
          return (
            <Text
              key={i}
              accessibilityRole="link"
              style={{ color: colors.primary, textDecorationLine: "underline" }}
              onPress={() => {
                void openHttps(link[2]!).catch(onError);
              }}
            >
              {link[1]}
            </Text>
          );
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <Text key={i} style={styles.code}>
              {part.slice(1, -1)}
            </Text>
          );
        if (part.startsWith("**") && part.endsWith("**"))
          return (
            <Text key={i} style={{ fontWeight: "700" }}>
              {part.slice(2, -2)}
            </Text>
          );
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
export function Reading({
  body,
  onError,
}: {
  body: string;
  onError: (e: unknown) => void;
}) {
  const blocks = body.replaceAll("\r\n", "\n").split(/\n\s*\n/);
  return (
    <View style={{ gap: space.xl }}>
      {blocks.map((block, i) => {
        if (block.startsWith("```"))
          return (
            <ScrollView horizontal key={i}>
              <Text selectable style={styles.code}>
                {block.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "")}
              </Text>
            </ScrollView>
          );
        if (block.trim().startsWith("|")) {
          const rows = block
            .trim()
            .split("\n")
            .filter((line) => !/^\s*\|?[ :|\-]+\|?\s*$/.test(line));
          return (
            <ScrollView key={i} horizontal>
              <View>
                {rows.map((line, row) => (
                  <View
                    key={row}
                    style={{
                      flexDirection: "row",
                      borderBottomWidth: 1,
                      borderBottomColor: colors.outline,
                    }}
                  >
                    {line
                      .trim()
                      .replace(/^\||\|$/g, "")
                      .split("|")
                      .map((cell, column) => (
                        <Text
                          key={column}
                          selectable
                          style={[
                            styles.body,
                            {
                              width: 120,
                              padding: space.md,
                              fontWeight: row === 0 ? "600" : "400",
                            },
                          ]}
                        >
                          {cell.trim()}
                        </Text>
                      ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }
        const heading = block.match(/^(#{1,4})\s+([^\n]+)$/);
        return (
          <Text
            key={i}
            accessibilityRole={heading ? "header" : undefined}
            selectable
            style={heading ? styles.subtitle : styles.body}
          >
            <Inline text={heading ? heading[2]! : block} onError={onError} />
          </Text>
        );
      })}
    </View>
  );
}
