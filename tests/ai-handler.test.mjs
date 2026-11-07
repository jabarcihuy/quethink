import test from "node:test";
import assert from "node:assert/strict";
import { handleAi } from "../supabase/functions/mobile-ai/handler.mjs";
const request = (message = "What is a JOIN?") =>
  new Request("https://example.test", {
    method: "POST",
    headers: {
      authorization: "Bearer fixture",
      "content-type": "application/json",
    },
    body: JSON.stringify({ message, language: "en" }),
  });
const deps = (access = async () => "OK") => ({
  authorize: async () => ({ access }),
  complete: async () => "A JOIN combines rows.",
});
const code = async (response) => (await response.json()).error?.code;

test("requires a user and bounds input before contacting provider", async () => {
  let calls = 0;
  const d = {
    authorize: async () => {
      calls++;
      return null;
    },
    complete: async () => {
      throw Error();
    },
  };
  assert.equal(
    (await handleAi(new Request("https://example.test", { method: "POST" }), d))
      .status,
    401,
  );
  assert.equal((await handleAi(request("x".repeat(2001)), d)).status, 400);
  assert.equal(calls, 0);
  assert.equal((await handleAi(request(), d)).status, 401);
});
test("blocks active tests and quota before provider invocation", async () => {
  for (const expected of ["TEST_ACTIVE", "RATE_LIMITED", "FORBIDDEN"]) {
    let called = false;
    const d = deps(async () => expected);
    d.complete = async () => {
      called = true;
      return "secret";
    };
    assert.equal(await code(await handleAi(request(), d)), expected);
    assert.equal(called, false);
  }
});
test("rechecks access after provider returns and discards answer if test started", async () => {
  let checks = 0;
  const d = deps(async (reserve) => {
    checks++;
    return reserve ? "OK" : "TEST_ACTIVE";
  });
  const result = await handleAi(request(), d);
  assert.equal(await code(result), "TEST_ACTIVE");
  assert.equal(checks, 2);
});
test("returns valid response and hides upstream errors", async () => {
  assert.equal(
    (await (await handleAi(request(), deps())).json()).data.answer,
    "A JOIN combines rows.",
  );
  const d = deps();
  d.complete = async () => {
    throw new Error("sensitive provider detail");
  };
  const text = await (await handleAi(request(), d)).text();
  assert.match(text, /AI_UNAVAILABLE/);
  assert.doesNotMatch(text, /sensitive/);
});
