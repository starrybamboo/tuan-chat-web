import { Redirect, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";

import { resolveMobileNotificationRoute } from "@/features/notifications/mobile-notification-routing";

function readSegments(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map(item => item.trim()).filter(Boolean);
  }
  return typeof value === "string" && value.trim() ? [value.trim()] : [];
}

function buildChatTargetPath(segments: string[]) {
  return segments.length > 0 ? `/chat/${segments.map(encodeURIComponent).join("/")}` : "/chat";
}

export default function ChatDeepLinkRedirect() {
  const searchParams = useLocalSearchParams<{ segments?: string | string[] }>();
  const targetPath = useMemo(() => buildChatTargetPath(readSegments(searchParams.segments)), [searchParams.segments]);
  const href = useMemo(() => resolveMobileNotificationRoute({ targetPath }) ?? "/(tabs)", [targetPath]);

  return <Redirect href={href} />;
}
