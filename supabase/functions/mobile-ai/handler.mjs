const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const fail = (code, status) => reply({ error: { code } }, status);

// Dependencies are injected so authorization and provider failure can be tested without credentials.
export async function handleAi(req, deps) {
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", 405);
  const token = req.headers
    .get("authorization")
    ?.match(/^Bearer ([^\s]{1,8192})$/i)?.[1];
  if (!token) return fail("AUTH_REQUIRED", 401);
  if (Number(req.headers.get("content-length") ?? 0) > 16384)
    return fail("INVALID_REQUEST", 400);
  let input;
  try {
    const reader = req.body?.getReader();
    if (!reader) return fail("INVALID_REQUEST", 400);
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 16384) {
          await reader.cancel();
          return fail("INVALID_REQUEST", 400);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return fail("INVALID_REQUEST", 400);
  }
  if (
    !input ||
    typeof input.message !== "string" ||
    !input.message.trim() ||
    input.message.length > 2000 ||
    !["en", "id"].includes(input.language)
  )
    return fail("INVALID_REQUEST", 400);
  try {
    const account = await deps.authorize(token);
    if (!account) return fail("AUTH_REQUIRED", 401);
    const before = await account.access(true);
    if (before !== "OK") return accessFailure(before);
    const answer = await deps.complete(input.message.trim(), input.language);
    if (typeof answer !== "string" || !answer.trim() || answer.length > 16000)
      return fail("AI_UNAVAILABLE", 502);
    const after = await account.access(false);
    if (after !== "OK") return accessFailure(after);
    return reply({ data: { answer: answer.trim() } });
  } catch {
    return fail("AI_UNAVAILABLE", 503);
  }
}
function accessFailure(code) {
  if (code === "AUTH_REQUIRED") return fail(code, 401);
  if (code === "FORBIDDEN") return fail(code, 403);
  if (code === "TEST_ACTIVE") return fail(code, 403);
  if (code === "RATE_LIMITED") return fail(code, 429);
  return fail("AI_UNAVAILABLE", 503);
}
