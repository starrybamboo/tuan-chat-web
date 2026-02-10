import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import fg from "fast-glob";

const TEXT_FILE_GLOBS = [
  "app/**/*.{ts,tsx,js,jsx,mjs,cjs,json,md,css,html,yml,yaml,ps1,sql}",
  "api/**/*.{ts,tsx,js,jsx,mjs,cjs,json,md}",
  "scripts/**/*.{ts,tsx,js,jsx,mjs,cjs,ps1}",
  "electron/**/*.{ts,tsx,js,jsx,mjs,cjs,json,md}",
  "vite.config.{ts,js,mjs,cjs}",
  "eslint.config.{js,mjs,cjs}",
  "package.json",
  "README.md",
];

const BAD_CHARS = [
  { char: "\uFFFD", name: "Unicode replacement character" },
  { char: "\u022B", name: "U+022B" },
  { char: "\u0363", name: "U+0363" },
  { char: "\u03F2", name: "U+03F2" },
  { char: "\u016D", name: "U+016D" },
];

const allowedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".html",
  ".yml",
  ".yaml",
  ".ps1",
  ".sql",
]);

const normalizePath = input => input.split(path.sep).join(path.posix.sep);

function shouldCheckFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return allowedExtensions.has(ext);
}

async function gatherTargets(args) {
  if (args.length > 0) {
    return args
      .map(entry => entry.trim())
      .filter(Boolean)
      .filter(entry => !entry.startsWith("-"))
      .filter(entry => shouldCheckFile(entry));
  }
  return fg(TEXT_FILE_GLOBS, {
    dot: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
  });
}

async function checkFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, index) => {
    for (const bad of BAD_CHARS) {
      if (line.includes(bad.char)) {
        hits.push({
          line: index + 1,
          name: bad.name,
          preview: line.trim().slice(0, 200),
        });
      }
    }
  });
  return hits;
}

async function main() {
  const args = process.argv.slice(2);
  const targets = await gatherTargets(args);
  if (targets.length === 0) {
    console.log("encoding check: no matching files");
    return;
  }

  const results = [];
  for (const target of targets) {
    const filePath = normalizePath(target);
    if (!shouldCheckFile(filePath)) {
      continue;
    }
    try {
      const hits = await checkFile(filePath);
      if (hits.length > 0) {
        results.push({ filePath, hits });
      }
    }
    catch (error) {
      results.push({
        filePath,
        hits: [{ line: 0, name: "read error", preview: String(error) }],
      });
    }
  }

  if (results.length === 0) {
    console.log("encoding check: OK");
    return;
  }

  console.error("encoding check: suspicious characters detected");
  for (const result of results) {
    console.error(`- ${result.filePath}`);
    for (const hit of result.hits) {
      if (hit.line > 0) {
        console.error(`  line ${hit.line}: ${hit.name}`);
      }
      else {
        console.error(`  ${hit.name}`);
      }
      if (hit.preview) {
        console.error(`    ${hit.preview}`);
      }
    }
  }
  process.exitCode = 1;
}

await main();
