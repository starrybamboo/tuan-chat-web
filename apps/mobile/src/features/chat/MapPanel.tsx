import type { LayoutChangeEvent } from "react-native";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import type { StateEventAtom } from "@tuanchat/domain/state-event";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { MOBILE_MESSAGE_ATTACHMENT_KIND, pickMobileMessageAttachments } from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import { useSendRoomMessageMutation } from "@/features/messages/useSendRoomMessageMutation";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { avatarThumbUrl } from "@/lib/media-url";
import { buildCommandStateEventExtra, toApiMessageExtraWithStateEvent } from "@tuanchat/domain/state-event";

import type { RoomDndMapToken } from "./roomDndMap";

import { MapGridOverlay } from "./MapGridOverlay";
import { buildMobileMapStatusRows, buildMobileMapTokenStatusByRoleId, formatMobileMapNumericValue } from "./mapStatusSummary";
import { MapToken } from "./MapToken";
import { getRoomDndMapImageUrl, useRoomDndMapMutations, useRoomDndMapQuery } from "./roomDndMap";
import { useContainedImageRect } from "./useContainedImageRect";
import { useRoomStateRuntime } from "./useRoomStateRuntime";

const EMPTY_MAP_TOKENS: RoomDndMapToken[] = [];

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: Spacing.lg,
  },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  gridSettings: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  hpText: { flexShrink: 0 },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    textAlign: "center",
    width: 52,
  },
  mapContainer: { borderRadius: Radius.lg, overflow: "hidden", width: "100%" },
  roleAvatarGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  section: { gap: Spacing.sm },
  sectionLabel: { fontSize: 12 },
  statusBar: {
    gap: Spacing.sm,
  },
  statusChip: {
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.xs,
    minWidth: 124,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  statusChipHeader: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  statusChipMeta: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  statusList: { gap: Spacing.sm },
  statusName: { flex: 1, minWidth: 0 },
  statusTags: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  statusTag: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  title: { fontSize: 16, fontWeight: "600", marginBottom: Spacing.md },
});
type MapPanelProps = {
  currentRoleId: number | null;
  isKP: boolean;
  messages: Message[];
  roomId: number | null;
  roomRoles: UserRole[];
  ruleId: number | null | undefined;
};

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function computeTokenSize(rectWidth: number, rectHeight: number, gridCols: number, gridRows: number): number {
  if (rectWidth <= 0 || rectHeight <= 0) {
    return 28;
  }
  const cellWidth = rectWidth / gridCols;
  const cellHeight = rectHeight / gridRows;
  const size = Math.min(cellWidth, cellHeight) * 0.78;
  return Math.max(12, Math.min(32, Math.floor(size)));
}

function resolveGridCell(
  locationX: number,
  locationY: number,
  rectLeft: number,
  rectTop: number,
  rectWidth: number,
  rectHeight: number,
  gridRows: number,
  gridCols: number,
) {
  const relX = locationX - rectLeft;
  const relY = locationY - rectTop;
  if (relX < 0 || relY < 0 || relX > rectWidth || relY > rectHeight) {
    return null;
  }
  const colIndex = Math.min(gridCols - 1, Math.max(0, Math.floor((relX / rectWidth) * gridCols)));
  const rowIndex = Math.min(gridRows - 1, Math.max(0, Math.floor((relY / rectHeight) * gridRows)));
  return { rowIndex, colIndex };
}

