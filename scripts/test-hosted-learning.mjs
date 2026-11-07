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
const url = config.EXPO_PUBLIC_SUPABASE_URL,
  key = config.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const fixture = JSON.parse(
  await readFile(".secrets/m1-test-fixtures.json", "utf8"),
);
async function login(role) {
  const c = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const account = fixture.accounts.find((a) => a.role === role);
  const { error } = await c.auth.signInWithPassword(account);
  assert.ifError(error);
  return c;
}
async function rpc(c, name, p = {}) {
  const { data, error } = await c.rpc("mobile_" + name, p);
  assert.ifError(error);
  return data;
}
const learn = (c, a, p = {}) =>
  rpc(c, "learning", { p_action: a, p_payload: p });
const teacher = await login("teacherA"),
  student = await login("studentA"),
  other = await login("studentB");
if (process.argv[2] === "record-native") {
  const t=await login('teacherB');
  const listed=await rpc(t,'list_my_classes');
  const native=listed.data.find(c=>c.name==='Native SQL Class');assert.ok(native);
  if(!fixture.classes.some(c=>c.id===native.id))fixture.classes.push(native);
  fixture.nativeClassId=native.id;
  await writeFile('.secrets/m1-test-fixtures.json',JSON.stringify(fixture,null,2),{mode:0o600});
  console.log('Native class recorded for fixture cleanup.');
} else if (process.argv[2] === "setup") {
  await rpc(teacher, "update_my_profile", {
    p_display_name: "Synthetic Learning Teacher",
  });
  for (const [c, n] of [
    [student, "A"],
    [other, "B"],
  ])
    await rpc(c, "update_my_profile", {
      p_display_name: "Synthetic Learner " + n,
      p_nim: "00" + n,
    });
  const templates = await rpc(teacher, "list_templates");
  const classroom = (
    await rpc(teacher, "create_class", {
      p_name: "Synthetic Learning " + fixture.group,
      p_template_id: templates.data[0].id,
    })
  ).data;
  assert.ok(classroom);
  fixture.classes.push(classroom);
  await writeFile(
    ".secrets/m1-test-fixtures.json",
    JSON.stringify(fixture, null, 2),
    { mode: 0o600 },
  );
  assert.ok(
    (await learn(teacher, "settings", { classId: classroom.id, minutes: 1 }))
      .data,
  );
  for (const c of [student, other])
    assert.ok(
      (await rpc(c, "join_class", { p_code: classroom.joinCode })).data,
    );
  const started = (await learn(student, "start")).data;
  assert.ok(started);
  fixture.learningAttempt = started.id;
  const active = (await learn(student, "attempt", { attemptId: started.id }))
    .data;
  assert.ok(
    active.questions.every((q) => !("reference" in q) && !("correct" in q)),
  );
  const answers = {
    table: "a",
    key: "a",
    filter: "a",
    relation: "a",
    select: "select name from students where cohort=2025 order by name",
    count: "select count(*) from students where cohort=2024",
  };
  assert.ok(
    (
      await learn(student, "save", {
        attemptId: started.id,
        revision: 0,
        answers,
      })
    ).data,
  );
  assert.equal(
    (await learn(other, "attempt", { attemptId: started.id })).error.code,
    "FORBIDDEN",
  );
  const cross = await other.functions.invoke("mobile-grade", {
    body: { attemptId: started.id },
  });
  assert.ifError(cross.error);
  assert.equal(cross.data.data.processed, 0);
  assert.ok((await learn(student, "submit", { attemptId: started.id })).data);
  const graded = await student.functions.invoke("mobile-grade", {
    body: { attemptId: started.id },
  });
  if (graded.error) {
    console.log(
      "Edge grading failed:",
      graded.error.name,
      graded.error.context?.status,
    );
    process.exitCode = 1;
  } else {
    assert.equal(graded.data.data.processed, 1);
  }
  if (!process.exitCode) {
    const result = (await learn(student, "result", { attemptId: started.id }))
      .data;
    assert.equal(Number(result.score), 100);
    const list = (await learn(student, "materials")).data;
    assert.equal(list.length, 11);
    assert.equal(list[0].available, true);
    assert.equal(list[1].available, false);
    const material = (
      await learn(teacher, "material", { materialId: list[0].id })
    ).data;
    assert.ok(
      (
        await learn(teacher, "edit_material", {
          materialId: material.id,
          title: material.title,
          body: material.body,
          requiresLab: false,
          attachments: [],
        })
      ).data,
    );
    assert.equal(
      (await learn(student, "read", { materialId: material.id })).data
        .completed,
      true,
    );
    assert.equal((await learn(student, "materials")).data[1].available, true);
    const due = (await learn(other, "start")).data;
    fixture.deadlineAttempt = due.id;
    assert.ok(
      (
        await learn(other, "save", {
          attemptId: due.id,
          revision: 0,
          answers: { table: "b" },
        })
      ).data,
    );
    await writeFile(
      ".secrets/m1-test-fixtures.json",
      JSON.stringify(fixture, null, 2),
      { mode: 0o600 },
    );
    console.log(
      "Hosted pretest passed: private keys, JWT ownership, Edge SQLite score100, copied materials and sequential completion. Deadline attempt started for independent Cron check.",
    );
  }
} else if (process.argv[2] === "verify") {
  const status = (await learn(student, "status")).data;
  const result = (
    await learn(student, "result", { attemptId: status.attempt.id })
  ).data;
  assert.ok(result, "Grading is pending");
  assert.equal(Number(result.score), 100);
  const list = (await learn(student, "materials")).data;
  assert.equal(list.length, 11);
  assert.equal(list[0].available, true);
  assert.equal(list[1].available, false);
  const material = (
    await learn(teacher, "material", { materialId: list[0].id })
  ).data;
  assert.ok(
    (
      await learn(teacher, "edit_material", {
        materialId: material.id,
        title: material.title,
        body: material.body,
        requiresLab: false,
        attachments: [],
      })
    ).data,
  );
  assert.equal(
    (await learn(student, "read", { materialId: material.id })).data.completed,
    true,
  );
  assert.equal((await learn(student, "materials")).data[1].available, true);
  const due = (await learn(other, "start")).data;
  fixture.deadlineAttempt = due.id;
  fixture.learningAttempt = status.attempt.id;
  assert.ok(
    (
      await learn(other, "save", {
        attemptId: due.id,
        revision: 0,
        answers: { table: "b" },
      })
    ).data,
  );
  await writeFile(
    ".secrets/m1-test-fixtures.json",
    JSON.stringify(fixture, null, 2),
    { mode: 0o600 },
  );
  console.log(
    "Hosted SQLite grading100 and material progression passed; second attempt awaits server deadline.",
  );
} else if (process.argv[2] === "deadline") {
  const result = await learn(other, "result", {
    attemptId: fixture.deadlineAttempt,
  });
  assert.ok(result.data, "Deadline grading not yet completed");
  assert.equal(Number(result.data.score), 0);
  assert.equal((await learn(other,"materials")).data[0].available,true);
  console.log(
    "Server Cron graded the saved deadline attempt without a client submit or grading request.",
  );
}
