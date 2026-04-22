import type { ReactNode } from "react";

export function renderResolutionGlyph(optionId: string) {
  let glyph: ReactNode;
  if (optionId === "tall") {
    glyph = <div className="h-5 w-3 rounded-sm border border-current opacity-80" />;
  }
  else if (optionId === "wide") {
    glyph = <div className="h-2.5 w-5 rounded-sm border border-current opacity-80" />;
  }
  else if (optionId === "square") {
    glyph = <div className="size-4 rounded-sm border border-current opacity-80" />;
  }
  else {
    glyph = (
      <div className="flex size-4 items-center justify-center rounded-sm border border-dashed border-current opacity-80">
        <span className="text-[10px] font-bold leading-none">+</span>
      </div>
    );
  }

  return <span className="flex w-5 shrink-0 items-center justify-start">{glyph}</span>;
}
