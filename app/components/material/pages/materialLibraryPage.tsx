import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";
import type { MaterialPackageResponse } from "../../../../api/models/MaterialPackageResponse";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useCreateMaterialPackageMutation,
  useDeleteMaterialPackageMutation,
  useMyMaterialPackagesQuery,
  usePublicMaterialPackagesQuery,
  useUpdateMaterialPackageMutation,
} from "../../../../api/hooks/materialPackageQueryHooks";
import MaterialPackageEditor, { createEmptyMaterialPackageContent } from "../components/materialPackageEditor";

export type GlobalTab = "public" | "mine";

type MaterialLibraryPageProps = {
  mode?: GlobalTab;
  embedded?: boolean;
};

function buildDraft(pkg?: MaterialPackageResponse) {
  return {
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    coverUrl: pkg?.coverUrl ?? "",
    isPublic: pkg?.isPublic ?? true,
    content: (pkg?.content ?? createEmptyMaterialPackageContent()) as MaterialPackageContent,
  };
}

export default function MaterialLibraryPage({ mode, embedded = false }: MaterialLibraryPageProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<GlobalTab>(mode ?? "public");
  const [keyword, setKeyword] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const activeTab = mode ?? internalActiveTab;
  const isEmbeddedDiscoverView = embedded && Boolean(mode);
  const showTabSwitch = !mode;
  const pageBadgeLabel = isEmbeddedDiscoverView ? "Discover Material" : "Material Library";
  const pageTitle = isEmbeddedDiscoverView
    ? activeTab === "mine" ? "我的素材包" : "素材广场"
    : "局外素材库";
  const pageDescription = isEmbeddedDiscoverView
    ? activeTab === "mine"
      ? "这里集中管理你自己的局外素材包。你可以继续新建、编辑、删除，并保持与发现导航一致的浏览路径。"
      : "这里展示公开的局外素材包。你可以像在发现页浏览仓库一样，直接查看公开素材的结构与内容。"
    : "每个用户都维护自己的素材包。素材包默认公开，可出现在素材广场；包内结构使用树形 JSON，folder 只负责组织，material 才承载一条或多条消息。";
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

  const packages = activeTab === "mine"
    ? (myPackagesQuery.data?.data?.list ?? [])
    : (publicPackagesQuery.data?.data?.list ?? []);
  const selectedPackage = packages.find(item => item.packageId === selectedPackageId);
  const loading = activeTab === "mine" ? myPackagesQuery.isLoading : publicPackagesQuery.isLoading;

  useEffect(() => {
    if (isCreating) {
      return;
    }
    if (packages.length === 0) {
      setSelectedPackageId(null);
      return;
    }
    if (!packages.some(item => item.packageId === selectedPackageId)) {
      setSelectedPackageId(packages[0]?.packageId ?? null);
    }
  }, [isCreating, packages, selectedPackageId]);

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
    setInternalActiveTab("mine");
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
    const packageId = selectedPackage.packageId;
    await deleteMutation.mutateAsync(packageId);
    toast.success("素材包已删除");
    setSelectedPackageId(null);
  };

  const renderRightPanel = () => {
    if (activeTab === "mine" && isCreating) {
      return (
        <MaterialPackageEditor
          valueKey="create"
          title="新建局外素材包"
          subtitle="包外是素材包，包内结构仍然保持 folder / material 的树形 JSON。"
          initialDraft={buildDraft()}
          showPublicToggle={true}
          saveLabel="创建素材包"
          savePending={createMutation.isPending}
          onSave={handleCreate}
        />
      );
    }

    if (!selectedPackage) {
      return (
        <div className="rounded-[28px] border border-dashed border-base-300 bg-base-100/70 px-8 py-16 text-center">
          <div className="text-xl font-medium">还没有选中素材包</div>
          <div className="mt-2 text-sm opacity-70">
            {activeTab === "mine" ? "你可以先新建一个局外素材包，或者从左侧选择已有素材包。" : "从左侧选择一个公开素材包查看内容。"}
          </div>
          {activeTab === "mine" && (
            <button
              type="button"
              className="btn btn-primary mt-6"
              onClick={() => setIsCreating(true)}
            >
              新建素材包
            </button>
          )}
        </div>
      );
    }

    const subtitle = activeTab === "public"
      ? `作者：${selectedPackage.username ?? "未知"} · 已被导入 ${selectedPackage.importCount ?? 0} 次`
      : `已被导入 ${selectedPackage.importCount ?? 0} 次`;

    return (
      <MaterialPackageEditor
        valueKey={`${activeTab}-${selectedPackage.packageId ?? "unknown"}-${selectedPackage.updateTime ?? ""}`}
        title={activeTab === "public" ? "公开素材包详情" : "编辑局外素材包"}
        subtitle={subtitle}
        initialDraft={buildDraft(selectedPackage)}
        readOnly={activeTab === "public"}
        showPublicToggle={activeTab === "mine"}
        savePending={updateMutation.isPending}
        deletePending={deleteMutation.isPending}
        onSave={activeTab === "mine" ? handleUpdate : undefined}
        onDelete={activeTab === "mine" ? handleDelete : undefined}
      />
    );
  };

  return (
    <div className={`${embedded ? "h-full min-h-0 overflow-y-auto" : "min-h-screen"} bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.84),_rgba(248,250,252,0.96))]`}>
      <div className={`mx-auto max-w-[1440px] px-4 ${embedded ? "py-6 md:px-6 md:py-6" : "py-8 md:px-8"}`}>
        <div className="rounded-[32px] border border-base-300/70 bg-base-100/85 shadow-2xl backdrop-blur">
          <div className="border-b border-base-300/80 px-6 py-8 md:px-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl space-y-3">
                <span className="badge badge-lg badge-outline">{pageBadgeLabel}</span>
                <h1 className="text-3xl font-semibold md:text-5xl">{pageTitle}</h1>
                <p className="max-w-2xl text-sm leading-7 opacity-75 md:text-base">
                  {pageDescription}
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                {showTabSwitch && (
                  <div className="tabs tabs-boxed bg-base-200/70">
                    <button
                      type="button"
                      className={`tab ${activeTab === "public" ? "tab-active" : ""}`}
                      onClick={() => {
                        setInternalActiveTab("public");
                        setIsCreating(false);
                      }}
                    >
                      素材广场
                    </button>
                    <button
                      type="button"
                      className={`tab ${activeTab === "mine" ? "tab-active" : ""}`}
                      onClick={() => setInternalActiveTab("mine")}
                    >
                      我的素材包
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  className="input input-bordered md:w-72"
                  placeholder="按名称搜索"
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                />

                {activeTab === "mine" && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setIsCreating(true);
                      setSelectedPackageId(null);
                    }}
                  >
                    新建素材包
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:p-8">
            <div className="space-y-4">
              <div className="rounded-[28px] border border-base-300 bg-base-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium opacity-80">
                    {activeTab === "mine" ? "我的局外素材包" : "公开素材包"}
                  </div>
                  <div className="text-xs opacity-60">{`${packages.length} 个结果`}</div>
                </div>

                <div className="space-y-3">
                  {loading && <div className="rounded-2xl border border-base-300 px-4 py-10 text-center opacity-70">加载中...</div>}
                  {!loading && packages.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-base-300 px-4 py-10 text-center opacity-70">
                      暂时没有匹配的素材包。
                    </div>
                  )}
                  {!loading && packages.map(item => {
                    const active = !isCreating && item.packageId === selectedPackageId;
                    return (
                      <button
                        key={item.packageId}
                        type="button"
                        className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                          active
                            ? "border-primary bg-primary/8 shadow-lg"
                            : "border-base-300 bg-base-100/80 hover:border-base-400 hover:bg-base-100"
                        }`}
                        onClick={() => {
                          setIsCreating(false);
                          setSelectedPackageId(item.packageId ?? null);
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="truncate font-medium">{item.name || "未命名素材包"}</div>
                              {item.isPublic
                                ? <span className="badge badge-primary badge-outline">公开</span>
                                : <span className="badge badge-outline">私有</span>}
                            </div>
                            {item.description && <div className="line-clamp-2 text-sm opacity-70">{item.description}</div>}
                            <div className="flex flex-wrap gap-2 text-xs opacity-60">
                              <span>{`${item.materialCount ?? 0} 个素材`}</span>
                              <span>{`${item.folderCount ?? 0} 个文件夹`}</span>
                              <span>{`${item.messageCount ?? 0} 条消息`}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>{renderRightPanel()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
