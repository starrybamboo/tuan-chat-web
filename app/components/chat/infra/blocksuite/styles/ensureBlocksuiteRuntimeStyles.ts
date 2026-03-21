const STYLE_ID = "tc-blocksuite-runtime-style";

let installPromise: Promise<void> | null = null;

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
      tcHeaderMod,
    ] = await Promise.all([
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

    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.setAttribute("data-tc-blocksuite-runtime-style", "1");
    styleEl.textContent = [
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

    document.head.appendChild(styleEl);
  })().finally(() => {
    installPromise = null;
  });

  return installPromise;
}
