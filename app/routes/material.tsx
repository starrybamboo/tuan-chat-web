import type { Route } from "./+types/material";
import { useSearchParams } from "react-router";
import MaterialLibraryPage from "@/components/material/pages/materialLibraryPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "素材库",
    description: "管理和浏览团剧共创中的局外素材库。",
    path: "/material",
    index: false,
  });
}

export default function MaterialRoute() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const initialTab = tab === "public" || tab === "mine" ? tab : undefined;

  return (
    <div className="h-full overflow-hidden bg-base-200">
      <MaterialLibraryPage initialTab={initialTab} />
    </div>
  );
}
