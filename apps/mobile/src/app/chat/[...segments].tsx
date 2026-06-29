import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useAuthSession } from "@/features/auth/auth-session";
import { resolveMobileNotificationRoute } from "@/features/notifications/mobile-notification-routing";
import { logNotificationTrace, logNotificationTraceError } from "@/features/notifications/notificationTrace";
import { mobileApiClient } from "@/lib/api";

const styles = StyleSheet.create({
  splash: { alignItems: "center", backgroundColor: "#0d1117", flex: 1, gap: 12, justifyContent: "center" },
});

function parsePositiveInteger(value: string | undefined): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readSegments(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map(item => item.trim()).filter(Boolean);
  }
  return typeof value === "string" && value.trim() ? [value.trim()] : [];
}

function getRoomOnlyDeepLinkRoomId(targetPath: string) {
  const segments = targetPath.split(/[?#]/, 1)[0]?.split("/").filter(Boolean) ?? [];
  if (segments[0] !== "chat" || segments[1] !== "room") {
    return null;
  }
  return parsePositiveInteger(segments[2]);
}

function buildChatTargetPath(segments: string[]) {
  return segments.length > 0 ? `/chat/${segments.map(encodeURIComponent).join("/")}` : "/chat";
}

export default function ChatDeepLinkRedirect() {
  const searchParams = useLocalSearchParams();
  const { isBootstrapping } = useAuthSession();
  const targetPath = useMemo(() => buildChatTargetPath(readSegments(searchParams.segments as string | string[] | undefined)), [searchParams.segments]);
  const roomOnlyTargetRoomId = useMemo(() => getRoomOnlyDeepLinkRoomId(targetPath), [targetPath]);
  const fallbackHref = useMemo(() => resolveMobileNotificationRoute({ targetPath }) ?? "/(tabs)", [targetPath]);
  const [resolvedTarget, setResolvedTarget] = useState<{ href: string; targetPath: string } | null>(null);
  const resolvedHref = resolvedTarget?.targetPath === targetPath ? resolvedTarget.href : null;

  useEffect(() => {
    let disposed = false;

    if (!roomOnlyTargetRoomId) {
      return () => {
        disposed = true;
      };
    }

    if (isBootstrapping) {
      return () => {
        disposed = true;
      };
    }

    void (async () => {
      try {
        logNotificationTrace("deeplink.room.resolve.start", {
          roomId: roomOnlyTargetRoomId,
          targetPath,
        });
        const roomResponse = await mobileApiClient.roomController.getRoomInfo(roomOnlyTargetRoomId);
        const spaceId = roomResponse.data?.spaceId;
        const href = typeof spaceId === "number" && Number.isInteger(spaceId) && spaceId > 0
          ? `/(tabs)?spaceId=${spaceId}&roomId=${roomOnlyTargetRoomId}`
          : `/(tabs)?roomId=${roomOnlyTargetRoomId}`;
        logNotificationTrace("deeplink.room.resolve.done", {
          href,
          roomId: roomOnlyTargetRoomId,
          spaceId: spaceId ?? null,
        });
        if (!disposed) {
          setResolvedTarget({ href, targetPath });
        }
      }
      catch (error) {
        logNotificationTraceError("deeplink.room.resolve.error", error, {
          roomId: roomOnlyTargetRoomId,
          targetPath,
        });
        if (!disposed) {
          setResolvedTarget({ href: `/(tabs)?roomId=${roomOnlyTargetRoomId}`, targetPath });
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [fallbackHref, isBootstrapping, roomOnlyTargetRoomId, targetPath]);

  if (!roomOnlyTargetRoomId) {
    return <Redirect href={fallbackHref as any} />;
  }

  if (resolvedHref) {
    return <Redirect href={resolvedHref as any} />;
  }

  return (
    <View style={styles.splash}>
      <ActivityIndicator color="#58a6ff" />
      <ThemedText themeColor="textSecondary">正在打开聊天…</ThemedText>
    </View>
  );
}
