const DICE_OPTION_PATTERN = /^\s*[0-9\uFF10\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18\uFF19]+\s*(?:[.)）．。、,:：，]\s*|\s)\S.*$/;
const DICE_EXPRESSION_PATTERN = /\d*\s*d\s*(?:\d+|%)/i;

export type WebgalDiceRenderMode = "dialog" | "narration" | "anko" | "script";

export type WebgalDiceSoundConfig = {
  /** Direct sound URL (highest priority). */
  url?: string;
  /** Game asset file name (default folder: game/se). */
  fileName?: string;
  /** Asset folder, default "se". */
  folder?: string;
  /** Volume (0-100). */
  volume?: number;
  /** Whether sound is enabled. */
  enabled?: boolean;
};

export type WebgalDiceRenderPayload = {
  /** Render mode. */
  mode?: WebgalDiceRenderMode;
  /** Split into two steps (preview + result) when multiple lines present. */
  twoStep?: boolean;
  /** Override display content. */
  content?: string;
  /** Raw WebGAL script lines (mode=script). */
  lines?: string[];
  /** Dice size for anko highlight completion. */
  diceSize?: number;
  /** Whether to show figure. */
  showFigure?: boolean;
  /** Whether to show mini avatar. */
  showMiniAvatar?: boolean;
  /** Sound config. */
  sound?: WebgalDiceSoundConfig;
};

const DICE_RENDER_MODES = new Set<WebgalDiceRenderMode>(["dialog", "narration", "anko", "script"]);

function normalizeLineBreaks(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractWebgalDicePayload(webgal: unknown): WebgalDiceRenderPayload | null {
  if (!webgal || typeof webgal !== "object") {
    return null;
  }
  const raw = (webgal as any)?.diceRender ?? (webgal as any)?.dice;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const mode = typeof raw.mode === "string" && DICE_RENDER_MODES.has(raw.mode)
    ? (raw.mode as WebgalDiceRenderMode)
    : undefined;
  const content = typeof raw.content === "string" ? raw.content : undefined;
  const lines = Array.isArray(raw.lines)
    ? raw.lines.filter((line: unknown) => typeof line === "string" && line.trim().length > 0)
    : undefined;
  const diceSize = typeof raw.diceSize === "number" && Number.isFinite(raw.diceSize) && raw.diceSize > 0
    ? Math.floor(raw.diceSize)
    : undefined;
  const showFigure = typeof raw.showFigure === "boolean" ? raw.showFigure : undefined;
  const showMiniAvatar = typeof raw.showMiniAvatar === "boolean" ? raw.showMiniAvatar : undefined;
  const twoStep = typeof raw.twoStep === "boolean" ? raw.twoStep : undefined;

  let sound: WebgalDiceSoundConfig | undefined;
  if (raw.sound && typeof raw.sound === "object") {
    const soundRaw = raw.sound as Record<string, unknown>;
    sound = {
      url: typeof soundRaw.url === "string" ? soundRaw.url : undefined,
      fileName: typeof soundRaw.fileName === "string" ? soundRaw.fileName : undefined,
      folder: typeof soundRaw.folder === "string" ? soundRaw.folder : undefined,
      volume: typeof soundRaw.volume === "number" && Number.isFinite(soundRaw.volume)
        ? soundRaw.volume
        : undefined,
      enabled: typeof soundRaw.enabled === "boolean" ? soundRaw.enabled : undefined,
    };
  }

  return {
    mode,
    twoStep,
    content,
    lines,
    diceSize,
    showFigure,
    showMiniAvatar,
    sound,
  };
}

export function isLikelyAnkoDiceContent(content: string): boolean {
  const normalized = normalizeLineBreaks(String(content ?? ""));
  if (!normalized.trim()) {
    return false;
  }
  const lines = normalized.split("\n");
  const optionCount = lines.filter(line => DICE_OPTION_PATTERN.test(line.trim())).length;
  if (optionCount < 2) {
    return false;
  }
  return lines.some(line => DICE_EXPRESSION_PATTERN.test(line));
}

export function stripDiceHighlightTokens(content: string, color: string = "#FF6B00"): string {
  const normalized = String(content ?? "");
  const safeColor = escapeRegExp(color.trim().toLowerCase());
  const highlightPattern = new RegExp(
    `\\[([^\\]\\n\\r]+)\\]\\(style\\s*=\\s*color\\s*:\\s*${safeColor}\\)`,
    "gi",
  );
  return normalized.replace(highlightPattern, "$1");
}
