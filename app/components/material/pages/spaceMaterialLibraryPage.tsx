import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";
import type { SpaceMaterialPackageResponse } from "../../../../api/models/SpaceMaterialPackageResponse";
import type { MaterialItemDragPayload } from "@/components/chat/utils/materialItemDrag";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router";
import {
  useCreateSpaceMaterialPackageMutation,
  useDeleteSpaceMaterialPackageMutation,
  useSpaceMaterialPackagesQuery,
  useUpdateSpaceMaterialPackageMutation,
} from "../../../../api/hooks/materialPackageQueryHooks";
import MaterialEditorDropLayer from "../components/materialEditorDropLayer";
import MaterialPackageEditor from "../components/materialPackageEditor";
import { buildMaterialPackageEditorDraft } from "../components/materialPackageEditorDraft";
import MaterialPackageEditorInlinePage from "../components/materialPackageEditorInlinePage";
import MaterialPackageLibraryFrame from "../components/materialPackageLibraryFrame";
import MaterialPackageImportModal from "../components/materialPackageImportModal";
import { parseNodePath, serializeNodePath } from "../components/materialPackageTreeUtils";
import SpaceMaterialLibrarySidebar from "../components/spaceMaterialLibrarySidebar";
import SpaceMaterialLibraryWorkspace from "../components/spaceMaterialLibraryWorkspace";

interface SpaceMaterialLibraryPageProps {
  spaceId: number;
  embedded?: boolean;
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
    />
  );

  const editorContent = isCreating
    ? (
        <MaterialPackageEditor
          valueKey="space-create"
          dragPackageId={undefined}
          sidebarActionScope="detail"
          title="新建局内素材包"
          subtitle="当前空间的局内素材包会像本地仓库一样管理素材副本，编辑体验与局外素材包保持一致。"
          initialDraft={buildMaterialPackageEditorDraft()}
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
            sidebarActionScope="detail"
            title="编辑局内素材包"
            subtitle={selectedPackage.sourcePackageId
              ? `来源局外素材包：${selectedPackage.sourcePackageId} · 当前空间维护的是独立副本`
              : "这是当前空间直接创建的本地素材包"}
            selectedNodeKey={selectedMaterialPathKey}
            initialDraft={buildMaterialPackageEditorDraft(selectedPackage)}
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

  const framedMainContentNode = (
    <MaterialEditorDropLayer onEditMaterialItem={handleOpenMaterialItem}>
      {mainContentNode}
    </MaterialEditorDropLayer>
  );

  return (
    <>
      <MaterialPackageLibraryFrame
        embedded={embedded}
        sidebarNode={sidebarNode}
        mainContentNode={framedMainContentNode}
        drawerTitle="局内素材包侧边栏"
        drawerDescription="在当前空间、素材广场和我的素材包之间切换。"
        openSidebarLabel="打开素材包侧边栏"
      />

      <MaterialPackageImportModal
        isOpen={isImportOpen}
        spaceId={spaceId}
        onClose={handleCloseImportModal}
        onImported={handleImportedPackage}
      />
    </>
  );
}
