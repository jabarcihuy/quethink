import initialize from "./vendor/sqlite.mjs";
import binary from "./vendor/sqlite-binary.mjs";
let runtime;
const fixtures = [
  [
    [1, "Alya", 2025],
    [2, "Bima", 2024],
    [3, "Citra", 2025],
  ],
  [
    [4, "Deni", 2024],
    [5, "Eka", 2025],
    [6, "Fina", 2024],
    [7, "Arga", 2025],
  ],
];
function sqlite() {
  if (!runtime) {
    globalThis.sqlite3ApiConfig = {
      disable: {
        vfs: {
          opfs: true,
          "opfs-vfs": true,
          "opfs-sahpool": true,
          "opfs-wl": true,
          kvvfs: true,
        },
      },
      warn: () => {},
      error: () => {},
    };
    runtime = (async () => {
      const packed = Uint8Array.from(atob(binary), (c) => c.charCodeAt(0));
      const stream = new Blob([packed])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      const wasmBinary = new Uint8Array(
        await new Response(stream).arrayBuffer(),
      );
      return initialize({
        wasmBinary,
        wasmMemory: new WebAssembly.Memory({ initial: 128, maximum: 512 }),
        print: () => {},
        printErr: () => {},
      });
    })();
  }
  return runtime;
}
// Syntax boundary only. SQLite, rather than string comparison, decides correctness.
export function singleStatement(sql) {
  if (
    typeof sql !== "string" ||
    !sql.trim() ||
    sql.length > 4096 ||
    sql.includes("\0")
  )
    return false;
  let quote = null,
    ended = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i],
      next = sql[i + 1];
    if (quote) {
      if (c === quote) {
        if (next === quote) i++;
        else quote = null;
      }
      continue;
    }
    if (c === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      if (end < 0) return false;
      i = end + 1;
      continue;
    }
    if (/\s/.test(c)) continue;
    if (ended) return false;
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      continue;
    }
    if (c === "[") {
      const end = sql.indexOf("]", i + 1);
      if (end < 0) return false;
      i = end;
      continue;
    }
    if (c === ";") ended = true;
  }
  return !quote;
}
function execute(engine, query, rows, mode = "select", labels = false) {
  const db = new engine.oo1.DB(":memory:");
  try {
    db.exec(
      "PRAGMA temp_store=MEMORY; CREATE TABLE students(id INTEGER PRIMARY KEY,name TEXT NOT NULL,cohort INTEGER NOT NULL);",
    );
    for (const row of rows)
      db.exec({ sql: "INSERT INTO students VALUES(?,?,?)", bind: row });
    const { capi } = engine,
      handle = db.pointer;
    for (const [limit, value] of [
      [capi.SQLITE_LIMIT_LENGTH, 8000],
      [capi.SQLITE_LIMIT_SQL_LENGTH, 4096],
      [capi.SQLITE_LIMIT_COLUMN, 8],
      [capi.SQLITE_LIMIT_EXPR_DEPTH, 24],
      [capi.SQLITE_LIMIT_COMPOUND_SELECT, 2],
      [capi.SQLITE_LIMIT_FUNCTION_ARG, 4],
      [capi.SQLITE_LIMIT_ATTACHED, 0],
      [capi.SQLITE_LIMIT_VDBE_OP, 5000],
    ])
      capi.sqlite3_limit(handle, limit, value);
    capi.sqlite3_db_config(handle, capi.SQLITE_DBCONFIG_DEFENSIVE, 1);
    let mutates = false;
    const functions = new Set([
      "count",
      "min",
      "max",
      "avg",
      "sum",
      "round",
      "upper",
      "lower",
      "length",
    ]);
    capi.sqlite3_set_authorizer(
      handle,
      (_ctx, action, first, second) => {
        if (action === capi.SQLITE_SELECT) return capi.SQLITE_OK;
        if (
          mode === "update" &&
          action === capi.SQLITE_UPDATE &&
          String(first).toLowerCase() === "students" &&
          ["name", "cohort"].includes(String(second).toLowerCase())
        ) {
          mutates = true;
          return capi.SQLITE_OK;
        }
        if (action === capi.SQLITE_READ)
          return String(first).toLowerCase() === "students"
            ? capi.SQLITE_OK
            : capi.SQLITE_DENY;
        if (action === capi.SQLITE_FUNCTION)
          return functions.has(String(second || first).toLowerCase())
            ? capi.SQLITE_OK
            : capi.SQLITE_DENY;
        return capi.SQLITE_DENY;
      },
      0,
    );
    let operations = 0;
    const until = performance.now() + 50;
    capi.sqlite3_progress_handler(
      handle,
      500,
      () => {
        operations += 500;
        return operations > 25000 || performance.now() > until ? 1 : 0;
      },
      0,
    );
    const statement = db.prepare(query);
    try {
      if (
        (statement.columnCount < 1 && mode !== "update") ||
        statement.columnCount > 8
      )
        throw Error("QUERY_REJECTED");
      const output = [];
      let size = 0;
      while (statement.step()) {
        if (output.length >= 100) throw Error("OUTPUT_LIMIT");
        const row = statement.get([]);
        for (const cell of row) {
          if (
            !(
              cell === null ||
              typeof cell === "string" ||
              (typeof cell === "number" && Number.isFinite(cell))
            )
          )
            throw Error("CELL_LIMIT");
          size += String(cell ?? "").length;
          if (size > 8000) throw Error("OUTPUT_LIMIT");
        }
        output.push(row);
      }
      if (mode === "update" && mutates) {
        const final = db.selectArrays(
          "SELECT id,name,cohort FROM students ORDER BY id",
        );
        return {
          columns: 3,
          mutates: true,
          rows: final,
          ...(labels ? { names: ["id", "name", "cohort"] } : {}),
        };
      }
      return {
        columns: statement.columnCount,
        ...(mode === "update" ? { mutates: false } : {}),
        rows: output,
        ...(labels ? { names: statement.getColumnNames([]) } : {}),
      };
    } finally {
      statement.finalize();
    }
  } finally {
    db.close();
  }
}
export async function grade(questions, answers) {
  if (
    !Array.isArray(questions) ||
    questions.length > 30 ||
    typeof answers !== "object" ||
    !answers
  )
    throw Error("CONFIGURATION_ERROR");
  const engine = await sqlite(),
    scores = {};
  for (const q of questions) {
    if (q.kind === "choice") {
      scores[q.id] =
        typeof answers[q.id] === "string" && answers[q.id] === q.correct;
      continue;
    }
    if (q.kind !== "sql" || !singleStatement(q.reference))
      throw Error("CONFIGURATION_ERROR");
    // Always validate reference fixtures before deciding whether a student is wrong.
    const expected = fixtures.map((rows) => execute(engine, q.reference, rows));
    if (!singleStatement(answers[q.id])) {
      scores[q.id] = false;
      continue;
    }
    scores[q.id] = fixtures.every((rows, i) => {
      try {
        return (
          JSON.stringify(execute(engine, answers[q.id], rows)) ===
          JSON.stringify(expected[i])
        );
      } catch {
        return false;
      }
    });
  }
  return scores;
}

export async function validateReferences(questions) {
  const engine = await sqlite();
  for (const q of questions) {
    if (q.kind === "sql") {
      if (!singleStatement(q.reference)) throw Error("SQL_REFERENCE_INVALID");
      for (const rows of fixtures) execute(engine, q.reference, rows);
    }
  }
}
export async function runLab(kind, query, check) {
  if (!["filter", "update"].includes(kind) || !singleStatement(query))
    throw Error("QUERY_REJECTED");
  const engine = await sqlite(),
    mode = kind === "update" ? "update" : "select";
  const reference =
    kind === "update"
      ? "UPDATE students SET cohort=2026 WHERE cohort=2024"
      : "SELECT name FROM students WHERE cohort=2025 ORDER BY name";
  const output = execute(engine, query, fixtures[0], mode, true);
  const passed =
    check &&
    fixtures.every((rows) => {
      try {
        return (
          JSON.stringify(execute(engine, query, rows, mode)) ===
          JSON.stringify(execute(engine, reference, rows, mode))
        );
      } catch {
        return false;
      }
    });
  return { ...output, passed };
}
