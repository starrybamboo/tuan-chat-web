import type { RefObject } from "react";

import { useEffect, useRef } from "react";

type EscapeCloseEvent = Pick<KeyboardEvent, "defaultPrevented" | "isComposing" | "key">;

const MODAL_LAYER_SELECTOR = [
  "dialog[open]",
  "[data-modal-layer=\"true\"]",
  "[role=\"dialog\"][aria-modal=\"true\"]",
].join(", ");

export function isActiveModalLayer({
  tagName,
  hasOpenAttribute,
  isRegistered,
  hidden,
  ariaHidden,
}: {
  tagName: string;
  hasOpenAttribute: boolean;
  isRegistered: boolean;
  hidden: boolean;
  ariaHidden: string | null;
}): boolean {
  if (hidden || ariaHidden === "true") {
    return false;
  }
  if (tagName === "DIALOG" && !hasOpenAttribute && !isRegistered) {
    return false;
  }
  return true;
}

export function shouldCloseEscapeLayer<T>(
  event: EscapeCloseEvent,
  currentLayer: T | null,
  topLayer: T | null,
): boolean {
  return event.key === "Escape"
    && !event.defaultPrevented
    && !event.isComposing
    && currentLayer != null
    && topLayer === currentLayer;
}

export function useEscapeToClose<T extends HTMLElement>({
  enabled,
  onClose,
  containerRef,
}: {
  enabled: boolean;
  onClose: () => void;
  containerRef: RefObject<T | null>;
}) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const layers = Array.from(document.querySelectorAll<HTMLElement>(MODAL_LAYER_SELECTOR))
        .filter(layer => isActiveModalLayer({
          tagName: layer.tagName,
          hasOpenAttribute: layer.hasAttribute("open"),
          isRegistered: layer.dataset.modalLayer === "true",
          hidden: layer.hidden,
          ariaHidden: layer.getAttribute("aria-hidden"),
        }));
      const topLayer = layers.at(-1) ?? null;
      if (!shouldCloseEscapeLayer(event, containerRef.current, topLayer)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      onCloseRef.current();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, enabled]);
}
