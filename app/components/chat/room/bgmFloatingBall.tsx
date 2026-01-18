import React, { useEffect, useRef, useState } from "react";
import { useBgmStore } from "@/components/chat/stores/bgmStore";
import { MusicNote } from "@/icons";

interface Pos {
  x: number;
  y: number;
}

export default function BgmFloatingBall({ roomId }: { roomId: number }) {
  const track = useBgmStore(state => state.trackByRoomId[roomId]);
  const dismissed = useBgmStore(state => Boolean(state.userDismissedByRoomId[roomId]));
  const isPlaying = useBgmStore(state => state.isPlaying && state.playingRoomId === roomId);
  const userToggle = useBgmStore(state => state.userToggle);
  const volume = useBgmStore(state => state.volumeByRoomId[roomId] ?? 50);
  const setVolume = useBgmStore(state => state.setVolume);

  const hasTrack = Boolean(track);

  // 展开/收起
  const [isExpanded, setIsExpanded] = useState(false);

  // 拖动位置
  const [pos, setPos] = useState<Pos>(() => {
    // 初始值给一个“右下偏上”的近似位置；挂载后会 clamp 到视口内
    return { x: Math.max(16, (typeof window !== "undefined" ? window.innerWidth - 16 - 64 : 16)), y: 128 };
  });

  // Topbanner 安全区（避免悬浮球被遮挡）
  const [topSafe, setTopSafe] = useState(0);

  // 拖动状态
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const offsetRef = useRef<Pos>({ x: 0, y: 0 });

  // 尺寸用于 clamp（收起态按球尺寸，展开态按面板尺寸：改为动态测量）
  const ballSize = 56;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelSize, setPanelSize] = useState<{ w: number; h: number }>({ w: 260, h: 88 });

  const clampPos = (p: Pos, expanded: boolean): Pos => {
    if (typeof window === "undefined")
      return p;

    const margin = 8;
    const w = expanded ? panelSize.w : ballSize;
    const h = expanded ? panelSize.h : ballSize;

    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);

    const minY = Math.max(margin, topSafe + margin);

    return {
      x: Math.min(Math.max(margin, p.x), maxX),
      y: Math.min(Math.max(minY, p.y), maxY),
    };
  };

  // 运行时测量 Topbanner 高度，作为 topSafe（兼容桌面/移动端、展开收起）
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined")
      return;

    const measure = () => {
      // Topbanner 结构：<div className="w-full"><div className="relative z-50 ...">...</div></div>
      const el = document.querySelector("body > div.w-full > div") as HTMLElement | null;
      const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0;
      setTopSafe(h);
      setPos(prev => clampPos(prev, isExpanded));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  // 测量值变化时再 clamp 一次，避免异步测量导致瞬间遮挡
  useEffect(() => {
    setPos(prev => clampPos(prev, isExpanded));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topSafe]);

  // 测量展开面板真实尺寸（避免固定 260 导致靠右时裁切）
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
    // 初次展开也立刻 clamp 一次（即使 RO 还没回调）
    setPos(prev => clampPos(prev, true));

    return () => ro.disconnect();
  }, [isExpanded]);

  // 视口变化时避免跑出屏幕
  useEffect(() => {
    const onResize = () => setPos(prev => clampPos(prev, isExpanded));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isExpanded]);

  const handleToggle = () => {
    if (!hasTrack)
      return;
    void userToggle(roomId);
  };

  const handleVolumeChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!hasTrack)
      return;
    const v = Number(e.target.value);
    setVolume(roomId, v);
  };

  const onPointerDownBall: React.PointerEventHandler<HTMLButtonElement> = (e) => {
    // 只在收起态允许“按球拖动”（避免展开态误触）
    if (isExpanded)
      return;

    draggingRef.current = true;
    movedRef.current = false;
    pointerIdRef.current = e.pointerId;

    // 记录点击点与左上角的偏移
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

      // 如果没有发生明显移动，则视为点击：展开
      if (!movedRef.current) {
        setIsExpanded(true);
        // 先用当前（可能还是默认）的 panelSize clamp 一次，后续 ResizeObserver 会再次修正
        setPos(prev => clampPos(prev, true));
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // 用 fixed + left/top 来支持拖动定位
  const wrapperStyle: React.CSSProperties = {
    left: pos.x,
    top: pos.y,
  };

  return (
    <div className="fixed z-100 pointer-events-auto" style={wrapperStyle}>
      {/* 收起态：悬浮球 */}
      {!isExpanded && (
        <button
          type="button"
          onPointerDown={onPointerDownBall}
          aria-disabled={!hasTrack}
          className={`btn btn-circle shadow-lg border border-base-300 bg-base-100/95 ${
            hasTrack ? "" : "opacity-60"
          }`}
          title={
            !hasTrack
              ? "暂无BGM（点按展开/拖动）"
              : (isPlaying ? "BGM：播放中（点按展开/拖动）" : "BGM：已暂停（点按展开/拖动）")
          }
        >
          <div className="relative">
            <MusicNote className={`size-6 ${isPlaying ? "text-primary" : "text-base-content/60"}`} />
            {isPlaying && (
              <span className="absolute -right-2 -top-2 size-2 rounded-full bg-primary" />
            )}
          </div>
        </button>
      )}

      {/* 展开态 */}
      {isExpanded && (
        <div
          ref={panelRef}
          className="flex items-center gap-3 rounded-2xl bg-base-100/95 border border-base-300 shadow-lg px-3 py-2 min-w-190px max-w-260px"
        >
          <button
            type="button"
            className="btn btn-circle btn-sm btn-ghost border border-base-300"
            title="收起"
            onClick={() => {
              setIsExpanded(false);
              setPos(prev => clampPos(prev, false));
            }}
          >
            ×
          </button>
          <button
            type="button"
            disabled={!hasTrack}
            className={`btn btn-circle btn-sm border ${
              isPlaying ? "btn-primary" : "btn-ghost border-base-300"
            } ${!hasTrack ? "btn-disabled opacity-60" : ""}`}
            title={!hasTrack ? "暂无BGM" : (isPlaying ? "暂停BGM（仅自己）" : "播放BGM")}
            onClick={handleToggle}
          >
            <MusicNote className={`size-5 ${isPlaying ? "text-primary-content" : "text-base-content/70"}`} />
          </button>

          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-base-content/80 truncate">
                {!hasTrack ? "暂无BGM" : (isPlaying ? "正在播放" : "已暂停")}
                {dismissed && " · 已隐藏控件"}
              </span>
            </div>

            <div className={`flex items-center gap-2 ${!hasTrack ? "opacity-50" : ""}`}>
              <span className="text-[11px] text-base-content/60 shrink-0 select-none">
                音量
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={volume}
                onChange={handleVolumeChange}
                disabled={!hasTrack}
                className="range range-xs range-primary flex-1"
              />
              <span className="text-[11px] text-base-content/60 w-9 text-right shrink-0 tabular-nums">
                {volume}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
