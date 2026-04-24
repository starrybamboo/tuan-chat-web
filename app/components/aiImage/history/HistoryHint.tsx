import type {
  FocusEvent,
  MouseEvent,
} from "react";
import { useState } from "react";

export function HistoryHint() {
  const hintText = "鍗曞嚮棰勮锛孋trl/Cmd+鍗曞嚮瀵煎叆璁剧疆锛孲hift+鍗曞嚮瀵煎叆 seed锛孋trl/Cmd+Shift+鍗曞嚮瀵煎叆璁剧疆涓?seed銆?";
  const [tooltipState, setTooltipState] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const showTooltipAtPointer = (event: MouseEvent<HTMLButtonElement>) => {
    setTooltipState({
      x: event.clientX,
      y: event.clientY,
      visible: true,
    });
  };

  const showTooltipAtButton = (event: FocusEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipState({
      x: rect.left,
      y: rect.bottom,
      visible: true,
    });
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        className="flex size-4 cursor-help items-center justify-center rounded-full bg-transparent text-base-content/28 transition hover:text-base-content/55 focus:outline-none"
        aria-label={hintText}
        onBlur={() => setTooltipState(prev => ({ ...prev, visible: false }))}
        onFocus={showTooltipAtButton}
        onMouseEnter={showTooltipAtPointer}
        onMouseLeave={() => setTooltipState(prev => ({ ...prev, visible: false }))}
        onMouseMove={showTooltipAtPointer}
      >
        <span className="flex size-3.5 items-center justify-center rounded-full border border-base-content/16 text-[9px] font-medium leading-none text-current">
          ?
        </span>
      </button>
      {tooltipState.visible
        ? (
            <div
              className="pointer-events-none fixed z-30 flex h-[80px] w-[300px] items-center rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-[11px] leading-5 text-base-content/72 shadow-xl"
              style={{
                left: tooltipState.x,
                top: tooltipState.y,
                transform: "translate(calc(-100% - 10px), 10px)",
              }}
            >
              {hintText}
            </div>
          )
        : null}
    </div>
  );
}
