import { useCallback, useEffect, useMemo, useRef } from "react";

import { createLogger } from "../utils/logger";

type MaybeRef<T> = React.MutableRefObject<T> | { current: T };

export type UseSelectionPersistenceOptions = {
  quillRef: MaybeRef<any | null>;
  editorReady: boolean;
  persistSelectionKey?: string;
  active?: boolean;
  focusOnActive?: boolean;
  debug?: boolean;
  wrapperRef?: React.MutableRefObject<HTMLDivElement | null>;
  scheduleToolbarUpdateRef?: React.MutableRefObject<(() => void) | null>;
  onRestored?: (index: number, length: number) => void;
};

export type UseSelectionPersistenceReturn = {
  attemptRestore: (
    source: string,
    opts?: { focus?: boolean; ensureVisible?: boolean; force?: boolean },
  ) => boolean;
};

// 选区持久化与恢复（最小侵入版）：
// - 持久化：监听 selection-change 事件与卸载前兜底写入 localStorage
// - 恢复：暴露 attemptRestore，供外层按需调用（本文件不主动劫持原有逻辑）
export default function useSelectionPersistence(options: UseSelectionPersistenceOptions): UseSelectionPersistenceReturn {
  const { quillRef, editorReady, persistSelectionKey, active, focusOnActive, debug, wrapperRef, scheduleToolbarUpdateRef, onRestored } = options;

  const log = useMemo(() => createLogger("PERSIST", { domainKey: "DOM", enabledOverride: debug }), [debug]);
  const restoredOnceRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 10; // 最多重试 10 次
  const retryDelayMs = 200; // 每次间隔 200ms

  // 将当前选区写入 localStorage
  const writeSelection = useCallback((reason: string) => {
    if (!persistSelectionKey) {
      return;
    }
    try {
      const editor = quillRef.current as any;
      const sel = editor?.getSelection?.();
      if (!sel || typeof sel.index !== "number") {
        log.warn("persist:skip:no-selection", { reason });
        return;
      }
      const payload = { i: sel.index, l: sel.length || 0, ts: Date.now(), r: reason };
      localStorage.setItem(persistSelectionKey, JSON.stringify(payload));
      log.warn("persist:write", payload);
    }
    catch {
      // ignore
    }
  }, [persistSelectionKey, quillRef, log]);

  const ensureVisible = useCallback((editor: any, index: number) => {
    try {
      const root = editor?.root as HTMLElement | null;
      const wrap = wrapperRef?.current ?? null;
      const b = editor?.getBounds?.(index, 0) || { top: 0 };
      if (!root || !wrap) {
        return;
      }
      const rootRect = root.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const top = (rootRect.top + (b.top || 0) - root.scrollTop) - wrapRect.top;
      // 简单视口可见性：若超出区域则滚动
      if (top < 0 || top > wrap.clientHeight - 40) {
        root.scrollTop += top - Math.min(24, Math.max(-24, top));
      }
    }
    catch {
      // ignore
    }
  }, [wrapperRef]);

  // 对外暴露的恢复函数（幂等）
  const attemptRestore = useCallback((source: string, opts?: { focus?: boolean; ensureVisible?: boolean; force?: boolean }): boolean => {
    const focus = !!opts?.focus;
    const doEnsure = !!opts?.ensureVisible;
    const force = !!opts?.force;

    if (!persistSelectionKey || typeof window === "undefined") {
      return false;
    }
    const editor = quillRef.current as any;
    if (!editor) {
      return false;
    }
    const len = editor.getLength?.() ?? 0;
    const existing = editor.getSelection?.();
    if (!force && existing && typeof existing.index === "number") {
      // 已有选区时按“成功同步”处理：仅确保可见、聚焦与工具栏刷新，停止重试
      try {
        if (focus) {
          editor.focus?.();
        }
        if (doEnsure) {
          ensureVisible(editor, existing.index);
        }
        scheduleToolbarUpdateRef?.current?.();
        try {
          onRestored?.(existing.index, existing.length || 0);
        }
        catch {
          /* ignore */
        }
      }
      catch {
        /* ignore */
      }
      log.warn("restore:skip:has-selection", { source, existing });
      restoredOnceRef.current = true;
      return true;
    }
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(persistSelectionKey);
    }
    catch {
      // ignore
    }
    if (!raw) {
      // 在没有持久化记录时，若内容为空且需要聚焦，可尝试将光标放到起始位置，避免“看起来什么都没有”的体验
      if (len <= 1 && (focus || force)) {
        try {
          editor.setSelection?.(0, 0, "silent");
          if (focus) {
            editor.focus?.();
          }
          scheduleToolbarUpdateRef?.current?.();
          try {
            onRestored?.(0, 0);
          }
          catch {
            /* ignore */
          }
          log.warn("restore:fallback:empty-default", { source });
          restoredOnceRef.current = true;
          return true;
        }
        catch {
          // ignore
        }
      }
      log.warn("restore:miss", { source });
      return false;
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    }
    catch {
      // ignore
    }
    if (!parsed || typeof parsed.i !== "number") {
      log.warn("restore:bad-payload", { source, raw });
      return false;
    }
    // 即便内容长度很短（<=1），也允许将光标放到 0 位置，以便展示工具栏与占位光标
    const idx = Math.min(Math.max(0, parsed.i), Math.max(0, len - 1));
    const selLen = (typeof parsed.l === "number" && parsed.l > 0) ? Math.min(parsed.l, Math.max(0, len - 1 - idx)) : 0;
    try {
      editor.setSelection?.(idx, selLen, "silent");
      if (focus) {
        editor.focus?.();
      }
      if (doEnsure) {
        ensureVisible(editor, idx);
      }
      scheduleToolbarUpdateRef?.current?.();
      try {
        onRestored?.(idx, selLen);
      }
      catch {
        // ignore
      }
      log.warn("restore:ok", { source, idx, selLen });
      restoredOnceRef.current = true;
      return true;
    }
    catch (e) {
      log.warn("restore:fail", { source, error: String(e) });
      return false;
    }
  }, [persistSelectionKey, quillRef, scheduleToolbarUpdateRef, log, ensureVisible, onRestored]);

  // 若内容尚未就绪导致恢复失败，排队短暂重试（仅在 active 驱动下，避免首帧空白时错过恢复）
  const scheduleRetry = useCallback((source: string, baseOpts: { focus?: boolean; ensureVisible?: boolean; force?: boolean }) => {
    try {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }
    catch { /* ignore */ }
    if (retryCountRef.current >= maxRetries) {
      log.warn("restore:retry:stop", { source, tried: retryCountRef.current });
      return;
    }
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      retryCountRef.current += 1;
      log.warn("restore:retry", { source, attempt: retryCountRef.current });
      const ok = attemptRestore(source, baseOpts);
      if (!ok) {
        scheduleRetry(source, baseOpts);
      }
      else {
        // 成功后复位计数
        retryCountRef.current = 0;
      }
    }, retryDelayMs) as unknown as number;
  }, [attemptRestore, log]);

  // 监听 selection-change, 即时写入
  useEffect(() => {
    if (!persistSelectionKey || !editorReady) {
      return;
    }
    const editor = quillRef.current as any;
    if (!editor) {
      return;
    }
    const onSel = () => writeSelection("selection-change");
    try {
      editor.on?.("selection-change", onSel);
      log.warn("persist:bind:selection-change");
    }
    catch {
      // ignore
    }
    return () => {
      try {
        editor.off?.("selection-change", onSel);
        log.warn("persist:unbind:selection-change");
      }
      catch {
        // ignore
      }
    };
  }, [persistSelectionKey, editorReady, quillRef, log, writeSelection]);

  // active 切换为 true 时的可选恢复（不强制，若已有选区仅确保可见）
  useEffect(() => {
    if (!editorReady || !active) {
      return;
    }
    // 不强制覆盖已有选区
    const ok = attemptRestore("active", { focus: !!focusOnActive, ensureVisible: !!focusOnActive, force: false });
    if (!ok) {
      scheduleRetry("active", { focus: !!focusOnActive, ensureVisible: !!focusOnActive, force: false });
    }
  }, [active, editorReady, focusOnActive, attemptRestore, scheduleRetry]);

  // 卸载前兜底写入一次
  useEffect(() => {
    return () => {
      writeSelection("unmount");
    };
  }, [persistSelectionKey, writeSelection]);

  // 首次 editorReady 时尝试强制恢复一次
  useEffect(() => {
    if (!editorReady || restoredOnceRef.current) {
      return;
    }
    const ok = attemptRestore("editorReady", { focus: true, ensureVisible: true, force: true });
    if (ok) {
      restoredOnceRef.current = true;
    }
    else {
      // editorReady 也可能先于内容准备完成，短暂重试一次（不设置多次，避免打扰体验）
      scheduleRetry("editorReady", { focus: true, ensureVisible: true, force: true });
    }
  }, [editorReady, attemptRestore, scheduleRetry]);

  // 组件卸载或 active 关闭时，清理重试定时器
  useEffect(() => {
    return () => {
      try {
        if (retryTimerRef.current) {
          window.clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      }
      catch { /* ignore */ }
      retryCountRef.current = 0;
    };
  }, []);

  return { attemptRestore };
}
