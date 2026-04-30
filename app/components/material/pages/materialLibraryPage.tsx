import type { MaterialPackageContent } from "@tuanchat/openapi-client/models/MaterialPackageContent";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import {
  MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
  useCreateMaterialPackageMutation,
  useDeleteMaterialPackageMutation,
  useMyMaterialPackagesInfiniteQuery,
  usePublicMaterialPackagesInfiniteQuery,
  useUpdateMaterialPackageMutation,
} from "../../../../api/hooks/materialPackageQueryHooks";
import { buildMaterialPackageEditorDraft } from "../components/materialPackageEditorDraft";
import { createEmptyMaterialPackageContent } from "../components/materialPackageEditorShared";
import { buildGlobalMaterialPackageEditorValueKey } from "../components/materialPackageEditorValueKey";
import MaterialPackageLibraryFrame from "../components/materialPackageLibraryFrame";
import { buildGlobalMaterialPackageCardModel } from "../components/materialPackageLibraryModels";
import MaterialPackageLibrarySidebar from "../components/materialPackageLibrarySidebar";
import MaterialPackageLibraryWorkspace from "../components/materialPackageLibraryWorkspace";

const LazyMaterialPackageEditor = lazy(() => import("../components/materialPackageEditor"));
const LazyMaterialPackageEditorInlinePage = lazy(() => import("../components/materialPackageEditorInlinePage"));

type GlobalTab = "public" | "mine";

interface MaterialLibraryPageProps {
  initialTab?: GlobalTab;
  mode?: GlobalTab;
  embedded?: boolean;
}

function MaterialEditorLoadingState({ embedded }: { embedded: boolean }) {
  const minHeightClassName = embedded ? "min-h-[20rem]" : "min-h-[24rem]";
  return (
    <div className={`flex ${minHeightClassName} items-center justify-center text-sm text-base-content/60`}>
      <span className="loading loading-spinner loading-md"></span>
      <span className="ml-2">正在加载素材编辑器...</span>
    </div>
  );
}

