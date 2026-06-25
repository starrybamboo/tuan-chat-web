import type { MaterialPackageContent } from "@tuanchat/openapi-client/models/MaterialPackageContent";
import type { SpaceMaterialPackageResponse } from "@tuanchat/openapi-client/models/SpaceMaterialPackageResponse";

import { useLocation, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import type { MaterialItemDragPayload } from "@/components/chat/utils/materialItemDrag";

import {
  buildReplayAssetUploadFileMap,
  buildUploadedReplayAssetManifest,
  createReplayAssetManifestUploadDepsFromUploadUtils,
  findReplayLocalAssetManifestFile,
  readReplayAssetManifestJsonFile,
  summarizeReplayAssetManifestSections,
} from "@/components/chat/utils/importRglAssetManifestUpload";
import { applyReplayMaterialPackageImport, buildReplayMaterialPackageFromAssetManifest } from "@/components/chat/utils/importRglMaterialManifest";
import { UploadUtils } from "@/utils/media/UploadUtils";
import { appendPathQuery } from "@/utils/pathQuery";
import { tuanchat } from "api/instance";

import {
  MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
  useCreateSpaceMaterialPackageMutation,
  useDeleteSpaceMaterialPackageMutation,
  useSpaceMaterialPackagesInfiniteQuery,
  useUpdateSpaceMaterialPackageMutation,
} from "../../../../api/hooks/materialPackageQueryHooks";
import MaterialEditorDropLayer from "../components/materialEditorDropLayer";
import MaterialPackageEditor from "../components/materialPackageEditor";
import { buildMaterialPackageEditorDraft } from "../components/materialPackageEditorDraft";
import MaterialPackageEditorInlinePage from "../components/materialPackageEditorInlinePage";
import { buildSpaceMaterialPackageEditorValueKey } from "../components/materialPackageEditorValueKey";
import MaterialPackageImportModal from "../components/materialPackageImportModal";
import MaterialPackageLibraryFrame from "../components/materialPackageLibraryFrame";
import { buildSpaceMaterialPackageCardModel } from "../components/materialPackageLibraryModels";
import MaterialPackageLibrarySidebar from "../components/materialPackageLibrarySidebar";
import MaterialPackageLibraryWorkspace from "../components/materialPackageLibraryWorkspace";
import { parseNodePath, serializeNodePath } from "../components/materialPackageTreeUtils";

type SpaceMaterialLibraryPageProps = {
  spaceId: number;
  embedded?: boolean;
}

const REPLAY_LOCAL_ASSET_DIRECTORY_INPUT_PROPS = {
  directory: "",
  webkitdirectory: "",
} as Record<string, string>;

async function findSpaceMaterialPackageByExactName(spaceId: number, name: string): Promise<SpaceMaterialPackageResponse | null> {
  const matches: SpaceMaterialPackageResponse[] = [];
  let pageNo = 1;
  for (let guard = 0; guard < 100; guard += 1) {
    const response = await tuanchat.spaceMaterialPackageController.pagePackages({
      spaceId,
      keyword: name,
      pageNo,
      pageSize: 100,
    });
    if (!response.success) {
      throw new Error(response.errMsg?.trim() || "查询局内素材包失败");
    }

    const page = response.data;
    for (const item of page?.list ?? []) {
      if (item.name?.trim() === name) {
        matches.push(item);
      }
    }
    if (page?.isLast || !page?.list?.length) {
      break;
    }
    pageNo = (page.pageNo ?? pageNo) + 1;
  }

  if (matches.length > 1) {
    throw new Error(`存在多个同名局内素材包：${name}`);
  }
  return matches[0] ?? null;
}

export default function SpaceMaterialLibraryPage({
  spaceId,
  embedded = false,
}: SpaceMaterialLibraryPageProps) {
  const location = useLocation();
  const router = useRouter();
  const searchParams = useMemo(() => new URLSearchParams(location.searchStr), [location.searchStr]);
  const [keyword, setKeyword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImportingReplayLocalAssets, setIsImportingReplayLocalAssets] = useState(false);
  const [isImportingReplayManifest, setIsImportingReplayManifest] = useState(false);
  const replayLocalAssetsInputRef = useRef<HTMLInputElement | null>(null);
  const replayManifestInputRef = useRef<HTMLInputElement | null>(null);
  const replayAssetUploadUtilsRef = useRef(new UploadUtils());

  const pageRequest = useMemo(() => ({
    pageNo: 1,
    pageSize: MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
    spaceId,
    keyword: keyword.trim() || undefined,
  }), [keyword, spaceId]);

  const packagesQuery = useSpaceMaterialPackagesInfiniteQuery(pageRequest, spaceId > 0);
  const createMutation = useCreateSpaceMaterialPackageMutation();
  const updateMutation = useUpdateSpaceMaterialPackageMutation();
  const deleteMutation = useDeleteSpaceMaterialPackageMutation();
  const packages = useMemo(() => (
    packagesQuery.data?.pages.flatMap(page => page.data?.list ?? []) ?? []
  ), [packagesQuery.data?.pages]);
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
  const packageCardItems = packages.map(buildSpaceMaterialPackageCardModel);

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
    router.history.replace(appendPathQuery(location.pathname, nextSearchParams, location.hash));
  }, [location.hash, location.pathname, router, searchParams]);

  useEffect(() => {
    if (selectedPackageId !== null && isCreating) {
      queueMicrotask(() => setIsCreating(false));
    }
  }, [isCreating, selectedPackageId]);

  useEffect(() => {
    if (!packagesQuery.isFetched || selectedPackageId === null || selectedPackage) {
      return;
    }
    if (packagesQuery.hasNextPage) {
      if (!packagesQuery.isFetching && !packagesQuery.isFetchingNextPage) {
        void packagesQuery.fetchNextPage();
      }
      return;
    }
    if (packagesQuery.isFetching || packagesQuery.isFetchingNextPage) {
      return;
    }
    updateSelectedLocation(null);
  }, [
    packagesQuery,
    selectedPackage,
    selectedPackageId,
    updateSelectedLocation,
  ]);

  const handleCreate = async (draft: {
    name: string;
    description: string;
    coverFileId?: number;
    coverUrl: string;
    originalCoverUrl: string;
    isPublic: boolean;
    content: MaterialPackageContent;
  }) => {
    const result = await createMutation.mutateAsync({
      spaceId,
      name: draft.name,
      description: draft.description,
      coverFileId: draft.coverFileId,
      content: draft.content,
    });
    toast.success("局内素材包已创建");
    setIsCreating(false);
    updateSelectedLocation(result.data?.spacePackageId ?? null);
  };

  const handleUpdate = async (draft: {
    name: string;
    description: string;
    coverFileId?: number;
    coverUrl: string;
    originalCoverUrl: string;
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
      coverFileId: draft.coverFileId,
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

  const handlePickReplayManifest = () => {
    if (isImportingReplayManifest) {
      return;
    }
    replayManifestInputRef.current?.click();
  };

  const handlePickReplayLocalAssets = () => {
    if (isImportingReplayLocalAssets) {
      return;
    }
    replayLocalAssetsInputRef.current?.click();
  };

  const handleImportReplayLocalAssetsFile = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }

    setIsImportingReplayLocalAssets(true);
    try {
      const manifestFile = findReplayLocalAssetManifestFile(selectedFiles);
      const rawManifest = await readReplayAssetManifestJsonFile(manifestFile, "本地 Replay 素材清单");
      const uploadedManifest = await buildUploadedReplayAssetManifest(rawManifest, createReplayAssetManifestUploadDepsFromUploadUtils({
        filesByPath: buildReplayAssetUploadFileMap(selectedFiles),
        uploadUtils: replayAssetUploadUtilsRef.current,
      }), {
        includeRoles: false,
      });
      const sections = summarizeReplayAssetManifestSections(uploadedManifest);
      if (!sections.media) {
        throw new Error("本地素材清单没有 media 通用素材；角色素材请在房间 RGL 导入窗口导入");
      }

      const replayPackage = buildReplayMaterialPackageFromAssetManifest(uploadedManifest);
      const result = await applyReplayMaterialPackageImport(spaceId, replayPackage, {
        findPackageByExactName: findSpaceMaterialPackageByExactName,
        createPackage: request => createMutation.mutateAsync(request),
        updatePackage: request => updateMutation.mutateAsync(request),
      });

      const savedId = result.spacePackageId ?? null;
      toast.success(`${result.action === "update" ? "已重写" : "已创建"} Replay 导入素材包：${result.name}（${result.materialCount} 个素材）`);
      setKeyword("");
      setIsCreating(false);
      updateSelectedLocation(savedId);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.error(`导入本地 Replay 素材失败：${message}`);
    }
    finally {
      setIsImportingReplayLocalAssets(false);
      if (replayLocalAssetsInputRef.current) {
        replayLocalAssetsInputRef.current.value = "";
      }
    }
  };

  const handleImportReplayManifestFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    setIsImportingReplayManifest(true);
    try {
      const rawManifest = await readReplayAssetManifestJsonFile(file, "asset-manifest.json");
      const replayPackage = buildReplayMaterialPackageFromAssetManifest(rawManifest);
      const result = await applyReplayMaterialPackageImport(spaceId, replayPackage, {
        findPackageByExactName: findSpaceMaterialPackageByExactName,
        createPackage: request => createMutation.mutateAsync(request),
        updatePackage: request => updateMutation.mutateAsync(request),
      });

      const savedId = result.spacePackageId ?? null;
      toast.success(`${result.action === "update" ? "已重写" : "已创建"} Replay 导入素材包：${result.name}（${result.materialCount} 个素材）`);
      setKeyword("");
      setIsCreating(false);
      updateSelectedLocation(savedId);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.error(`导入 asset-manifest.json 失败：${message}`);
    }
    finally {
      setIsImportingReplayManifest(false);
      if (replayManifestInputRef.current) {
        replayManifestInputRef.current.value = "";
      }
    }
  };

  const handleCloseEditor = () => {
    setIsCreating(false);
    updateSelectedLocation(null);
  };
  const handleLoadMore = useCallback(() => {
    if (packagesQuery.hasNextPage && !packagesQuery.isFetchingNextPage) {
      void packagesQuery.fetchNextPage();
    }
  }, [packagesQuery]);
  const editorBackProps = embedded
    ? {}
    : {
        backLabel: detailBackLabel,
        onBack: handleCloseEditor,
      };
  const showEmbeddedStructureSidebar = !embedded;

  const handleNavigateToPublic = () => {
    router.history.push("/material?tab=public");
  };

  const handleNavigateToMine = () => {
    router.history.push("/material?tab=mine");
  };

  const sidebarNode = (
    <MaterialPackageLibrarySidebar
      description="局内素材包和局外素材包保持同一种工作区体验，当前只在访问路径和数据来源上区分。"
      items={[
        {
          key: "space",
          label: `当前空间 · Space ${spaceId}`,
          icon: "house",
          active: true,
        },
        {
          key: "public",
          label: "素材广场",
          icon: "squares",
          onClick: handleNavigateToPublic,
        },
        {
          key: "mine",
          label: "我的素材包",
          icon: "package",
          onClick: handleNavigateToMine,
        },
      ]}
      footerDescription="当前页面展示的是当前空间的本地素材包副本区，可以像管理本地仓库一样组织和编辑素材。"
    />
  );

  const workspaceNode = (
    <MaterialPackageLibraryWorkspace
      upperLabel="Space Library"
      title="局内素材包"
      description="当前空间的局内素材包会像本地仓库一样管理素材副本，编辑体验与局外素材包保持一致。"
      searchPlaceholder="搜索当前空间的素材包、导入副本或章节内容..."
      keyword={keyword}
      items={packageCardItems}
      headerActions={[
        {
          key: "import-replay-local-assets",
          label: isImportingReplayLocalAssets ? "上传中..." : "上传本地 Replay 素材",
          icon: "package",
          variant: "secondary",
          onClick: handlePickReplayLocalAssets,
        },
        {
          key: "import-replay-manifest",
          label: isImportingReplayManifest ? "导入中..." : "导入 asset-manifest.json",
          icon: "package",
          variant: "secondary",
          onClick: handlePickReplayManifest,
        },
        {
          key: "import-package",
          label: "从局外导入",
          icon: "package",
          variant: "secondary",
          onClick: () => setIsImportOpen(true),
        },
        {
          key: "create-space-package",
          label: "新建局内素材包",
          icon: "plus",
          variant: "primary",
          onClick: handleCreateRequest,
        },
      ]}
      emptyTitle="当前空间还没有局内素材包"
      emptyDescription="你可以先新建一个局内素材包，或者从局外素材库整包导入，把它当作当前空间的本地素材工作区。"
      loading={packagesQuery.isLoading}
      loadingMore={packagesQuery.isFetchingNextPage}
      hasMore={Boolean(packagesQuery.hasNextPage)}
      skeletonPrefix="space-material-skeleton"
      onKeywordChange={setKeyword}
      onLoadMore={handleLoadMore}
      onOpenItem={(index) => {
        const item = packages[index];
        if (typeof item?.spacePackageId === "number") {
          handleOpenPackage(item.spacePackageId);
        }
      }}
    />
  );

  const editorContent = isCreating
    ? (
        <MaterialPackageEditor
          valueKey="space-create"
          dragPackageId={undefined}
          sidebarActionScope="detail"
          showStructureSidebar={showEmbeddedStructureSidebar}
          title="新建局内素材包"
          subtitle="当前空间的局内素材包会像本地仓库一样管理素材副本，编辑体验与局外素材包保持一致。"
          initialDraft={buildMaterialPackageEditorDraft()}
          {...editorBackProps}
          saveLabel="创建局内素材包"
          savePending={createMutation.isPending}
          onSave={handleCreate}
        />
      )
    : selectedPackage
      ? (
          <MaterialPackageEditor
            valueKey={buildSpaceMaterialPackageEditorValueKey(selectedPackage)}
            dragPackageId={selectedPackage.spacePackageId}
            sidebarActionScope="detail"
            showStructureSidebar={showEmbeddedStructureSidebar}
            title="编辑局内素材包"
            subtitle={selectedPackage.sourcePackageId
              ? `来源局外素材包：${selectedPackage.sourcePackageId} · 当前空间维护的是独立副本`
              : "这是当前空间直接创建的本地素材包"}
            selectedNodeKey={selectedMaterialPathKey}
            initialDraft={buildMaterialPackageEditorDraft(selectedPackage)}
            {...editorBackProps}
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
      <input
        ref={replayLocalAssetsInputRef}
        type="file"
        className="hidden"
        multiple
        {...REPLAY_LOCAL_ASSET_DIRECTORY_INPUT_PROPS}
        onChange={event => void handleImportReplayLocalAssetsFile(event.target.files)}
      />
      <input
        ref={replayManifestInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={event => void handleImportReplayManifestFile(event.target.files)}
      />
    </>
  );
}
