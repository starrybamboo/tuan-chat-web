import { QueryClientProvider } from "@tanstack/react-query";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import RootApp, {
  ErrorBoundary as RootErrorBoundary,
} from "@/routes/__root";
import { queryClient } from "@/queryClient";
import BlocksuiteFrameRoute from "@/routes/blocksuiteFrame";
import ChatDiscoverMaterialMyRoute from "@/routes/chat/discover/material/my";
import ChatDiscoverMaterialRoute from "@/routes/chat/discover/material";
import ChatDiscoverMyRoute from "@/routes/chat/discover/my";
import ChatDiscoverRoute from "@/routes/chat/discover";
import ChatDocRoute from "@/routes/chat/doc";
import ChatIndexRoute from "@/routes/chat";
import ChatLayoutRoute from "@/routes/chat/route";
import ChatRoomSettingRoute from "@/routes/chat/room-setting";
import ChatSpaceRoute from "@/routes/chat/space";
import CollectionRoute from "@/routes/collection";
import DashBoardRoute from "@/routes/_dashboard";
import DocRoute from "@/routes/doc";
import FeedbackRoute from "@/routes/feedback";
import HomeRoute from "@/routes/home";
import InviteRoute from "@/routes/invite";
import LoginRoute from "@/routes/login";
import MaterialRoute from "@/routes/material";
import NotificationsRoute from "@/routes/notifications";
import ProfileHomeRoute from "@/routes/profile";
import ProfileLayoutRoute from "@/routes/profile/route";
import ProfileWorksRoute from "@/routes/profile/works";
import RepositoryCommitChainRoute from "@/routes/repository/commit-chain";
import RepositoryCreateRoute from "@/routes/repository/create";
import RepositoryDetailRoute, {
  clientLoader as repositoryDetailLoader,
} from "@/routes/repository/detail";
import RepositoryIndexRoute from "@/routes/repository/index";
import ResourceRoute from "@/routes/resource";
import RoleEntryRoute from "@/routes/role";
import RoleDetailRoute from "@/routes/role/$roleId";
import RoleLayoutRoute from "@/routes/role/route";
import RoomMapFrameRoute from "@/routes/roomMapFrame";
import ScrollSequenceDemoRoute from "@/routes/scrollSequenceDemo";
import ScrollSequenceMotionDemoRoute from "@/routes/scrollSequenceMotionDemo";
import SettingsRoute from "@/routes/settings";
import SpaceMaterialRoute from "@/routes/spaceMaterial";
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
