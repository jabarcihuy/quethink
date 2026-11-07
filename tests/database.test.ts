import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("mobile migrations enforce roles, private profiles, class ownership, joins and archives", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("supabase/tests/base.sql", "utf8"));
    for (const file of (await readdir("supabase/migrations")).sort().filter(file=>!file.includes("learning_cron")))
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const users = Array.from(
      { length: 6 },
      (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    );
    for (const uid of users)
      await db.query(
        'insert into auth.users(id,raw_user_meta_data) values($1,\'{"role":"ADMIN"}\')',
        [uid],
      );
    const [teacherA, teacherB, studentA, studentB, incomplete, guesser] = users;
    await db.query(
      "update public.profiles set role='TEACHER',display_name='Teacher' where id=any($1::uuid[])",
      [[teacherA, teacherB]],
    );
    const template = (
      await db.query<{ id: string }>(
        "insert into public.learning_paths(title,is_published) values('Synthetic course',true) returning id",
      )
    ).rows[0]!.id;
    async function actor(uid: string | null) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        uid ?? "",
      ]);
      await db.exec("set role authenticated");
    }
    async function rpc(name: string, args: unknown[] = []) {
      const result = await db.query<{
        result: {
          data?: any;
          error?: { code: string };
          nextCursor?: string | null;
        };
      }>(
        `select public.mobile_${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
        args,
      );
      return result.rows[0]!.result;
    }
    await actor(studentA!);
    assert.equal((await rpc("get_my_profile")).data.role, "student"); // spoofed signup metadata ignored
    await assert.rejects(
      db.query("update public.profiles set role='ADMIN' where id=$1", [
        studentA,
      ]),
    );
    await assert.rejects(
      db.query(
        "insert into public.class_memberships(class_id,student_id) values(gen_random_uuid(),$1)",
        [studentA],
      ),
    );
    for (const uid of [studentA, studentB, guesser]) {
      await actor(uid!);
      assert.equal(
        (
          await rpc("update_my_profile", [
            "Synthetic student",
            "00123",
            null,
            null,
          ])
        ).data.profileComplete,
        true,
      );
    }
    await actor(teacherA!);
    const a = (await rpc("create_class", ["Class A", template])).data;
    const b = (await rpc("create_class", ["Class B", template])).data;
    assert.match(a.joinCode, /^[A-F0-9]{12}$/);
    await actor(teacherB!);
    assert.equal((await rpc("archive_class", [a.id])).error?.code, "FORBIDDEN");
    assert.equal(
      (await rpc("get_class_roster", [a.id])).error?.code,
      "FORBIDDEN",
    );
    assert.equal(
      (await db.query("select * from public.classes")).rows.length,
      0,
    );
    await actor(incomplete!);
    assert.equal(
      (await rpc("join_class", [a.joinCode])).error?.code,
      "PROFILE_INCOMPLETE",
    );
    await actor(studentA!);
    assert.equal(
      (await rpc("resolve_class_code", [a.joinCode])).data.name,
      "Class A",
    );
    const membership = (await rpc("join_class", [a.joinCode])).data;
    assert.equal(
      (await rpc("join_class", [a.joinCode])).data.id,
      membership.id,
    );
    assert.equal(
      (await rpc("join_class", [b.joinCode])).error?.code,
      "ALREADY_JOINED",
    );
    assert.equal((await rpc("get_my_class")).data.joinCode, null);
    assert.equal((await rpc("get_dashboard", [b.id])).error?.code, "FORBIDDEN");
    assert.equal(
      (await db.query("select * from public.profiles")).rows.length,
      1,
    );
    await assert.rejects(db.query("select * from private.class_join_codes"));
    await actor(studentB!);
    assert.equal(
      (await db.query("select * from public.classes")).rows.length,
      0,
    );
    await actor(guesser!);
    for (let i = 0; i < 10; i++)
      assert.equal(
        (await rpc("resolve_class_code", ["wrong"])).error?.code,
        "CLASS_CODE_INVALID",
      );
    assert.equal(
      (await rpc("resolve_class_code", [a.joinCode])).error?.code,
      "RATE_LIMITED",
    );
    await actor(teacherA!);
    const roster = (await rpc("get_class_roster", [a.id])).data;
    assert.equal(roster.length, 1);
    assert.equal(roster[0].nim, "00123");
    assert.equal("birthDate" in roster[0], false);
    await rpc("archive_class", [a.id]);
    await actor(studentB!);
    assert.equal(
      (await rpc("join_class", [a.joinCode])).error?.code,
      "CLASS_ARCHIVED",
    );
    await actor(studentA!);
    assert.equal((await rpc("get_my_class")).data.status, "archived");
    assert.equal(
      (await rpc("join_class", [b.joinCode])).error?.code,
      "ALREADY_JOINED",
    );
    await actor(null);
    assert.equal((await rpc("get_my_profile")).error?.code, "AUTH_REQUIRED");
    await db.exec("reset role");
    await assert.rejects(
      db.query("update public.profiles set role='TEACHER' where id=$1", [
        studentA,
      ]),
    );
    await actor(studentB!);
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('avatars',$1)",
        [`${studentA}/other.png`],
      ),
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('avatars',$1)",
      [`${studentB}/own.png`],
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      1,
    );
    await actor(studentA!);
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    assert.equal(
      (await rpc("update_my_profile", ["Student", "001", "2999-01-01", null]))
        .error?.code,
      "VALIDATION_ERROR",
    );
    assert.equal(
      (
        await rpc("update_my_profile", [
          "Student",
          "001",
          null,
          `${studentB}/own.png`,
        ])
      ).error?.code,
      "VALIDATION_ERROR",
    );
    await db.exec("reset role");
    await db.query(
      "insert into public.classes(teacher_id,name,source_learning_path_id,created_at) select $1,'Page '||i,$2,'2026-01-01'::timestamptz from generate_series(1,55) i",
      [teacherB, template],
    );
    await actor(teacherB!);
    const first = await rpc("list_my_classes");
    const second = await rpc("list_my_classes", [first.nextCursor]);
    assert.equal(first.data.length, 50);
    assert.equal(second.data.length, 5);
    assert.equal(
      new Set([...first.data, ...second.data].map((c: any) => c.id)).size,
      55,
    );
    await db.exec("set role anon");
    await assert.rejects(rpc("get_my_profile"));
  } finally {
    await db.close();
  }
});
