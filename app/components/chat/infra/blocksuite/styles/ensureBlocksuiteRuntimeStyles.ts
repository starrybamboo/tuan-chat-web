const STYLE_ID = "tc-blocksuite-runtime-style";

let styleTextPromise: Promise<string> | null = null;
const installPromises = new WeakMap<Document, Promise<void>>();

export async function loadBlocksuiteRuntimeStyleText(): Promise<string> {
  if (styleTextPromise)
    return styleTextPromise;

  styleTextPromise = (async () => {
    const [themeMod, fontsMod, katexMod, headerMod, tcHeaderMod] = await Promise.all([
      import("@toeverything/theme/style.css?inline"),
      import("@toeverything/theme/fonts.css?inline"),
      import("katex/dist/katex.min.css?inline"),
      import("./affine-embed-synced-doc-header.css?inline"),
      import("./tcHeader.css?inline"),
    ]);

    const themeCss = (((themeMod as any)?.default as string | undefined) ?? "");
    const fontsCss = (((fontsMod as any)?.default as string | undefined) ?? "");
    const katexCss = (((katexMod as any)?.default as string | undefined) ?? "");
    const headerCss = (((headerMod as any)?.default as string | undefined) ?? "");
    const tcHeaderCss = (((tcHeaderMod as any)?.default as string | undefined) ?? "");

    return [
      "@layer blocksuite {",
      themeCss,
      fontsCss,
      katexCss,
      headerCss,
      tcHeaderCss,
      `
      .dg > ul { overflow: auto; }
      `,
      "}",
    ].join("\n");
  })().catch((error) => {
    styleTextPromise = null;
    throw error;
  });

  return styleTextPromise;
}

export async function ensureBlocksuiteRuntimeStyles(targetDocument: Document = document): Promise<void> {
  if (typeof window === "undefined")
    return;

  if (targetDocument.getElementById(STYLE_ID))
    return;

  const existingInstall = installPromises.get(targetDocument);
  if (existingInstall)
    return existingInstall;

  const installPromise = (async () => {
    const cssText = await loadBlocksuiteRuntimeStyleText();
    if (targetDocument.getElementById(STYLE_ID))
      return;

    const styleEl = targetDocument.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.setAttribute("data-tc-blocksuite-runtime-style", "1");
    styleEl.textContent = cssText;

    targetDocument.head.appendChild(styleEl);
  })().finally(() => {
    installPromises.delete(targetDocument);
  });

  installPromises.set(targetDocument, installPromise);
  return installPromise;
}
