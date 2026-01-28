import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAudioPlaybackStore } from "@/components/common/audioPlaybackStore";
import { MusicNote } from "@/icons";

interface Pos {
  x: number;
  y: number;
}

function getFileNameFromUrl(url: string | undefined): string | undefined {
  if (!url)
    return undefined;
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.href : "http://localhost");
    const seg = u.pathname.split("/").filter(Boolean).pop();
    return seg || url;
  }
  catch {
    const seg = url.split("?")[0]?.split("#")[0]?.split("/").filter(Boolean).pop();
    return seg || url;
  }
}

export default function AudioFloatingBall() {
  const entriesById = useAudioPlaybackStore(state => state.entriesById);
  const pause = useAudioPlaybackStore(state => state.pause);
  const stop = useAudioPlaybackStore(state => state.stop);

  const playingEntries = useMemo(() => {
    return Object.values(entriesById)
      .filter(Boolean)
      .filter(e => e!.isPlaying)
      .map(e => e!);
  }, [entriesById]);

  const playingCount = playingEntries.length;

  const [isExpanded, setIsExpanded] = useState(false);

  const [pos, setPos] = useState<Pos>(() => {
    return { x: Math.max(16, (typeof window !== "undefined" ? window.innerWidth - 16 - 64 : 16)), y: 128 };
  });

  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const offsetRef = useRef<Pos>({ x: 0, y: 0 });

  const ballSize = 56;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelSize, setPanelSize] = useState<{ w: number; h: number }>({ w: 320, h: 240 });

  const clampPos = useCallback((p: Pos, expanded: boolean): Pos => {
    if (typeof window === "undefined")
      return p;

    const margin = 8;
    const w = expanded ? panelSize.w : ballSize;
    const h = expanded ? panelSize.h : ballSize;

    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);

    return {
      x: Math.min(Math.max(margin, p.x), maxX),
      y: Math.min(Math.max(margin, p.y), maxY),
    };
  }, [panelSize.h, panelSize.w]);

  useEffect(() => {
    const onResize = () => setPos(prev => clampPos(prev, isExpanded));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPos, isExpanded]);

  useEffect(() => {
    if (!isExpanded)
      return;

    const el = panelRef.current;
    if (!el || typeof ResizeObserver === "undefined")
      return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const next = { w: Math.ceil(rect.width), h: Math.ceil(rect.height) };
      setPanelSize(next);
      setPos(prev => clampPos(prev, true));
    });

    ro.observe(el);
    setPos(prev => clampPos(prev, true));
    return () => ro.disconnect();
  }, [clampPos, isExpanded]);

  const onPointerDownBall: React.PointerEventHandler<HTMLButtonElement> = (e) => {
    if (isExpanded)
      return;

    draggingRef.current = true;
    movedRef.current = false;
    pointerIdRef.current = e.pointerId;

    offsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current)
        return;
      movedRef.current = true;
      const next = clampPos({ x: ev.clientX - offsetRef.current.x, y: ev.clientY - offsetRef.current.y }, false);
      setPos(next);
    };

    const onUp = (ev: PointerEvent) => {
      if (pointerIdRef.current !== ev.pointerId)
        return;

      draggingRef.current = false;
      pointerIdRef.current = null;

      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      if (!movedRef.current) {
        setIsExpanded(true);
        setPos(prev => clampPos(prev, true));
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const wrapperStyle: React.CSSProperties = { left: pos.x, top: pos.y };

  // 没有任何播放时不展示悬浮球（避免常驻遮挡）
  if (playingCount <= 0)
    return null;

  return (
    <div className="fixed z-100 pointer-events-auto" style={wrapperStyle}>
      {!isExpanded && (
        <button
          type="button"
          onPointerDown={onPointerDownBall}
          className="btn btn-circle shadow-lg border border-base-300 bg-base-100/95"
          title={`正在播放 ${playingCount} 个音频（点按展开/拖动）`}
        >
          <div className="relative">
            <MusicNote className="size-6 text-primary" />
            <span className="absolute -right-2 -top-2 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-content text-[11px] leading-5 text-center tabular-nums">
              {playingCount}
            </span>
          </div>
        </button>
      )}

      {isExpanded && (
        <div
          ref={panelRef}
          className="rounded-2xl bg-base-100/95 border border-base-300 shadow-lg w-[340px] max-w-[85vw]"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-base-300">
            <div className="flex items-center gap-2 min-w-0">
              <MusicNote className="size-5 text-primary shrink-0" />
              <div className="font-medium text-sm text-base-content truncate">
                正在播放（
                {playingCount}
                ）
              </div>
            </div>
            <button
              type="button"
              className="btn btn-xs btn-ghost border border-base-300"
              title="收起"
              onClick={() => {
                setIsExpanded(false);
                setPos(prev => clampPos(prev, false));
              }}
            >
              收起
            </button>
          </div>

          <div className="max-h-[50vh] overflow-auto p-2">
            <div className="space-y-2">
              {playingEntries.map((e) => {
                const name = e.title || getFileNameFromUrl(e.url) || "音频";
                const kindLabel = e.kind === "bgm"
                  ? "BGM"
                  : e.kind === "chat"
                    ? "聊天"
                    : e.kind === "resource"
                      ? "资源"
                      : e.kind === "role"
                        ? "角色"
                        : "音频";

                return (
                  <div key={e.id} className="flex items-center gap-2 rounded-xl border border-base-300 bg-base-200/60 px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="badge badge-sm badge-outline shrink-0">{kindLabel}</span>
                        <div className="text-sm font-medium text-base-content truncate">
                          {name}
                        </div>
                      </div>
                      {e.url && (
                        <div className="text-[11px] text-base-content/60 truncate">
                          {e.url}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {e.pause && (
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost border border-base-300"
                          onClick={() => pause(e.id)}
                          title="暂停"
                        >
                          暂停
                        </button>
                      )}
                      {e.stop && (
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost border border-base-300"
                          onClick={() => stop(e.id)}
                          title="停止"
                        >
                          停止
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
