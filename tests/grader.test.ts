import test from "node:test";
import assert from "node:assert/strict";
import {
  grade,
  singleStatement,
} from "../supabase/functions/mobile-grade/grader.mjs";
const questions = [
  {
    id: "select",
    kind: "sql",
    reference: "SELECT name FROM students WHERE cohort=2025 ORDER BY name",
  },
  {
    id: "count",
    kind: "sql",
    reference: "SELECT COUNT(*) FROM students WHERE cohort=2024",
  },
  { id: "choice", kind: "choice", correct: "a" },
];
test("SQLite grader evaluates equivalent SQL on fresh private fixtures and rejects false results", async () => {
  assert.deepEqual(
    await grade(questions, {
      select:
        "select name from students where 2025 = cohort order by name ASC;",
      count: "SELECT count(id) AS total FROM students WHERE cohort=2024",
      choice: "a",
    }),
    { select: true, count: true, choice: true },
  );
  assert.deepEqual(
    await grade(questions, {
      select: "SELECT 'Alya'",
      count: "SELECT 1",
      choice: "b",
    }),
    { select: false, count: false, choice: false },
  );
});
test("SQLite sandbox rejects production/system data, writes, filesystem functions and multiple statements", async () => {
  for (const query of [
    "SELECT * FROM sqlite_master",
    "ATTACH DATABASE '/tmp/x' AS x",
    "PRAGMA database_list",
    "DELETE FROM students",
    "SELECT readfile('/etc/passwd')",
    "SELECT name FROM students; SELECT name FROM students",
    "WITH RECURSIVE x(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM x) SELECT n FROM x",
  ]) {
    assert.equal(
      (await grade([questions[0]!], { select: query })).select,
      false,
      query,
    );
  }
  assert.equal(singleStatement("SELECT ';' FROM students; -- comment"), true);
  assert.equal(singleStatement("SELECT 'unclosed"), false);
  await assert.rejects(
    grade(
      [
        {
          id: "broken",
          kind: "sql",
          reference: "SELECT private_data FROM missing_table",
        },
      ],
      {},
    ),
  );
  assert.equal(
    (
      await grade([questions[1]!], {
        count: "SELECT count(*) FROM students WHERE cohort=2024",
      })
    ).count,
    true,
  );
});

test("lab SELECT and UPDATE checks use private fixtures and reset every run", async () => {
  const { runLab } = await import(
    "../supabase/functions/mobile-grade/grader.mjs"
  );
  assert.equal(
    (
      await runLab(
        "filter",
        "SELECT name FROM students WHERE cohort=2025 ORDER BY name",
        true,
      )
    ).passed,
    true,
  );
  assert.equal(
    (await runLab("filter", "SELECT 'Alya' UNION ALL SELECT 'Citra'", true))
      .passed,
    false,
  );
  const updated = await runLab(
    "update",
    "UPDATE students SET cohort=2026 WHERE cohort=2024",
    true,
  );
  assert.equal(updated.passed, true);
  assert.equal(updated.rows[1]![2], 2026);
  assert.equal(
    (await runLab("update", "UPDATE students SET cohort=2026", true)).passed,
    false,
  );
  assert.equal(
    (await runLab("update", "SELECT * FROM students ORDER BY id", false))
      .rows[1]![2],
    2024,
  );
  for (const query of [
    "DELETE FROM students",
    "DROP TABLE students",
    "UPDATE students SET name=readfile('/etc/passwd')",
    "UPDATE students SET id=42",
    "UPDATE students SET cohort=2026; SELECT 1",
  ])
    await assert.rejects(runLab("update", query, true));
});
test("authoring accepts executable read references and rejects unsafe or invalid SQL", async () => {
  const { validateReferences } = await import(
    "../supabase/functions/mobile-grade/grader.mjs"
  );
  await validateReferences(questions);
  for (const reference of [
    "SELECT missing FROM students",
    "UPDATE students SET cohort=2026",
    "SELECT * FROM auth.users",
  ])
    await assert.rejects(
      validateReferences([{ id: "sql", kind: "sql", reference }]),
    );
});

test("UPDATE equivalence checks the actual mutation, including RETURNING", async () => {
  const { runLab } = await import(
    "../supabase/functions/mobile-grade/grader.mjs"
  );
  assert.equal(
    (
      await runLab(
        "update",
        "UPDATE students SET cohort=2026 WHERE cohort=2024 RETURNING name",
        true,
      )
    ).passed,
    true,
  );
  assert.equal(
    (
      await runLab(
        "update",
        "SELECT id,name,CASE WHEN cohort=2024 THEN 2026 ELSE cohort END FROM students ORDER BY id",
        true,
      )
    ).passed,
    false,
  );
});
