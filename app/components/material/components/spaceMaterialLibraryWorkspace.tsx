import type { SpaceMaterialPackageResponse } from "../../../../api/models/SpaceMaterialPackageResponse";
import { buildSpaceMaterialPackageCardModel } from "./materialPackageLibraryModels";
import MaterialPackageLibraryWorkspace from "./materialPackageLibraryWorkspace";

interface SpaceMaterialLibraryWorkspaceProps {
  keyword: string;
  packages: SpaceMaterialPackageResponse[];
  loading: boolean;
  onKeywordChange: (value: string) => void;
  onOpenPackage: (spacePackageId: number) => void;
  onCreatePackage: () => void;
  onImportPackage: () => void;
}

export default function SpaceMaterialLibraryWorkspace({
  keyword,
  packages,
  loading,
  onKeywordChange,
  onOpenPackage,
  onCreatePackage,
  onImportPackage,
}: SpaceMaterialLibraryWorkspaceProps) {
  const items = packages.map(buildSpaceMaterialPackageCardModel);

  return (
    <MaterialPackageLibraryWorkspace
      upperLabel="Space Library"
      title="局内素材包"
      description="当前空间的局内素材包会像本地仓库一样管理素材副本，编辑体验与局外素材包保持一致。"
      searchPlaceholder="搜索当前空间的素材包、导入副本或章节内容..."
      keyword={keyword}
      items={items}
      headerActions={[
        {
          key: "import-package",
          label: "从局外导入",
          icon: "package",
          variant: "secondary",
          onClick: onImportPackage,
        },
        {
          key: "create-space-package",
          label: "新建局内素材包",
          icon: "plus",
          variant: "primary",
          onClick: onCreatePackage,
        },
      ]}
      emptyTitle="当前空间还没有局内素材包"
      emptyDescription="你可以先新建一个局内素材包，或者从局外素材库整包导入，把它当作当前空间的本地素材工作区。"
      loading={loading}
      skeletonPrefix="space-material-skeleton"
      onKeywordChange={onKeywordChange}
      onOpenItem={(index) => {
        const item = packages[index];
        if (typeof item?.spacePackageId === "number") {
          onOpenPackage(item.spacePackageId);
        }
      }}
    />
  );
}
