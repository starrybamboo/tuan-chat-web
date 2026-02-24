import { useState } from "react";

type ChatFrameOverlayState = {
  isForwardWindowOpen: boolean;
  isExportFileWindowOpen: boolean;
  isExportImageWindowOpen: boolean;
  isRegexSelectWindowOpen: boolean;
  setIsForwardWindowOpen: (open: boolean) => void;
  setIsExportFileWindowOpen: (open: boolean) => void;
  setIsExportImageWindowOpen: (open: boolean) => void;
  setIsRegexSelectWindowOpen: (open: boolean) => void;
};

export default function useChatFrameOverlayState(): ChatFrameOverlayState {
  const [isForwardWindowOpen, setIsForwardWindowOpen] = useState(false);
  const [isExportFileWindowOpen, setIsExportFileWindowOpen] = useState(false);
  const [isExportImageWindowOpen, setIsExportImageWindowOpen] = useState(false);
  const [isRegexSelectWindowOpen, setIsRegexSelectWindowOpen] = useState(false);

  return {
    isForwardWindowOpen,
    isExportFileWindowOpen,
    isExportImageWindowOpen,
    isRegexSelectWindowOpen,
    setIsForwardWindowOpen,
    setIsExportFileWindowOpen,
    setIsExportImageWindowOpen,
    setIsRegexSelectWindowOpen,
  };
}
