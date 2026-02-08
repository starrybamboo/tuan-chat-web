import type { WebgalChoosePayload } from "@/types/webgalChoose";

export default function WebgalChooseMessage({ payload }: { payload: WebgalChoosePayload | null }) {
  const options = payload?.options ?? [];

  if (options.length === 0) {
    return (
      <div className="text-xs text-base-content/60">[选择]</div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="badge badge-ghost badge-xs">选择</span>
        <span className="text-xs text-base-content/60">WebGAL</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {options.map((option, index) => {
          const hasCode = Boolean(option.code?.trim());
          return (
            <div key={`${index}-${option.text}`} className="flex items-start gap-2">
              <span className="badge badge-outline badge-xs">{index + 1}</span>
              <div className="min-w-0">
                <div className="text-sm break-words">{option.text}</div>
                {hasCode && (
                  <div className="text-[11px] text-base-content/60 break-words mt-0.5">
                    代码: {option.code}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
