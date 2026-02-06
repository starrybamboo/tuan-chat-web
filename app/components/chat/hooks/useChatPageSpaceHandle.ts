import { useCallback } from "react";

import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";

type UseChatPageSpaceHandleResult = {
  closeSpaceHandle: () => void;
  isSpaceHandleOpen: boolean;
  openSpaceHandle: () => void;
  setIsSpaceHandleOpen: (next: boolean) => void;
};

export default function useChatPageSpaceHandle(): UseChatPageSpaceHandleResult {
  const [isSpaceHandleOpen, setIsSpaceHandleOpen] = useSearchParamsState<boolean>("addSpacePop", false);

  const openSpaceHandle = useCallback(() => {
    setIsSpaceHandleOpen(true);
  }, [setIsSpaceHandleOpen]);

  const closeSpaceHandle = useCallback(() => {
    setIsSpaceHandleOpen(false);
  }, [setIsSpaceHandleOpen]);

  return {
    closeSpaceHandle,
    isSpaceHandleOpen,
    openSpaceHandle,
    setIsSpaceHandleOpen,
  };
}
