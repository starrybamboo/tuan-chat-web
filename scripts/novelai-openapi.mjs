import { spawnSync } from "node:child_process";
import dns from "node:dns";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SWAGGER_UI_INIT_URL = "https://api.novelai.net/docs/swagger-ui-init.js";

const openapiOutputFileUrl = new URL("../api/novelai_OpenAPI.json", import.meta.url);
const clientOutputDirUrl = new URL("../api/novelai/", import.meta.url);

dns.setDefaultResultOrder("ipv4first");

function downloadWithPowershell(url) {
  const psScript = [
    "$ProgressPreference = \"SilentlyContinue\"",
    `$response = Invoke-WebRequest -Uri \"${url}\" -UseBasicParsing`,
    "$response.Content",
  ].join("; ");

  const result = spawnSync("powershell.exe", ["-Command", psScript], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 256,
  });

  if (result.status !== 0) {
    throw new Error(
      `PowerShell 下载失败: exit=${result.status} stderr=${(result.stderr || "").toString().trim()}`,
    );
  }

  return (result.stdout || "").toString();
}

function downloadWithCurl(url) {
  const result = spawnSync("curl", ["-fsSL", url], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 256,
  });

  if (result.status !== 0) {
    throw new Error(`curl 下载失败: exit=${result.status}`);
  }

  return (result.stdout || "").toString();
}

async function downloadText(url) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/javascript,text/javascript,*/*" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  }
  catch {
    if (process.platform === "win32") {
      return downloadWithPowershell(url);
    }
    return downloadWithCurl(url);
  }
}

function extractJsonObjectFromJs({ source, startAt }) {
  const braceStart = source.indexOf("{", startAt);
  if (braceStart === -1) {
    throw new Error("无法定位 JSON 对象起始 \"{\"。");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = braceStart; index < source.length; index++) {
    const ch = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\\\") {
        escaped = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth++;
      continue;
    }

    if (ch === "}") {
      depth--;
      if (depth === 0) {
        const jsonText = source.slice(braceStart, index + 1);
        return jsonText;
      }
    }
  }

  throw new Error("未能在 swagger-ui-init.js 中找到完整闭合的 JSON 对象。");
}

function extractSwaggerDocFromSwaggerUiInit(jsText) {
  const markers = ["let options =", "const options =", "var options ="];
  const markerIndex = markers.map(m => jsText.indexOf(m)).find(idx => idx !== -1);
  if (markerIndex === undefined) {
    throw new Error("无法定位 swagger-ui-init.js 中的 options 对象声明。");
  }

  const optionsJsonText = extractJsonObjectFromJs({ source: jsText, startAt: markerIndex });
  const options = JSON.parse(optionsJsonText);

  if (!options || typeof options !== "object") {
    throw new Error("解析 options 失败：结果不是对象。");
  }

  const swaggerDoc = options.swaggerDoc;
  if (!swaggerDoc || typeof swaggerDoc !== "object") {
    throw new Error("解析 options.swaggerDoc 失败：未找到 OpenAPI 文档对象。");
  }

  if (!("openapi" in swaggerDoc) && !("swagger" in swaggerDoc)) {
    throw new Error("swaggerDoc 中未检测到 openapi/swagger 字段，内容可能不是 OpenAPI 规范。");
  }

  return swaggerDoc;
}

async function exportOpenApiJson() {
  const jsText = await downloadText(SWAGGER_UI_INIT_URL);

  const swaggerDoc = extractSwaggerDocFromSwaggerUiInit(jsText);

  await mkdir(new URL("../api/", import.meta.url), { recursive: true });
  await writeFile(openapiOutputFileUrl, `${JSON.stringify(swaggerDoc, null, 2)}\n`, "utf8");

  const title = swaggerDoc?.info?.title ?? "(unknown)";
  const version = swaggerDoc?.info?.version ?? "(unknown)";
  const pathCount = swaggerDoc?.paths ? Object.keys(swaggerDoc.paths).length : 0;
  console.log(`[novelai-openapi] 已导出 OpenAPI: ${title} @ ${version} (paths=${pathCount})`);
  console.log(`[novelai-openapi] 输出: ${fileURLToPath(openapiOutputFileUrl)}`);
}

function generateClient() {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "openapi",
      "--input",
      fileURLToPath(openapiOutputFileUrl),
      "--output",
      fileURLToPath(clientOutputDirUrl),
      "--client",
      "fetch",
      "--name",
      "NovelAI",
    ],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    throw new Error(`openapi-typescript-codegen 执行失败: exit=${result.status}`);
  }

  console.log(`[novelai-openapi] 客户端输出: ${fileURLToPath(clientOutputDirUrl)}`);
}

async function main() {
  const command = process.argv[2];

  if (command === "fetch") {
    await exportOpenApiJson();
    return;
  }

  if (command === "generate") {
    await exportOpenApiJson();
    generateClient();
    return;
  }

  console.log("用法:");
  console.log("  node ./scripts/novelai-openapi.mjs fetch");
  console.log("  node ./scripts/novelai-openapi.mjs generate");
  process.exitCode = 2;
}

await main();
