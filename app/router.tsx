import { QueryClientProvider } from "@tanstack/react-query";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import RootApp, {
  ErrorBoundary as RootErrorBoundary,
} from "@/root";
import { queryClient } from "@/queryClient";
import BlocksuiteFrameRoute, { meta as blocksuiteFrameMeta } from "@/routes/blocksuiteFrame";
import ChatDiscoverMaterialMyRoute, { meta as chatDiscoverMaterialMyMeta } from "@/routes/chatDiscoverMaterialMy";
import ChatDiscoverMaterialRoute, { meta as chatDiscoverMaterialMeta } from "@/routes/chatDiscoverMaterial";
import ChatDiscoverMyRoute, { meta as chatDiscoverMyMeta } from "@/routes/chatDiscoverMy";
import ChatDiscoverRoute, { meta as chatDiscoverMeta } from "@/routes/chatDiscover";
import ChatDocRoute from "@/routes/chatDoc";
import ChatIndexRoute from "@/routes/chat";
import ChatLayoutRoute, { meta as chatLayoutMeta } from "@/routes/chatLayout";
import ChatRoomSettingRoute from "@/routes/chatRoomSetting";
import ChatSpaceRoute from "@/routes/chatSpace";
import CollectionRoute, { meta as collectionMeta } from "@/routes/collection";
import DashBoardRoute, { meta as dashBoardMeta } from "@/routes/dashBoard";
import DocRoute, { meta as docMeta } from "@/routes/doc";
import FeedbackRoute, { meta as feedbackMeta } from "@/routes/feedback";
import HomeRoute, { meta as homeMeta } from "@/routes/home";
import InviteRoute from "@/routes/invite";
import LoginRoute, { meta as loginMeta } from "@/routes/login";
import MaterialRoute, { meta as materialMeta } from "@/routes/material";
import NotificationsRoute, { meta as notificationsMeta } from "@/routes/notifications";
import ProfileHomeRoute, { meta as profileHomeMeta } from "@/routes/profile/homeTab";
import ProfileLayoutRoute, { meta as profileLayoutMeta } from "@/routes/profile/profile";
import ProfileWorksRoute, { meta as profileWorksMeta } from "@/routes/profile/profileWorks";
import RepositoryCommitChainRoute, { meta as repositoryCommitChainMeta } from "@/routes/repository/commitChain";
import RepositoryCreateRoute, { meta as repositoryCreateMeta } from "@/routes/repository/create";
import RepositoryDetailRoute, {
  clientLoader as repositoryDetailLoader,
  meta as repositoryDetailMeta,
} from "@/routes/repository/detail";
import RepositoryIndexRoute, { meta as repositoryIndexMeta } from "@/routes/repository/index";
import ResourceRoute, { meta as resourceMeta } from "@/routes/resource";
import RoleEntryRoute from "@/routes/role/entry";
import RoleDetailRoute from "@/routes/role/roleId";
import RoleLayoutRoute, { meta as roleLayoutMeta } from "@/routes/role";
import RoomMapFrameRoute from "@/routes/roomMapFrame";
import ScrollSequenceDemoRoute, { meta as scrollSequenceDemoMeta } from "@/routes/scrollSequenceDemo";
import ScrollSequenceMotionDemoRoute, { meta as scrollSequenceMotionDemoMeta } from "@/routes/scrollSequenceMotionDemo";
import SettingsRoute, { meta as settingsMeta } from "@/routes/settings";
import SpaceMaterialRoute, { meta as spaceMaterialMeta } from "@/routes/spaceMaterial";
import AiImageRoute from "@/routes/aiImage";
import { isDevOrTestEnvironment } from "@/utils/runtimeEnvironment";

function AppDocument() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootApp />
      {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-right" /> : null}
    </QueryClientProvider>
  );
}

const ENABLE_AI_IMAGE_ROUTE = isDevOrTestEnvironment({
  isDev: import.meta.env.DEV,
  mode: import.meta.env.MODE,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
});

const ENABLE_FEEDBACK_ROUTE = import.meta.env.DEV || import.meta.env.MODE === "test";

const rootRoute = createRootRoute({
  component: AppDocument,
  errorComponent: (props) => <RootErrorBoundary error={props.error as Error} params={{}} />,
});

const blocksuiteFrameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "blocksuite-frame",
  component: BlocksuiteFrameRoute,
});

const roomMapFrameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "room-map/$spaceId/$roomId",
  component: RoomMapFrameRoute,
});

const scrollSequenceDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "scroll-sequence-demo",
  component: ScrollSequenceDemoRoute,
});

const scrollSequenceMotionDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "scroll-sequence-motion-demo",
  component: ScrollSequenceMotionDemoRoute,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "login",
  component: LoginRoute,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "dashboard-layout",
  component: DashBoardRoute,
});

const homeRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "/",
  component: HomeRoute,
});

const roleLayoutRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "role",
  component: RoleLayoutRoute,
});

