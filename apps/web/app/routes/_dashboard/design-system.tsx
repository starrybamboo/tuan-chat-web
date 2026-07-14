import { createFileRoute } from "@tanstack/react-router";

import { DesignSystemPage } from "@/components/designSystem/DesignSystemPage";
import { requireDevelopmentRoute } from "@/utils/devRouteAccess";
import { createSeoMeta } from "@/utils/seo";

export const Route = createFileRoute("/_dashboard/design-system")({
  beforeLoad: () => requireDevelopmentRoute(import.meta.env.DEV),
  head: () => ({
    meta: createSeoMeta({
      title: "Design System · 团剧共创",
      description: "团剧共创 Web 端 design token 与公共原语开发校验页。",
      path: "/design-system",
      index: false,
    }),
  }),
  component: DesignSystemPage,
});
