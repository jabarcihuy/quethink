import test from "node:test";
import assert from "node:assert/strict";
import { createSecureStorage } from "../src/lib/supabase/secure-storage";

test("secure session chunks round trip large Unicode payloads and serialize concurrent updates", async () => {
  const data = new Map<string, string>();
  const store = createSecureStorage({
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      assert.ok(Buffer.byteLength(v) < 2048);
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
  });
  const value = JSON.stringify({ session: "🔐".repeat(2000) });
  await store.setItem("session", value);
  assert.equal(await store.getItem("session"), value);
  await Promise.all([
    store.setItem("session", "first"),
    store.setItem("session", "last"),
  ]);
  assert.equal(await store.getItem("session"), "last");
  assert.equal(data.size, 2);
  await store.removeItem("session");
  assert.equal(await store.getItem("session"), null);
  assert.equal(data.size, 0);
});
test("failed secure write keeps the previous committed session readable", async () => {
  const data = new Map<string, string>();
  let fail = false;
  const store = createSecureStorage({
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      if (fail && k !== "session") throw new Error("disk full");
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
  });
  await store.setItem("session", "previous");
  fail = true;
  await assert.rejects(store.setItem("session", "replacement"));
  assert.equal(await store.getItem("session"), "previous");
});
