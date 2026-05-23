import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const inventoryPath = resolve(projectRoot, "docs/media-legacy-url-inventory.json");

const SOURCE_EXTENSIONS = new Set([".java", ".ts", ".tsx", ".sql", ".json"]);
const SKIP_DIRS = new Set([
  ".codex-tmp",
  ".expo-export-web",
  ".react-router",
  ".tanstack",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "release",
]);

const DECLARATION_PATTERNS = [
  /\bprivate\s+(?:List\s*<\s*String\s*>|String)\s+([A-Za-z_$][\w$]*)\s*(?:=[^;]*)?;/g,
  /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\??:\s*(?:Array\s*<\s*string\s*>|string\s*\[\]|string(?:\s*\|\s*null)?(?:\s*\|\s*undefined)?)\s*[;,]/gm,
];

const SQL_TYPE_PATTERN = String.raw`(?:character\s+varying|varchar|text|jsonb?|uuid|bigint|integer|int|smallint|boolean|bool|timestamp|date|numeric|decimal)`;

const SQL_FIELD_PATTERNS = [
  new RegExp(String.raw`^\s*"?([a-z]\w*)"?\s+${SQL_TYPE_PATTERN}\b`, "gim"),
  new RegExp(String.raw`\bADD\s+COLUMN(?:\s+IF\s+NOT\s+EXISTS)?\s+"?([a-z]\w*)"?\s+${SQL_TYPE_PATTERN}\b`, "gi"),
  /\bDROP\s+COLUMN(?:\s+IF\s+EXISTS)?\s+"?([a-z]\w*)"?/gi,
  /\bCOMMENT\s+ON\s+COLUMN\s+(?:[\w"]+\.){1,2}"?([a-z]\w*)"?\s+IS\b/gi,
  /\bdrop_empty_legacy_media_url_column\([^,]+,\s*'([a-z]\w*)'\s*\)/gi,
  /\bcolumn_name\s*=\s*'([a-z]\w*)'/gi,
];

const MEDIA_NOUNS = [
  "avatar",
  "background",
  "cover",
  "file",
  "image",
  "logo",
  "map",
  "media",
  "origin",
  "resource",
  "sound",
  "sprite",
  "thumb",
  "video",
  "voice",
];

const KNOWN_URL_FIELDS = new Set([
  "downloadUrl",
  "longUrl",
  "previewUrl",
  "ttsApiUrl",
  "uploadUrl",
]);

const KNOWN_MEDIA_VALUE_FIELDS = new Set([
  "avatar",
  "coverImage",
  "image",
  "originalAvatar",
  "originalCoverImage",
  "originalImage",
  "originalMapImg",
]);

function loadInventory() {
  return JSON.parse(readFileSync(inventoryPath, "utf8"));
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function shouldSkipPath(path) {
  const parts = normalizePath(path).split("/");
  if (parts.some(part => SKIP_DIRS.has(part))) {
    return true;
  }
  return /\.test\.[cm]?[jt]sx?$/.test(path) || /\.e2e\.test\.[cm]?[jt]sx?$/.test(path);
}

function walkFiles(root) {
  const files = [];
  if (!statExists(root)) {
    return files;
  }

  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (shouldSkipPath(path)) {
        continue;
      }
      if (entry.isDirectory()) {
        visit(path);
        continue;
      }
      if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(path))) {
        files.push(path);
      }
    }
  };

  visit(root);
  return files;
}

function statExists(path) {
  try {
    statSync(path);
    return true;
  }
  catch {
    return false;
  }
}

function isBareMediaValueFieldTarget(file) {
  const normalized = normalizePath(file);
  return normalized.endsWith(".sql")
    || normalized.endsWith("_OpenAPI.json")
    || normalized.endsWith("/api.json")
    || normalized.includes("../TuanChat/src/main/java/")
    || normalized.includes("/TuanChat/src/main/java/")
    || normalized.includes("packages/tuanchat-openapi-client/src/models/")
    || normalized.includes("api/novelai/models/");
}

