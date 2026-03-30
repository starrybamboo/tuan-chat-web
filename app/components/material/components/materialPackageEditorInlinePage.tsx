import type { ReactNode } from "react";

interface MaterialPackageEditorInlinePageProps {
  children: ReactNode;
  embedded?: boolean;
}

export default function MaterialPackageEditorInlinePage({
  children,
  embedded = false,
}: MaterialPackageEditorInlinePageProps) {
  return (
    <div className={`h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top_left,oklch(var(--p)/0.1),transparent_26%),linear-gradient(180deg,oklch(var(--b2)/0.98),oklch(var(--b1)/1))] text-base-content ${embedded ? "" : "border-t border-base-300"}`}>
      <div className={`mx-auto flex w-full max-w-[1560px] flex-col ${embedded ? "px-5 py-4 md:px-8 md:py-5" : "px-6 py-5 md:px-10 md:py-6"}`}>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
