import MaterialPackageLibrarySidebar from "./materialPackageLibrarySidebar";

interface SpaceMaterialLibrarySidebarProps {
  spaceId: number;
  onNavigateToPublic: () => void;
  onNavigateToMine: () => void;
}

export default function SpaceMaterialLibrarySidebar({
  spaceId,
  onNavigateToPublic,
  onNavigateToMine,
}: SpaceMaterialLibrarySidebarProps) {
  return (
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
          onClick: onNavigateToPublic,
        },
        {
          key: "mine",
          label: "我的素材包",
          icon: "package",
          onClick: onNavigateToMine,
        },
      ]}
      footerDescription="当前页面展示的是当前空间的本地素材包副本区，可以像管理本地仓库一样组织和编辑素材。"
    />
  );
}
