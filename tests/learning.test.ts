import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("pretest ownership, one attempt, answer revisions, leased grading and material gates hold in PostgreSQL", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("supabase/tests/base.sql", "utf8"));
    for (const file of (await readdir("supabase/migrations"))
      .sort()
      .filter((f) => !f.includes("learning_cron")))
      await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
    const ids = [
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000002",
      "10000000-0000-4000-8000-000000000003",
      "10000000-0000-4000-8000-000000000004",
    ];
    const [teacher, otherTeacher, student, otherStudent] = ids as [
      string,
      string,
      string,
      string,
    ];
    for (const id of ids)
      await db.query("insert into auth.users(id) values($1)", [id]);
    await db.query(
      "update profiles set role='TEACHER',display_name='Teacher' where id=any($1::uuid[])",
      [[teacher, otherTeacher]],
    );
    const path = (
      await db.query<any>(
        "insert into learning_paths(title,is_published)values('Course',true)returning id",
      )
    ).rows[0].id;
    const ch = (
      await db.query<any>(
        "insert into chapters(learning_path_id,title,position,is_published)values($1,'Chapter',1,true)returning id",
        [path],
      )
    ).rows[0].id;
    for (let i = 1; i <= 3; i++) {
      const l = (
        await db.query<any>(
          "insert into lessons(chapter_id,title,content,position,is_published)values($1,$2,'## Reading', $3,true)returning id",
          [ch, i === 2 ? "Memilih Baris dengan WHERE" : "Material " + i, i],
        )
      ).rows[0].id;
      if (i === 2)
        await db.query(
          "insert into exercises(lesson_id,is_published,is_required)values($1,true,true)",
          [l],
        );
    }
    async function actor(id: string | null, role = "authenticated") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id ?? "",
      ]);
      await db.exec("set role " + role);
    }
    async function rpc(name: string, args: any[] = []) {
      return (
        await db.query<any>(
          `select public.mobile_${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as r`,
          args,
        )
      ).rows[0].r;
    }
    const learn = (action: string, payload: any = {}) =>
      rpc("learning", [action, payload]);
    await actor(teacher);
    const c = (await rpc("create_class", ["Mobile Course", path])).data;
    for (let i = 0; i < 15; i++)
      assert.equal(
        (
          await db.query<{ result: string }>(
            "select public.mobile_ai_access(true) as result",
          )
        ).rows[0]?.result,
        "OK",
      );
    assert.equal(
      (
        await db.query<{ result: string }>(
          "select public.mobile_ai_access(true) as result",
        )
      ).rows[0]?.result,
      "RATE_LIMITED",
    );
    await assert.rejects(db.query("select * from private.mobile_ai_limits"));
    await actor(otherTeacher);
    assert.equal(
      (await learn("materials", { classId: c.id })).error.code,
      "FORBIDDEN",
    );
    for (const s of [student, otherStudent]) {
      await actor(s);
      await rpc("update_my_profile", ["Student", "001", null, null]);
      await rpc("join_class", [c.joinCode]);
    }
    await actor(student);
    const locked = (await learn("materials")).data;
    assert.equal(locked.length, 3);
    assert.ok(locked.every((m: any) => m.available === false));
    assert.ok(!("body" in locked[0]));
    assert.equal(
      (await learn("material", { materialId: locked[0].id })).error.code,
      "MATERIAL_LOCKED",
    );
    await assert.rejects(db.query("select * from private.mobile_attempts"));
    const started = (await learn("start")).data,
      aid = started.id;
    assert.equal(
      (
        await db.query<{ result: string }>(
          "select public.mobile_ai_access(true) as result",
        )
      ).rows[0]?.result,
      "TEST_ACTIVE",
    );
    assert.equal(
      (
        await db.query<{ result: string }>(
          "select public.mobile_ai_access(false) as result",
        )
      ).rows[0]?.result,
      "TEST_ACTIVE",
    );
    assert.equal((await learn("start")).data.id, aid);
    const active = (await learn("attempt", { attemptId: aid })).data;
    assert.equal(active.questions.length, 6);
    assert.ok(
      active.questions.every(
        (q: any) =>
          !("correct" in q) && !("reference" in q) && !("explanation" in q),
      ),
    );
    await actor(otherStudent);
    assert.equal(
      (await learn("attempt", { attemptId: aid })).error.code,
      "FORBIDDEN",
    );
    await actor(student);
    await assert.rejects(rpc("grade_jobs", [aid, student]));
    assert.equal(
      (
        await learn("save", {
          attemptId: aid,
          revision: 0,
          answers: { fake: "x" },
        })
      ).error.code,
      "VALIDATION_ERROR",
    );
    await db.exec("reset role");
    const secret = (
      await db.query<any>(
        "select questions from private.mobile_attempts where id=$1",
        [aid],
      )
    ).rows[0].questions;
    const answers = Object.fromEntries(
      secret.map((q: any) => [q.id, q.correct ?? q.reference]),
    );
    await actor(student);
    assert.equal(
      (await learn("save", { attemptId: aid, revision: 0, answers })).data
        .revision,
      1,
    );
    assert.equal(
      (await learn("save", { attemptId: aid, revision: 0, answers })).error
        .code,
      "REVISION_CONFLICT",
    );
    assert.equal(
      (await learn("submit", { attemptId: aid })).data.status,
      "grading",
    );
    assert.equal(
      (await learn("save", { attemptId: aid, revision: 1, answers: {} })).error
        .code,
      "ATTEMPT_CLOSED",
    );
    await actor(null, "service_role");
    assert.equal(await rpc("grade_jobs", [aid, otherStudent]), null);
    const job = await rpc("grade_jobs", [aid, student]);
    assert.ok(job.lease);
    assert.equal(await rpc("grade_jobs", [aid, student]), null);
    const scores = Object.fromEntries(
      job.questions.map((q: any) => [q.id, true]),
    );
    assert.equal(await rpc("grade_commit", [aid, ids[0], scores]), false);
    assert.equal(await rpc("grade_commit", [aid, job.lease, scores]), true);
    assert.equal(await rpc("grade_commit", [aid, job.lease, scores]), false);
    await actor(student);
    const result = (await learn("result", { attemptId: aid })).data;
    assert.equal(Number(result.score), 100);
    assert.equal(result.feedback.length, 6);
    assert.ok(!("fixtures" in result));
    assert.equal((await learn("start")).data.id, aid);
    let list = (await learn("materials")).data;
    assert.equal(list[0].available, true);
    assert.equal(list[1].available, false);
    assert.equal(
      (await learn("read", { materialId: list[0].id })).data.completed,
      true,
    );
    await learn("read", { materialId: list[0].id });
    list = (await learn("materials")).data;
    assert.equal(list[1].available, true);
    assert.equal(list[2].available, false);
    assert.equal(
      (await learn("read", { materialId: list[1].id })).error.code,
      "LAB_REQUIRED",
    );
    await actor(teacher);
    assert.equal(
      (
        await learn("edit_material", {
          materialId: list[0].id,
          title: "Changed",
          body: "Body",
          requiresLab: false,
          attachments: [],
        })
      ).error.code,
      "MATERIAL_IN_USE",
    );
    assert.ok(
      (
        await learn("edit_material", {
          materialId: list[1].id,
          title: "Class copy",
          body: "Read this",
          requiresLab: false,
          attachments: [],
        })
      ).data,
    );
    await actor(student);
    await learn("read", { materialId: list[1].id });
    assert.equal((await learn("materials")).data[2].available, true);
    await actor(teacher);
    assert.equal(
      (
        await learn("add_material", {
          classId: c.id,
          title: "New",
          body: "Custom",
          requiresLab: false,
          attachments: [{}],
        })
      ).error.code,
      "VALIDATION_ERROR",
    );
    const added = (
      await learn("add_material", {
        classId: c.id,
        title: "New",
        body: "Custom",
        requiresLab: false,
        attachments: [],
      })
    ).data;
    assert.equal(added.position, 4);
    await actor(otherStudent);
    assert.equal(
      (
        await learn("add_material", {
          classId: c.id,
          title: "Attack",
          body: "",
          requiresLab: false,
          attachments: [],
        })
      ).error.code,
      "TEACHER_REQUIRED",
    );
    await actor(otherStudent);
    const second = (await learn("start")).data;
    await db.exec("reset role");
    await db.query(
      "update private.mobile_attempts set started_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute' where id=$1",
      [second.id],
    );
    await actor(otherStudent);
    assert.equal(
      (await learn("save", { attemptId: second.id, revision: 0, answers: {} }))
        .error.code,
      "ATTEMPT_CLOSED",
    );
    await actor(null, "service_role");
    const due = await rpc("grade_jobs", [second.id, otherStudent]);
    assert.ok(due);
    await rpc("grade_commit", [
      due.id,
      due.lease,
      Object.fromEntries(due.questions.map((q: any) => [q.id, false])),
    ]);
    await actor(teacher);
    assert.equal(
      (await learn("results", { classId: c.id })).data.items.length,
      2,
    );
    assert.equal(
      (await learn("settings", { classId: c.id, minutes: 10 })).error.code,
      "ASSESSMENT_IN_USE",
    );
    await db.exec("reset role");
    for (let i = 0; i < 53; i++) {
      const user = (
        await db.query<any>(
          "insert into auth.users(id)values(gen_random_uuid())returning id",
        )
      ).rows[0].id;
      await db.query(
        "insert into private.mobile_attempts(class_id,student_id,status,questions,started_at,expires_at,score)values($1,$2,'completed','[]','2026-01-01','2026-01-01 00:01:00',0)",
        [c.id, user],
      );
    }
    await actor(teacher);
    const page1 = (await learn("results", { classId: c.id })).data;
    assert.equal(page1.items.length, 50);
    assert.ok(page1.nextCursor);
    const page2 = (
      await learn("results", { classId: c.id, cursor: page1.nextCursor })
    ).data;
    assert.equal(page2.items.length, 5);
    assert.equal(page2.nextCursor, null);
    assert.equal(
      new Set([...page1.items, ...page2.items].map((a: any) => a.id)).size,
      55,
    );
    await rpc("archive_class", [c.id]);
    await actor(student);
    assert.equal(
      (await learn("read", { materialId: list[2].id })).error.code,
      "CLASS_ARCHIVED",
    );
    assert.equal(
      (await learn("material", { materialId: list[0].id })).data.title,
      "Material 1",
    );
  } finally {
    await db.close();
  }
});
