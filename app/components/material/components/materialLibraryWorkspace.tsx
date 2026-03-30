import type { MaterialPackageResponse } from "../../../../api/models/MaterialPackageResponse";
import { buildGlobalMaterialPackageCardModel } from "./materialPackageLibraryModels";
import MaterialPackageLibraryWorkspace from "./materialPackageLibraryWorkspace";

type MaterialLibraryWorkspaceProps = {
  activeTab: "public" | "mine";
  keyword: string;
  packages: MaterialPackageResponse[];
  loading: boolean;
  embedded?: boolean;
  onKeywordChange: (value: string) => void;
  onOpenPackage: (packageId: number) => void;
  onCreatePackage: () => void;
  onNavigateToMine?: () => void;
};

export default function MaterialLibraryWorkspace({
  activeTab,
  keyword,
  packages,
  loading,
  embedded = false,
  onKeywordChange,
  onOpenPackage,
  onCreatePackage,
  onNavigateToMine,
}: MaterialLibraryWorkspaceProps) {
  const items = packages.map(item => buildGlobalMaterialPackageCardModel(item, activeTab));

  return (
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
      items={items}
      headerActions={activeTab === "mine"
        ? [{
            key: "create-package",
            label: "新建素材包",
            icon: "plus",
            variant: "primary",
            onClick: onCreatePackage,
          }]
        : []}
      shortcuts={activeTab === "mine"
        ? [{
            key: "create-shortcut",
            title: "创建新的素材包",
            description: "从一个空包开始，逐步整理和沉淀你自己的素材集合。",
            caption: "创建后即可进入编辑",
            icon: "plus",
            onClick: onCreatePackage,
          }]
        : onNavigateToMine
          ? [{
              key: "navigate-to-mine",
              title: "前往我的素材包",
              description: "切换到个人素材区，继续新建、管理和维护你的私有素材库。",
              caption: "适合沉淀你自己的常用内容",
              icon: "package",
              onClick: onNavigateToMine,
            }]
          : []}
      emptyTitle={activeTab === "mine" ? "你还没有自己的素材包" : "当前没有匹配的公开素材包"}
      emptyDescription={activeTab === "mine"
        ? "可以先新建一个素材包，开始组织你的素材与消息模板。"
        : "换个关键词试试，或者稍后再来看看新的公开内容。"}
      loading={loading}
      embedded={embedded}
      skeletonPrefix="material-skeleton"
      onKeywordChange={onKeywordChange}
      onOpenItem={(index) => {
        const item = packages[index];
        if (typeof item?.packageId === "number") {
          onOpenPackage(item.packageId);
        }
      }}
    />
  );
}
