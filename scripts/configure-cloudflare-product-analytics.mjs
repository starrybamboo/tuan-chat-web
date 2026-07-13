import { randomBytes } from "node:crypto";

const PROJECT_NAMES = ["tuan-chat-web", "tuan-chat-web-test"];
const BINDING_NAME = "TUANCHAT_PRODUCT_ANALYTICS";
const DATASET = "tuanchat_product_events";
const SALT_NAME = "TUANCHAT_ANALYTICS_FINGERPRINT_SALT";

function readCloudflareCredentials() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    throw new Error("需要 CLOUDFLARE_ACCOUNT_ID 与具备 Cloudflare Pages Edit 权限的 CLOUDFLARE_API_TOKEN");
  }
  return { accountId, apiToken };
}

async function cloudflareRequest(url, apiToken, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Cloudflare API 请求失败（HTTP ${response.status}）：${details}`);
  }
  return response.json();
}

async function configureProject({ accountId, apiToken }, projectName) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`;
  const projectPayload = await cloudflareRequest(endpoint, apiToken);
  const productionConfig = projectPayload.result?.deployment_configs?.production ?? {};
  const analyticsBindings = productionConfig.analytics_engine_datasets ?? {};
  const environmentVariables = productionConfig.env_vars ?? {};
  const hasBinding = analyticsBindings[BINDING_NAME]?.dataset === DATASET;
  const hasSalt = Object.hasOwn(environmentVariables, SALT_NAME);

  if (hasBinding && hasSalt) {
    console.log(`${projectName}：Analytics Engine 绑定与匿名盐已存在`);
    return;
  }

  const productionPatch = {};
  if (!hasBinding) {
    productionPatch.analytics_engine_datasets = {
      [BINDING_NAME]: { dataset: DATASET },
    };
  }
  if (!hasSalt) {
    productionPatch.env_vars = {
      [SALT_NAME]: {
        type: "secret_text",
        value: randomBytes(32).toString("hex"),
      },
    };
  }

  await cloudflareRequest(endpoint, apiToken, {
    method: "PATCH",
    body: JSON.stringify({
      deployment_configs: {
        production: productionPatch,
      },
    }),
  });
  console.log(`${projectName}：Analytics Engine 生产环境配置已写入`);
}

async function main() {
  const credentials = readCloudflareCredentials();
  for (const projectName of PROJECT_NAMES) {
    await configureProject(credentials, projectName);
  }
  console.log("Pages Functions 需要重新部署后才会加载新增绑定");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
