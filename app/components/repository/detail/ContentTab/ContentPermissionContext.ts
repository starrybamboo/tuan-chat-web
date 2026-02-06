import { createContext, use } from "react";

export type ContentPermission = "player" | "kp";

export const ContentPermissionContext = createContext<ContentPermission>("player");

export function useContentPermission(): ContentPermission {
  return use(ContentPermissionContext);
}
