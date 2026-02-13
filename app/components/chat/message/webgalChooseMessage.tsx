import type { WebgalChoosePayload } from "@/types/webgalChoose";

export default function WebgalChooseMessage({ payload }: { payload: WebgalChoosePayload | null }) {
  const options = payload?.options ?? [];

  if (options.length === 0) {
    return (
      <div className="text-xs text-base-content/60">[选择]</div>
    );
  }

  return (
    <div className="rounded-xl border border-base-content/10 bg-base-100/70 px-3 py-2 text-sm shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-base-content/60">
        <span className="inline-flex items-center rounded-full border border-base-content/20 bg-base-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-base-content/70">
          选择
        </span>
        <span>WebGAL</span>
      </div>
      <div className="mt-2 space-y-2 border-l-2 border-base-content/10 pl-3">
        {options.map((option, index) => {
          const optionKey = `${option.text}::${option.code ?? ""}`;
          return (
            <div key={optionKey} className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-base-content/30 bg-base-100 text-[11px] font-semibold text-base-content/70">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-base-content/90 break-words">{option.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
