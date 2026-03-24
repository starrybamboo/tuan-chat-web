import type { Route } from "./+types/spaceMaterial";
import SpaceMaterialLibraryPage from "@/components/material/pages/spaceMaterialLibraryPage";

export function meta(args: Route.MetaArgs) {
  return [
    { title: `局内素材包 · Space ${args.params.spaceId} - tuan-chat` },
    { name: "description", content: "当前空间的局内素材包管理页" },
  ];
}

export default function SpaceMaterialRoute({ params }: Route.ComponentProps) {
  const spaceId = Number(params.spaceId);
  return (
    <div className="h-full overflow-auto bg-base-200">
      <SpaceMaterialLibraryPage spaceId={Number.isFinite(spaceId) ? spaceId : -1} />
    </div>
  );
}
