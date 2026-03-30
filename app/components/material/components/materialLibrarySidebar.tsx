import MaterialPackageLibrarySidebar from "./materialPackageLibrarySidebar";

type MaterialLibrarySidebarProps = {
  activeTab: "public" | "mine";
  onSelectTab: (tab: "public" | "mine") => void;
};

export default function MaterialLibrarySidebar({
  activeTab,
  onSelectTab,
}: MaterialLibrarySidebarProps) {
  return (
    <MaterialPackageLibrarySidebar
      description="在这里切换素材广场与我的素材包。"
      items={[
        {
          key: "public",
          label: "素材广场",
          icon: "squares",
          active: activeTab === "public",
          onClick: () => onSelectTab("public"),
        },
        {
          key: "mine",
          label: "我的素材包",
          icon: "package",
          active: activeTab === "mine",
          onClick: () => onSelectTab("mine"),
        },
      ]}
      footerDescription={activeTab === "mine"
        ? "你可以新建、编辑、删除自己的素材包。"
        : "这里展示公开的素材包，默认以只读方式查看。"}
    />
  );
}
