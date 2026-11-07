import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("posttest prerequisites, frozen banks, lab authority, retries and archive rules hold", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("supabase/tests/base.sql", "utf8"));
    for (const f of (await readdir("supabase/migrations"))
      .sort()
      .filter((f) => !f.includes("learning_cron")))
      await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
    const teacher = "20000000-0000-4000-8000-000000000001",
      student = "20000000-0000-4000-8000-000000000002",
      outsider = "20000000-0000-4000-8000-000000000003";
    for (const id of [teacher, student, outsider])
      await db.query("insert into auth.users(id)values($1)", [id]);
    await db.query(
      "update profiles set role='TEACHER',display_name='Teacher' where id=$1",
      [teacher],
    );
    const path = (
      await db.query<any>(
        "insert into learning_paths(title,is_published)values('Cycle',true)returning id",
      )
    ).rows[0].id;
    const ch = (
      await db.query<any>(
        "insert into chapters(learning_path_id,title,position,is_published)values($1,'SQL',1,true)returning id",
        [path],
      )
    ).rows[0].id;
    for (const [i, title] of [
      "Memilih Baris dengan WHERE",
      "Mengubah Record dengan UPDATE",
    ].entries())
      await db.query(
        "insert into lessons(chapter_id,title,content,position,is_published)values($1,$2,'Reading',$3,true)",
        [ch, title, i + 1],
      );
    async function actor(uid: string | null, role = "authenticated") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        uid ?? "",
      ]);
      await db.exec("set role " + role);
    }
    async function rpc(name: string, args: any[] = []) {
      return (
        await db.query<any>(
          `select public.mobile_${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) r`,
          args,
        )
      ).rows[0].r;
    }
    const learn = (action: string, payload: any = {}) =>
      rpc("learning", [action, payload]);
    const cycle = (uid: string, action: string, payload: any) =>
      rpc("cycle", [uid, action, payload]);
    await actor(teacher);
    const c = (await rpc("create_class", ["Cycle", path])).data;
    let bank = (await learn("bank", { classId: c.id, kind: "POSTTEST" })).data;
    assert.equal(bank.questions.filter((q: any) => q.kind === "sql").length, 2);
    await assert.rejects(cycle(teacher, "bank_save", {}));
    await actor(null, "service_role");
    const saved = {
      classId: c.id,
      kind: "POSTTEST",
      revision: bank.revision,
      minutes: 5,
      questions: bank.questions,
    };
    assert.ok((await cycle(teacher, "bank_save", saved)).data.saved);
    assert.equal(
      (await cycle(teacher, "bank_save", saved)).error.code,
      "REVISION_CONFLICT",
    );
    assert.equal(
      (await cycle(outsider, "bank_save", saved)).error.code,
      "FORBIDDEN",
    );
    await actor(student);
    await rpc("update_my_profile", ["Learner", "002", null, null]);
    await rpc("join_class", [c.joinCode]);
    assert.equal(
      (await learn("bank", { kind: "POSTTEST" })).error.code,
      "TEACHER_REQUIRED",
    );
    assert.equal(
      (await learn("start", { kind: "POSTTEST" })).error.code,
      "POSTTEST_LOCKED",
    );
    const pre = (await learn("start")).data;
    assert.equal(pre.kind, "PRETEST");
    async function finish(id: string, uid: string) {
      await actor(uid);
      await learn("submit", { attemptId: id });
      await actor(null, "service_role");
      const job = await rpc("grade_jobs", [id, uid]);
      await rpc("grade_commit", [
        id,
        job.lease,
        Object.fromEntries(job.questions.map((q: any) => [q.id, true])),
      ]);
    }
    await finish(pre.id, student);
    await actor(student);
    const materials = (await learn("materials")).data;
    const first = materials[0].id,
      second = materials[1].id;
    assert.equal(
      (await learn("read", { materialId: first })).error.code,
      "LAB_REQUIRED",
    );
    const req = {
      materialId: first,
      requestId: "20000000-0000-4000-8000-000000000010",
      query: "SELECT name FROM students WHERE cohort=2025 ORDER BY name",
      check: true,
    };
    await assert.rejects(cycle(student, "lab_open", req));
    await actor(null, "service_role");
    assert.equal(
      (await cycle(outsider, "lab_open", req)).error.code,
      "FORBIDDEN",
    );
    assert.equal(
      (await cycle(student, "lab_open", { ...req, materialId: second })).error
        .code,
      "MATERIAL_LOCKED",
    );
    const job = (await cycle(student, "lab_open", req)).data;
    assert.equal((await cycle(student, "lab_open", req)).data.id, job.id);
    assert.equal(
      (await cycle(student, "lab_open", { ...req, query: "SELECT 1" })).error
        .code,
      "REVISION_CONFLICT",
    );
    const commit = {
      materialId: first,
      runId: job.id,
      result: {
        passed: true,
        names: ["name"],
        rows: [["Alya"], ["Citra"]],
        columns: 1,
      },
    };
    assert.ok((await cycle(student, "lab_commit", commit)).data.passed);
    assert.ok((await cycle(student, "lab_commit", commit)).data.passed);
    await actor(student);
    assert.equal((await learn("materials")).data[1].available, true);
    assert.equal((await learn("status")).data.posttestAvailable, false);
    await actor(null, "service_role");
    const run2 = (
      await cycle(student, "lab_open", {
        ...req,
        materialId: second,
        requestId: "20000000-0000-4000-8000-000000000011",
        query: "UPDATE students SET cohort=2026 WHERE cohort=2024",
        check: false,
      })
    ).data;
    await cycle(student, "lab_commit", {
      materialId: second,
      runId: run2.id,
      result: { passed: true, names: [], rows: [], columns: 0 },
    });
    await actor(student);
    assert.equal(
      (await learn("status")).data.posttestAvailable,
      false,
      "Run never completes progress even with true service output",
    );
    await actor(null, "service_role");
    const run3 = (
      await cycle(student, "lab_open", {
        ...req,
        materialId: second,
        requestId: "20000000-0000-4000-8000-000000000012",
      })
    ).data;
    await cycle(student, "lab_commit", {
      materialId: second,
      runId: run3.id,
      result: { passed: true, names: [], rows: [], columns: 0 },
    });
    await actor(student);
    assert.equal((await learn("status")).data.posttestAvailable, true);
    const post = (await learn("start", { kind: "POSTTEST" })).data;
    assert.equal(post.kind, "POSTTEST");
    assert.equal((await learn("start", { kind: "POSTTEST" })).data.id, post.id);
    assert.equal(
      (await learn("attempt", { attemptId: post.id })).data.questions.length,
      6,
    );
    await actor(null, "service_role");
    assert.equal(
      (
        await cycle(student, "lab_open", {
          ...req,
          requestId: "20000000-0000-4000-8000-000000000013",
        })
      ).error.code,
      "OTHER_TEST_ACTIVE",
    );
    assert.equal(
      (await cycle(teacher, "bank_check", { ...saved, revision: 1 })).error
        .code,
      "ASSESSMENT_IN_USE",
    );
    await actor(teacher);
    assert.equal(
      (
        await learn("add_material", {
          classId: c.id,
          title: "Late",
          body: "",
          requiresLab: false,
          attachments: [],
        })
      ).error.code,
      "ASSESSMENT_IN_USE",
    );
    await finish(post.id, student);
    await actor(student);
    assert.equal((await learn("start", { kind: "POSTTEST" })).data.id, post.id);
    const status = (await learn("status")).data;
    assert.equal(status.attempt.id, pre.id);
    assert.equal(status.posttest.id, post.id);
    await actor(teacher);
    assert.equal(
      (await learn("results", { classId: c.id, kind: "POSTTEST" })).data
        .items[0].id,
      post.id,
    );
    await rpc("archive_class", [c.id]);
    await actor(null, "service_role");
    assert.equal(
      (await cycle(student, "lab_open", req)).error.code,
      "CLASS_ARCHIVED",
    );
  } finally {
    await db.close();
  }
});
