import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";
import type { SpaceMaterialPackageResponse } from "../../../../api/models/SpaceMaterialPackageResponse";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router";
import { Drawer } from "vaul";
import {
  useCreateSpaceMaterialPackageMutation,
  useDeleteSpaceMaterialPackageMutation,
  useSpaceMaterialPackagesQuery,
  useUpdateSpaceMaterialPackageMutation,
} from "../../../../api/hooks/materialPackageQueryHooks";
import type { MaterialItemDragPayload } from "@/components/chat/utils/materialItemDrag";
import MaterialPackageEditor from "../components/materialPackageEditor";
import MaterialEditorDropLayer from "../components/materialEditorDropLayer";
import MaterialPackageEditorInlinePage from "../components/materialPackageEditorInlinePage";
import { createEmptyMaterialPackageContent } from "../components/materialPackageEditorShared";
import { parseNodePath, serializeNodePath } from "../components/materialPackageTreeUtils";
import MaterialPackageImportModal from "../components/materialPackageImportModal";
import SpaceMaterialLibrarySidebar from "../components/spaceMaterialLibrarySidebar";
import SpaceMaterialLibraryWorkspace from "../components/spaceMaterialLibraryWorkspace";

interface SpaceMaterialLibraryPageProps {
  spaceId: number;
  embedded?: boolean;
}

function buildDraft(pkg?: SpaceMaterialPackageResponse) {
  return {
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    coverUrl: pkg?.coverUrl ?? "",
    isPublic: true,
    content: (pkg?.content ?? createEmptyMaterialPackageContent()) as MaterialPackageContent,
  };
}

