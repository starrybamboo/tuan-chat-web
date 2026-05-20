import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { CombatPanel } from "./CombatPanel";
import { MapPanel } from "./MapPanel";
import { MobileCluePanel } from "./MobileCluePanel";

type TabKey = "map" | "combat" | "clues";

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  tab: {
    alignItems: "center",
    flex: 1,
    paddingVertical: Spacing.md,
  },
});

type RightDrawerPanelProps = {
  clueRooms: Room[];
  currentUserId: number | null;
  currentRoleId: number | null;
  isKP: boolean;
  isStateCommandMode: boolean;
  messages: Message[];
  onAdvanceTurn: () => void;
  onClose: () => void;
  onEnterStateCommandMode: () => void;
  roomId: number | null;
  roomRoles: UserRole[];
  ruleId: number | null | undefined;
  spaceId: number | null;
};

export function RightDrawerPanel({
  clueRooms,
  currentUserId,
  currentRoleId,
  isKP,
  isStateCommandMode,
  messages,
  onAdvanceTurn,
  onClose: _onClose,
  onEnterStateCommandMode,
  roomId,
  roomRoles,
  ruleId,
  spaceId,
}: RightDrawerPanelProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>("clues");

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.content}>
        {activeTab === "map" && (
          <MapPanel
            currentRoleId={currentRoleId}
            isKP={isKP}
            messages={messages}
            roomId={roomId}
            roomRoles={roomRoles}
            ruleId={ruleId}
          />
        )}
        {activeTab === "combat" && (
          <CombatPanel
            currentRoleId={currentRoleId}
            isStateCommandMode={isStateCommandMode}
            messages={messages}
            onAdvanceTurn={onAdvanceTurn}
            onEnterStateCommandMode={onEnterStateCommandMode}
            roomRoles={roomRoles}
            ruleId={ruleId}
          />
        )}
        {activeTab === "clues" && (
          <MobileCluePanel
            clueRooms={clueRooms}
            currentUserId={currentUserId}
            currentRoleId={currentRoleId}
            currentRoomId={roomId}
            isKP={isKP}
            spaceId={spaceId}
          />
        )}
      </View>

      <View style={[styles.tabBar, { borderTopColor: theme.border }]}>
        <Pressable style={styles.tab} onPress={() => setActiveTab("clues")}>
          <ThemedText
            type="smallBold"
            themeColor={activeTab === "clues" ? "accent" : "textSecondary"}
          >
            线索
          </ThemedText>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => setActiveTab("combat")}>
          <ThemedText
            type="smallBold"
            themeColor={activeTab === "combat" ? "accent" : "textSecondary"}
          >
            战斗
          </ThemedText>
        </Pressable>
        <Pressable style={styles.tab} onPress={() => setActiveTab("map")}>
          <ThemedText
            type="smallBold"
            themeColor={activeTab === "map" ? "accent" : "textSecondary"}
          >
            地图
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}
