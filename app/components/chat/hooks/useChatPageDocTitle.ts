import { useMemo } from "react";

import type { MinimalDocMeta } from "@/components/chat/room/sidebarTree";

type DocHeaderOverride = {
  title?: string | null;
};

type UseChatPageDocTitleParams = {
  activeDocId?: string | null;
  activeDocHeaderOverride?: DocHeaderOverride | null;
  docMetasFromSidebarTree: MinimalDocMeta[];
  spaceDocMetas: MinimalDocMeta[] | null;
};

export default function useChatPageDocTitle({
  activeDocId,
  activeDocHeaderOverride,
  docMetasFromSidebarTree,
  spaceDocMetas,
}: UseChatPageDocTitleParams) {
  return useMemo(() => {
    if (!activeDocId)
      return "";

    const overrideTitle = typeof activeDocHeaderOverride?.title === "string" ? activeDocHeaderOverride.title.trim() : "";
    if (overrideTitle)
      return overrideTitle;

    const fromState = (spaceDocMetas ?? []).find(m => m.id === activeDocId)?.title;
    if (typeof fromState === "string" && fromState.trim().length > 0)
      return fromState.trim();

    const fromTree = (docMetasFromSidebarTree ?? []).find(m => m.id === activeDocId)?.title;
    if (typeof fromTree === "string" && fromTree.trim().length > 0)
      return fromTree.trim();

    return "文档";
  }, [activeDocHeaderOverride?.title, activeDocId, docMetasFromSidebarTree, spaceDocMetas]);
}
