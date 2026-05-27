import type { LayoutChangeEvent } from "react-native";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { ArrowsOutSimple, X } from "phosphor-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
import { useContainedImageRect, useImageSize } from "./useContainedImageRect";
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
  fullscreenCloseButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "rgba(13, 17, 23, 0.98)",
  },
  fullscreenContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  fullscreenHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  fullscreenHint: {
    marginBottom: Spacing.md,
  },
  fullscreenMapHost: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 260,
  },
  fullscreenMapStage: {
    position: "relative",
  },
  fullscreenRoleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
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
  mapExpandButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  mapExpandButtonWrap: {
    position: "absolute",
    right: Spacing.sm,
    top: Spacing.sm,
    zIndex: 3,
  },
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

function computeTokenSize(rectWidth: number, rectHeight: number, gridCols: number, gridRows: number, maxSize = 32): number {
  if (rectWidth <= 0 || rectHeight <= 0) {
    return 28;
  }
  const cellWidth = rectWidth / gridCols;
  const cellHeight = rectHeight / gridRows;
  const size = Math.min(cellWidth, cellHeight) * 0.78;
  return Math.max(12, Math.min(maxSize, Math.floor(size)));
}

function computeFullscreenMapSize(
  imageWidth: number,
  imageHeight: number,
  availableWidth: number,
  availableHeight: number,
) {
  if (imageWidth <= 0 || imageHeight <= 0 || availableWidth <= 0 || availableHeight <= 0) {
    return {
      rotate: false,
      width: 0,
      height: 0,
    };
  }

  const rotate = imageWidth > imageHeight;
  const fitWidth = rotate ? imageHeight : imageWidth;
  const fitHeight = rotate ? imageWidth : imageHeight;
  const scale = Math.min(availableWidth / fitWidth, availableHeight / fitHeight);

  return {
    height: imageHeight * scale,
    rotate,
    width: imageWidth * scale,
  };
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
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
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
  const mapImageSize = useImageSize(mapImageUrl ?? "");
  const [gridRowsInput, setGridRowsInput] = useState("");
  const [gridColsInput, setGridColsInput] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [containerLayout, setContainerLayout] = useState({ width: 0, height: 0 });
  const [mapFullscreenVisible, setMapFullscreenVisible] = useState(false);
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
  const fullscreenMapSize = useMemo(() => {
    if (!mapImageSize) {
      return {
        height: 0,
        rotate: false,
        width: 0,
      };
    }
    const availableWidth = Math.max(0, windowWidth - Spacing.xl * 2);
    const availableHeight = Math.max(0, windowHeight - insets.top - insets.bottom - 160);
    return computeFullscreenMapSize(mapImageSize.width, mapImageSize.height, availableWidth, availableHeight);
  }, [insets.bottom, insets.top, mapImageSize, windowHeight, windowWidth]);
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
  const fullscreenTokenSize = useMemo(
    () => computeTokenSize(fullscreenMapSize.width, fullscreenMapSize.height, resolvedGridCols, resolvedGridRows, 44),
    [fullscreenMapSize.height, fullscreenMapSize.width, resolvedGridCols, resolvedGridRows],
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

  const handleGridPress = useCallback((
    locationX: number,
    locationY: number,
    rectWidth: number,
    rectHeight: number,
  ) => {
    if (selectedRoleId == null || rectWidth <= 0 || rectHeight <= 0) {
      return;
    }
    const cell = resolveGridCell(
      locationX,
      locationY,
      0,
      0,
      rectWidth,
      rectHeight,
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
  }, [selectedRoleId, resolvedGridRows, resolvedGridCols, tokenByCellKey, sendMapStateEvents]);

  const handleImageGridPress = useCallback((event: { nativeEvent: { locationX: number; locationY: number } }) => {
    handleGridPress(event.nativeEvent.locationX, event.nativeEvent.locationY, imageRect.width, imageRect.height);
  }, [handleGridPress, imageRect.height, imageRect.width]);

  const handleTokenPress = useCallback((roleId: number) => {
    if (!isKP)
      return;
    setSelectedRoleId((prev) => {
      return prev === roleId ? null : roleId;
    });
  }, [isKP]);

  const handleTokenLongPress = useCallback((roleId: number) => {
    const role = roomRoles.find(item => item.roleId === roleId);
    Alert.alert("移除角色", `确定将${role?.roleName ?? "该角色"}从地图移除吗？`, [
      { text: "取消", style: "cancel" },
      {
        text: "移除",
        style: "destructive",
        onPress: () => {
          const events: StateEventAtom[] = [{
            type: "mapTokenRemove",
            roleId,
          }];
          void sendMapStateEvents(events, ".combat map-remove");
          setSelectedRoleId(prev => (prev === roleId ? null : prev));
        },
      },
    ]);
  }, [roomRoles, sendMapStateEvents]);

  const handleUnplacedRolePress = useCallback((roleId: number) => {
    if (!isKP)
      return;
    setSelectedRoleId((prev) => {
      return prev === roleId ? null : roleId;
    });
  }, [isKP]);

  const openFullscreenMap = useCallback(() => {
    if (!mapImageUrl) {
      return;
    }
    setMapFullscreenVisible(true);
  }, [mapImageUrl]);

  const closeFullscreenMap = useCallback(() => {
    setMapFullscreenVisible(false);
  }, []);

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
    <>
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
                                onLongPress={() => handleTokenLongPress(token.roleId)}
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
            {mapImageUrl
              ? (
                  <Pressable
                    accessibilityLabel="全屏查看地图"
                    accessibilityRole="button"
                    onPress={openFullscreenMap}
                    style={({ pressed }) => [
                      styles.mapExpandButtonWrap,
                      styles.mapExpandButton,
                      {
                        backgroundColor: pressed ? theme.backgroundSelected : theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <ArrowsOutSimple color={theme.textSecondary} size={18} weight="bold" />
                  </Pressable>
                )
              : null}
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
                    onLongPress={() => handleTokenLongPress(token.roleId)}
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

      <Modal animationType="fade" onRequestClose={closeFullscreenMap} visible={mapFullscreenVisible}>
        <SafeAreaView style={styles.fullscreenContainer}>
          <View style={styles.fullscreenContent}>
            <View style={styles.fullscreenHeader}>
              <View style={{ flex: 1, gap: Spacing.xs }}>
                <ThemedText type="heading">地图</ThemedText>
                <ThemedText themeColor="textSecondary" type="caption">
                  {fullscreenMapSize.rotate ? "已按手机长边旋转展示，方便放大操作" : "全屏查看与落位"}
                </ThemedText>
              </View>
              <Pressable
                accessibilityLabel="关闭全屏地图"
                accessibilityRole="button"
                onPress={closeFullscreenMap}
                style={({ pressed }) => [
                  styles.fullscreenCloseButton,
                  {
                    backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  },
                ]}
              >
                <X color={theme.textSecondary} size={20} weight="bold" />
              </Pressable>
            </View>

            <ThemedText style={styles.fullscreenHint} themeColor="textSecondary" type="caption">
              {selectedRoleId ? "点地图放置选中的角色，长按角色可移除" : "先点下方角色，再点地图落位"}
            </ThemedText>

            <View style={styles.fullscreenMapHost}>
              {mapImageUrl && mapImageSize && fullscreenMapSize.width > 0 && fullscreenMapSize.height > 0
                ? (
                    <View
                      style={[
                        styles.fullscreenMapStage,
                        {
                          height: fullscreenMapSize.height,
                          transform: [{ rotateZ: fullscreenMapSize.rotate ? "-90deg" : "0deg" }],
                          width: fullscreenMapSize.width,
                        },
                      ]}
                    >
                      <CachedImage
                        contentFit="contain"
                        style={StyleSheet.absoluteFill}
                        uri={mapImageUrl}
                      />
                      <View style={StyleSheet.absoluteFill}>
                        <MapGridOverlay
                          width={fullscreenMapSize.width}
                          height={fullscreenMapSize.height}
                          gridRows={resolvedGridRows}
                          gridCols={resolvedGridCols}
                          gridColor={resolvedGridColor}
                        />
                        <Pressable
                          onPress={(event) => {
                            handleGridPress(
                              event.nativeEvent.locationX,
                              event.nativeEvent.locationY,
                              fullscreenMapSize.width,
                              fullscreenMapSize.height,
                            );
                          }}
                          style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                        />
                        {tokens.map((token) => {
                          const role = roomRoles.find(r => r.roleId === token.roleId);
                          const tokenStatus = tokenStatusByRoleId[token.roleId];
                          const left = ((token.colIndex + 0.5) / resolvedGridCols) * fullscreenMapSize.width - fullscreenTokenSize / 2;
                          const top = ((token.rowIndex + 0.5) / resolvedGridRows) * fullscreenMapSize.height - fullscreenTokenSize / 2;
                          return (
                            <View key={token.roleId} style={{ position: "absolute", left, top, zIndex: 2 }}>
                              <MapToken
                                avatarUrl={role?.avatarFileId ? avatarThumbUrl(role.avatarFileId) : null}
                                hasStatus={Boolean(tokenStatus)}
                                isSelected={selectedRoleId === token.roleId}
                                onLongPress={() => handleTokenLongPress(token.roleId)}
                                name={role?.roleName?.trim() || `#${token.roleId}`}
                                onPress={() => handleTokenPress(token.roleId)}
                                size={fullscreenTokenSize}
                                statusText={tokenStatus?.text}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )
                : (
                    <View style={[styles.fullscreenMapStage, { alignItems: "center", backgroundColor: theme.backgroundElement, borderColor: theme.border, borderRadius: Radius.lg, borderWidth: 1, justifyContent: "center", padding: Spacing.xxl }]}>
                      <ThemedText themeColor="textSecondary">地图尚未上传。</ThemedText>
                    </View>
                  )}
            </View>

            {isKP
              ? (
                  <View style={styles.fullscreenRoleRow}>
                    {unplacedRoles.map(role => (
                      <Pressable key={role.roleId} onPress={() => handleUnplacedRolePress(role.roleId)}>
                        <View
                          style={{
                            borderColor: selectedRoleId === role.roleId ? theme.accent : theme.border,
                            borderRadius: 999,
                            borderWidth: 2,
                            height: 44,
                            overflow: "hidden",
                            width: 44,
                          }}
                        >
                          {role.avatarFileId
                            ? (
                                <CachedImage uri={avatarThumbUrl(role.avatarFileId)} style={{ height: 40, width: 40, borderRadius: 999 }} />
                              )
                            : (
                                <View style={{ alignItems: "center", backgroundColor: theme.backgroundElement, borderRadius: 999, height: 40, justifyContent: "center", width: 40 }}>
                                  <ThemedText type="caption">{(role.roleName ?? "#").charAt(0)}</ThemedText>
                                </View>
                              )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )
              : null}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
