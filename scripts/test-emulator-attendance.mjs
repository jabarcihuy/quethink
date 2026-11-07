// Real Android camera test support. Only synthetic fixtures; never submits a scan.
import { readFile, writeFile, chmod } from "node:fs/promises";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import pngjs from "pngjs";
const config = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .trim()
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
);
const file = ".secrets/m1-test-fixtures.json",
  fixture = JSON.parse(await readFile(file, "utf8"));
async function login(role) {
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
async function rpc(c, name, args = {}) {
  const { data, error } = await c.rpc(`mobile_${name}`, args);
  assert.ifError(error);
  assert.ok(data && !data.error, JSON.stringify(data?.error));
  return data.data;
}
const action = process.argv[2],
  teacher = await login("teacherA");
const att = (c, action, payload) =>
  rpc(c, "attendance", { p_action: action, p_payload: payload });
async function save() {
  await writeFile(file, JSON.stringify(fixture, null, 2), { mode: 0o600 });
}
if (action === "setup") {
  assert.ok(!fixture.attendanceClass, "Use a fresh fixture group.");
  const template = (await rpc(teacher, "list_templates"))[0].id;
  const c = await rpc(teacher, "create_class", {
    p_name: "Synthetic emulator optical class",
    p_template_id: template,
  });
  fixture.attendanceClass = c.id;
  fixture.classes.push(c.id);
  await save();
  for (const [i, role] of ["studentA", "studentB"].entries()) {
    const s = await login(role);
    await rpc(s, "update_my_profile", {
      p_display_name: `Synthetic camera student ${i ? "B" : "A"}`,
      p_nim: `Optical-00${i + 1}`,
      p_avatar_path: null,
      p_birth_date: null,
    });
    await rpc(s, "join_class", { p_code: c.joinCode });
  }
  const s = await att(teacher, "start", {
    classId: c.id,
    title: "Synthetic optical QR session",
    minutes: 60,
  });
  fixture.attendanceSession = s.session.id;
  await save();
  console.log(
    "Synthetic class/session ready; neither student has an attendance record.",
  );
} else if (action === "qr") {
  const code = await att(teacher, "qr", {
    sessionId: fixture.attendanceSession,
  });
  assert.match(code.value, /^quethink-attendance:v1:/);
  const { PNG } = pngjs,
    qr = PNG.sync.read(
      await QRCode.toBuffer(code.value, {
        width: 400,
        margin: 6,
        errorCorrectionLevel: "M",
      }),
    );
  const canvas = new PNG({ width: 1024, height: 1024 });
  canvas.data.fill(255);
  PNG.bitblt(qr, canvas, 0, 0, 400, 400, 72, 312);
  await writeFile("/tmp/quethink-optical-camera.png", PNG.sync.write(canvas));
  await chmod("/tmp/quethink-optical-camera.png", 0o600);
  console.log(
    "Fresh real attendance QR supplied to camera image; token omitted.",
  );
} else if (action === "verify") {
  const s = await att(await login("studentB"), "session", {
    sessionId: fixture.attendanceSession,
  });
  assert.equal(s.session.record?.state, "present");
  assert.equal(s.session.record?.source, "qr");
  assert.equal(s.session.record?.revision, 1);
  console.log(
    "Server verified student B: present, source=qr, revision=1. This script never calls scan.",
  );
} else if (action === "close") {
  assert.equal(
    (await att(teacher, "close", { sessionId: fixture.attendanceSession }))
      .session.status,
    "closed",
  );
  console.log("Synthetic session closed by teacher.");
} else throw Error("Use setup, qr, verify, or close.");
