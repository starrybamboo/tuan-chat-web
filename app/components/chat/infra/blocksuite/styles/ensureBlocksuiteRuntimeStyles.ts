const STYLE_ID = "tc-blocksuite-runtime-style";
const SCOPE_SELECTOR = ":where(.tc-blocksuite-scope, .blocksuite-portal)";

let installPromise: Promise<void> | null = null;

function rewriteThemeRoot(cssText: string): string {
  // @toeverything/theme 基本只在 `:root` 上声明变量；这里把它限定在 blocksuite scope 内。
  return cssText.replace(/:root\b/g, SCOPE_SELECTOR);
}

function rewriteKatexGlobalCounterReset(cssText: string): string {
  // KaTeX 会在 `body` 上做 counter-reset，用于 equation numbering；限制到 blocksuite scope。
  return cssText.replace(
    /body\s*\{\s*counter-reset\s*:\s*katexEqnNo\s+mmlEqnNo\s*;?\s*\}/g,
    `${SCOPE_SELECTOR}{counter-reset:katexEqnNo mmlEqnNo}`,
  );
}

export async function ensureBlocksuiteRuntimeStyles(): Promise<void> {
  if (typeof document === "undefined")
    return;

  if (document.getElementById(STYLE_ID))
    return;

  if (installPromise)
    return installPromise;

  installPromise = (async () => {
    const [
      themeMod,
      fontsMod,
      katexMod,
      headerMod,
    ] = await Promise.all([
      import("@toeverything/theme/style.css?inline"),
      import("@toeverything/theme/fonts.css?inline"),
      import("katex/dist/katex.min.css?inline"),
      import("./affine-embed-synced-doc-header.css?inline"),
    ]);

    const themeCss = rewriteThemeRoot(((themeMod as any)?.default as string | undefined) ?? "");
    const fontsCss = (((fontsMod as any)?.default as string | undefined) ?? "");
    const katexCss = rewriteKatexGlobalCounterReset(((katexMod as any)?.default as string | undefined) ?? "");
    const headerCss = (((headerMod as any)?.default as string | undefined) ?? "");

    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.setAttribute("data-tc-blocksuite-runtime-style", "1");
    styleEl.textContent = [
      "@layer blocksuite {",
      themeCss,
      fontsCss,
      katexCss,
      headerCss,
      `
      ${SCOPE_SELECTOR} .dg > ul { overflow: auto; }
      `,
      "}",
    ].join("\n");

    document.head.appendChild(styleEl);
  })().finally(() => {
    installPromise = null;
  });

  return installPromise;
}

