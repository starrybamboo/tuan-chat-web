import type { MaterialPackageResponse } from "@tuanchat/openapi-client/models/MaterialPackageResponse";
import type { SpaceMaterialPackageResponse } from "@tuanchat/openapi-client/models/SpaceMaterialPackageResponse";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useImportSpaceMaterialPackageMutation, useMyMaterialPackagesQuery, usePublicMaterialPackagesQuery } from "../../../../api/hooks/materialPackageQueryHooks";
import { buildMaterialPackageImportSuccessMessage, getMaterialPackageDisplayName } from "./materialPackageImportFeedback";

interface MaterialPackageImportModalProps {
  isOpen: boolean;
  spaceId: number;
  onClose: () => void;
  onImported?: (materialPackage: SpaceMaterialPackageResponse) => void;
}

type SourceTab = "my" | "public";

function PackageSourceCard({
  item,
  onImport,
  importing,
}: {
  item: MaterialPackageResponse;
  onImport: (packageId: number) => void;
  importing: boolean;
}) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <div className="font-medium truncate">{getMaterialPackageDisplayName(item.name)}</div>
            {item.isPublic ? <span className="badge badge-primary badge-outline">公开</span> : <span className="badge badge-outline">私有</span>}
          </div>
          {item.description && <div className="text-sm opacity-70 whitespace-pre-wrap">{item.description}</div>}
          <div className="flex flex-wrap gap-2 text-xs opacity-60">
            <span>{`${item.materialCount ?? 0} 个素材`}</span>
            <span>{`${item.folderCount ?? 0} 个文件夹`}</span>
            <span>{`${item.messageCount ?? 0} 条消息`}</span>
            {item.username && <span>{`作者：${item.username}`}</span>}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm shrink-0"
          onClick={() => onImport(item.packageId ?? 0)}
          disabled={!item.packageId || importing}
        >
          {importing ? "导入中..." : "导入"}
        </button>
      </div>
    </div>
  );
}

export default function MaterialPackageImportModal({
  isOpen,
  spaceId,
  onClose,
  onImported,
}: MaterialPackageImportModalProps) {
  const [activeTab, setActiveTab] = useState<SourceTab>("my");
  const [keyword, setKeyword] = useState("");
  const myRequest = useMemo(() => ({
    pageNo: 1,
    pageSize: 50,
    keyword: keyword.trim() || undefined,
  }), [keyword]);
  const publicRequest = useMemo(() => ({
    pageNo: 1,
    pageSize: 50,
    keyword: keyword.trim() || undefined,
  }), [keyword]);
  const myPackagesQuery = useMyMaterialPackagesQuery(myRequest, isOpen && activeTab === "my");
  const publicPackagesQuery = usePublicMaterialPackagesQuery(publicRequest, isOpen && activeTab === "public");
  const importMutation = useImportSpaceMaterialPackageMutation();

  if (!isOpen) {
    return null;
  }

  const list = activeTab === "my"
    ? (myPackagesQuery.data?.data?.list ?? [])
    : (publicPackagesQuery.data?.data?.list ?? []);
  const loading = activeTab === "my" ? myPackagesQuery.isLoading : publicPackagesQuery.isLoading;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-4xl rounded-[28px] p-0">
        <div className="border-b border-base-300 px-6 py-5">
          <div className="text-xl font-semibold">导入局外素材包</div>
          <div className="mt-1 text-sm opacity-70">导入时会整包复制到当前空间，之后局内修改不会影响局外原包。</div>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="tabs tabs-boxed">
              <button
                type="button"
                className={`tab ${activeTab === "my" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("my")}
              >
                我的局外素材包
              </button>
              <button
                type="button"
                className={`tab ${activeTab === "public" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("public")}
              >
                素材广场
              </button>
            </div>

            <input
              type="text"
              className="input input-bordered md:w-72"
              placeholder="按名称搜索"
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
            />
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {loading && <div className="rounded-2xl border border-base-300 px-4 py-8 text-center opacity-70">加载中...</div>}
            {!loading && list.length === 0 && (
              <div className="rounded-2xl border border-dashed border-base-300 px-4 py-10 text-center opacity-70">
                当前没有可导入的素材包。
              </div>
            )}
            {!loading && list.map(item => (
              <PackageSourceCard
                key={item.packageId}
                item={item}
                importing={importMutation.isPending}
                onImport={(packageId) => {
                  importMutation.mutate(
                    { spaceId, packageId },
                    {
                      onSuccess: (result) => {
                        const importedPackage = result.data;
                        toast.success(buildMaterialPackageImportSuccessMessage(importedPackage?.name ?? item.name));
                        if (importedPackage) {
                          onImported?.(importedPackage);
                        }
                        onClose();
                      },
                    },
                  );
                }}
              />
            ))}
          </div>
        </div>

        <div className="modal-action m-0 border-t border-base-300 px-6 py-4">
          <button type="button" className="btn" onClick={onClose}>关闭</button>
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label="关闭导入弹窗" />
    </dialog>
  );
}
