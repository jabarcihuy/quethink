import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import {
  IconBadge,
  classroomStyles,
  useVisualText,
} from "@/components/ClassroomUI";
import { Page } from "@/components/Page";
import { Button } from "@/components/Button";
import {
  Field,
  RequireAccount,
  TextAction,
  ErrorText,
  useAccountText,
  ui,
} from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { accountRepository, AccountError } from "@/features/account/repository";
import { requireSupabase } from "@/lib/supabase/client";
export default function ProfileScreen() {
  return (
    <RequireAccount>
      <ProfileForm />
    </RequireAccount>
  );
}
function ProfileForm() {
  const auth = useAuth(),
    profile = auth.profile!,
    text = useAccountText(),
    v = useVisualText();
  const [name, setName] = useState(profile.displayName ?? ""),
    [nim, setNim] = useState(profile.nim ?? ""),
    [birth, setBirth] = useState(profile.birthDate ?? "");
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null),
    [remove, setRemove] = useState(false),
    [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let active = true;
    if (profile.avatarPath)
      void requireSupabase()
        .storage.from("avatars")
        .createSignedUrl(profile.avatarPath, 3600)
        .then(({ data }) => {
          if (active) setImageUrl(data?.signedUrl ?? null);
        });
    return () => {
      active = false;
    };
  }, [profile.avatarPath]);
  async function choosePhoto() {
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!picked.canceled) {
        setPhoto(picked.assets[0] ?? null);
        setRemove(false);
      }
    } catch (failure) {
      setError(failure);
    }
  }
  async function save() {
    if (!name.trim() || (profile.role === "student" && !nim.trim())) {
      setError(new AccountError("PROFILE_INCOMPLETE"));
      return;
    }
    setBusy(true);
    setError(null);
    let uploaded: string | null = null;
    try {
      let avatarPath = remove ? null : profile.avatarPath;
      if (photo) {
        const file = new File(photo.uri),
          mime = photo.mimeType ?? "image/jpeg";
        if (
          !file.exists ||
          file.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(mime)
        )
          throw new AccountError("PHOTO_INVALID");
        const extension =
          mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
        const path = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
        const { error: failure } = await requireSupabase()
          .storage.from("avatars")
          .upload(path, await file.arrayBuffer(), {
            contentType: mime,
            upsert: false,
          });
        if (failure) throw failure;
        avatarPath = path;
        uploaded = path;
      }
      await accountRepository.updateProfile({
        displayName: name.trim(),
        nim: profile.role === "student" ? nim.trim() : null,
        birthDate: birth.trim() || null,
        avatarPath,
      });
      uploaded = null;
      if (profile.avatarPath && profile.avatarPath !== avatarPath)
        await requireSupabase()
          .storage.from("avatars")
          .remove([profile.avatarPath]);
      if (await auth.refresh()) router.replace("/home");
    } catch (failure) {
      if (uploaded)
        await requireSupabase().storage.from("avatars").remove([uploaded]);
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  const source = photo?.uri ?? (!remove ? imageUrl : null);
  return (
    <Page>
      <View style={classroomStyles.header}>
        <IconBadge name="user" tone="apricot" />
        <View style={classroomStyles.grow}>
          <Text accessibilityRole="header" style={classroomStyles.headline}>
            {profile.profileComplete ? v.profile : text.completeProfile}
          </Text>
          <Text style={ui.label}>
            {profile.role === "student" ? v.student : v.teacher}
          </Text>
        </View>
      </View>
      <Text style={ui.body}>
        {profile.role === "student"
          ? text.profileBody
          : text.teacherProfileBody}
      </Text>
      {source ? (
        <Image
          source={{ uri: source }}
          style={{ width: 88, height: 88, borderRadius: 16 }}
          contentFit="cover"
          accessibilityLabel={text.choosePhoto}
        />
      ) : null}
      <TextAction
        label={text.choosePhoto}
        disabled={busy}
        onPress={() => {
          void choosePhoto();
        }}
      />
      {(photo || profile.avatarPath) && !remove ? (
        <TextAction
          label={text.removePhoto}
          disabled={busy}
          onPress={() => {
            setPhoto(null);
            setRemove(true);
          }}
        />
      ) : null}
      <Field
        label={text.name}
        value={name}
        onChangeText={setName}
        maxLength={100}
        autoComplete="name"
        editable={!busy}
      />
      {profile.role === "student" ? (
        <Field
          label={text.nim}
          value={nim}
          onChangeText={setNim}
          maxLength={64}
          autoCapitalize="none"
          editable={!busy}
        />
      ) : null}
      <Field
        label={text.birthDate}
        value={birth}
        onChangeText={setBirth}
        placeholder="YYYY-MM-DD"
        maxLength={10}
        autoCapitalize="none"
        editable={!busy}
      />
      <ErrorText error={error} />
      <Button
        label={text.saveProfile}
        busy={busy}
        onPress={() => {
          void save();
        }}
      />
      {profile.profileComplete ? (
        <TextAction
          label={text.home}
          disabled={busy}
          onPress={() => router.replace("/home")}
        />
      ) : null}
      <TextAction
        label={text.signOut}
        disabled={busy}
        onPress={() => {
          setBusy(true);
          void auth
            .signOut()
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      />
    </Page>
  );
}
