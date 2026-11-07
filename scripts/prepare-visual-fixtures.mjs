// Visual QA only: obtain an authenticated pretest attempt for the Demo fixture.
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const fpath = ".secrets/m1-test-fixtures.json",
  fixture = JSON.parse(await readFile(fpath, "utf8"));
const config = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .trim()
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
);
async function client(role) {
  const a = fixture.accounts.find((a) => a.role === role);
  assert.ok(a);
  const c = createClient(
    config.EXPO_PUBLIC_SUPABASE_URL,
    config.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  assert.ifError(
    (await c.auth.signInWithPassword({ email: a.email, password: a.password }))
      .error,
  );
  return c;
}
const student = await client("studentB"),
  teacher = await client("teacherA");
const { data, error } = await student.rpc("mobile_learning", {
  p_action: "start",
  p_payload: { kind: "PRETEST" },
});
assert.ifError(error);
assert.ok(data?.data?.id, JSON.stringify(data?.error));
fixture.visualAttemptId = data.data.id;
const recorded = await teacher.rpc("mobile_attendance", {
  p_action: "correct",
  p_payload: {
    sessionId: fixture.attendanceSession,
    studentId: fixture.accounts.find((a) => a.role === "studentB").id,
    state: "present",
    reason: "Synthetic visual QA attendance",
    revision: 0,
  },
});
assert.ifError(recorded.error);
assert.ok(recorded.data?.data, JSON.stringify(recorded.data?.error));
await writeFile(fpath, JSON.stringify(fixture, null, 2), { mode: 0o600 });
console.log(
  "Visual Demo attempt and teacher-recorded attendance ready. No real student data changed.",
);