function MapStatusBar({
  rows,
}: {
  rows: ReturnType<typeof buildMobileMapStatusRows>;
}) {
  const theme = useTheme();
  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={styles.statusBar}>
      <ThemedText style={styles.sectionLabel} themeColor="textSecondary" type="caption">状态</ThemedText>
      <View style={styles.statusList}>
        {rows.map(row => (
          <View
            key={row.id}
            style={[styles.statusChip, {
              backgroundColor: row.isPlaced ? theme.accentMuted : theme.surface,
              borderColor: row.isPlaced ? theme.accent : theme.border,
            }]}
          >
            <View style={styles.statusChipHeader}>
              <ThemedText numberOfLines={1} style={styles.statusName} type="smallBold">{row.name}</ThemedText>
              {row.isPlaced
                ? (
                    <ThemedText themeColor="accent" type="caption">已落位</ThemedText>
                  )
                : null}
            </View>
            <View style={styles.statusChipMeta}>
              {row.initiative != null
                ? (
                    <ThemedText themeColor="textSecondary" type="caption">
                      先攻
                      {" "}
                      {formatMobileMapNumericValue(row.initiative)}
                    </ThemedText>
                  )
                : null}
              {row.hp != null
                ? (
                    <ThemedText style={styles.hpText} themeColor="textSecondary" type="caption">
                      HP
                      {" "}
                      {formatMobileMapNumericValue(row.hp)}
                      {row.maxHp != null ? `/${formatMobileMapNumericValue(row.maxHp)}` : ""}
                    </ThemedText>
                  )
                : null}
            </View>
            {row.activeStateLabels.length > 0
              ? (
                  <View style={styles.statusTags}>
                    {row.activeStateLabels.map((label, index) => (
                      <View key={`${row.id}:${label}:${index}`} style={[styles.statusTag, { backgroundColor: theme.accentMuted }]}>
                        <ThemedText themeColor="accent" type="caption">{label}</ThemedText>
                      </View>
                    ))}
                  </View>
                )
              : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export function MapPanel({ currentRoleId, isKP, messages, roomId, roomRoles, ruleId }: MapPanelProps) {
  const theme = useTheme();
  const roomDndMapQuery = useRoomDndMapQuery(roomId);
  const {
    clearMapMutation,
    upsertMapMutation,
  } = useRoomDndMapMutations(roomId);
  const sendRoomMessageMutation = useSendRoomMessageMutation(roomId);
  const runtime = useRoomStateRuntime({
    currentRoleId,
    messages,
    roomRoles,
    ruleId,
  });

  const map = roomDndMapQuery.data;
  const mapImageUrl = getRoomDndMapImageUrl(map);
  const [gridRowsInput, setGridRowsInput] = useState("");
  const [gridColsInput, setGridColsInput] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [containerLayout, setContainerLayout] = useState({ width: 0, height: 0 });
  const gridRowsRef = useRef<TextInput>(null);
  const gridColsRef = useRef<TextInput>(null);

  const resolvedGridRows = parsePositiveInt(gridRowsInput, map?.gridRows ?? 10);
  const resolvedGridCols = parsePositiveInt(gridColsInput, map?.gridCols ?? 10);
  const resolvedGridColor = map?.gridColor ?? "#808080";

  const mapContainerHeight = Math.min(containerLayout.width * 0.75, 300);

  const imageRect = useContainedImageRect(
    mapImageUrl ?? "",
    containerLayout.width,
    mapContainerHeight,
  );
  const tokens = useMemo(() => {
    return runtime.hasMapState ? runtime.mapTokens : map?.tokens ?? EMPTY_MAP_TOKENS;
  }, [map?.tokens, runtime.hasMapState, runtime.mapTokens]);
  const statusRows = useMemo(() => {
    return buildMobileMapStatusRows({
      roomRoles,
      runtime,
      tokens,
    });
  }, [roomRoles, runtime, tokens]);
  const tokenStatusByRoleId = useMemo(() => {
    return buildMobileMapTokenStatusByRoleId(statusRows);
  }, [statusRows]);

  const tokenSize = useMemo(
    () => computeTokenSize(imageRect.width, imageRect.height, resolvedGridCols, resolvedGridRows),
    [imageRect.width, imageRect.height, resolvedGridCols, resolvedGridRows],
  );

  const tokenByCellKey = useMemo(() => {
    const map = new Map<string, typeof tokens[number]>();
    tokens.forEach(token => map.set(`${token.rowIndex}:${token.colIndex}`, token));
    return map;
  }, [tokens]);

  const unplacedRoles = useMemo(() => {
    const placedRoleIds = new Set(tokens.map(token => token.roleId));
    return roomRoles.filter(role => role.state !== 1 && !placedRoleIds.has(role.roleId));
  }, [roomRoles, tokens]);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerLayout({ width, height });
  }, []);
  const sendMapStateEvents = useCallback(async (events: StateEventAtom[], content: string) => {
    if (!roomId || roomId <= 0) {
      return;
    }
    try {
      await sendRoomMessageMutation.sendRequest({
        roomId,
        messageType: MESSAGE_TYPE.STATE_EVENT,
        content,
        roleId: currentRoleId ?? -1,
        extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("combat", events)),
      });
    }
    catch (error) {
      Alert.alert("地图事件发送失败", error instanceof Error ? error.message : "请稍后重试。");
    }
  }, [currentRoleId, roomId, sendRoomMessageMutation]);

  const handleImageGridPress = useCallback((event: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (selectedRoleId == null || imageRect.width <= 0) {
      return;
    }
    const cell = resolveGridCell(
      event.nativeEvent.locationX,
      event.nativeEvent.locationY,
      0,
      0,
      imageRect.width,
      imageRect.height,
      resolvedGridRows,
      resolvedGridCols,
    );
    if (!cell) {
      return;
    }
    const occupant = tokenByCellKey.get(`${cell.rowIndex}:${cell.colIndex}`);
    const events: StateEventAtom[] = [];
    if (occupant && occupant.roleId !== selectedRoleId) {
      events.push({
        type: "mapTokenRemove",
        roleId: occupant.roleId,
      });
    }
    events.push({
      type: "mapTokenUpsert",
      roleId: selectedRoleId,
      rowIndex: cell.rowIndex,
      colIndex: cell.colIndex,
    });
    void sendMapStateEvents(events, ".combat map-move");
    setSelectedRoleId(null);
  }, [selectedRoleId, imageRect.width, imageRect.height, resolvedGridRows, resolvedGridCols, tokenByCellKey, sendMapStateEvents]);

  const handleTokenPress = useCallback((roleId: number) => {
    if (!isKP)
      return;
    setSelectedRoleId((prev) => {
      return prev === roleId ? null : roleId;
    });
  }, [isKP]);

  const handleUnplacedRolePress = useCallback((roleId: number) => {
    if (!isKP)
      return;
    setSelectedRoleId((prev) => {
      return prev === roleId ? null : roleId;
    });
  }, [isKP]);

  const handleUploadMap = async () => {
    try {
      const [picked] = await pickMobileMessageAttachments(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE);
      if (!picked) {
        return;
      }
      const uploaded = await uploadMobileMessageAttachments(mobileApiClient, [picked]);
      const [image] = uploaded.uploadedImages;
      if (!image) {
        throw new Error("地图上传失败。");
      }
      await upsertMapMutation.mutateAsync({
        clearTokens: true,
        gridColor: resolvedGridColor,
        gridCols: resolvedGridCols,
        gridRows: resolvedGridRows,
        mapFileId: image.fileId,
      });
      const clearTokenEvents: StateEventAtom[] = tokens.map(token => ({
        type: "mapTokenRemove",
        roleId: token.roleId,
      }));
      if (clearTokenEvents.length > 0) {
        await sendMapStateEvents(clearTokenEvents, ".combat map-clear");
      }
    }
    catch (error) {
      Alert.alert("地图上传失败", error instanceof Error ? error.message : "请稍后重试。");
    }
  };

  const saveGridSettings = useCallback((rows: number, cols: number, color: string) => {
    if (!map?.mapFileId)
      return;
    void upsertMapMutation.mutateAsync({
      gridColor: color,
      gridCols: cols,
      gridRows: rows,
      mapFileId: map.mapFileId,
    });
  }, [map?.mapFileId, upsertMapMutation]);

  const handleGridRowsBlur = useCallback(() => {
    if (!gridRowsInput)
      return;
    saveGridSettings(resolvedGridRows, resolvedGridCols, resolvedGridColor);
  }, [gridRowsInput, resolvedGridRows, resolvedGridCols, resolvedGridColor, saveGridSettings]);

  const handleGridColsBlur = useCallback(() => {
    if (!gridColsInput)
      return;
    saveGridSettings(resolvedGridRows, resolvedGridCols, resolvedGridColor);
  }, [gridColsInput, resolvedGridRows, resolvedGridCols, resolvedGridColor, saveGridSettings]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ThemedText style={styles.title}>地图</ThemedText>

      <View style={styles.section}>
        <View
          onLayout={handleContainerLayout}
          style={[styles.mapContainer, { backgroundColor: theme.backgroundElement, height: mapContainerHeight }]}
        >
          {mapImageUrl
            ? (
                <>
                  <CachedImage
                    uri={mapImageUrl}
                    contentFit="contain"
                    style={StyleSheet.absoluteFill}
                  />
                  {imageRect.width > 0 && (
                    <View style={{ position: "absolute", left: imageRect.left, top: imageRect.top }}>
                      <MapGridOverlay
                        width={imageRect.width}
                        height={imageRect.height}
                        gridRows={resolvedGridRows}
                        gridCols={resolvedGridCols}
                        gridColor={resolvedGridColor}
                      />
                      <Pressable
                        onPress={handleImageGridPress}
                        style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                      />
                      {tokens.map((token) => {
                        const role = roomRoles.find(r => r.roleId === token.roleId);
                        const tokenStatus = tokenStatusByRoleId[token.roleId];
                        const left = ((token.colIndex + 0.5) / resolvedGridCols) * imageRect.width - tokenSize / 2;
                        const top = ((token.rowIndex + 0.5) / resolvedGridRows) * imageRect.height - tokenSize / 2;
                        return (
                          <View key={token.roleId} style={{ position: "absolute", left, top, zIndex: 2 }}>
                            <MapToken
                              avatarUrl={role?.avatarFileId ? avatarThumbUrl(role.avatarFileId) : null}
                              hasStatus={Boolean(tokenStatus)}
                              isSelected={selectedRoleId === token.roleId}
                              name={role?.roleName?.trim() || `#${token.roleId}`}
                              onPress={() => handleTokenPress(token.roleId)}
                              size={tokenSize}
                              statusText={tokenStatus?.text}
                            />
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              )
            : (
                <Pressable onPress={() => void handleUploadMap()} style={{ flex: 1 }}>
                  <View style={{ alignItems: "center", borderColor: theme.border, borderRadius: Radius.md, borderStyle: "dashed", borderWidth: 1.5, flex: 1, justifyContent: "center", margin: Spacing.lg }}>
                    <ThemedText themeColor="textSecondary" type="smallBold">+ 上传地图</ThemedText>
                  </View>
                </Pressable>
              )}
        </View>
        {mapImageUrl
          ? (
              <View style={styles.buttonRow}>
                <Pressable onPress={() => void handleUploadMap()} style={[styles.button, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <ThemedText type="smallBold">更换地图</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Alert.alert("清空地图", "确定清空当前地图和所有角色落位吗？", [
                      { text: "取消", style: "cancel" },
                      {
                        text: "清空",
                        style: "destructive",
                        onPress: () => {
                          void clearMapMutation.mutateAsync();
                          const clearTokenEvents: StateEventAtom[] = tokens.map(token => ({
                            type: "mapTokenRemove",
                            roleId: token.roleId,
                          }));
                          if (clearTokenEvents.length > 0) {
                            void sendMapStateEvents(clearTokenEvents, ".combat map-clear");
                          }
                          setSelectedRoleId(null);
                        },
                      },
                    ]);
                  }}
                  style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.danger }]}
                >
                  <ThemedText style={{ color: theme.danger }} type="smallBold">清空</ThemedText>
                </Pressable>
              </View>
            )
          : null}

        {isKP && (
          <View style={styles.gridSettings}>
            <TextInput
              ref={gridRowsRef}
              keyboardType="number-pad"
              onBlur={handleGridRowsBlur}
              onChangeText={setGridRowsInput}
              placeholder={String(map?.gridRows ?? 10)}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
              value={gridRowsInput}
            />
            <ThemedText themeColor="textSecondary" type="caption">x</ThemedText>
            <TextInput
              ref={gridColsRef}
              keyboardType="number-pad"
              onBlur={handleGridColsBlur}
              onChangeText={setGridColsInput}
              placeholder={String(map?.gridCols ?? 10)}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
              value={gridColsInput}
            />
          </View>
        )}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel} themeColor="textSecondary" type="caption">
            {selectedRoleId ? "点击地图放置" : "角色"}
          </ThemedText>
          <View style={styles.roleAvatarGrid}>
            {unplacedRoles.map(role => (
              <Pressable
                key={role.roleId}
                onPress={() => handleUnplacedRolePress(role.roleId)}
              >
                <View style={{
                  borderColor: selectedRoleId === role.roleId ? theme.accent : "transparent",
                  borderRadius: 999,
                  borderWidth: 2,
                  height: 36,
                  overflow: "hidden",
                  width: 36,
                }}
                >
                  {role.avatarFileId
                    ? (
                        <CachedImage uri={avatarThumbUrl(role.avatarFileId)} style={{ height: 32, width: 32, borderRadius: 999 }} />
                      )
                    : (
                        <View style={{ alignItems: "center", backgroundColor: theme.backgroundElement, borderRadius: 999, height: 32, justifyContent: "center", width: 32 }}>
                          <ThemedText type="caption">{(role.roleName ?? "#").charAt(0)}</ThemedText>
                        </View>
                      )}
                </View>
              </Pressable>
            ))}
            {tokens.map((token) => {
              const role = roomRoles.find(r => r.roleId === token.roleId);
              return (
                <Pressable
                  key={token.roleId}
                  onLongPress={() => {
                    Alert.alert("移除角色", `确定将${role?.roleName ?? "该角色"}从地图移除吗？`, [
                      { text: "取消", style: "cancel" },
                      {
                        text: "移除",
                        style: "destructive",
                        onPress: () => {
                          const events: StateEventAtom[] = [{
                            type: "mapTokenRemove",
                            roleId: token.roleId,
                          }];
                          void sendMapStateEvents(events, ".combat map-remove");
                          if (selectedRoleId === token.roleId) {
                            setSelectedRoleId(null);
                          }
                        },
                      },
                    ]);
                  }}
                  onPress={() => handleTokenPress(token.roleId)}
                >
                  <View style={{
                    borderColor: selectedRoleId === token.roleId ? theme.accent : theme.border,
                    borderRadius: 999,
                    borderWidth: 2,
                    height: 36,
                    overflow: "hidden",
                    width: 36,
                  }}
                  >
                    {role?.avatarFileId
                      ? (
                          <CachedImage uri={avatarThumbUrl(role.avatarFileId)} style={{ height: 32, width: 32, borderRadius: 999 }} />
                        )
                      : (
                          <View style={{ alignItems: "center", backgroundColor: theme.backgroundElement, borderRadius: 999, height: 32, justifyContent: "center", width: 32 }}>
                            <ThemedText type="caption">{(role?.roleName ?? "#").charAt(0)}</ThemedText>
                          </View>
                        )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <MapStatusBar rows={statusRows} />
      </View>
    </ScrollView>
  );
}
