// Synthetic fixture-only integration checks; credentials stay in .secrets.
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const config = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .trim()
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
);
const fixture = JSON.parse(
  await readFile(".secrets/m1-test-fixtures.json", "utf8"),
);
const clients = {};
for (const a of fixture.accounts) {
  const c = createClient(
    config.EXPO_PUBLIC_SUPABASE_URL,
    config.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  assert.ifError(
    (await c.auth.signInWithPassword({ email: a.email, password: a.password }))
      .error,
  );
  clients[a.role] = c;
}
async function rpc(c, name, args = {}) {
  const { data, error } = await c.rpc(`mobile_${name}`, args);
  assert.ifError(error);
  return data;
}
const teacher = clients.teacherA,
  student = clients.studentA,
  studentB = clients.studentB;
if (process.argv[2] === "archive") {
  const classId = fixture.attendanceClass,
    sessionId = fixture.attendanceSession;
  assert.equal(
    (await rpc(teacher, "archive_class", { p_class_id: classId })).data.status,
    "archived",
  );
  const detail = await rpc(teacher, "attendance", {
    p_action: "session",
    p_payload: { sessionId },
  });
  assert.equal(detail.data.session.status, "closed");
  assert.equal(
    (
      await rpc(student, "attendance", {
        p_action: "scan",
        p_payload: { sessionId, token: "b".repeat(64) },
      })
    ).error.code,
    "CLASS_ARCHIVED",
  );
  assert.equal(
    (
      await rpc(teacher, "attendance", {
        p_action: "qr",
        p_payload: { sessionId },
      })
    ).error.code,
    "CLASS_ARCHIVED",
  );
  assert.ok(
    (await rpc(student, "attendance", { p_action: "list", p_payload: {} })).data
      .items.length,
  );
  console.log(
    "Hosted archive closes the session, rejects QR/scan, and preserves history.",
  );
  process.exit(0);
}
if (process.argv[2] === "qr") {
  const code = await rpc(teacher, "attendance", {
    p_action: "qr",
    p_payload: { sessionId: fixture.attendanceSession },
  });
  assert.ok(code.data?.value);
  const QRCode = (await import("qrcode")).default;
  await QRCode.toFile("/tmp/quethink-attendance-qr.png", code.data.value, {
    width: 1024,
    margin: 4,
  });
  console.log("Fresh synthetic QR image prepared; token omitted.");
  process.exit(0);
}
const template = (await rpc(teacher, "list_templates")).data[0].id;
let classId = fixture.attendanceClass;
if (!classId) {
  const c = (
    await rpc(teacher, "create_class", {
      p_name: "Synthetic attendance class",
      p_template_id: template,
    })
  ).data;
  assert.ok(c?.id);
  classId = c.id;
  fixture.classes.push(c.id);
  fixture.attendanceClass = classId;
  await writeFile(
    ".secrets/m1-test-fixtures.json",
    JSON.stringify(fixture, null, 2),
    { mode: 0o600 },
  );
  for (const [i, client] of [student, studentB].entries()) {
    assert.ok(
      (
        await rpc(client, "update_my_profile", {
          p_display_name: i ? "Synthetic student B" : "Synthetic student A",
          p_nim: `Attendance-00${i + 1}`,
          p_avatar_path: null,
          p_birth_date: null,
        })
      ).data,
    );
    assert.ok((await rpc(client, "join_class", { p_code: c.joinCode })).data);
  }
}
const att = (client, action, payload = {}) =>
  rpc(client, "attendance", { p_action: action, p_payload: payload });
const concurrent = await Promise.all(
  Array.from({ length: 2 }, () =>
    att(teacher, "start", {
      classId,
      title: "Synthetic QR session",
      minutes: 180,
    }),
  ),
);
assert.equal(concurrent.filter((v) => v.data).length, 1);
assert.equal(
  concurrent.filter((v) => v.error?.code === "SESSION_ALREADY_OPEN").length,
  1,
);
const session = concurrent.find((v) => v.data).data.session;
fixture.attendanceSession = session.id;
await writeFile(
  ".secrets/m1-test-fixtures.json",
  JSON.stringify(fixture, null, 2),
  { mode: 0o600 },
);
const code = (await att(teacher, "qr", { sessionId: session.id })).data;
const parts = code.value.split(":");
const scan = { sessionId: parts[2], token: parts[3] };
const scans = await Promise.all(
  Array.from({ length: 4 }, () => att(student, "scan", scan)),
);
assert.equal(scans.filter((v) => v.data?.alreadyRecorded === false).length, 1);
assert.equal(scans.filter((v) => v.data?.alreadyRecorded === true).length, 3);
assert.equal(
  (await att(clients.teacherB, "session", { sessionId: session.id })).error
    .code,
  "FORBIDDEN",
);
assert.equal(
  (await att(clients.guesser, "scan", scan)).error.code,
  "FORBIDDEN",
);
assert.equal(
  (await att(student, "roster", { sessionId: session.id })).error.code,
  "FORBIDDEN",
);
const studentId = fixture.accounts.find((a) => a.role === "studentA").id;
const corrections = await Promise.all(
  ["sick", "excused"].map((state) =>
    att(teacher, "correct", {
      sessionId: session.id,
      studentId,
      state,
      reason: "Synthetic concurrency check",
      revision: 1,
    }),
  ),
);
assert.equal(corrections.filter((v) => v.data).length, 1);
assert.equal(
  corrections.filter((v) => v.error?.code === "REVISION_CONFLICT").length,
  1,
);
assert.equal(
  (await att(student, "scan", scan)).data.session.record.source,
  "manual",
);
assert.equal(
  (await att(studentB, "scan", { ...scan, token: "b".repeat(64) })).error.code,
  "QR_EXPIRED",
);
assert.equal(
  (await att(teacher, "record", { sessionId: session.id, studentId })).data
    .audit.length,
  1,
);
assert.ok(
  !JSON.stringify((await att(student, "list")).data).includes(scan.token),
);
console.log(
  "Hosted attendance: concurrent opens, four concurrent scans, CAS correction, role/class privacy, invalid QR and audit passed. Synthetic session left open for Android UI verification.",
);
