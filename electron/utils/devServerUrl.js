// 用于避免前端固定启动的端口被占用

function uniqueStrings(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const s = String(item || "").trim();
    if (!s || seen.has(s))
      continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function withTimeout(signalMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), signalMs);
  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timer),
  };
}

// 向前端发送请求
async function fetchText(url, timeoutMs, acceptHeader = "text/html, */*") {
  const fetchImpl = globalThis.fetch;
  if (typeof fetchImpl !== "function")
    return { ok: false, status: 0, text: "" };

  const { signal, dispose } = withTimeout(timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal,
      headers: {
        accept: acceptHeader,
      },
    });

    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text: String(text || "") };
  }
  catch {
    return { ok: false, status: 0, text: "" };
  }
  finally {
    dispose();
  }
}

function makeNonce() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function isLikelyTuanChatDevServer(baseUrl, timeoutMs) {
  const normalized = String(baseUrl || "").replace(/\/+$/, "");
  if (!normalized)
    return false;

  const nonce = makeNonce();
  const probeUrl = `${normalized}/__electron_ping?nonce=${encodeURIComponent(nonce)}`;
  const res = await fetchText(probeUrl, timeoutMs, "application/json, text/plain, */*");
  if (!res.ok)
    return false;

  try {
    const data = JSON.parse(res.text);
    return data && data.app === "tuan-chat-web" && data.nonce === nonce;
  }
  catch {
    return false;
  }
}

async function isLikelyViteDevServer(baseUrl, timeoutMs) {
  const normalized = String(baseUrl || "").replace(/\/+$/, "");
  if (!normalized)
    return false;

  // Vite dev server always serves this module.
  const probeUrl = `${normalized}/@vite/client`;
  const res = await fetchText(probeUrl, timeoutMs);
  if (!res.ok)
    return false;

  const head = res.text.slice(0, 4000);
  // Lightweight signature check; extremely unlikely for unrelated servers.
  return head.includes("createHotContext") || head.includes("import.meta.hot") || head.includes("__vite");
}

async function firstMatch(urls, tester, concurrency) {
  const list = Array.isArray(urls) ? urls : [];
  const limit = Number.isFinite(concurrency) && concurrency > 0 ? Math.floor(concurrency) : 8;

  let index = 0;
  let found = "";

  const worker = async () => {
    while (!found) {
      const current = index;
      index++;
      if (current >= list.length)
        return;

      const url = list[current];
      const ok = await tester(url);
      if (ok) {
        found = String(url).replace(/\/+$/, "");
        return;
      }
    }
  };

  const workers = Array.from({ length: Math.min(limit, list.length) }, () => worker());
  await Promise.all(workers);
  return found;
}

export async function resolveDevServerUrl({ preferredUrl, host = "localhost", ports = [], timeoutMs = 800, concurrency = 8 } = {}) {
  const normalizedHost = String(host || "localhost").trim() || "localhost";

  const candidates = [];
  if (preferredUrl)
    candidates.push(String(preferredUrl));

  for (const p of ports) {
    const port = Number(p);
    if (!Number.isFinite(port) || port <= 0)
      continue;
    candidates.push(`http://${normalizedHost}:${port}`);
  }

  const urls = uniqueStrings(candidates);

  // Phase 1: prefer our explicit ping endpoint (most accurate, and only 1 request per port).
  const pingMatched = await firstMatch(
    urls,
    url => isLikelyTuanChatDevServer(url, timeoutMs),
    concurrency,
  );
  if (pingMatched)
    return pingMatched;

  // Phase 2 (fallback): if ping endpoint is absent, still allow Vite signature (best-effort).
  const viteMatched = await firstMatch(
    urls,
    url => isLikelyViteDevServer(url, timeoutMs),
    concurrency,
  );
  return viteMatched || "";
}

export function buildCandidatePorts({ preferredPorts = [], defaultPort = 5177, scanRange = 20 } = {}) {
  const ports = [];
  for (const p of preferredPorts) {
    const num = Number(p);
    if (Number.isFinite(num) && num > 0)
      ports.push(num);
  }

  const base = Number(defaultPort);
  if (Number.isFinite(base) && base > 0) {
    for (let i = 0; i < scanRange; i++) {
      ports.push(base + i);
    }
  }

  return ports;
}
