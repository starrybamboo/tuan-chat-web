import { getOrCreateSpaceDoc } from "@/components/chat/infra/blocksuite/spaceWorkspaceRegistry";
import { AFFINE_EDGELESS_STD_EXTENSIONS, AFFINE_PAGE_STD_EXTENSIONS } from "@/components/chat/infra/blocksuite/spec/affineSpec";
import { ensureBlocksuiteCoreElementsDefined } from "@/components/chat/infra/blocksuite/spec/coreElements";

import { BlockStdScope } from "@blocksuite/std";
import { useEffect, useRef } from "react";

export default function BlocksuiteDescriptionEditor(props: {
  spaceId: number;
  docId: string;
  mode?: "page" | "edgeless";
  className?: string;
}) {
  const { className, docId, mode = "page", spaceId } = props;

  const hostContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = hostContainerRef.current;
    if (!container)
      return;

    ensureBlocksuiteCoreElementsDefined();

    const store = getOrCreateSpaceDoc({ spaceId, docId });
    const extensions = mode === "edgeless" ? AFFINE_EDGELESS_STD_EXTENSIONS : AFFINE_PAGE_STD_EXTENSIONS;
    const std = new BlockStdScope({ store, extensions });
    const host = std.render();

    // `editor-host` defaults to `height: 100%` in BlockSuite styles.
    // In our panel layout, the parent may not have an explicit height,
    // so we make the host self-sized with a sane minimum height.
    host.style.height = "auto";
    host.style.minHeight = "8rem";
    host.style.width = "100%";

    container.replaceChildren(host);

    return () => {
      container.replaceChildren();
    };
  }, [docId, mode, spaceId]);

  return (
    <div className={className}>
      <div className="rounded-box bg-base-100 border border-base-300 overflow-hidden">
        <div ref={hostContainerRef} className="min-h-32 w-full" />
      </div>
    </div>
  );
}
