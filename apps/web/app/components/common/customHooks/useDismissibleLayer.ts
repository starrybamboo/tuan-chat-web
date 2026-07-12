import type { RefObject } from "react";

import { useEffect, useRef } from "react";

import { shouldCloseEscapeLayer } from "@/components/common/customHooks/useEscapeToClose";

type DismissibleLayerEvent = Pick<KeyboardEvent, "defaultPrevented" | "isComposing" | "key">;

const DISMISSIBLE_LAYER_SELECTOR = [
  "[data-dismissible-layer=\"true\"]",
  "dialog[open]",
  "[data-modal-layer=\"true\"]",
  "[role=\"dialog\"][aria-modal=\"true\"]",
].join(", ");

export type UseDismissibleLayerOptions<T extends HTMLElement> = {
  enabled: boolean;
  containerRef: RefObject<T | null>;
  onDismiss: () => void;
  closeOnEscape?: boolean;
  closeOnOutsidePointerDown?: boolean;
};

function isVisibleDismissibleLayer(layer: HTMLElement) {
  return !layer.hidden && layer.getAttribute("aria-hidden") !== "true";
}

function getTopDismissibleLayer() {
  return Array.from(document.querySelectorAll<HTMLElement>(DISMISSIBLE_LAYER_SELECTOR))
    .filter(isVisibleDismissibleLayer)
    .at(-1) ?? null;
}

function shouldDismissOnEscape<T extends HTMLElement>(
  event: DismissibleLayerEvent,
  container: T | null,
) {
  return shouldCloseEscapeLayer(event, container, getTopDismissibleLayer());
}

/**
 * 统一轻浮层关闭逻辑：用于菜单、下拉、浮层编辑器等非 modal surface。
 * 调用方需要把容器标记为 data-dismissible-layer="true"，以保证多层浮层只关闭顶层。
 */
export function useDismissibleLayer<T extends HTMLElement>({
  enabled,
  containerRef,
  onDismiss,
  closeOnEscape = true,
  closeOnOutsidePointerDown = true,
}: UseDismissibleLayerOptions<T>) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!closeOnOutsidePointerDown) {
        return;
      }
      const container = containerRef.current;
      const target = event.target;
      if (!container || !(target instanceof Node) || container.contains(target)) {
        return;
      }
      if (getTopDismissibleLayer() !== container) {
        return;
      }
      onDismissRef.current();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!closeOnEscape || !shouldDismissOnEscape(event, containerRef.current)) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      onDismissRef.current();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeOnEscape, closeOnOutsidePointerDown, containerRef, enabled]);
}