const roleEntryRoute = createRoute({
  getParentRoute: () => roleLayoutRoute,
  path: "/",
  component: RoleEntryRoute,
});

const roleDetailRoute = createRoute({
  getParentRoute: () => roleLayoutRoute,
  path: "{-$roleId}",
  component: RoleDetailRoute,
});

const profileLayoutRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "profile/$userId",
  component: ProfileLayoutRoute,
});

const profileHomeRoute = createRoute({
  getParentRoute: () => profileLayoutRoute,
  path: "/",
  component: ProfileHomeRoute,
});

const profileWorksRoute = createRoute({
  getParentRoute: () => profileLayoutRoute,
  path: "works",
  component: ProfileWorksRoute as any,
});

const repositoryIndexRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "repository",
  component: RepositoryIndexRoute,
});

const repositoryDetailRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "repository/detail/{-$id}",
  component: RepositoryDetailRoute,
  loader: ({ params }) => repositoryDetailLoader({ params } as never),
});

const repositoryCommitChainRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "repository/commit-chain/{-$id}",
  component: RepositoryCommitChainRoute,
});

const repositoryCreateRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "repository/create",
  component: RepositoryCreateRoute,
});

const chatBaseRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "chat",
});

const chatDiscoverMyRoute = createRoute({
  getParentRoute: () => chatBaseRoute,
  path: "discover/my",
  component: ChatDiscoverMyRoute,
});

const chatDiscoverMaterialMyRoute = createRoute({
  getParentRoute: () => chatBaseRoute,
  path: "discover/material/my",
  component: ChatDiscoverMaterialMyRoute,
});

const chatDiscoverMaterialRoute = createRoute({
  getParentRoute: () => chatBaseRoute,
  path: "discover/material",
  component: ChatDiscoverMaterialRoute,
});

const chatDiscoverRoute = createRoute({
  getParentRoute: () => chatBaseRoute,
  path: "discover",
  component: ChatDiscoverRoute,
});

const chatLayoutRoute = createRoute({
  getParentRoute: () => chatBaseRoute,
  id: "chat-layout",
  component: ChatLayoutRoute,
});

const chatIndexRoute = createRoute({
  getParentRoute: () => chatLayoutRoute,
  path: "/",
  component: ChatIndexRoute,
});

const chatDocRoute = createRoute({
  getParentRoute: () => chatLayoutRoute,
  path: "$spaceId/doc/$docId",
  component: ChatDocRoute,
});

const chatRoomSettingRoute = createRoute({
  getParentRoute: () => chatLayoutRoute,
  path: "$spaceId/$roomId/setting",
  component: ChatRoomSettingRoute,
});

const chatSpaceRoute = createRoute({
  getParentRoute: () => chatLayoutRoute,
  path: "$spaceId/{-$roomId}/{-$messageId}",
  component: ChatSpaceRoute,
});

const settingsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "settings",
  component: SettingsRoute,
});

const notificationsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "notifications",
  component: NotificationsRoute,
});

const collectionRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "collection",
  component: CollectionRoute,
});

const materialRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "material",
  component: MaterialRoute,
});

const spaceMaterialRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "material/space/$spaceId",
  component: SpaceMaterialRoute as any,
});

const resourceRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "resource",
  component: ResourceRoute,
});

const docRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "doc/$spaceId/$docId",
  component: DocRoute,
});

const inviteRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "invite/$code",
  component: InviteRoute,
});

const feedbackRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "feedback/{-$issueId}",
  component: FeedbackRoute,
});

const aiImageRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "ai-image",
  component: AiImageRoute,
});

const dashboardChildren = [
  homeRoute,
  roleLayoutRoute.addChildren([roleEntryRoute, roleDetailRoute]),
  profileLayoutRoute.addChildren([profileHomeRoute, profileWorksRoute]),
  repositoryIndexRoute,
  repositoryDetailRoute,
  repositoryCommitChainRoute,
  repositoryCreateRoute,
  chatBaseRoute.addChildren([
    chatDiscoverMyRoute,
    chatDiscoverMaterialMyRoute,
    chatDiscoverMaterialRoute,
    chatDiscoverRoute,
    chatLayoutRoute.addChildren([
      chatIndexRoute,
      chatDocRoute,
      chatRoomSettingRoute,
      chatSpaceRoute,
    ]),
  ]),
  settingsRoute,
  notificationsRoute,
  collectionRoute,
  materialRoute,
  spaceMaterialRoute,
  resourceRoute,
  docRoute,
  inviteRoute,
  ...(ENABLE_AI_IMAGE_ROUTE ? [aiImageRoute] : []),
  ...(ENABLE_FEEDBACK_ROUTE ? [feedbackRoute] : []),
];

const routeTree = rootRoute.addChildren([
  blocksuiteFrameRoute,
  roomMapFrameRoute,
  scrollSequenceDemoRoute,
  scrollSequenceMotionDemoRoute,
  loginRoute,
  dashboardRoute.addChildren(dashboardChildren),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}
