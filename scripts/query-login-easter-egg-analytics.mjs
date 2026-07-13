const DATASET = "tuanchat_product_events";
const EVENTS = ["login_page_view", "login_easter_egg_discovered"];

function readArgument(name, fallback) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find(value => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : fallback;
}

function readConfig() {
  const environment = readArgument("environment", "production");
  if (!new Set(["production", "test"]).has(environment)) {
    throw new Error("--environment 仅支持 production 或 test");
  }

  const days = Number(readArgument("days", "30"));
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new Error("--days 必须是 1 到 90 之间的整数");
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    throw new Error("需要 CLOUDFLARE_ACCOUNT_ID 与具备 Account Analytics Read 权限的 CLOUDFLARE_API_TOKEN");
  }

  return { accountId, apiToken, days, environment };
}

function buildQuery({ days, environment }) {
  return `
SELECT
  blob1 AS event,
  count(DISTINCT index1) AS visitors
FROM ${DATASET}
WHERE
  timestamp >= NOW() - INTERVAL '${days}' DAY
  AND blob1 IN ('${EVENTS.join("', '")}')
  AND blob2 = '${environment}'
GROUP BY event
FORMAT JSON
`.trim();
}

function resolveRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload?.result)) {
    return payload.result;
  }
  return [];
}

async function main() {
  const config = readConfig();
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiToken}`,
        "content-type": "text/plain",
      },
      body: buildQuery(config),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Cloudflare Analytics Engine 查询失败（HTTP ${response.status}）：${details}`);
  }

  const rows = resolveRows(await response.json());
  const visitorsByEvent = new Map(rows.map(row => [row.event, Number(row.visitors) || 0]));
  const loginVisitors = visitorsByEvent.get("login_page_view") ?? 0;
  const discoverers = visitorsByEvent.get("login_easter_egg_discovered") ?? 0;
  const discoveryRate = loginVisitors === 0 ? 0 : (discoverers / loginVisitors) * 100;

  console.log(`环境：${config.environment}`);
  console.log(`统计范围：最近 ${config.days} 天`);
  console.log(`登录页独立访客：${loginVisitors}`);
  console.log(`彩蛋独立发现者：${discoverers}`);
  console.log(`彩蛋发现率：${discoveryRate.toFixed(2)}%`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
