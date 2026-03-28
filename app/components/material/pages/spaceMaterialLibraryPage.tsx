import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";
import type { SpaceMaterialPackageResponse } from "../../../../api/models/SpaceMaterialPackageResponse";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useCreateSpaceMaterialPackageMutation,
  useDeleteSpaceMaterialPackageMutation,
  useSpaceMaterialPackagesQuery,
  useUpdateSpaceMaterialPackageMutation,
} from "../../../../api/hooks/materialPackageQueryHooks";
import MaterialPackageEditor from "../components/materialPackageEditor";
import { createEmptyMaterialPackageContent } from "../components/materialPackageEditorShared";
import MaterialPackageImportModal from "../components/materialPackageImportModal";

interface SpaceMaterialLibraryPageProps {
  spaceId: number;
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

export default function SpaceMaterialLibraryPage({ spaceId }: SpaceMaterialLibraryPageProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
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
  const selectedPackage = packages.find(item => item.spacePackageId === selectedPackageId);

  useEffect(() => {
    if (isCreating) {
      return;
    }
    if (packages.length === 0) {
      setSelectedPackageId(null);
      return;
    }
    if (!packages.some(item => item.spacePackageId === selectedPackageId)) {
      setSelectedPackageId(packages[0]?.spacePackageId ?? null);
    }
  }, [isCreating, packages, selectedPackageId]);

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
    setSelectedPackageId(result.data?.spacePackageId ?? null);
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
    toast.success("局内素材包已更新");
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
    setSelectedPackageId(null);
  };

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_rgba(248,250,252,0.92),_rgba(255,255,255,1))]">
        <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
          <div className="rounded-[32px] border border-base-300/70 bg-base-100/85 shadow-2xl backdrop-blur">
            <div className="border-b border-base-300/80 px-6 py-8 md:px-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl space-y-3">
                  <span className="badge badge-lg badge-outline">Space Material Package</span>
                  <h1 className="text-3xl font-semibold md:text-5xl">{`局内素材包 · Space ${spaceId}`}</h1>
                  <p className="max-w-2xl text-sm leading-7 opacity-75 md:text-base">
                    这里是当前空间自己的素材包副本区。你可以直接新建局内素材包，也可以从局外素材库整包导入；导入后局内修改不会回写到局外原包。
                  </p>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    type="text"
                    className="input input-bordered md:w-72"
                    placeholder="按名称搜索"
                    value={keyword}
                    onChange={event => setKeyword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsImportOpen(true)}
                  >
                    从局外导入
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setIsCreating(true);
                      setSelectedPackageId(null);
                    }}
                  >
                    新建局内素材包
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:p-8">
              <div className="space-y-4">
                <div className="rounded-[28px] border border-base-300 bg-base-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium opacity-80">当前空间的素材包</div>
                    <div className="text-xs opacity-60">{`${packages.length} 个结果`}</div>
                  </div>

                  <div className="space-y-3">
                    {packagesQuery.isLoading && <div className="rounded-2xl border border-base-300 px-4 py-10 text-center opacity-70">加载中...</div>}
                    {!packagesQuery.isLoading && packages.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-base-300 px-4 py-10 text-center opacity-70">
                        当前空间还没有素材包。
                      </div>
                    )}
                    {!packagesQuery.isLoading && packages.map((item) => {
                      const active = !isCreating && item.spacePackageId === selectedPackageId;
                      return (
                        <button
                          key={item.spacePackageId}
                          type="button"
                          className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                            active
                              ? "border-primary bg-primary/8 shadow-lg"
                              : "border-base-300 bg-base-100/80 hover:border-base-400 hover:bg-base-100"
                          }`}
                          onClick={() => {
                            setIsCreating(false);
                            setSelectedPackageId(item.spacePackageId ?? null);
                          }}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="truncate font-medium">{item.name || "未命名局内素材包"}</div>
                              {item.sourcePackageId ? <span className="badge badge-secondary badge-outline">导入</span> : <span className="badge badge-outline">局内</span>}
                            </div>
                            {item.description && <div className="line-clamp-2 text-sm opacity-70">{item.description}</div>}
                            <div className="flex flex-wrap gap-2 text-xs opacity-60">
                              <span>{`${item.materialCount ?? 0} 个素材`}</span>
                              <span>{`${item.folderCount ?? 0} 个文件夹`}</span>
                              <span>{`${item.messageCount ?? 0} 条消息`}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                {isCreating
                  ? (
                      <MaterialPackageEditor
                        valueKey="space-create"
                        title="新建局内素材包"
                        subtitle="局内素材包是当前空间内部管理单位，不区分公开私有。"
                        initialDraft={buildDraft()}
                        saveLabel="创建局内素材包"
                        savePending={createMutation.isPending}
                        onSave={handleCreate}
                      />
                    )
                  : selectedPackage
                    ? (
                        <MaterialPackageEditor
                          valueKey={`space-${selectedPackage.spacePackageId ?? "unknown"}-${selectedPackage.updateTime ?? ""}`}
                          title="编辑局内素材包"
                          subtitle={selectedPackage.sourcePackageId
                            ? `来源局外素材包：${selectedPackage.sourcePackageId} · 现在已经是独立副本`
                            : "这是直接在局内创建的素材包"}
                          initialDraft={buildDraft(selectedPackage)}
                          savePending={updateMutation.isPending}
                          deletePending={deleteMutation.isPending}
                          onSave={handleUpdate}
                          onDelete={handleDelete}
                        />
                      )
                    : (
                        <div className="rounded-[28px] border border-dashed border-base-300 bg-base-100/70 px-8 py-16 text-center">
                          <div className="text-xl font-medium">还没有选中局内素材包</div>
                          <div className="mt-2 text-sm opacity-70">可以先新建一个局内素材包，或者从局外素材库整包导入。</div>
                        </div>
                      )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <MaterialPackageImportModal
        isOpen={isImportOpen}
        spaceId={spaceId}
        onClose={() => setIsImportOpen(false)}
      />
    </>
  );
}
