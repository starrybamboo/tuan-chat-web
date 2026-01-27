import type { ClueMessage } from "../../../../../api/models/ClueMessage";
import { useEffect, useMemo, useRef, useState } from "react";
import BlocksuiteClueDescriptionEditor from "@/components/chat/shared/components/blocksuiteClueDescriptionEditor";
import { useUpdateClueMutation } from "../../../../../api/hooks/spaceClueHooks";

interface ManualData {
  id?: number;
  name?: string;
  image?: string;
  clueStarsId?: number;
}

interface DisplayOfItemDetailProps {
  manualData?: ManualData;
  onSend: (clue: ClueMessage) => void;
  spaceId?: number;
  onManualDataChange?: (next: ManualData) => void;
}

function DisplayOfItemDetail({ manualData, spaceId, onManualDataChange }: DisplayOfItemDetailProps) {
  const canOpenClueDoc = typeof spaceId === "number"
    && spaceId > 0
    && typeof manualData?.id === "number";

  const [manualDataState, setManualDataState] = useState<ManualData>(() => manualData ?? {});

  useEffect(() => {
    setManualDataState(manualData ?? {});
  }, [manualData?.id, manualData?.image, manualData?.name]);

  const updateClueMutation = useUpdateClueMutation();

  const clueId = manualDataState?.id;
  const clueStarsId = useMemo(
    () => (manualDataState as any)?.clueStarsId ?? (manualData as any)?.clueStarsId,
    [manualDataState, manualData],
  );

  const debounceTimerRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ name?: string; image?: string } | null>(null);

  const syncMeta = (nextName?: string, nextImage?: string) => {
    if (typeof clueId !== "number")
      return;

    const last = lastSentRef.current;
    if (last?.name === nextName && last?.image === nextImage)
      return;

    // 1) UI 立即同步（列表 name/img）
    onManualDataChange?.({
      id: clueId,
      name: nextName,
      image: nextImage,
      clueStarsId,
    });

    // 2) debounce 后端更新（避免频繁请求）
    if (debounceTimerRef.current)
      window.clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = window.setTimeout(() => {
      lastSentRef.current = { name: nextName, image: nextImage };

      updateClueMutation.mutate([
        {
          id: clueId,
          name: nextName,
          image: nextImage,
          clueStarsId,
        } as any,
      ]);
    }, 500);
  };

  useEffect(() => {
    if (!canOpenClueDoc)
      return;

    const normalizeTitle = (t: string) => t?.trim?.() ?? "";
    let prev = normalizeTitle(document.title);

    const t = window.setInterval(() => {
      const now = normalizeTitle(document.title);
      if (now && now !== prev) {
        prev = now;
        syncMeta(now, (manualDataState as any)?.image);
      }
    }, 400);

    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canOpenClueDoc, clueId]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!canOpenClueDoc)
      return;
    if (!containerRef.current)
      return;

    const root = containerRef.current;

    const pickAvatarSrc = () => {
      const imgs = Array.from(root.querySelectorAll("img"));
      const img = imgs.find(i => typeof i.src === "string" && i.src.length > 0);
      return img?.src;
    };

    let prevSrc = pickAvatarSrc();

    const obs = new MutationObserver(() => {
      const nextSrc = pickAvatarSrc();
      if (nextSrc && nextSrc !== prevSrc) {
        prevSrc = nextSrc;
        syncMeta((manualDataState as any)?.name, nextSrc);
      }
    });

    obs.observe(root, { subtree: true, attributes: true, childList: true, attributeFilter: ["src"] });

    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canOpenClueDoc, clueId]);

  // 保留你原来的列表同步（从 manualDataState 变化推给父组件）
  useEffect(() => {
    if (!onManualDataChange)
      return;
    if (typeof manualDataState?.id !== "number")
      return;

    onManualDataChange({
      id: manualDataState.id,
      name: manualDataState.name,
      image: manualDataState.image,
      clueStarsId,
    });
  }, [manualDataState?.id, manualDataState?.name, manualDataState?.image, onManualDataChange, clueStarsId]);

  if (!manualDataState?.id) {
    return <div className="text-red-500 dark:text-red-300">缺少线索ID，无法打开线索文档</div>;
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full max-w-6xl mx-auto bg-neutral-50 dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden border border-neutral-200 dark:border-neutral-700"
    >
      <div className="p-4 md:p-5">
        {canOpenClueDoc
          ? (
              <BlocksuiteClueDescriptionEditor
                spaceId={spaceId as number}
                clueId={manualDataState.id as number}
                className="w-full h-[calc(100dvh-220px)]"
              />
            )
          : (
              <div className="text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 rounded-md p-3 border border-neutral-200 dark:border-neutral-600">
                缺少 spaceId 或 clueId，无法打开线索文档。
              </div>
            )}
      </div>
    </div>
  );
}

export default DisplayOfItemDetail;
