import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const dir = "supabase/functions/mobile-grade/vendor";
await mkdir(dir, { recursive: true });
// Edge runtime wraps WebAssembly.Memory; its instanceof identity differs from Deno/Node.
// The memory is host-created and bounded, never supplied by a learner.
const source = await readFile(
  "node_modules/@sqlite.org/sqlite-wasm/dist/index.mjs",
  "utf8",
);
const check =
  "target.memory instanceof WebAssembly.Memory ? target.memory : target.exports.memory";
if (!source.includes(check))
  throw Error("Pinned SQLite compatibility point changed");
await writeFile(
  `${dir}/sqlite.mjs`,
  source.replace(
    check,
    "target.memory?.buffer ? target.memory : target.exports.memory",
  ),
);
const binary = await readFile(
  "node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm",
);
await writeFile(
  `${dir}/sqlite-binary.mjs`,
  `// Gzip-compressed SQLite 3.54.1 WASM from @sqlite.org/sqlite-wasm@3.54.1-build1.\n// SQLite public domain; Emscripten glue license is preserved in sqlite.mjs.\nexport default '${gzipSync(binary, { level: 9 }).toString("base64")}';\n`,
);
console.log("Vendored pinned SQLite runtime for Edge deployment.");
