import { useState } from "react";

type ChatFrameOverlayState = {
  isForwardWindowOpen: boolean;
  isExportFileWindowOpen: boolean;
  isExportImageWindowOpen: boolean;
  isMessageFilterWindowOpen: boolean;
  setIsForwardWindowOpen: (open: boolean) => void;
  setIsExportFileWindowOpen: (open: boolean) => void;
  setIsExportImageWindowOpen: (open: boolean) => void;
  setIsMessageFilterWindowOpen: (open: boolean) => void;
};

export default function useChatFrameOverlayState(): ChatFrameOverlayState {
  const [isForwardWindowOpen, setIsForwardWindowOpen] = useState(false);
  const [isExportFileWindowOpen, setIsExportFileWindowOpen] = useState(false);
  const [isExportImageWindowOpen, setIsExportImageWindowOpen] = useState(false);
  const [isMessageFilterWindowOpen, setIsMessageFilterWindowOpen] = useState(false);

  return {
    isForwardWindowOpen,
    isExportFileWindowOpen,
    isExportImageWindowOpen,
    isMessageFilterWindowOpen,
    setIsForwardWindowOpen,
    setIsExportFileWindowOpen,
    setIsExportImageWindowOpen,
    setIsMessageFilterWindowOpen,
  };
}
