import path from "node:path";
import { fileURLToPath } from "node:url";

const SQL_JS_WASM_DIR = path.dirname(fileURLToPath(import.meta.resolve("sql.js/dist/sql-wasm.wasm")));

export function locateSqlJsFile(file: string): string {
  return path.join(SQL_JS_WASM_DIR, file);
}
