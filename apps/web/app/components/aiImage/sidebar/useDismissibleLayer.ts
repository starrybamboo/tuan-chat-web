import type { RefObject } from "react";

import { useDismissibleLayer as useCommonDismissibleLayer } from "@/components/common/customHooks/useDismissibleLayer";

type UseDismissibleLayerOptions = {
  isOpen: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
};

export function useDismissibleLayer({
  isOpen,
  containerRef,
  onDismiss,
}: UseDismissibleLayerOptions) {
  useCommonDismissibleLayer({
    enabled: isOpen,
    containerRef,
    onDismiss,
  });
}
