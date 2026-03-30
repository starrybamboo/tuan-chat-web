import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";
import type { MaterialPackageResponse } from "../../../../api/models/MaterialPackageResponse";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import {
  useCreateMaterialPackageMutation,
  useDeleteMaterialPackageMutation,
  useMyMaterialPackagesQuery,
  usePublicMaterialPackagesQuery,
  useUpdateMaterialPackageMutation,
} from "../../../../api/hooks/materialPackageQueryHooks";
import MaterialLibrarySidebar from "../components/materialLibrarySidebar";
import MaterialLibraryWorkspace from "../components/materialLibraryWorkspace";
import MaterialPackageEditor from "../components/materialPackageEditor";
import { buildMaterialPackageEditorDraft } from "../components/materialPackageEditorDraft";
import MaterialPackageEditorInlinePage from "../components/materialPackageEditorInlinePage";
import { createEmptyMaterialPackageContent } from "../components/materialPackageEditorShared";
import MaterialPackageLibraryFrame from "../components/materialPackageLibraryFrame";

export type GlobalTab = "public" | "mine";

interface MaterialLibraryPageProps {
  initialTab?: GlobalTab;
  mode?: GlobalTab;
  embedded?: boolean;
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
    pageSize: 100,
    keyword: keyword.trim() || undefined,
  }), [keyword]);
  const publicRequest = useMemo(() => ({
    pageNo: 1,
    pageSize: 100,
    keyword: keyword.trim() || undefined,
  }), [keyword]);

  const myPackagesQuery = useMyMaterialPackagesQuery(myRequest, activeTab === "mine");
  const publicPackagesQuery = usePublicMaterialPackagesQuery(publicRequest, activeTab === "public");
  const createMutation = useCreateMaterialPackageMutation();
  const updateMutation = useUpdateMaterialPackageMutation();
  const deleteMutation = useDeleteMaterialPackageMutation();

  const packages = useMemo(() => (
    activeTab === "mine"
      ? (myPackagesQuery.data?.data?.list ?? [])
      : (publicPackagesQuery.data?.data?.list ?? [])
  ), [activeTab, myPackagesQuery.data?.data?.list, publicPackagesQuery.data?.data?.list]);
  const selectedPackage = packages.find(item => item.packageId === selectedPackageId);
  const loading = activeTab === "mine" ? myPackagesQuery.isLoading : publicPackagesQuery.isLoading;
  const editorOpen = isCreating || Boolean(selectedPackage);
  const detailBackLabel = activeTab === "mine" ? "返回我的素材包" : "返回素材广场";

  useEffect(() => {
    if (mode) {
      setSelectedPackageId(null);
      setIsCreating(false);
      setKeyword("");
    }
  }, [mode]);

  useEffect(() => {
    if (!mode && initialTab) {
      setInternalActiveTab(initialTab);
      setSelectedPackageId(null);
      setIsCreating(false);
      setKeyword("");
    }
  }, [initialTab, mode]);

  useEffect(() => {
    if (selectedPackageId !== null && !packages.some(item => item.packageId === selectedPackageId)) {
      setSelectedPackageId(null);
    }
  }, [packages, selectedPackageId]);

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
    <MaterialLibrarySidebar
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
    />
  );

  const workspaceNode = (
    <MaterialLibraryWorkspace
      activeTab={activeTab}
      keyword={keyword}
      packages={packages}
      loading={loading}
      embedded={embedded}
      onKeywordChange={setKeyword}
      onOpenPackage={handleOpenPackage}
      onCreatePackage={handleCreateRequest}
      onNavigateToMine={activeTab === "public" ? handleNavigateToMine : undefined}
    />
  );

  const editorContent = isCreating
    ? (
        <MaterialPackageEditor
          valueKey="create"
          dragPackageId={undefined}
          title="新建素材包"
          subtitle="创建你的素材容器，配置封面、描述和素材单元。每个素材单元里都可以继续添加多条素材。"
          initialDraft={buildMaterialPackageEditorDraft()}
          showPublicToggle={true}
          backLabel={detailBackLabel}
          onBack={handleCloseEditor}
          saveLabel="创建素材包"
          savePending={createMutation.isPending}
          onSave={handleCreate}
        />
      )
    : selectedPackage
      ? (
          <MaterialPackageEditor
            valueKey={`${activeTab}-${selectedPackage.packageId ?? "unknown"}-${selectedPackage.updateTime ?? ""}`}
            dragPackageId={selectedPackage.packageId}
            title={activeTab === "public" ? "公开素材包详况" : "修改素材包"}
            subtitle={activeTab === "public"
              ? `作者：${selectedPackage.username ?? "未知"} · 已被导入 ${selectedPackage.importCount ?? 0} 次`
              : `已被导入 ${selectedPackage.importCount ?? 0} 次`}
            initialDraft={buildMaterialPackageEditorDraft(selectedPackage)}
            readOnly={activeTab === "public"}
            showPublicToggle={activeTab === "mine"}
            backLabel={detailBackLabel}
            onBack={handleCloseEditor}
            autoSave={activeTab === "mine"}
            savePending={updateMutation.isPending}
            deletePending={deleteMutation.isPending}
            extraActionLabel={activeTab === "public" ? "添加到我的素材包" : undefined}
            extraActionPending={activeTab === "public" ? createMutation.isPending : false}
            onSave={activeTab === "mine" ? handleUpdate : undefined}
            onDelete={activeTab === "mine" ? handleDelete : undefined}
            onExtraAction={activeTab === "public" ? handleAddToMine : undefined}
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
