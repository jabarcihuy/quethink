import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { handleAi } from "./handler.mjs";

const url = Deno.env.get("SUPABASE_URL")!;
const publicKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
const publicKey = publicKeys
  ? (JSON.parse(publicKeys).default as string)
  : Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve((req: Request) =>
  handleAi(req, {
    async authorize(token: string) {
      const client = createClient(url, publicKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const user = await client.auth.getUser(token);
      if (user.error || !user.data.user) return null;
      return {
        async access(reserve: boolean) {
          const result = await client.rpc("mobile_ai_access", {
            p_reserve: reserve,
          });
          if (result.error || typeof result.data !== "string")
            throw new Error("ACCESS_UNAVAILABLE");
          return result.data;
        },
      };
    },
    async complete(message: string, language: string) {
      const key = Deno.env.get("AI_API_KEY");
      const base = Deno.env.get("AI_BASE_URL");
      const model = Deno.env.get("AI_MODEL");
      if (!key || !base || !model) throw new Error("AI_NOT_CONFIGURED");
      const target = new URL(`${base.replace(/\/$/, "")}/chat/completions`);
      if (
        target.protocol !== "https:" ||
        target.hostname !== "router.bynara.id"
      )
        throw new Error("INVALID_AI_ENDPOINT");
      const response = await fetch(target, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `You are Quethink, a concise database and SQL learning tutor. Explain concepts and guide the learner; do not claim to know their private class data. Reply in ${language === "id" ? "Indonesian" : "English"}.`,
            },
            { role: "user", content: message },
          ],
          max_tokens: 800,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (
        !response.ok ||
        Number(response.headers.get("content-length") ?? 0) > 100000
      )
        throw new Error("PROVIDER_ERROR");
      const text = await response.text();
      if (text.length > 100000) throw new Error("PROVIDER_ERROR");
      const value = JSON.parse(text);
      return value?.choices?.[0]?.message?.content;
    },
  }),
);
