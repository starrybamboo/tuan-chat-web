export type VariantFolderClickAction = "select" | "enter";

export function getVariantFolderClickAction(
  selectedVariantKey: string | null,
  clickedVariantKey: string,
): VariantFolderClickAction {
  return selectedVariantKey === clickedVariantKey ? "enter" : "select";
}