function isUrlFieldName(field, file) {
  if (KNOWN_URL_FIELDS.has(field)) {
    return true;
  }
  if (KNOWN_MEDIA_VALUE_FIELDS.has(field) && isBareMediaValueFieldTarget(file)) {
    return true;
  }
  if (/(?:DataUrl|DataUrls|ObjectUrl|ObjectUrls|BlobUrl|BlobUrls)$/.test(field)) {
    return true;
  }
  if (/(?:BaseUrl|ApiUrl|EndpointUrl|HealthcheckUrl|EditorUrl)$/.test(field)) {
    return true;
  }
  if (!/(?:Url|Urls|URL|URLs)$/.test(field)) {
    return false;
  }
  const lower = field.toLowerCase();
  return MEDIA_NOUNS.some(noun => lower.includes(noun));
}

function extractCandidatesFromFile(file) {
  const extension = extname(file);
  if (extension === ".sql") {
    return extractCandidatesFromSql(file);
  }
  if (extension === ".json") {
    return extractCandidatesFromOpenApiJson(file);
  }

  const text = readFileSync(file, "utf8");
  const candidates = [];
  for (const pattern of DECLARATION_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const field = match[1];
      if (!isUrlFieldName(field, file)) {
        continue;
      }
      const line = 1 + text.slice(0, match.index).split(/\r?\n/).length - 1;
      candidates.push({ file, field, line, sourceKind: "source" });
    }
  }
  return candidates;
}

function snakeToCamel(value) {
  return value.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function lineForIndex(text, index) {
  return 1 + text.slice(0, index).split(/\r?\n/).length - 1;
}

function extractCandidatesFromSql(file) {
  const text = readFileSync(file, "utf8");
  const candidates = [];
  const seen = new Set();

  for (const pattern of SQL_FIELD_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const sqlField = match[1];
      if (/^has_.*_url$/.test(sqlField)) {
        continue;
      }
      const field = snakeToCamel(sqlField);
      if (!isUrlFieldName(field, file)) {
        continue;
      }
      const line = lineForIndex(text, match.index);
      const key = `${field}:${line}:${sqlField}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      candidates.push({
        file,
        field,
        line,
        sourceField: sqlField,
        sourceKind: "sql",
      });
    }
  }

  return candidates;
}

function extractCandidatesFromOpenApiJson(file) {
  const text = readFileSync(file, "utf8");
  let spec;
  try {
    spec = JSON.parse(text);
  }
  catch {
    return [];
  }

  const schemas = spec?.components?.schemas;
  if (!schemas || typeof schemas !== "object") {
    return [];
  }

  const candidates = [];
  for (const [schemaName, schema] of Object.entries(schemas)) {
    const properties = schema?.properties;
    if (!properties || typeof properties !== "object") {
      continue;
    }
    for (const field of Object.keys(properties)) {
      if (!isUrlFieldName(field, file)) {
        continue;
      }
      const propertyIndex = text.indexOf(`"${field}"`);
      candidates.push({
        file,
        field,
        line: propertyIndex >= 0 ? lineForIndex(text, propertyIndex) : 1,
        sourceKind: "openapi",
        sourceSchema: schemaName,
      });
    }
  }

  return candidates;
}

function pathMatches(entry, file) {
  const pathIncludes = entry.pathIncludes;
  if (!Array.isArray(pathIncludes) || pathIncludes.length === 0) {
    return true;
  }
  const normalized = normalizePath(file).toLowerCase();
  return pathIncludes.some(part => normalized.includes(String(part).toLowerCase()));
}

function schemaMatches(entry, candidate) {
  const sourceSchemas = entry.sourceSchemas;
  if (!Array.isArray(sourceSchemas) || sourceSchemas.length === 0) {
    return true;
  }
  return Boolean(candidate.sourceSchema) && sourceSchemas.includes(candidate.sourceSchema);
}

function compileInventoryPattern(pattern) {
  return new RegExp(pattern);
}

function classifyCandidate(candidate, inventory) {
  const exactMatches = inventory.fields
    .filter(entry => entry.field === candidate.field && pathMatches(entry, candidate.file) && schemaMatches(entry, candidate))
    .sort((left, right) => {
      const rightScore = (right.pathIncludes?.length ?? 0) + (right.sourceSchemas?.length ?? 0);
      const leftScore = (left.pathIncludes?.length ?? 0) + (left.sourceSchemas?.length ?? 0);
      return rightScore - leftScore;
    });

  if (exactMatches[0]) {
    return exactMatches[0];
  }

  const patternMatches = inventory.patterns ?? [];
  for (const entry of patternMatches) {
    const pattern = new RegExp(entry.pattern);
    if (pattern.test(candidate.field)) {
      return entry;
    }
  }

  return null;
}

function validateInventory(inventory) {
  const errors = [];
  const allowedClassifications = new Set(Object.keys(inventory.classifications ?? {}));
  const fieldNames = new Set();

  for (const entry of inventory.fields ?? []) {
    if (!entry.field) {
      errors.push("inventory.fields 存在缺少 field 的条目");
    }
    if (!allowedClassifications.has(entry.classification)) {
      errors.push(`字段 ${entry.field} 使用了未知分类 ${entry.classification}`);
    }
    const key = `${entry.field}:${(entry.pathIncludes ?? []).join("|")}:${(entry.sourceSchemas ?? []).join("|")}`;
    if (fieldNames.has(key)) {
      errors.push(`字段 ${entry.field} 存在重复清单条目`);
    }
    fieldNames.add(key);
    if (!entry.readPolicy || !entry.writePolicy || !entry.retirementCondition) {
      errors.push(`字段 ${entry.field} 缺少 readPolicy/writePolicy/retirementCondition`);
    }
  }

  for (const entry of inventory.patterns ?? []) {
    if (!entry.pattern) {
      errors.push("inventory.patterns 存在缺少 pattern 的条目");
      continue;
    }
    try {
      compileInventoryPattern(entry.pattern);
    }
    catch (error) {
      errors.push(`pattern ${entry.pattern} 不是合法正则: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!allowedClassifications.has(entry.classification)) {
      errors.push(`pattern ${entry.pattern} 使用了未知分类 ${entry.classification}`);
    }
  }

  return errors;
}

