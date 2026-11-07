import { useEffect, useRef, useState } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ActivityIndicator, Text } from "react-native";
import { Page } from "@/components/Page";
import { TextAction, useAccountText, ui } from "@/components/AccountUI";
import { requireSupabase } from "@/lib/supabase/client";
import { colors } from "@/theme/tokens";
export default function AuthCallback() {
  const url = Linking.useLinkingURL(),
    pending = useRef<{
      url: string;
      promise: Promise<"/home" | "/reset-password">;
    } | null>(null),
    text = useAccountText();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = !url || failedUrl === url;
  useEffect(() => {
    if (!url) return;
    let active = true;
    async function exchange() {
      const parsed = new URL(url!);
      if (
        parsed.protocol !== "quethink:" ||
        parsed.hostname !== "auth" ||
        parsed.pathname !== "/callback" ||
        parsed.searchParams.has("error")
      )
        throw new Error("Invalid callback");
      const code = parsed.searchParams.get("code");
      if (!code || code.length > 2048) throw new Error("Invalid callback");
      const client = requireSupabase();
      let recovery = false;
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") recovery = true;
      });
      try {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
        return recovery ? ("/reset-password" as const) : ("/home" as const);
      } finally {
        subscription.unsubscribe();
      }
    }
    if (pending.current?.url !== url)
      pending.current = { url, promise: exchange() };
    void pending.current.promise
      .then((route) => {
        if (active) {
          Linking.clearInitialURL();
          router.replace(route);
        }
      })
      .catch(() => {
        if (active) {
          Linking.clearInitialURL();
          setFailedUrl(url);
        }
      });
    return () => {
      active = false;
    };
  }, [url]);
  return (
    <Page>
      {failed ? (
        <>
          <Text style={ui.body}>{text.linkError}</Text>
          <TextAction
            label={text.forgot}
            onPress={() => router.replace("/forgot-password")}
          />
          <TextAction
            label={text.backLogin}
            onPress={() => router.replace("/login")}
          />
        </>
      ) : (
        <ActivityIndicator
          color={colors.primary}
          accessibilityLabel={text.loading}
        />
      )}
    </Page>
  );
}