export default function SpaceMaterialLibraryPage({
  spaceId,
  embedded = false,
}: SpaceMaterialLibraryPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  const pageRequest = useMemo(() => ({
    pageNo: 1,
    pageSize: 100,
    spaceId,
    keyword: keyword.trim() || undefined,
  }), [keyword, spaceId]);

  const packagesQuery = useSpaceMaterialPackagesQuery(pageRequest, spaceId > 0);
  const createMutation = useCreateSpaceMaterialPackageMutation();
  const updateMutation = useUpdateSpaceMaterialPackageMutation();
  const deleteMutation = useDeleteSpaceMaterialPackageMutation();
  const packages = useMemo(() => (
    packagesQuery.data?.data?.list ?? []
  ), [packagesQuery.data?.data?.list]);
  const selectedPackageId = useMemo(() => {
    const value = Number(searchParams.get("spacePackageId"));
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value;
  }, [searchParams]);
  const selectedMaterialPathKey = useMemo(() => {
    const raw = searchParams.get("materialPathKey") ?? "";
    const normalized = raw.trim();
    if (!normalized) {
      return null;
    }
    const path = parseNodePath(normalized);
    return path.length > 0 ? serializeNodePath(path) : null;
  }, [searchParams]);
  const selectedPackage = packages.find(item => item.spacePackageId === selectedPackageId);
  const editorOpen = isCreating || Boolean(selectedPackage);
  const detailBackLabel = "返回局内素材包";

  const updateSelectedLocation = useCallback((nextId: number | null, nextMaterialPathKey?: string | null) => {
    const currentValue = searchParams.get("spacePackageId") ?? "";
    const nextValue = nextId && nextId > 0 ? String(nextId) : "";
    const currentMaterialPathKey = searchParams.get("materialPathKey") ?? "";
    const nextPathValue = nextId && nextId > 0 && nextMaterialPathKey?.trim()
      ? serializeNodePath(parseNodePath(nextMaterialPathKey))
      : "";
    if (currentValue === nextValue && currentMaterialPathKey === nextPathValue) {
      return;
    }
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextId && nextId > 0) {
      nextSearchParams.set("spacePackageId", String(nextId));
    }
    else {
      nextSearchParams.delete("spacePackageId");
    }
    if (nextPathValue) {
      nextSearchParams.set("materialPathKey", nextPathValue);
    }
    else {
      nextSearchParams.delete("materialPathKey");
    }
    setSearchParams(nextSearchParams);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setIsDrawerOpen(false);
      }
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (selectedPackageId !== null && isCreating) {
      setIsCreating(false);
    }
  }, [isCreating, selectedPackageId]);

  useEffect(() => {
    if (!packagesQuery.isFetched || packagesQuery.isFetching || selectedPackageId === null) {
      return;
    }
    if (!packages.some(item => item.spacePackageId === selectedPackageId)) {
      updateSelectedLocation(null);
    }
  }, [packages, packagesQuery.isFetched, packagesQuery.isFetching, selectedPackageId, updateSelectedLocation]);

  const handleCreate = async (draft: {
    name: string;
    description: string;
    coverUrl: string;
    isPublic: boolean;
    content: MaterialPackageContent;
  }) => {
    const result = await createMutation.mutateAsync({
      spaceId,
      name: draft.name,
      description: draft.description,
      coverUrl: draft.coverUrl,
      content: draft.content,
    });
    toast.success("局内素材包已创建");
    setIsCreating(false);
    updateSelectedLocation(result.data?.spacePackageId ?? null);
  };

  const handleUpdate = async (draft: {
    name: string;
    description: string;
    coverUrl: string;
    isPublic: boolean;
    content: MaterialPackageContent;
  }) => {
    if (!selectedPackage?.spacePackageId) {
      return;
    }

    await updateMutation.mutateAsync({
      spacePackageId: selectedPackage.spacePackageId,
      spaceId,
      name: draft.name,
      description: draft.description,
      coverUrl: draft.coverUrl,
      content: draft.content,
    });
  };

  const handleDelete = async () => {
    if (!selectedPackage?.spacePackageId) {
      return;
    }

    await deleteMutation.mutateAsync({
      spaceId,
      spacePackageId: selectedPackage.spacePackageId,
    });
    toast.success("局内素材包已删除");
    setIsCreating(false);
    updateSelectedLocation(null);
  };

  const handleCreateRequest = () => {
    updateSelectedLocation(null);
    setIsCreating(true);
    setIsDrawerOpen(false);
  };

  const handleOpenPackage = (spacePackageId: number) => {
    setIsCreating(false);
    updateSelectedLocation(spacePackageId);
  };

  const handleOpenMaterialItem = useCallback((payload: MaterialItemDragPayload) => {
    const nextPackageId = Number(payload.spacePackageId);
    if (!Number.isFinite(nextPackageId) || nextPackageId <= 0) {
      return;
    }
    setIsCreating(false);
    updateSelectedLocation(nextPackageId, payload.materialPathKey);
  }, [updateSelectedLocation]);

  const handleCloseImportModal = () => {
    setIsImportOpen(false);
  };

  const handleImportedPackage = useCallback((materialPackage: SpaceMaterialPackageResponse) => {
    setKeyword("");
    setIsCreating(false);
    const importedId = typeof materialPackage.spacePackageId === "number" && materialPackage.spacePackageId > 0
      ? materialPackage.spacePackageId
      : null;
    updateSelectedLocation(importedId);
  }, [updateSelectedLocation]);

  const handleCloseEditor = () => {
    setIsCreating(false);
    updateSelectedLocation(null);
  };

  const handleNavigateToPublic = () => {
    navigate("/material?tab=public");
  };

  const handleNavigateToMine = () => {
    navigate("/material?tab=mine");
  };

  const sidebarNode = (
    <SpaceMaterialLibrarySidebar
      spaceId={spaceId}
      onNavigateToPublic={handleNavigateToPublic}
      onNavigateToMine={handleNavigateToMine}
    />
  );

  const workspaceNode = (
    <SpaceMaterialLibraryWorkspace
      keyword={keyword}
      packages={packages}
      loading={packagesQuery.isLoading}
      onKeywordChange={setKeyword}
      onOpenPackage={handleOpenPackage}
      onCreatePackage={handleCreateRequest}
      onImportPackage={() => setIsImportOpen(true)}
      onNavigateToPublic={handleNavigateToPublic}
      onNavigateToMine={handleNavigateToMine}
    />
  );

  const editorContent = isCreating
    ? (
        <MaterialPackageEditor
          valueKey="space-create"
          dragPackageId={undefined}
          title="新建局内素材包"
          subtitle="当前空间的局内素材包会像本地仓库一样管理素材副本，编辑体验与局外素材包保持一致。"
          initialDraft={buildDraft()}
          backLabel={detailBackLabel}
          onBack={handleCloseEditor}
          saveLabel="创建局内素材包"
          savePending={createMutation.isPending}
          onSave={handleCreate}
        />
      )
    : selectedPackage
      ? (
          <MaterialPackageEditor
            valueKey={`space-${selectedPackage.spacePackageId ?? "unknown"}-${selectedPackage.updateTime ?? ""}`}
            dragPackageId={selectedPackage.spacePackageId}
            title="编辑局内素材包"
            subtitle={selectedPackage.sourcePackageId
              ? `来源局外素材包：${selectedPackage.sourcePackageId} · 当前空间维护的是独立副本`
              : "这是当前空间直接创建的本地素材包"}
            selectedNodeKey={selectedMaterialPathKey}
            initialDraft={buildDraft(selectedPackage)}
            backLabel={detailBackLabel}
            onBack={handleCloseEditor}
            autoSave
            savePending={updateMutation.isPending}
            deletePending={deleteMutation.isPending}
            onSave={handleUpdate}
            onDelete={handleDelete}
          />
        )
      : null;
  const mainContentNode = editorOpen && editorContent
    ? (
        <MaterialPackageEditorInlinePage
          embedded={embedded}
        >
          {editorContent}
        </MaterialPackageEditorInlinePage>
      )
    : workspaceNode;

  if (embedded) {
    return (
      <>
        <MaterialEditorDropLayer onEditMaterialItem={handleOpenMaterialItem}>
          {mainContentNode}
        </MaterialEditorDropLayer>

        <MaterialPackageImportModal
          isOpen={isImportOpen}
          spaceId={spaceId}
          onClose={handleCloseImportModal}
          onImported={handleImportedPackage}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative flex h-full w-full min-w-0 overflow-hidden bg-base-200 text-base-content">
        {isDesktop && (
          <div className={`border-r border-base-300 bg-base-300/60 transition-all duration-300 ${isSidebarCollapsed ? "w-0 overflow-hidden" : "w-[280px]"}`}>
            {sidebarNode}
          </div>
        )}

        {isDesktop && (
          <div className={`fixed top-24 z-50 -translate-y-1/2 transition-all duration-300 ${isSidebarCollapsed ? "left-0" : "left-[280px]"}`}>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              className="flex h-12 w-6 items-center justify-center rounded-r-full border border-l-0 border-base-300 bg-base-100 text-base-content/55 transition hover:bg-base-200 hover:text-base-content"
              aria-label={isSidebarCollapsed ? "展开素材侧边栏" : "收起素材侧边栏"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="h-3 w-3 stroke-current transition-transform duration-200"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={isSidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
                />
              </svg>
            </button>
          </div>
        )}

        {!isDesktop && (
          <div className="fixed left-0 top-[calc(env(safe-area-inset-top)+4.25rem)] z-50">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="打开素材包侧边栏"
              className="flex h-14 w-7 items-center justify-center rounded-r-full border border-base-300 border-l-0 bg-base-100/95 text-base-content/72 shadow-md transition hover:bg-base-200 hover:text-base-content"
            >
              <CaretRightIcon size={16} weight="bold" />
            </button>
          </div>
        )}

        {!isDesktop && (
          <Drawer.Root
            open={isDrawerOpen}
            onOpenChange={setIsDrawerOpen}
            direction="left"
          >
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-base-content/40 data-[state=closed]:pointer-events-none data-[state=open]:pointer-events-auto" />
              <Drawer.Content className="fixed left-0 top-0 z-[100] flex h-full w-[280px] flex-col bg-base-300/95 data-[state=closed]:pointer-events-none data-[state=open]:pointer-events-auto">
                <Drawer.Title className="sr-only">局内素材包侧边栏</Drawer.Title>
                <Drawer.Description className="sr-only">在当前空间、素材广场和我的素材包之间切换。</Drawer.Description>
                <div className="h-full overflow-y-auto">
                  {sidebarNode}
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        )}

        <div className="flex-1 min-h-0 min-w-0">
          <MaterialEditorDropLayer onEditMaterialItem={handleOpenMaterialItem}>
            {mainContentNode}
          </MaterialEditorDropLayer>
        </div>
      </div>

      <MaterialPackageImportModal
        isOpen={isImportOpen}
        spaceId={spaceId}
        onClose={handleCloseImportModal}
        onImported={handleImportedPackage}
      />
    </>
  );
}
