import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import { Field } from "@/components/AccountUI";
import {
  learningRepository,
  type Material,
  type Attachment,
} from "./repository";
import {
  useLearningText,
  useCycleText,
  Radio,
  LearningError,
  styles,
} from "./UI";
export function MaterialForm({
  material: m,
  newClassId,
}: {
  material: Material;
  newClassId?: string;
}) {
  const t = useLearningText(),
    c = useCycleText();
  const [title, setTitle] = useState(m.title),
    [body, setBody] = useState(m.body),
    [lab, setLab] = useState(m.requiresLab),
    [labKind, setLabKind] = useState<"filter" | "update">(
      m.labKind ?? "filter",
    ),
    [pdf, setPdf] = useState(
      m.attachments.find((a) => a.type === "pdf")?.url ?? "",
    ),
    [video, setVideo] = useState(
      m.attachments.find((a) => a.type === "video")?.url ?? "",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      const attachments: Attachment[] = [];
      for (const [kind, url] of [
        ["pdf", pdf],
        ["video", video],
      ] as const)
        if (url.trim()) {
          const parsed = new URL(url.trim());
          if (
            parsed.protocol !== "https:" ||
            parsed.username ||
            parsed.password
          )
            throw { code: "VALIDATION_ERROR" };
          attachments.push({
            type: kind,
            title: kind === "pdf" ? "PDF" : "Video",
            url: parsed.href,
          });
        }
      if (newClassId)
        await learningRepository.add(newClassId, {
          title: title.trim(),
          body,
          requiresLab: lab,
          labKind,
          attachments,
        });
      else
        await learningRepository.edit(m.id, {
          title: title.trim(),
          body,
          requiresLab: lab,
          labKind,
          attachments,
        });
      router.back();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Stack.Screen options={{ title: newClassId ? t.addMaterial : t.edit }} />
      <Field
        label={t.title}
        value={title}
        onChangeText={setTitle}
        maxLength={200}
        editable={!busy && !m.archived}
      />
      <Field
        label={t.body}
        value={body}
        onChangeText={setBody}
        maxLength={100000}
        style={{ minHeight: 240, maxHeight: 360, textAlignVertical: "top" }}
        multiline
        editable={!busy && !m.archived}
      />
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={t.requiresLab}
        accessibilityState={{ checked: lab, disabled: busy || m.archived }}
        disabled={busy || m.archived}
        onPress={() => setLab(!lab)}
        style={[styles.row, { minHeight: 48 }]}
      >
        <Text style={[styles.body, styles.grow]}>{t.requiresLab}</Text>
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        >
          <Switch value={lab} disabled={busy || m.archived} />
        </View>
      </Pressable>
      <Text style={styles.caption}>{c.labTeacher}</Text>
      {lab ? (
        <View style={styles.section}>
          <Text style={styles.label}>{c.labTask}</Text>
          {(["filter", "update"] as const).map((k) => (
            <Radio
              key={k}
              label={k === "filter" ? c.filterTask : c.updateTask}
              selected={labKind === k}
              disabled={busy || m.archived}
              onPress={() => setLabKind(k)}
            />
          ))}
        </View>
      ) : null}
      <Field
        label={t.pdf}
        value={pdf}
        onChangeText={setPdf}
        keyboardType="url"
        autoCapitalize="none"
        editable={!busy && !m.archived}
      />
      <Field
        label={t.video}
        value={video}
        onChangeText={setVideo}
        keyboardType="url"
        autoCapitalize="none"
        editable={!busy && !m.archived}
      />
      <LearningError error={error} />
      <Button
        label={t.saveMaterial}
        busy={busy}
        disabled={m.archived || !title.trim()}
        onPress={() => {
          void save();
        }}
      />
    </Page>
  );
}
