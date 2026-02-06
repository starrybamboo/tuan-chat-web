import { useState } from "react";

export type ChatFrameOverlayState = {
  isForwardWindowOpen: boolean;
  isExportImageWindowOpen: boolean;
  setIsForwardWindowOpen: (open: boolean) => void;
  setIsExportImageWindowOpen: (open: boolean) => void;
};

export default function useChatFrameOverlayState(): ChatFrameOverlayState {
  const [isForwardWindowOpen, setIsForwardWindowOpen] = useState(false);
  const [isExportImageWindowOpen, setIsExportImageWindowOpen] = useState(false);

  return {
    isForwardWindowOpen,
    isExportImageWindowOpen,
    setIsForwardWindowOpen,
    setIsExportImageWindowOpen,
  };
}
