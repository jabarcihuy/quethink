import { ScrollView, Text, View } from "react-native";
import { Field } from "@/components/AccountUI";
import { styles, useLearningText, useCycleText } from "./UI";
import { colors, space } from "@/theme/tokens";
export function QueryTable({
  names,
  rows,
}: {
  names: string[];
  rows: (string | number | null)[][];
}) {
  const c = useCycleText();
  const widths = names.map((n, i) =>
    Math.min(
      200,
      Math.max(
        96,
        Math.max(n.length, ...rows.map((r) => String(r[i] ?? "NULL").length)) *
          9 +
          24,
      ),
    ),
  );
  return (
    <View style={styles.section}>
      <ScrollView horizontal>
        <View>
          <View style={{ flexDirection: "row" }}>
            {names.map((n, i) => (
              <Text
                key={i}
                selectable
                style={[styles.label, { width: widths[i], padding: space.md }]}
              >
                {n}
              </Text>
            ))}
          </View>
          {rows.map((row, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                borderTopWidth: 1,
                borderColor: colors.outline,
              }}
            >
              {row.map((v, j) => (
                <Text
                  key={j}
                  selectable
                  style={[styles.code, { width: widths[j], padding: space.md }]}
                >
                  {v === null ? "NULL" : String(v)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {!rows.length ? <Text style={styles.caption}>{c.emptyRows}</Text> : null}
    </View>
  );
}
export function SqlDataset() {
  const c = useCycleText(),
    t = useLearningText();
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t.dataset}</Text>
      <ScrollView horizontal>
        <Text selectable style={styles.code}>
          {c.schema}
        </Text>
      </ScrollView>
      <QueryTable
        names={["id", "name", "cohort"]}
        rows={[
          [1, "Alya", 2025],
          [2, "Bima", 2024],
          [3, "Citra", 2025],
        ]}
      />
    </View>
  );
}
export function SqlEditor({
  value,
  onChangeText,
  disabled = false,
  label,
}: {
  value: string;
  onChangeText: (s: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const t = useLearningText();
  return (
    <Field
      label={label ?? t.sqlAnswer}
      value={value}
      onChangeText={onChangeText}
      multiline
      autoCapitalize="none"
      autoCorrect={false}
      maxLength={4096}
      editable={!disabled}
      style={[
        styles.code,
        { minHeight: 144, maxHeight: 288, textAlignVertical: "top" },
      ]}
    />
  );
}
