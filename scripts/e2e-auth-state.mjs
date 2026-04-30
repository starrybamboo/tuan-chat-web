import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const DEFAULT_ENV_FILE = ".env.development.local";
const DEFAULT_OUTPUT_FILE = ".tmp/e2e-auth-state.json";
const DEFAULT_TIMEOUT_MS = 10_000;

function printHelp() {
  console.log(`Usage: pnpm test:e2e:auth-state [options]

Generate a Playwright storageState file for authenticated e2e/browser tests.

Options:
  --env-file <path>       Local env file to read. Default: ${DEFAULT_ENV_FILE}
  --output <path>         storageState output path. Default: ${DEFAULT_OUTPUT_FILE}
  --api-base-url <url>    Override TC_E2E_API_BASE_URL.
  --app-origin <url>      Override TC_E2E_APP_ORIGIN.
  --login-method <type>   userId or username. Default: TC_E2E_LOGIN_METHOD or userId.
  --user-id <id>          Override TC_E2E_USER_ID.
  --username <name>       Override TC_E2E_USERNAME.
  --password <password>   Override TC_E2E_PASSWORD.
  --help                  Show this help.
`);
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`未知参数：${arg}`);
    }

    const [rawKey, inlineValue] = arg.split("=", 2);
    const key = rawKey.slice(2);
    const value = inlineValue ?? argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`参数 ${rawKey} 缺少值`);
    }
    if (inlineValue === undefined) {
      index += 1;
    }
    options[key] = value;
  }

  return options;
}

function parseEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function readEnvFile(envFile) {
  let content = "";
  try {
    content = await readFile(envFile, "utf8");
  }
  catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }

  const entries = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = parseEnvValue(line.slice(separatorIndex + 1));
    entries[key] = value;
  }

  return entries;
}

function requireValue(config, key) {
  const value = config[key]?.trim();
  if (!value) {
    throw new Error(`缺少 ${key}，请在 ${DEFAULT_ENV_FILE} 或命令行参数中配置。`);
  }
  return value;
}

function normalizeOrigin(value) {
  const url = new URL(value);
  return url.origin;
}

function buildLoginBody(config) {
  const loginMethod = (config.TC_E2E_LOGIN_METHOD || "userId").trim();
  const password = requireValue(config, "TC_E2E_PASSWORD");

  if (loginMethod === "username") {
    return {
      body: {
        username: requireValue(config, "TC_E2E_USERNAME"),
        password,
      },
      uid: config.TC_E2E_USER_ID?.trim() || "",
    };
  }

  if (loginMethod !== "userId") {
    throw new Error(`不支持的 TC_E2E_LOGIN_METHOD：${loginMethod}`);
  }

  const userId = requireValue(config, "TC_E2E_USER_ID");
  return {
    body: {
      userId,
      password,
    },
    uid: userId,
  };
}

async function login({ apiBaseUrl, body }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/user/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    }
    catch {
      throw new Error(`登录接口返回非 JSON，HTTP ${response.status}`);
    }

    if (!response.ok || payload?.success === false) {
      const message = payload?.errMsg ? `：${payload.errMsg}` : "";
      throw new Error(`登录失败，HTTP ${response.status}${message}`);
    }

    const token = typeof payload?.data === "string" ? payload.data.trim() : "";
    if (!token) {
      throw new Error("登录接口未返回 token。");
    }

    return token;
  }
  catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`登录接口超时：${apiBaseUrl}`);
    }
    throw new Error(`请求登录接口失败：${apiBaseUrl} (${error?.message || String(error)})`);
  }
  finally {
    clearTimeout(timer);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const envFile = resolve(args["env-file"] || DEFAULT_ENV_FILE);
  const fileConfig = await readEnvFile(envFile);
  const config = {
    ...fileConfig,
    TC_E2E_API_BASE_URL: args["api-base-url"] || process.env.TC_E2E_API_BASE_URL || fileConfig.TC_E2E_API_BASE_URL,
    TC_E2E_APP_ORIGIN: args["app-origin"] || process.env.TC_E2E_APP_ORIGIN || fileConfig.TC_E2E_APP_ORIGIN,
    TC_E2E_LOGIN_METHOD: args["login-method"] || process.env.TC_E2E_LOGIN_METHOD || fileConfig.TC_E2E_LOGIN_METHOD,
    TC_E2E_USER_ID: args["user-id"] || process.env.TC_E2E_USER_ID || fileConfig.TC_E2E_USER_ID,
    TC_E2E_USERNAME: args.username || process.env.TC_E2E_USERNAME || fileConfig.TC_E2E_USERNAME,
    TC_E2E_PASSWORD: args.password || process.env.TC_E2E_PASSWORD || fileConfig.TC_E2E_PASSWORD,
  };

  const apiBaseUrl = requireValue(config, "TC_E2E_API_BASE_URL");
  const origin = normalizeOrigin(requireValue(config, "TC_E2E_APP_ORIGIN"));
  const { body, uid } = buildLoginBody(config);
  const token = await login({ apiBaseUrl, body });
  const output = resolve(args.output || process.env.TC_E2E_STORAGE_STATE || DEFAULT_OUTPUT_FILE);

  const localStorage = [{ name: "token", value: token }];
  if (uid) {
    localStorage.push({ name: "uid", value: uid });
  }

  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    `${JSON.stringify({
      cookies: [],
      origins: [
        {
          origin,
          localStorage,
        },
      ],
    }, null, 2)}\n`,
    "utf8",
  );

  console.log(`[e2e-auth-state] 已写入 ${output}`);
  console.log(`[e2e-auth-state] origin=${origin} uid=${uid || "(not set)"}`);
}

main().catch((error) => {
  console.error(`[e2e-auth-state] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
