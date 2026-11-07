// Integration fixtures only. Requires explicit setup and later cleanup through MCP.
import { readFile, writeFile, chmod, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const config = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .trim()
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
);
const url = config.EXPO_PUBLIC_SUPABASE_URL,
  key = config.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const file = ".secrets/m1-test-fixtures.json";
const client = () =>
  createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
async function save(value) {
  await mkdir(".secrets", { recursive: true, mode: 0o700 });
  await writeFile(file, JSON.stringify(value, null, 2), { mode: 0o600 });
  await chmod(file, 0o600);
}
async function rpc(c, name, args = {}) {
  const { data, error } = await c.rpc(`mobile_${name}`, args);
  if (error) throw error;
  return data;
}
if (process.argv[2] === "setup") {
  try {
    await readFile(file);
    throw new Error("Existing fixtures must be cleaned up before setup.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const settings = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
  }).then((r) => r.json());
  assert.equal(
    settings.mailer_autoconfirm,
    true,
    "Do not create email fixtures if confirmation messages would be sent.",
  );
  const group = randomUUID().replaceAll("-", "").slice(0, 12),
    fixtures = { group, accounts: [], classes: [], objects: [] };
  await save(fixtures);
  for (const role of [
    "teacherA",
    "teacherB",
    "studentA",
    "studentB",
    "incomplete",
    "guesser",
  ]) {
    const email = `m1-${group}-${role.toLowerCase()}@example.com`,
      password = `${randomUUID()}Aa1`;
    const { data, error } = await client().auth.signUp({
      email,
      password,
      options: { data: { role: "ADMIN", test_fixture: group } },
    });
    if (error) throw error;
    assert.ok(data.session);
    fixtures.accounts.push({ role, id: data.user.id, email, password });
    await save(fixtures);
  }
  console.log(
    JSON.stringify({
      group,
      accounts: fixtures.accounts.map(({ role, id }) => ({ role, id })),
    }),
  );
} else if (process.argv[2] === "test") {
  const fixture = JSON.parse(await readFile(file, "utf8")),
    clients = {};
  for (const account of fixture.accounts) {
    const c = client();
    const { error } = await c.auth.signInWithPassword(account);
    if (error) throw error;
    clients[account.role] = c;
  }
  const { teacherA, teacherB, studentA, studentB, incomplete, guesser } =
    clients;
  for (const name of ["teacherA", "teacherB"]) {
    assert.equal(
      (await rpc(clients[name], "get_my_profile")).data.role,
      "teacher",
    );
    await rpc(clients[name], "update_my_profile", {
      p_display_name: `Synthetic ${name}`,
    });
  }
  for (const name of ["studentA", "studentB", "guesser"]) {
    assert.equal(
      (await rpc(clients[name], "get_my_profile")).data.role,
      "student",
    );
    await rpc(clients[name], "update_my_profile", {
      p_display_name: `Synthetic ${name}`,
      p_nim: `001-${name}`,
    });
  }
  const template = (await rpc(teacherA, "list_templates")).data[0].id;
  for (const [c, name] of [
    [teacherA, "Class A"],
    [teacherA, "Class B"],
    [teacherB, "Class C"],
  ]) {
    const result = await rpc(c, "create_class", {
      p_name: `Synthetic ${fixture.group} ${name}`,
      p_template_id: template,
    });
    assert.ok(result.data);
    fixture.classes.push(result.data);
    await save(fixture);
  }
  const [a, b, c] = fixture.classes;
  assert.equal(
    (await rpc(incomplete, "join_class", { p_code: a.joinCode })).error.code,
    "PROFILE_INCOMPLETE",
  );
  assert.equal(
    (await rpc(teacherB, "archive_class", { p_class_id: a.id })).error.code,
    "FORBIDDEN",
  );
  assert.equal(
    (await rpc(teacherB, "get_class_roster", { p_class_id: a.id })).error.code,
    "FORBIDDEN",
  );
  assert.equal(
    (
      await studentA
        .from("profiles")
        .update({ role: "ADMIN" })
        .eq("id", fixture.accounts.find((a) => a.role === "studentA").id)
    ).error.code,
    "42501",
  );
  const first = await rpc(studentA, "join_class", { p_code: a.joinCode });
  assert.ok(first.data);
  assert.equal(
    (await rpc(studentA, "join_class", { p_code: a.joinCode })).data.id,
    first.data.id,
  );
  const race = await Promise.all([
    rpc(studentB, "join_class", { p_code: a.joinCode }),
    rpc(studentB, "join_class", { p_code: b.joinCode }),
  ]);
  assert.equal(race.filter((r) => r.data).length, 1);
  assert.equal(
    race.filter((r) => r.error?.code === "ALREADY_JOINED").length,
    1,
  );
  assert.equal((await rpc(studentA, "get_my_class")).data.joinCode, null);
  assert.equal(
    (await rpc(studentA, "get_dashboard", { p_class_id: c.id })).error.code,
    "FORBIDDEN",
  );
  assert.equal((await studentA.from("profiles").select("id")).data.length, 1);
  assert.equal((await teacherB.from("classes").select("id")).data.length, 1);
  assert.ok((await client().rpc("mobile_get_my_profile")).error);
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await rpc(guesser, "resolve_class_code", { p_code: "invalid" })).error
        .code,
      "CLASS_CODE_INVALID",
    );
  assert.equal(
    (await rpc(guesser, "resolve_class_code", { p_code: a.joinCode })).error
      .code,
    "RATE_LIMITED",
  );
  await rpc(teacherB, "archive_class", { p_class_id: c.id });
  assert.equal(
    (await rpc(studentA, "join_class", { p_code: c.joinCode })).error.code,
    "CLASS_ARCHIVED",
  );
  const roster = (await rpc(teacherA, "get_class_roster", { p_class_id: a.id }))
    .data;
  assert.ok(
    roster.some(
      (s) => s.id === fixture.accounts.find((u) => u.role === "studentA").id,
    ),
  );
  assert.ok(!("birthDate" in roster[0]));
  const photo = `${fixture.accounts.find((u) => u.role === "studentA").id}/integration.png`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = await studentA.storage
    .from("avatars")
    .upload(photo, png, { contentType: "image/png" });
  assert.ifError(upload.error);
  fixture.objects.push({ role: "studentA", path: photo });
  await save(fixture);
  assert.ok(
    (await studentB.storage.from("avatars").createSignedUrl(photo, 60)).error,
  );
  const own = await studentA.storage.from("avatars").createSignedUrl(photo, 60);
  assert.ifError(own.error);
  assert.ok((await fetch(own.data.signedUrl)).ok);
  fixture.tested = true;
  await save(fixture);
  console.log(
    "Hosted Auth/Data API integration passed: real JWTs, role protection, owner RLS, concurrent join, quota, archive, roster privacy, private avatars.",
  );
} else if (process.argv[2] === "remove-objects") {
  const fixture = JSON.parse(await readFile(file, "utf8"));
  for (const account of fixture.accounts) {
    const c = client();
    const { error } = await c.auth.signInWithPassword(account);
    if (error) throw error;
    // Includes avatar uploads created by the native walkthrough, scoped to fixture UID.
    const listed = await c.storage
      .from("avatars")
      .list(account.id, { limit: 100 });
    assert.ifError(listed.error);
    const paths = listed.data
      .filter((object) => object.id)
      .map((object) => `${account.id}/${object.name}`);
    if (paths.length) {
      const removed = await c.storage.from("avatars").remove(paths);
      assert.ifError(removed.error);
    }
    await c.auth.signOut();
  }
  console.log(
    "Fixture Storage objects removed. Remove only manifest user/class IDs through MCP, then delete the private manifest.",
  );
} else
  throw new Error(
    "Use setup, test, or remove-objects. This script never removes real accounts.",
  );
