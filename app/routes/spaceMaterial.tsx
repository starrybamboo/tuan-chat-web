import type { Route } from "./+types/spaceMaterial";
import SpaceMaterialLibraryPage from "@/components/material/pages/spaceMaterialLibraryPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(args: Route.MetaArgs) {
  return createSeoMeta({
    title: `空间 ${args.params.spaceId} 的局内素材包`,
    description: "查看当前空间的局内素材包与资源配置。",
    path: `/material/space/${args.params.spaceId}`,
    index: false,
  });
}

export default function SpaceMaterialRoute({ params }: Route.ComponentProps) {
  const spaceId = Number(params.spaceId);
  return (
    <div className="h-full overflow-auto bg-base-200">
      <SpaceMaterialLibraryPage spaceId={Number.isFinite(spaceId) ? spaceId : -1} />
    </div>
  );
}
