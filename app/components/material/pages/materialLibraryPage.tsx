import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";
import type { MaterialPackageResponse } from "../../../../api/models/MaterialPackageResponse";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { Drawer } from "vaul";
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
import MaterialPackageEditorModal from "../components/materialPackageEditorModal";
import { createEmptyMaterialPackageContent } from "../components/materialPackageEditorShared";

export type GlobalTab = "public" | "mine";

interface MaterialLibraryPageProps {
  mode?: GlobalTab;
  embedded?: boolean;
}

function buildDraft(pkg?: MaterialPackageResponse) {
  return {
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    coverUrl: pkg?.coverUrl ?? "",
    isPublic: pkg?.isPublic ?? true,
    content: (pkg?.content ?? createEmptyMaterialPackageContent()) as MaterialPackageContent,
  };
}

export default function MaterialLibraryPage({
  mode,
  embedded = false,
}: MaterialLibraryPageProps) {
  const navigate = useNavigate();
  const [internalActiveTab, setInternalActiveTab] = useState<GlobalTab>(mode ?? "mine");
  const [keyword, setKeyword] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  const activeTab = mode ?? internalActiveTab;
  const hasStandaloneSidebar = !embedded;
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
    if (mode) {
      setSelectedPackageId(null);
      setIsCreating(false);
      setKeyword("");
    }
  }, [mode]);

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
    setIsDrawerOpen(false);
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
    toast.success("素材包已更新");
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

  const handleCreateRequest = () => {
    if (activeTab !== "mine" && !mode) {
      setInternalActiveTab("mine");
    }
    setSelectedPackageId(null);
    setIsCreating(true);
    setIsDrawerOpen(false);
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

  const editorNode = (
    <MaterialPackageEditorModal
      isOpen={editorOpen}
      onClose={handleCloseEditor}
    >
      {isCreating
        ? (
            <MaterialPackageEditor
              valueKey="create"
              title="新建素材包"
              subtitle="创建你的素材容器，配置封面、描述和素材单元。每个素材单元里都可以继续添加多条素材。"
              initialDraft={buildDraft()}
              showPublicToggle={true}
              saveLabel="创建素材包"
              savePending={createMutation.isPending}
              onSave={handleCreate}
            />
          )
        : selectedPackage
          ? (
              <MaterialPackageEditor
                valueKey={`${activeTab}-${selectedPackage.packageId ?? "unknown"}-${selectedPackage.updateTime ?? ""}`}
                title={activeTab === "public" ? "公开素材包详况" : "修改素材包"}
                subtitle={activeTab === "public"
                  ? `作者：${selectedPackage.username ?? "未知"} · 已被导入 ${selectedPackage.importCount ?? 0} 次`
                  : `已被导入 ${selectedPackage.importCount ?? 0} 次`}
                initialDraft={buildDraft(selectedPackage)}
                readOnly={activeTab === "public"}
                showPublicToggle={activeTab === "mine"}
                savePending={updateMutation.isPending}
                deletePending={deleteMutation.isPending}
                onSave={activeTab === "mine" ? handleUpdate : undefined}
                onDelete={activeTab === "mine" ? handleDelete : undefined}
              />
            )
          : null}
    </MaterialPackageEditorModal>
  );

  if (embedded) {
    return (
      <>
        {workspaceNode}
        {editorNode}
      </>
    );
  }

  return (
    <>
      <div className="relative flex h-full w-full min-w-0 overflow-hidden bg-base-200 text-base-content">
        {hasStandaloneSidebar && isDesktop && (
          <div className={`border-r border-base-300 bg-base-300/60 transition-all duration-300 ${isSidebarCollapsed ? "w-0 overflow-hidden" : "w-[280px]"}`}>
            {sidebarNode}
          </div>
        )}

        {hasStandaloneSidebar && isDesktop && (
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

        {hasStandaloneSidebar && !isDesktop && (
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

        {hasStandaloneSidebar && !isDesktop && (
          <Drawer.Root
            open={isDrawerOpen}
            onOpenChange={setIsDrawerOpen}
            direction="left"
          >
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-base-content/40 data-[state=closed]:pointer-events-none data-[state=open]:pointer-events-auto" />
              <Drawer.Content className="fixed left-0 top-0 z-[100] flex h-full w-[280px] flex-col bg-base-300/95 data-[state=closed]:pointer-events-none data-[state=open]:pointer-events-auto">
                <Drawer.Title className="sr-only">素材包侧边栏</Drawer.Title>
                <Drawer.Description className="sr-only">在素材广场与我的素材包之间切换。</Drawer.Description>
                <div className="h-full overflow-y-auto">
                  {sidebarNode}
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        )}

        <div className="flex-1 min-h-0 min-w-0">{workspaceNode}</div>
      </div>

      {editorNode}
    </>
  );
}
