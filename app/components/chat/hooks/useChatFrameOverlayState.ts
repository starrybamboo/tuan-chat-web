import { useState } from "react";

export type ChatFrameOverlayState = {
  isForwardWindowOpen: boolean;
  isExportFileWindowOpen: boolean;
  isExportImageWindowOpen: boolean;
  setIsForwardWindowOpen: (open: boolean) => void;
  setIsExportFileWindowOpen: (open: boolean) => void;
  setIsExportImageWindowOpen: (open: boolean) => void;
};

export default function useChatFrameOverlayState(): ChatFrameOverlayState {
  const [isForwardWindowOpen, setIsForwardWindowOpen] = useState(false);
  const [isExportFileWindowOpen, setIsExportFileWindowOpen] = useState(false);
  const [isExportImageWindowOpen, setIsExportImageWindowOpen] = useState(false);

  return {
    isForwardWindowOpen,
    isExportFileWindowOpen,
    isExportImageWindowOpen,
    setIsForwardWindowOpen,
    setIsExportFileWindowOpen,
    setIsExportImageWindowOpen,
  };
}
