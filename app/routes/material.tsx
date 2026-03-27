import type { Route } from "./+types/material";
import MaterialLibraryPage from "@/components/material/pages/materialLibraryPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "素材包 - tuan-chat" },
    { name: "description", content: "局外素材库与素材广场" },
  ];
}

export default function MaterialRoute() {
  return (
    <div className="h-full overflow-auto bg-base-200">
      <MaterialLibraryPage />
    </div>
  );
}
