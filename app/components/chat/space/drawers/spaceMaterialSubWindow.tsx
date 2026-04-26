import type { MaterialPackageContent } from "@tuanchat/openapi-client/models/MaterialPackageContent";
import type { SpaceMaterialPackageResponse } from "@tuanchat/openapi-client/models/SpaceMaterialPackageResponse";

import { useMemo } from "react";
import toast from "react-hot-toast";
import MaterialPackageEditor from "@/components/material/components/materialPackageEditor";
import MaterialPackageEditorInlinePage from "@/components/material/components/materialPackageEditorInlinePage";
import { createEmptyMaterialPackageContent } from "@/components/material/components/materialPackageEditorShared";
import { buildSpaceMaterialPackageEditorValueKey } from "@/components/material/components/materialPackageEditorValueKey";
import {
  useDeleteSpaceMaterialPackageMutation,
  useSpaceMaterialPackagesQuery,
  useUpdateSpaceMaterialPackageMutation,
} from "../../../../../api/hooks/materialPackageQueryHooks";

interface SpaceMaterialSubWindowProps {
  spaceId: number;
  spacePackageId: number | null;
  materialPathKey?: string | null;
  onClearSelection: () => void;
}

function buildDraft(pkg?: SpaceMaterialPackageResponse) {
  return {
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    coverUrl: pkg?.coverUrl ?? "",
    originalCoverUrl: pkg?.originalCoverUrl ?? pkg?.coverUrl ?? "",
    isPublic: false,
    content: (pkg?.content ?? createEmptyMaterialPackageContent()) as MaterialPackageContent,
  };
}

export default function SpaceMaterialSubWindow({
  spaceId,
  spacePackageId,
  materialPathKey,
  onClearSelection,
}: SpaceMaterialSubWindowProps) {
  const pageRequest = useMemo(() => ({
    pageNo: 1,
    pageSize: 100,
    spaceId,
  }), [spaceId]);
  const packagesQuery = useSpaceMaterialPackagesQuery(pageRequest, spaceId > 0);
  const updateMutation = useUpdateSpaceMaterialPackageMutation();
  const deleteMutation = useDeleteSpaceMaterialPackageMutation();
  const packages = useMemo(() => {
    return packagesQuery.data?.data?.list ?? [];
  }, [packagesQuery.data?.data?.list]);
  const selectedPackage = packages.find(item => item.spacePackageId === spacePackageId);

  const handleUpdate = async (draft: {
    name: string;
    description: string;
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
      coverUrl: draft.coverUrl,
      originalCoverUrl: draft.originalCoverUrl,
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
    onClearSelection();
  };

  if (packagesQuery.isLoading && !selectedPackage) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-base-content/60">
        正在加载素材包...
      </div>
    );
  }

  if (!selectedPackage) {
    return (
      <div className="h-full flex items-center justify-center text-base-content/70">
        <div className="max-w-sm text-center px-8">
          <div className="text-base font-semibold">未找到可编辑素材</div>
          <div className="mt-2 text-sm text-base-content/60">
            点击左侧素材包或素材条目，或者把素材拖到此处即可打开编辑。
          </div>
        </div>
      </div>
    );
  }

  return (
    <MaterialPackageEditorInlinePage embedded>
      <MaterialPackageEditor
        valueKey={buildSpaceMaterialPackageEditorValueKey(selectedPackage, "sub-window")}
        dragPackageId={selectedPackage.spacePackageId}
        sidebarActionScope="subwindow"
        showStructureSidebar={false}
        title="编辑局内素材包"
        subtitle={selectedPackage.sourcePackageId
          ? `来源局外素材包：${selectedPackage.sourcePackageId} · 当前空间维护的是独立副本`
          : "这是当前空间直接创建的本地素材包"}
        selectedNodeKey={materialPathKey}
        initialDraft={buildDraft(selectedPackage)}
        autoSave
        savePending={updateMutation.isPending}
        deletePending={deleteMutation.isPending}
        onSave={handleUpdate}
        onDelete={handleDelete}
      />
    </MaterialPackageEditorInlinePage>
  );
}
