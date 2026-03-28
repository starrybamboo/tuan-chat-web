import type { Route } from "./+types/material";
import { useSearchParams } from "react-router";
import MaterialLibraryPage from "@/components/material/pages/materialLibraryPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "素材包 - tuan-chat" },
    { name: "description", content: "局外素材库与素材广场" },
  ];
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