export default function MaterialLibraryPage({
  initialTab,
  mode,
  embedded = false,
}: MaterialLibraryPageProps) {
  const navigate = useNavigate();
  const [internalActiveTab, setInternalActiveTab] = useState<GlobalTab>(mode ?? initialTab ?? "mine");
  const [keyword, setKeyword] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const activeTab = mode ?? internalActiveTab;
  const myRequest = useMemo(() => ({
    pageNo: 1,
    pageSize: MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
    keyword: keyword.trim() || undefined,
  }), [keyword]);
  const publicRequest = useMemo(() => ({
    pageNo: 1,
    pageSize: MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
    keyword: keyword.trim() || undefined,
  }), [keyword]);

  const myPackagesQuery = useMyMaterialPackagesInfiniteQuery(myRequest, activeTab === "mine");
  const publicPackagesQuery = usePublicMaterialPackagesInfiniteQuery(publicRequest, activeTab === "public");
  const createMutation = useCreateMaterialPackageMutation();
  const updateMutation = useUpdateMaterialPackageMutation();
  const deleteMutation = useDeleteMaterialPackageMutation();

  const activePackagesQuery = activeTab === "mine" ? myPackagesQuery : publicPackagesQuery;
  const packages = useMemo(() => (
    activeTab === "mine"
      ? (myPackagesQuery.data?.pages.flatMap(page => page.data?.list ?? []) ?? [])
      : (publicPackagesQuery.data?.pages.flatMap(page => page.data?.list ?? []) ?? [])
  ), [activeTab, myPackagesQuery.data?.pages, publicPackagesQuery.data?.pages]);
  const selectedPackage = packages.find(item => item.packageId === selectedPackageId);
  const loading = activePackagesQuery.isLoading;
  const editorOpen = isCreating || Boolean(selectedPackage);
  const detailBackLabel = activeTab === "mine" ? "返回我的素材包" : "返回素材广场";
  const packageCardItems = packages.map(item => buildGlobalMaterialPackageCardModel(item, activeTab));

  useEffect(() => {
    if (mode) {
      queueMicrotask(() => setSelectedPackageId(null));
      queueMicrotask(() => setIsCreating(false));
      queueMicrotask(() => setKeyword(""));
    }
  }, [mode]);

  useEffect(() => {
    if (!mode && initialTab) {
      queueMicrotask(() => setInternalActiveTab(initialTab));
      queueMicrotask(() => setSelectedPackageId(null));
      queueMicrotask(() => setIsCreating(false));
      queueMicrotask(() => setKeyword(""));
    }
  }, [initialTab, mode]);

  useEffect(() => {
    if (
      selectedPackageId !== null
      && !selectedPackage
      && activePackagesQuery.isFetched
      && !activePackagesQuery.hasNextPage
      && !activePackagesQuery.isFetching
      && !activePackagesQuery.isFetchingNextPage
    ) {
      queueMicrotask(() => setSelectedPackageId(null));
    }
  }, [
    activePackagesQuery.hasNextPage,
    activePackagesQuery.isFetched,
    activePackagesQuery.isFetching,
    activePackagesQuery.isFetchingNextPage,
    selectedPackage,
    selectedPackageId,
  ]);

  const handleLoadMore = useCallback(() => {
    if (activePackagesQuery.hasNextPage && !activePackagesQuery.isFetchingNextPage) {
      void activePackagesQuery.fetchNextPage();
    }
  }, [activePackagesQuery]);

  const handleSelectTab = (tab: GlobalTab) => {
    if (mode) {
      return;
    }
    setInternalActiveTab(tab);
    setSelectedPackageId(null);
    setIsCreating(false);
    setKeyword("");
  };

  const handleCreate = async (draft: {
    name: string;
    description: string;
    coverUrl: string;
    originalCoverUrl: string;
    isPublic: boolean;
    content: MaterialPackageContent;
  }) => {
    const result = await createMutation.mutateAsync(draft);
    const createdId = result.data?.packageId ?? null;
    toast.success("素材包已创建");
    setIsCreating(false);
    if (!mode) {
      setInternalActiveTab("mine");
    }
    setSelectedPackageId(createdId);
  };

  const handleUpdate = async (draft: {
    name: string;
    description: string;
    coverUrl: string;
    originalCoverUrl: string;
    isPublic: boolean;
    content: MaterialPackageContent;
  }) => {
    if (!selectedPackage?.packageId) {
      return;
    }
    await updateMutation.mutateAsync({
      packageId: selectedPackage.packageId,
      ...draft,
    });
  };

  const handleDelete = async () => {
    if (!selectedPackage?.packageId) {
      return;
    }
    await deleteMutation.mutateAsync(selectedPackage.packageId);
    toast.success("素材包已删除");
    setSelectedPackageId(null);
    setIsCreating(false);
  };

  const handleAddToMine = async () => {
    if (!selectedPackage) {
      return;
    }

    const result = await createMutation.mutateAsync({
      name: selectedPackage.name?.trim() || "未命名素材包",
      description: selectedPackage.description ?? "",
      coverUrl: selectedPackage.coverUrl ?? "",
      originalCoverUrl: selectedPackage.originalCoverUrl ?? selectedPackage.coverUrl ?? "",
      isPublic: false,
      content: (selectedPackage.content ?? createEmptyMaterialPackageContent()) as MaterialPackageContent,
    });

    const createdId = result.data?.packageId ?? null;
    toast.success("已添加到我的素材包");

    if (mode === "public" && embedded) {
      setIsCreating(false);
      setSelectedPackageId(null);
      navigate("/chat/discover/material/my");
      return;
    }

    if (!mode) {
      setInternalActiveTab("mine");
    }
    setIsCreating(false);
    setSelectedPackageId(createdId);
    setKeyword("");
  };

  const handleCreateRequest = () => {
    if (activeTab !== "mine" && !mode) {
      setInternalActiveTab("mine");
    }
    setSelectedPackageId(null);
    setIsCreating(true);
  };

  const handleOpenPackage = (packageId: number) => {
    setIsCreating(false);
    setSelectedPackageId(packageId);
  };

  const handleCloseEditor = () => {
    setIsCreating(false);
    setSelectedPackageId(null);
  };
  const editorBackProps = embedded
    ? {}
    : {
        backLabel: detailBackLabel,
        onBack: handleCloseEditor,
      };

  const handleNavigateToMine = () => {
    if (mode === "public" && embedded) {
      navigate("/chat/discover/material/my");
      return;
    }

    if (!mode) {
      setInternalActiveTab("mine");
      setSelectedPackageId(null);
      setIsCreating(false);
      setKeyword("");
    }
  };

  const sidebarNode = (
    <MaterialPackageLibrarySidebar
      description="在这里切换素材广场与我的素材包。"
      items={[
        {
          key: "public",
          label: "素材广场",
          icon: "squares",
          active: activeTab === "public",
          onClick: () => handleSelectTab("public"),
        },
        {
          key: "mine",
          label: "我的素材包",
          icon: "package",
          active: activeTab === "mine",
          onClick: () => handleSelectTab("mine"),
        },
      ]}
      footerDescription={activeTab === "mine"
        ? "你可以新建、编辑、删除自己的素材包。"
        : "这里展示公开的素材包，默认以只读方式查看。"}
    />
  );

  const workspaceNode = (
    <MaterialPackageLibraryWorkspace
      upperLabel={activeTab === "mine" ? "Personal Library" : "Public Square"}
      title={activeTab === "mine" ? "我的素材包" : "素材广场"}
      description={activeTab === "mine"
        ? "管理并组织你的数字化创意资产。通过统一的浏览与编辑视图，快速找到每一个灵感瞬间。"
        : "浏览公开分享的素材包，快速查看素材结构、贡献信息与内容规模。"}
      searchPlaceholder={activeTab === "mine"
        ? "搜索我的素材资产、标签或分类..."
        : "搜索公共素材包、标签或分类..."}
      keyword={keyword}
      items={packageCardItems}
      headerActions={activeTab === "mine"
        ? [{
            key: "create-package",
            label: "新建素材包",
            icon: "plus",
            variant: "primary",
            onClick: handleCreateRequest,
          }]
        : []}
      shortcuts={activeTab === "mine"
        ? [{
            key: "create-shortcut",
            title: "创建新的素材包",
            description: "从一个空包开始，逐步整理和沉淀你自己的素材集合。",
            caption: "创建后即可进入编辑",
            icon: "plus",
            onClick: handleCreateRequest,
          }]
        : activeTab === "public"
          ? [{
              key: "navigate-to-mine",
              title: "前往我的素材包",
              description: "切换到个人素材区，继续新建、管理和维护你的私有素材库。",
              caption: "适合沉淀你自己的常用内容",
              icon: "package",
              onClick: handleNavigateToMine,
            }]
          : []}
      emptyTitle={activeTab === "mine" ? "你还没有自己的素材包" : "当前没有匹配的公开素材包"}
      emptyDescription={activeTab === "mine"
        ? "可以先新建一个素材包，开始组织你的素材与消息模板。"
        : "换个关键词试试，或者稍后再来看看新的公开内容。"}
      loading={loading}
      loadingMore={activePackagesQuery.isFetchingNextPage}
      hasMore={Boolean(activePackagesQuery.hasNextPage)}
      embedded={embedded}
      showEmbeddedHeaderActions={activeTab !== "mine"}
      skeletonPrefix="material-skeleton"
      onKeywordChange={setKeyword}
      onLoadMore={handleLoadMore}
      onOpenItem={(index) => {
        const item = packages[index];
        if (typeof item?.packageId === "number") {
          handleOpenPackage(item.packageId);
        }
      }}
    />
  );

  const editorContent = isCreating
    ? (
        <Suspense fallback={<MaterialEditorLoadingState embedded={embedded} />}>
          <LazyMaterialPackageEditor
            valueKey="create"
            dragPackageId={undefined}
            title="新建素材包"
            subtitle="创建你的素材容器，配置封面、描述和素材单元。每个素材单元里都可以继续添加多条素材。"
            initialDraft={buildMaterialPackageEditorDraft()}
            showPublicToggle={true}
            {...editorBackProps}
            saveLabel="创建素材包"
            savePending={createMutation.isPending}
            onSave={handleCreate}
          />
        </Suspense>
      )
    : selectedPackage
      ? (
          <Suspense fallback={<MaterialEditorLoadingState embedded={embedded} />}>
            <LazyMaterialPackageEditor
              valueKey={buildGlobalMaterialPackageEditorValueKey(activeTab, selectedPackage)}
              dragPackageId={selectedPackage.packageId}
              title={activeTab === "public" ? "公开素材包详况" : "修改素材包"}
              subtitle={activeTab === "public"
                ? `作者：${selectedPackage.username ?? "未知"} · 已被导入 ${selectedPackage.importCount ?? 0} 次`
                : `已被导入 ${selectedPackage.importCount ?? 0} 次`}
              initialDraft={buildMaterialPackageEditorDraft(selectedPackage)}
              readOnly={activeTab === "public"}
              showPublicToggle={activeTab === "mine"}
              {...editorBackProps}
              autoSave={activeTab === "mine"}
              savePending={updateMutation.isPending}
              deletePending={deleteMutation.isPending}
              extraActionLabel={activeTab === "public" ? "添加到我的素材包" : undefined}
              extraActionPending={activeTab === "public" ? createMutation.isPending : false}
              onSave={activeTab === "mine" ? handleUpdate : undefined}
              onDelete={activeTab === "mine" ? handleDelete : undefined}
              onExtraAction={activeTab === "public" ? handleAddToMine : undefined}
            />
          </Suspense>
        )
      : null;
  const mainContentNode = editorOpen && editorContent
    ? (
        <Suspense fallback={<MaterialEditorLoadingState embedded={embedded} />}>
          <LazyMaterialPackageEditorInlinePage
            embedded={embedded}
          >
            {editorContent}
          </LazyMaterialPackageEditorInlinePage>
        </Suspense>
      )
    : workspaceNode;

  return (
    <MaterialPackageLibraryFrame
      embedded={embedded}
      sidebarNode={sidebarNode}
      mainContentNode={mainContentNode}
      drawerTitle="素材包侧边栏"
      drawerDescription="在素材广场与我的素材包之间切换。"
      openSidebarLabel="打开素材包侧边栏"
    />
  );
}