function collectCandidates(inventory) {
  const roots = inventory.scanTargets.map(target => resolve(projectRoot, target));
  return roots.flatMap(root => walkFiles(root).flatMap(extractCandidatesFromFile));
}

function buildReport() {
  const inventory = loadInventory();
  const validationErrors = validateInventory(inventory);
  const candidates = collectCandidates(inventory);
  const missing = [];
  const classified = [];

  for (const candidate of candidates) {
    const classification = classifyCandidate(candidate, inventory);
    if (!classification) {
      missing.push(candidate);
      continue;
    }
    classified.push({
      ...candidate,
      classification: classification.classification,
    });
  }

  return {
    inventoryPath: normalizePath(relative(projectRoot, inventoryPath)),
    validationErrors,
    checkedFields: candidates.length,
    classifiedFields: classified.length,
    missing,
    classified,
  };
}

function printHumanReport(report) {
  if (report.validationErrors.length > 0) {
    console.error("Legacy media URL inventory schema errors:");
    for (const error of report.validationErrors) {
      console.error(`- ${error}`);
    }
  }

  if (report.missing.length > 0) {
    console.error("Unclassified durable media-looking URL fields:");
    for (const item of report.missing) {
      const source = item.sourceSchema ? ` (${item.sourceSchema})` : "";
      const sourceField = item.sourceField && item.sourceField !== item.field ? ` from ${item.sourceField}` : "";
      console.error(`- ${normalizePath(relative(projectRoot, item.file))}:${item.line} ${item.field}${sourceField}${source}`);
    }
  }

  if (report.validationErrors.length === 0 && report.missing.length === 0) {
    console.log(`Legacy media URL inventory check passed (${report.checkedFields} fields checked).`);
  }
}

const report = buildReport();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({
    ...report,
    missing: report.missing.map(item => ({
      ...item,
      file: normalizePath(relative(projectRoot, item.file)),
    })),
    classified: report.classified.map(item => ({
      ...item,
      file: normalizePath(relative(projectRoot, item.file)),
    })),
  }, null, 2));
}
else {
  printHumanReport(report);
}

if (report.validationErrors.length > 0 || report.missing.length > 0) {
  process.exitCode = 1;
}
