import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { parseAttendanceQR } from "../src/features/attendance/qr";
test("attendance QR parser rejects URLs, malformed, oversized and foreign payloads", () => {
  const id = "00000000-0000-4000-8000-000000000001",
    token = "a".repeat(64),
    value = `quethink-attendance:v1:${id}:${token}`;
  assert.deepEqual(parseAttendanceQR(value), { sessionId: id, token });
  for (const v of [
    "https://example.com",
    value + "x",
    value.replace(":v1:", ":v2:"),
    "a".repeat(1000),
    value.replace(token, "xyz"),
  ])
    assert.equal(parseAttendanceQR(v), null);
});
test("attendance enforces ownership, membership, deadlines, duplicate safety, audited CAS corrections and archives", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("supabase/tests/base.sql", "utf8"));
    for (const f of (await readdir("supabase/migrations"))
      .sort()
      .filter((f) => !f.includes("learning_cron")))
      await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
    const ids = Array.from(
        { length: 5 },
        (_, i) => `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      ),
      [teacher, other, student, outsider, student2] = ids;
    for (const id of ids)
      await db.query("insert into auth.users(id) values($1)", [id]);
    await db.query(
      "update public.profiles set role='TEACHER',display_name='Teacher' where id=any($1::uuid[])",
      [[teacher, other]],
    );
    await db.query(
      "update public.profiles set display_name='Student',nim='123' where role='USER'",
    );
    const path = (
      await db.query<{ id: string }>(
        "insert into public.learning_paths(title,is_published) values('Attendance test',true) returning id",
      )
    ).rows[0]!.id;
    async function actor(id: string | null) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id ?? "",
      ]);
      await db.exec("set role authenticated");
    }
    async function rpc(action: string, payload: Record<string, unknown> = {}) {
      return (
        await db.query<{ r: any }>(
          "select public.mobile_attendance($1,$2::jsonb) r",
          [action, JSON.stringify(payload)],
        )
      ).rows[0]!.r;
    }
    await actor(teacher!);
    const c = (
      await db.query<{ r: any }>("select public.mobile_create_class($1,$2) r", [
        "Attendance test",
        path,
      ])
    ).rows[0]!.r.data;
    await db.exec("reset role");
    await db.query(
      "insert into public.class_memberships(class_id,student_id) values($1,$2),($1,$3)",
      [c.id, student, student2],
    );
    await actor(student!);
    assert.equal(
      (await rpc("start", { classId: c.id, title: "No", minutes: 5 })).error
        .code,
      "FORBIDDEN",
    );
    await assert.rejects(
      db.query("select * from private.mobile_attendance_records"),
    );
    await actor(other!);
    assert.equal(
      (await rpc("list", { classId: c.id })).error.code,
      "FORBIDDEN",
    );
    await actor(teacher!);
    assert.equal(
      (await rpc("start", { classId: c.id, title: "", minutes: 0 })).error.code,
      "VALIDATION_ERROR",
    );
    const s = (
      await rpc("start", { classId: c.id, title: "Session 1", minutes: 15 })
    ).data.session;
    assert.equal(
      (await rpc("start", { classId: c.id, title: "Competing", minutes: 15 }))
        .error.code,
      "SESSION_ALREADY_OPEN",
    );
    const qr = (await rpc("qr", { sessionId: s.id })).data;
    const parsed = parseAttendanceQR(qr.value)!;
    assert.ok(parsed);
    const publicJson = JSON.stringify(
      (await rpc("session", { sessionId: s.id })).data,
    );
    assert.ok(!publicJson.includes(parsed.token));
    await actor(outsider!);
    assert.equal((await rpc("scan", parsed)).error.code, "FORBIDDEN");
    await actor(student!);
    assert.equal(
      (await rpc("qr", { sessionId: s.id })).error.code,
      "FORBIDDEN",
    );
    assert.equal(
      (await rpc("roster", { sessionId: s.id })).error.code,
      "FORBIDDEN",
    );
    assert.equal(
      (await rpc("scan", { ...parsed, token: "b".repeat(64) })).error.code,
      "QR_EXPIRED",
    );
    await db.exec("reset role");
    await db.query(
      "insert into private.mobile_attempts(class_id,student_id,questions,expires_at) values($1,$2,'[]',clock_timestamp()+interval '1 hour')",
      [c.id, student],
    );
    await actor(student!);
    assert.equal((await rpc("scan", parsed)).error.code, "OTHER_TEST_ACTIVE");
    await db.exec("reset role");
    await db.query(
      "delete from private.mobile_attempts where class_id=$1 and student_id=$2",
      [c.id, student],
    );
    await actor(student!);
    const first = (await rpc("scan", parsed)).data;
    assert.equal(first.alreadyRecorded, false);
    assert.equal(first.session.record.state, "present");
    const duplicate = (await rpc("scan", parsed)).data;
    assert.equal(duplicate.alreadyRecorded, true);
    assert.equal(duplicate.session.record.revision, 1);
    await actor(teacher!);
    assert.equal(
      (
        await rpc("correct", {
          sessionId: s.id,
          studentId: student,
          state: "sick",
          reason: "",
          revision: 1,
        })
      ).error.code,
      "VALIDATION_ERROR",
    );
    const corrected = (
      await rpc("correct", {
        sessionId: s.id,
        studentId: student,
        state: "sick",
        reason: "Medical note",
        revision: 1,
      })
    ).data;
    assert.equal(corrected.record.revision, 2);
    assert.equal(corrected.audit[0].old_state, "present");
    assert.equal(corrected.audit[0].new_state, "sick");
    assert.equal(
      (
        await rpc("correct", {
          sessionId: s.id,
          studentId: student,
          state: "absent",
          reason: "Stale edit",
          revision: 1,
        })
      ).error.code,
      "REVISION_CONFLICT",
    );
    const roster = (await rpc("roster", { sessionId: s.id })).data;
    assert.equal(roster.items.length, 2);
    assert.equal(roster.items.find((v: any) => v.id === student2).state, null);
    assert.ok(!JSON.stringify(roster).includes("birthDate"));
    await actor(student!);
    const preserved = (await rpc("scan", parsed)).data;
    assert.equal(preserved.session.record.state, "sick");
    assert.equal(preserved.session.record.source, "manual");
    await db.exec("reset role");
    await db.query(
      "update private.mobile_attendance_tokens set expires_at=clock_timestamp()-interval '1 second' where session_id=$1",
      [s.id],
    );
    await actor(student2!);
    assert.equal((await rpc("scan", parsed)).error.code, "QR_EXPIRED");
    await actor(teacher!);
    const fresh = parseAttendanceQR(
      (await rpc("qr", { sessionId: s.id })).data.value,
    )!;
    await rpc("close", { sessionId: s.id });
    await rpc("close", { sessionId: s.id });
    await actor(student2!);
    assert.equal((await rpc("scan", fresh)).error.code, "SESSION_CLOSED");
    await actor(teacher!);
    const s2 = (
      await rpc("start", { classId: c.id, title: "Session 2", minutes: 1 })
    ).data.session;
    await db.exec("reset role");
    await db.query(
      "update private.mobile_attendance_sessions set starts_at=clock_timestamp()-interval '3 minutes',expires_at=clock_timestamp()-interval '1 minute' where id=$1",
      [s2.id],
    );
    await actor(teacher!);
    assert.equal(
      (await rpc("qr", { sessionId: s2.id })).error.code,
      "SESSION_CLOSED",
    );
    const s3 = (
      await rpc("start", { classId: c.id, title: "Session 3", minutes: 1 })
    ).data.session;
    assert.ok(s3.id);
    await db.query("select public.mobile_archive_class($1)", [c.id]);
    assert.equal(
      (await rpc("session", { sessionId: s3.id })).data.session.status,
      "closed",
    );
    for (const action of ["start", "qr", "close", "correct"])
      assert.equal(
        (
          await rpc(action, {
            classId: c.id,
            sessionId: s3.id,
            studentId: student,
          })
        ).error.code,
        "CLASS_ARCHIVED",
      );
    assert.equal(
      (await rpc("record", { sessionId: s.id, studentId: student })).data.audit
        .length,
      1,
    );
    await actor(student!);
    assert.equal((await rpc("list")).data.items.length, 3);
    assert.equal((await rpc("scan", fresh)).error.code, "CLASS_ARCHIVED");
    await db.exec("reset role");
    await db.query(
      "insert into private.mobile_attendance_sessions(class_id,opened_by,title,starts_at,expires_at,closed_at) select $1,$2,'Synthetic history '||n,clock_timestamp()-interval '1 day',clock_timestamp()-interval '23 hours',clock_timestamp() from generate_series(1,20) n",
      [c.id, teacher],
    );
    await actor(student!);
    const page1 = (await rpc("list")).data;
    const page2 = (await rpc("list", { cursor: page1.nextCursor })).data;
    assert.equal(page1.items.length, 20);
    assert.equal(page2.items.length, 3);
    assert.equal(
      new Set([...page1.items, ...page2.items].map((v) => v.id)).size,
      23,
    );
    await actor(null);
    assert.equal((await rpc("list")).error.code, "UNAUTHENTICATED");
  } finally {
    await db.close();
  }
});
