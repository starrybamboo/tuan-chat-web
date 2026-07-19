import type { PlatformOSType } from "react-native";

export type MobileKeyboardAvoidanceContext = "modal" | "screen";

export type MobileKeyboardAvoidance = {
  behavior: "height" | "padding" | undefined;
  enabled: boolean;
};

/** Android 普通页面交给 adjustResize；独立 Modal 仍需自己的避让容器。 */
export function resolveMobileKeyboardAvoidance(
  platform: PlatformOSType,
  context: MobileKeyboardAvoidanceContext,
): MobileKeyboardAvoidance {
  if (platform === "ios") {
    return { behavior: "padding", enabled: true };
  }
  if (platform === "android" && context === "modal") {
    return { behavior: "height", enabled: true };
  }
  return { behavior: undefined, enabled: false };
}
