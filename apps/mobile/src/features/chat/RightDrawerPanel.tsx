import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { memo, useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { RoomStateRuntimeValue } from "./useRoomStateRuntime";

import { CombatPanel } from "./CombatPanel";
import { MapPanel } from "./MapPanel";
import { MobileCluePanel } from "./MobileCluePanel";

export type RightDrawerTabKey = "map" | "combat" | "clues";

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
  activeTab: RightDrawerTabKey;
  clueRooms: Room[];
  currentUserId: number | null;
  currentRoleId: number | null;
  isKP: boolean;
  isSendingCombatRoundEvent: boolean;
  isStateCommandMode: boolean;
  messages: Message[];
  onAdvanceTurn: () => void;
  onClose: () => void;
  onChangeActiveTab: (tab: RightDrawerTabKey) => void;
  onEndCombat: () => void;
  onEnterStateCommandMode: () => void;
  onStartCombat: () => void;
  roomId: number | null;
  roomRoles: UserRole[];
  roomStateRuntime?: RoomStateRuntimeValue;
  ruleId: number | null | undefined;
  spaceId: number | null;
};

function RightDrawerPanelInner({
  activeTab,
  clueRooms,
  currentUserId,
  currentRoleId,
  isKP,
  isSendingCombatRoundEvent,
  isStateCommandMode,
  messages,
  onAdvanceTurn,
  onChangeActiveTab,
  onClose: _onClose,
  onEndCombat,
  onEnterStateCommandMode,
  onStartCombat,
  roomId,
  roomRoles,
  roomStateRuntime,
  ruleId,
  spaceId,
}: RightDrawerPanelProps) {
  const theme = useTheme();
  const handleShowClues = useCallback(() => onChangeActiveTab("clues"), [onChangeActiveTab]);
  const handleShowCombat = useCallback(() => onChangeActiveTab("combat"), [onChangeActiveTab]);
  const handleShowMap = useCallback(() => onChangeActiveTab("map"), [onChangeActiveTab]);

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
            roomStateRuntime={roomStateRuntime}
            ruleId={ruleId}
          />
        )}
        {activeTab === "combat" && (
          <CombatPanel
            currentRoleId={currentRoleId}
            isKP={isKP}
            isSendingCombatRoundEvent={isSendingCombatRoundEvent}
            isStateCommandMode={isStateCommandMode}
            messages={messages}
            onAdvanceTurn={onAdvanceTurn}
            onEndCombat={onEndCombat}
            onEnterStateCommandMode={onEnterStateCommandMode}
            onStartCombat={onStartCombat}
            roomRoles={roomRoles}
            roomStateRuntime={roomStateRuntime}
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
        <Pressable style={styles.tab} onPress={handleShowClues}>
          <ThemedText
            type="smallBold"
            themeColor={activeTab === "clues" ? "accent" : "textSecondary"}
          >
            线索
          </ThemedText>
        </Pressable>
        <Pressable style={styles.tab} onPress={handleShowCombat}>
          <ThemedText
            type="smallBold"
            themeColor={activeTab === "combat" ? "accent" : "textSecondary"}
          >
            战斗
          </ThemedText>
        </Pressable>
        <Pressable style={styles.tab} onPress={handleShowMap}>
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

export const RightDrawerPanel = memo(RightDrawerPanelInner);
