import { DocTitleViewExtension } from "@blocksuite/affine/fragments/doc-title/view";

function normalizeExtensionHint(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isBlocksuiteDocTitleExtension(extension: any) {
  if (!extension)
    return false;

  if (extension === DocTitleViewExtension || extension?.constructor === DocTitleViewExtension)
    return true;

  const name = normalizeExtensionHint(extension?.name ?? (typeof extension === "function" ? extension.name : ""));
  const id = normalizeExtensionHint(extension?.id ?? extension?.key ?? extension?.type ?? extension?.displayName);

  if (name === "affine-doc-title-fragment" || id === "affine-doc-title-fragment")
    return true;

  return (name.includes("doc") && name.includes("title")) || (id.includes("doc") && id.includes("title"));
}

export function filterBlocksuiteDocTitlePageSpecs(pageSpecs: any[], disableDocTitle: boolean) {
  if (!disableDocTitle)
    return pageSpecs;

  return pageSpecs.filter(extension => !isBlocksuiteDocTitleExtension(extension));
}
