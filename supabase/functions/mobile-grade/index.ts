import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { grade, runLab, validateReferences } from "./grader.mjs";
const url = Deno.env.get("SUPABASE_URL")!;
function serviceKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  return keys
    ? (Object.values(JSON.parse(keys))[0] as string)
    : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}
const admin = createClient(url, serviceKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});
function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
async function bodyOf(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) throw Error("INVALID_BODY");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) {
        await reader.cancel();
        throw Error("INVALID_BODY");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    all.set(part, offset);
    offset += part.length;
  }
  const value = JSON.parse(new TextDecoder().decode(all));
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("INVALID_BODY");
  return value;
}
const uuid = (id: unknown) =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
async function cycle(actor: string, action: string, payload: unknown) {
  const r = await admin.rpc("mobile_cycle", {
    p_actor: actor,
    p_action: action,
    p_payload: payload,
  });
  if (r.error) throw Error("CYCLE_UNAVAILABLE");
  return r.data;
}
Deno.serve(async (req: Request) => {
  if (req.method !== "POST")
    return reply({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);
  try {
    if (Number(req.headers.get("content-length") ?? 0) > 65536)
      return reply({ error: { code: "VALIDATION_ERROR" } }, 400);
    let actor: string | null = null,
      id: string | null = null,
      limit = 1;
    const cronHeader = req.headers.get("x-mobile-cron");
    if (cronHeader) {
      const key = await admin.rpc("mobile_grade_cron_key");
      if (key.error || typeof key.data !== "string" || cronHeader !== key.data)
        return reply({ error: { code: "AUTH_REQUIRED" } }, 401);
      limit = 5;
    } else {
      const token = req.headers
        .get("authorization")
        ?.match(/^Bearer ([^\s]{1,8192})$/i)?.[1];
      if (!token) return reply({ error: { code: "AUTH_REQUIRED" } }, 401);
      const user = await admin.auth.getUser(token);
      if (user.error || !user.data.user)
        return reply({ error: { code: "AUTH_REQUIRED" } }, 401);
      actor = user.data.user.id;
      let body;
      try {
        body = await bodyOf(req);
      } catch {
        return reply({ error: { code: "VALIDATION_ERROR" } }, 400);
      }
      if (body.action === "save_bank") {
        if (!uuid(body.classId))
          return reply({ error: { code: "VALIDATION_ERROR" } }, 400);
        const checked = await cycle(actor, "bank_check", body);
        if (checked.error) return reply(checked);
        try {
          await validateReferences(checked.data.questions);
        } catch {
          return reply({ error: { code: "SQL_REFERENCE_INVALID" } }, 422);
        }
        // Recheck ownership, revision and started attempts atomically after sandbox validation.
        return reply(await cycle(actor, "bank_save", body));
      }
      if (body.action === "lab") {
        if (!uuid(body.materialId) || !uuid(body.requestId))
          return reply({ error: { code: "VALIDATION_ERROR" } }, 400);
        const opened = await cycle(actor, "lab_open", body);
        if (opened.error) return reply(opened);
        const job = opened.data;
        if (job.result) return reply({ data: job.result });
        let result;
        try {
          result = await runLab(job.kind, job.query, job.check);
        } catch {
          result = {
            columns: 0,
            names: [],
            rows: [],
            passed: false,
            error: "QUERY_REJECTED",
          };
        }
        return reply(
          await cycle(actor, "lab_commit", {
            materialId: body.materialId,
            runId: job.id,
            result,
          }),
        );
      }
      if (!uuid(body.attemptId))
        return reply({ error: { code: "VALIDATION_ERROR" } }, 400);
      id = body.attemptId;
    }
    let processed = 0;
    for (let i = 0; i < limit; i++) {
      const claimed = await admin.rpc("mobile_grade_jobs", {
        p_id: id,
        p_actor: actor,
      });
      if (claimed.error) throw Error("QUEUE_UNAVAILABLE");
      if (!claimed.data) break;
      const job = claimed.data;
      const scores = await grade(job.questions, job.answers);
      const committed = await admin.rpc("mobile_grade_commit", {
        p_id: job.id,
        p_lease: job.lease,
        p_scores: scores,
      });
      if (committed.error || committed.data !== true)
        throw Error("GRADE_UNAVAILABLE");
      processed++;
    }
    return reply({ data: { processed } });
  } catch {
    return reply({ error: { code: "GRADING_UNAVAILABLE" } }, 503);
  }
});
