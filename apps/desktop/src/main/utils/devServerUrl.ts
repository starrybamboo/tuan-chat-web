function uniqueStrings(items: unknown[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const s = String(item || "").trim();
    if (!s || seen.has(s))
      continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function withTimeout(signalMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), signalMs);
  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timer),
  };
}

async function fetchText(url: string, timeoutMs: number, acceptHeader = "text/html, */*") {
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

async function isLikelyTuanChatDevServer(baseUrl: string, timeoutMs: number) {
  const normalized = baseUrl.replace(/\/+$/, "");
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

async function isLikelyViteDevServer(baseUrl: string, timeoutMs: number) {
  const normalized = baseUrl.replace(/\/+$/, "");
  if (!normalized)
    return false;

  const probeUrl = `${normalized}/@vite/client`;
  const res = await fetchText(probeUrl, timeoutMs);
  if (!res.ok)
    return false;

  const head = res.text.slice(0, 4000);
  return head.includes("createHotContext") || head.includes("import.meta.hot") || head.includes("__vite");
}

async function firstMatch(urls: string[], tester: (url: string) => Promise<boolean>, concurrency: number) {
  const limit = Number.isFinite(concurrency) && concurrency > 0 ? Math.floor(concurrency) : 8;

  let index = 0;
  let found = "";

  const worker = async () => {
    while (!found) {
      const current = index;
      index++;
      if (current >= urls.length)
        return;

      const url = urls[current];
      const ok = await tester(url);
      if (ok) {
        found = url.replace(/\/+$/, "");
        return;
      }
    }
  };

  const workers = Array.from({ length: Math.min(limit, urls.length) }, () => worker());
  await Promise.all(workers);
  return found;
}

export async function resolveDevServerUrl({
  preferredUrl,
  host = "localhost",
  ports = [],
  timeoutMs = 800,
  concurrency = 8,
}: {
  preferredUrl?: string;
  host?: string;
  ports?: unknown[];
  timeoutMs?: number;
  concurrency?: number;
} = {}) {
  const normalizedHost = String(host || "localhost").trim() || "localhost";

  const candidates: string[] = [];
  if (preferredUrl)
    candidates.push(preferredUrl);

  for (const p of ports) {
    const port = Number(p);
    if (!Number.isFinite(port) || port <= 0)
      continue;
    candidates.push(`http://${normalizedHost}:${port}`);
  }

  const urls = uniqueStrings(candidates);

  const pingMatched = await firstMatch(
    urls,
    url => isLikelyTuanChatDevServer(url, timeoutMs),
    concurrency,
  );
  if (pingMatched)
    return pingMatched;

  const viteMatched = await firstMatch(
    urls,
    url => isLikelyViteDevServer(url, timeoutMs),
    concurrency,
  );
  return viteMatched || "";
}

export function buildCandidatePorts({
  preferredPorts = [],
  defaultPort = 5177,
  scanRange = 20,
}: {
  preferredPorts?: unknown[];
  defaultPort?: number;
  scanRange?: number;
} = {}) {
  const ports: number[] = [];
  const seen = new Set<number>();

  const pushPort = (value: unknown) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0 || seen.has(num))
      return;
    seen.add(num);
    ports.push(num);
  };

  for (const p of preferredPorts) {
    pushPort(p);
  }

  const base = Number(defaultPort);
  if (Number.isFinite(base) && base > 0) {
    for (let i = 0; i < scanRange; i++) {
      pushPort(base + i);
    }
  }

  return ports;
}
