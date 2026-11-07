import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("forum protects identities, test gates, moderation, pagination, and writes", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("supabase/tests/base.sql", "utf8"));
    await db.exec(`
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      create table public.assessment_sessions(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), status text not null);
      create table public.forum_topics(id uuid primary key default gen_random_uuid(),author_id uuid not null references public.profiles(id) on delete cascade,title text not null check(char_length(btrim(title)) between 6 and 140),body text not null check(char_length(btrim(body)) between 10 and 6000),category text not null default 'DATABASE' check(category in ('DATABASE','GENERAL')),is_locked boolean not null default false,is_hidden boolean not null default false,created_at timestamptz not null default now());
      create table public.forum_replies(id uuid primary key default gen_random_uuid(),topic_id uuid not null references public.forum_topics(id) on delete cascade,author_id uuid not null references public.profiles(id) on delete cascade,body text not null check(char_length(btrim(body)) between 2 and 4000),is_hidden boolean not null default false,created_at timestamptz not null default now());
      alter table public.forum_topics enable row level security;
      alter table public.forum_replies enable row level security;
      grant select on public.forum_topics, public.forum_replies to authenticated;
    `);
    for (const file of (await readdir("supabase/migrations"))
      .sort()
      .filter((x) => !x.includes("learning_cron")))
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    await db.exec(`
      grant usage on schema auth,private to service_role;
      grant execute on function auth.jwt() to service_role;
      grant select on public.profiles,public.assessment_sessions,public.class_memberships to service_role;
      grant select,update on public.classes to service_role;
      revoke all on function public.forum_check_writer(uuid) from public,anon,authenticated;
      grant execute on function public.forum_check_writer(uuid) to service_role;
      create policy forum_topic_read on public.forum_topics for select to authenticated using (not public.current_user_has_active_assessment() and not is_hidden);
      create policy forum_reply_read on public.forum_replies for select to authenticated using (not public.current_user_has_active_assessment() and not is_hidden and exists(select 1 from public.forum_topics t where t.id=forum_replies.topic_id));
    `);
    const [teacher, student, other] = [
      "30000000-0000-4000-8000-000000000001",
      "30000000-0000-4000-8000-000000000002",
      "30000000-0000-4000-8000-000000000003",
    ];
    for (const id of [teacher, student, other])
      await db.query("insert into auth.users(id) values($1)", [id]);
    await db.query(
      "update public.profiles set role='TEACHER',display_name='Teacher' where id=$1",
      [teacher],
    );
    await db.query(
      "update public.profiles set display_name='Student',nim='secret-nim',birth_date='2000-01-01' where id=$1",
      [student],
    );
    await db.query(
      "update public.profiles set display_name='Other' where id=$1",
      [other],
    );
    async function actor(id: string | null) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id ?? "",
      ]);
      await db.exec("set role authenticated");
    }
    async function forum(action: string, payload: object = {}) {
      return (
        await db.query<{ r: any }>(
          "select public.mobile_forum($1,$2::jsonb) r",
          [action, JSON.stringify(payload)],
        )
      ).rows[0]!.r;
    }
    await actor(null);
    assert.equal((await forum("topics")).error.code, "AUTH_REQUIRED");
    await actor(student!);
    assert.equal(
      (
        await forum("create_topic", {
          title: "Short",
          body: "Valid long text",
          category: "DATABASE",
        })
      ).error.code,
      "VALIDATION_ERROR",
    );
    const id = (
      await forum("create_topic", {
        title: "SQL joins",
        body: "How do joins work?",
        category: "DATABASE",
      })
    ).data.id;
    assert.equal(
      (
        await forum("moderate", {
          targetId: id,
          operation: "lock_topic",
          value: true,
        })
      ).error.code,
      "FORBIDDEN",
    );
    await actor(other!);
    const reply = (
      await forum("create_reply", {
        topicId: id,
        body: "Use JOIN for matching rows.",
      })
    ).data.id;
    const topic = (await forum("topic", { topicId: id })).data;
    assert.equal(topic.authorName, "Student");
    assert.equal(topic.isMine, false);
    assert.ok(!JSON.stringify(topic).includes("secret-nim"));
    assert.ok(!("authorId" in topic));
    assert.equal((await forum("topics", { limit: 1 })).data.hasMore, false);
    const extra = (
      await forum("create_topic", {
        title: "Another topic",
        body: "A second discussion",
        category: "GENERAL",
      })
    ).data.id;
    const page1 = (await forum("topics", { limit: 1, offset: 0 })).data;
    const page2 = (await forum("topics", { limit: 1, offset: 1 })).data;
    assert.equal(page1.hasMore, true);
    assert.equal(page2.hasMore, false);
    assert.notEqual(page1.items[0].id, page2.items[0].id);
    await db.exec("reset role");
    await db.query("delete from public.forum_topics where id=$1", [extra]);
    await actor(other!);
    assert.equal(
      (await forum("topics", { search: "joins" })).data.items.length,
      1,
    );
    assert.equal(
      (await forum("topics", { search: "absent" })).data.items.length,
      0,
    );
    assert.equal(
      (await forum("replies", { topicId: id })).data.items[0].id,
      reply,
    );
    await actor(teacher!);
    assert.equal(
      (
        await forum("moderate", {
          targetId: id,
          operation: "lock_topic",
          value: true,
        })
      ).data.ok,
      true,
    );
    await actor(other!);
    assert.equal(
      (await forum("create_reply", { topicId: id, body: "blocked" })).error
        .code,
      "NOT_FOUND",
    );
    await actor(teacher!);
    await forum("moderate", {
      targetId: reply,
      operation: "hide_reply",
      value: true,
    });
    assert.equal(
      (await forum("replies", { topicId: id })).data.items.length,
      1,
    );
    await actor(student!);
    assert.equal(
      (await forum("replies", { topicId: id })).data.items.length,
      0,
    );
    await actor(teacher!);
    await forum("moderate", {
      targetId: id,
      operation: "hide_topic",
      value: true,
    });
    await actor(student!);
    assert.equal(
      (await forum("topic", { topicId: id })).error.code,
      "NOT_FOUND",
    );
    assert.equal((await forum("topics")).data.items.length, 0);
    await actor(teacher!);
    assert.equal((await forum("topics")).data.items.length, 1);
    await db.exec("reset role");
    const template = (
      await db.query<{ id: string }>(
        "insert into public.learning_paths(title,is_published) values('Forum test course',true) returning id",
      )
    ).rows[0]!.id;
    await actor(teacher!);
    const created = (
      await db.query<{ r: any }>("select public.mobile_create_class($1,$2) r", [
        "Forum class",
        template,
      ])
    ).rows[0]!.r.data;
    await actor(student!);
    await db.query("select public.mobile_join_class($1)", [created.joinCode]);
    const attempt = (
      await db.query<{ r: any }>(
        "select public.mobile_learning('start','{}'::jsonb) r",
      )
    ).rows[0]!.r;
    assert.ok(attempt.data?.id);
    assert.equal((await forum("topics")).error.code, "OTHER_TEST_ACTIVE");
    assert.equal(
      (await db.query("select * from public.forum_topics")).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ role: "service_role" }),
    ]);
    await db.exec("set role service_role");
    await assert.rejects(
      db.query("select public.forum_check_writer($1)", [student]),
      /Assessment active/,
    );
    await db.exec("reset role");
    await db.query(
      "update private.mobile_attempts set status='completed' where id=$1",
      [attempt.data.id],
    );
    await db.exec("set role service_role");
    await db.query("select public.forum_check_writer($1)", [student]);
    await db.exec("reset role");
    await db.query(
      "insert into public.assessment_sessions(user_id,status) values($1,'IN_PROGRESS')",
      [student],
    );
    await actor(student!);
    for (const action of [
      "topics",
      "topic",
      "replies",
      "create_topic",
      "create_reply",
      "moderate",
    ])
      assert.equal((await forum(action)).error.code, "OTHER_TEST_ACTIVE");
    assert.equal(
      (await db.query("select * from public.forum_topics")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into public.forum_topics(author_id,title,body) values($1,'Test title','Test body long')",
        [student],
      ),
    );
    await actor(other!);
    assert.equal(
      (await forum("topics", { limit: 0 })).error.code,
      "VALIDATION_ERROR",
    );
  } finally {
    await db.close();
  }
});
