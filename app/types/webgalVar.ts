export type WebgalVarScope = "space";
export type WebgalVarOp = "set";

export type WebgalVarMessagePayload = {
  scope: WebgalVarScope;
  op: WebgalVarOp;
  key: string;
  expr: string;
  global: true;
};

export type SpaceWebgalVarsRecord = Record<string, { expr: string; updatedAt: number }>;

const KEY_PATTERN = /^[A-Z_]\w*$/i;

export function parseWebgalVarCommand(raw: string): WebgalVarMessagePayload | null {
  const text = String(raw ?? "").trim();
  if (!text)
    return null;

  const lower = text.toLowerCase();
  if (!lower.startsWith("/var"))
    return null;

  const afterVar = text.slice(4);
  if (afterVar.length > 0 && !/\s/.test(afterVar[0] ?? ""))
    return null;

  const rest = afterVar.trimStart();
  if (!rest.toLowerCase().startsWith("set"))
    return null;

  const afterSet = rest.slice(3);
  if (afterSet.length === 0 || !/\s/.test(afterSet[0] ?? ""))
    return null;

  const body = afterSet.trim();
  const eqIndex = body.indexOf("=");
  if (eqIndex <= 0)
    return null;

  const key = body.slice(0, eqIndex).trim();
  const expr = body.slice(eqIndex + 1).trim();
  if (!key || !expr)
    return null;

  if (!KEY_PATTERN.test(key))
    return null;

  return {
    scope: "space",
    op: "set",
    key,
    expr,
    global: true,
  };
}

export function extractWebgalVarPayload(extra: unknown): WebgalVarMessagePayload | null {
  const payload = (extra as any)?.webgalVar;
  if (!payload || typeof payload !== "object")
    return null;

  if (payload.scope !== "space")
    return null;
  if (payload.op !== "set")
    return null;
  if (payload.global !== true)
    return null;

  const key = String(payload.key ?? "").trim();
  const expr = String(payload.expr ?? "").trim();
  if (!key || !expr)
    return null;
  if (!KEY_PATTERN.test(key))
    return null;

  return {
    scope: "space",
    op: "set",
    key,
    expr,
    global: true,
  };
}

export function buildWebgalSetVarLine(payload: WebgalVarMessagePayload): string {
  const expr = payload.expr.replace(/;+\s*$/, "").trim();
  const globalPart = payload.global ? " -global" : "";
  return `setVar:${payload.key}=${expr}${globalPart};`;
}

export function formatWebgalVarSummary(payload: WebgalVarMessagePayload): string {
  return `${payload.key} = ${payload.expr}`;
}
