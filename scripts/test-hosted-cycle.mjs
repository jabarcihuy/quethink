import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const cfg = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split("\n")
    .filter((x) => x.includes("="))
    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
);
const file = ".secrets/m1-test-fixtures.json",
  f = JSON.parse(await readFile(file, "utf8"));
const clients = {};
async function save() {
  await writeFile(file, JSON.stringify(f, null, 2), { mode: 0o600 });
}
async function login(role) {
  if (clients[role]) return clients[role];
  const c = createClient(
    cfg.EXPO_PUBLIC_SUPABASE_URL,
    cfg.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await c.auth.signInWithPassword(
    f.accounts.find((a) => a.role === role),
  );
  assert.ifError(error);
  clients[role] = c;
  return c;
}
async function rpc(c, name, p = {}) {
  const { data, error } = await c.rpc("mobile_" + name, p);
  assert.ifError(error);
  return data;
}
const learn = (c, a, p = {}) =>
  rpc(c, "learning", { p_action: a, p_payload: p });
async function data(c, a, p = {}) {
  const r = await learn(c, a, p);
  assert.ok(r.data, JSON.stringify(r.error));
  return r.data;
}
async function edge(c, body) {
  const r = await c.functions.invoke("mobile-grade", { body });
  if (r.error?.context?.json) return r.error.context.json();
  assert.ifError(r.error);
  return r.data;
}
const bank = (c, id, kind) => data(c, "bank", { classId: id, kind });
async function finish(c, teacher, id, kind = "PRETEST") {
  const b = await bank(teacher, id, kind),
    started = await data(c, "start", { kind }),
    a = await data(c, "attempt", { attemptId: started.id });
  if (a.status === "completed") return a;
  const answers = {};
  for (const q of a.questions) {
    const original = b.questions.find((x) => x.id === q.id);
    answers[q.id] =
      q.kind === "sql"
        ? original.reference
        : q.options.find(
            (o) =>
              o.text ===
              original.options.find((o) => o.id === original.correct).text,
          ).id;
  }
  await data(c, "save", { attemptId: a.id, revision: a.revision, answers });
  await data(c, "submit", { attemptId: a.id });
  await edge(c, { attemptId: a.id });
  for (let i = 0; i < 20; i++) {
    const r = await data(c, "attempt", { attemptId: a.id });
    if (r.status === "completed") {
      assert.equal(r.score, 100);
      return r;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw Error("Grading timeout");
}
async function completeMaterials(c) {
  for (const m of await data(c, "materials")) {
    if (m.requiresLab) {
      const material = await data(c, "material", { materialId: m.id });
      const query =
        material.labKind === "update"
          ? "UPDATE students SET cohort=2026 WHERE cohort=2024"
          : "SELECT name FROM students WHERE cohort=2025 ORDER BY name";
      const r = await edge(c, {
        action: "lab",
        materialId: m.id,
        requestId: randomUUID(),
        query,
        check: true,
      });
      assert.equal(r.data?.passed, true, JSON.stringify(r.error));
    } else await data(c, "read", { materialId: m.id });
  }
}
if (process.argv[2] === "setup") {
  assert.ok(!f.classes.length, "Existing classes must be cleaned first");
  for (const role of [
    "teacherA",
    "teacherB",
    "studentA",
    "studentB",
    "incomplete",
    "guesser",
  ]) {
    const c = await login(role);
    const r = await rpc(c, "update_my_profile", {
      p_display_name:
        role === "teacherB"
          ? "Cycle Teacher"
          : role === "incomplete"
            ? "Cycle Student"
            : "Synthetic " + role,
      p_nim: role.startsWith("teacher") ? null : "002-" + role,
    });
    assert.ok(r.data);
  }
  for (const role of ["teacherA", "teacherB"]) {
    const c = await login(role),
      templates = await rpc(c, "list_templates");
    const created = await rpc(c, "create_class", {
      p_name:
        role === "teacherB" ? "Cycle Native SQL" : "Synthetic Cycle " + f.group,
      p_template_id: templates.data[0].id,
    });
    assert.ok(created.data);
    f.classes.push(created.data);
    await save();
    for (const kind of ["PRETEST", "POSTTEST"]) {
      const b = await bank(c, created.data.id, kind);
      b.questions = [
        b.questions.find((q) => q.kind === "choice"),
        b.questions.find((q) => q.kind === "sql"),
      ];
      b.minutes = kind === "POSTTEST" && role === "teacherA" ? 1 : 20;
      const saved = await edge(c, {
        action: "save_bank",
        classId: created.data.id,
        ...b,
      });
      assert.equal(saved.data?.saved, true, JSON.stringify(saved.error));
    }
  }
  f.nativeClassId = f.classes[1].id;
  await save();
  for (const [role, index] of [
    ["studentA", 0],
    ["studentB", 0],
    ["incomplete", 1],
  ])
    assert.ok(
      (
        await rpc(await login(role), "join_class", {
          p_code: f.classes[index].joinCode,
        })
      ).data,
    );
  await finish(
    await login("incomplete"),
    await login("teacherB"),
    f.nativeClassId,
  );
  const native = await login("incomplete");
  for (const m of await data(native, "materials")) {
    if (m.requiresLab) break;
    await data(native, "read", { materialId: m.id });
  }
  console.log(
    "Hosted cycle fixtures ready; native student pretest completed normally, preceding readings saved through API.",
  );
} else if (process.argv[2] === "verify") {
  const teacher = await login("teacherA"),
    student = await login("studentA"),
    other = await login("studentB"),
    id = f.classes[0].id;
  assert.equal(
    (await learn(student, "start", { kind: "POSTTEST" })).error.code,
    "POSTTEST_LOCKED",
  );
  let b = await bank(teacher, id, "POSTTEST");
  const bad = structuredClone(b);
  bad.questions.find((q) => q.kind === "sql").reference =
    "SELECT secret FROM auth.users";
  assert.equal(
    (await edge(teacher, { action: "save_bank", classId: id, ...bad })).error
      .code,
    "SQL_REFERENCE_INVALID",
  );
  assert.equal((await bank(teacher, id, "POSTTEST")).revision, b.revision);
  assert.equal(
    (await edge(student, { action: "save_bank", classId: id, ...b })).error
      .code,
    "FORBIDDEN",
  );
  const forbidden = await student.rpc("mobile_cycle", {
    p_actor: f.accounts.find((a) => a.role === "studentA").id,
    p_action: "lab_open",
    p_payload: {},
  });
  assert.ok(forbidden.error);
  await finish(student, teacher, id);
  const list = await data(student, "materials");
  for (const m of list) {
    if (!m.requiresLab) {
      await data(student, "read", { materialId: m.id });
      continue;
    }
    const material = await data(student, "material", { materialId: m.id }),
      query =
        material.labKind === "update"
          ? "UPDATE students SET cohort=2026 WHERE cohort=2024"
          : "SELECT name FROM students WHERE cohort=2025 ORDER BY name";
    const before = (await data(student, "status")).completedCount;
    const preview = await edge(student, {
      action: "lab",
      materialId: m.id,
      query,
      check: false,
      requestId: randomUUID(),
    });
    assert.equal(preview.data.passed, false);
    assert.equal((await data(student, "status")).completedCount, before);
    const rejected = await edge(student, {
      action: "lab",
      materialId: m.id,
      query: "SELECT * FROM auth.users",
      check: true,
      requestId: randomUUID(),
    });
    assert.equal(rejected.data.error, "QUERY_REJECTED");
    assert.equal((await data(student, "status")).completedCount, before);
    const requestId = randomUUID(),
      passed = await edge(student, {
        action: "lab",
        materialId: m.id,
        query,
        check: true,
        requestId,
      });
    assert.equal(passed.data.passed, true);
    assert.deepEqual(
      await edge(student, {
        action: "lab",
        materialId: m.id,
        query,
        check: true,
        requestId,
      }),
      passed,
    );
  }
  assert.equal((await data(student, "status")).posttestAvailable, true);
  const result = await finish(student, teacher, id, "POSTTEST");
  assert.equal(result.kind, "POSTTEST");
  assert.equal(
    (await data(student, "start", { kind: "POSTTEST" })).id,
    result.id,
  );
  assert.equal(
    (await data(teacher, "results", { classId: id, kind: "POSTTEST" })).items[0]
      .id,
    result.id,
  );
  assert.equal(
    (await edge(teacher, { action: "save_bank", classId: id, ...b })).error
      .code,
    "ASSESSMENT_IN_USE",
  );
  await finish(other, teacher, id);
  await completeMaterials(other);
  const deadline = await data(other, "start", { kind: "POSTTEST" });
  f.cycleDeadline = deadline.id;
  await save();
  console.log(
    "Hosted cycle passed: private banks, executable reference validation, actual SELECT/UPDATE sandbox, preview vs verified progress, posttest gate, grading100, one attempt and teacher results. Deadline posttest started for Cron verification.",
  );
} else if (process.argv[2] === "draft-native") {
  const c = await login("teacherB");
  if (!f.draftClassId) {
    const templates = await rpc(c, "list_templates");
    const created = await rpc(c, "create_class", {
      p_name: "Synthetic Draft " + f.group,
      p_template_id: templates.data[0].id,
    });
    assert.ok(created.data);
    f.classes.push(created.data);
    f.draftClassId = created.data.id;
    await save();
  }
  console.log(f.draftClassId);
} else if (process.argv[2] === "advance-native") {
  const c = await login("incomplete");
  for (const m of await data(c, "materials")) {
    if (m.completed) continue;
    if (m.requiresLab) break;
    await data(c, "read", { materialId: m.id });
  }
  console.log(
    "Native student advanced only through unlocked non-Lab readings.",
  );
} else if (process.argv[2] === "deadline") {
  const r = await data(await login("studentB"), "attempt", {
    attemptId: f.cycleDeadline,
  });
  assert.equal(r.status, "completed");
  assert.equal(r.score, 0);
  console.log(
    "Posttest expired and completed via server Cron without client submit or grading request.",
  );
} else throw Error("Use setup|verify|advance-native|deadline");
