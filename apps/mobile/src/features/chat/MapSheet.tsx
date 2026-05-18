import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { Image } from "expo-image";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { MOBILE_MESSAGE_ATTACHMENT_KIND, pickMobileMessageAttachments } from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";

import { getRoomDndMapImageUrl, useRoomDndMapMutations, useRoomDndMapQuery } from "./roomDndMap";

const GRID_COLOR_OPTIONS = ["#64748b", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#ec4899"];

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  section: {
    gap: Spacing.md,
  },
  mapPreview: {
    borderRadius: Radius.lg,
    height: 220,
    overflow: "hidden",
    width: "100%",
  },
  gridSettings: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  colorSwatch: {
    borderRadius: Radius.full,
    height: 28,
    width: 28,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  button: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: Spacing.lg,
  },
  tokenRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  tokenInfo: {
    flex: 1,
    gap: 2,
  },
});

interface MapSheetProps {
  onClose: () => void;
  roomId: number | null;
  roomRoles: UserRole[];
  visible: boolean;
}

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function findNextEmptyCell(occupiedCells: Set<string>, gridCols: number, gridRows: number) {
  for (let rowIndex = 0; rowIndex < gridRows; rowIndex += 1) {
    for (let colIndex = 0; colIndex < gridCols; colIndex += 1) {
      const key = `${rowIndex}:${colIndex}`;
      if (!occupiedCells.has(key)) {
        return { colIndex, rowIndex };
      }
    }
  }
  return null;
}

export function MapSheet({
  onClose,
  roomId,
  roomRoles,
  visible,
}: MapSheetProps) {
  const theme = useTheme();
  const roomDndMapQuery = useRoomDndMapQuery(roomId);
  const {
    clearMapMutation,
    removeTokenMutation,
    upsertMapMutation,
    upsertTokenMutation,
  } = useRoomDndMapMutations(roomId);

  const map = roomDndMapQuery.data;
  const mapImageUrl = getRoomDndMapImageUrl(map);
  const [gridRowsInput, setGridRowsInput] = useState("");
  const [gridColsInput, setGridColsInput] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const resolvedGridRows = parsePositiveInt(gridRowsInput, map?.gridRows ?? 10);
  const resolvedGridCols = parsePositiveInt(gridColsInput, map?.gridCols ?? 10);

  const unplacedRoles = useMemo(() => {
    const placedRoleIds = new Set((map?.tokens ?? []).map(token => token.roleId));
    return roomRoles.filter(role => role.state !== 1 && !placedRoleIds.has(role.roleId));
  }, [map?.tokens, roomRoles]);

  const occupiedCells = useMemo(() => {
    return new Set((map?.tokens ?? []).map(token => `${token.rowIndex}:${token.colIndex}`));
  }, [map?.tokens]);

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
        gridColor: selectedColor ?? map?.gridColor ?? "#808080",
        gridCols: resolvedGridCols,
        gridRows: resolvedGridRows,
        mapFileId: image.fileId,
      });
    }
    catch (error) {
      Alert.alert("地图上传失败", error instanceof Error ? error.message : "请稍后重试。");
    }
  };

  const handleSaveGrid = async () => {
    try {
      await upsertMapMutation.mutateAsync({
        gridColor: selectedColor ?? map?.gridColor ?? "#808080",
        gridCols: resolvedGridCols,
        gridRows: resolvedGridRows,
        mapFileId: map?.mapFileId,
      });
    }
    catch (error) {
      Alert.alert("地图设置失败", error instanceof Error ? error.message : "请稍后重试。");
    }
  };

  const handlePlaceRole = async (roleId: number) => {
    const nextEmptyCell = findNextEmptyCell(occupiedCells, resolvedGridCols, resolvedGridRows);
    if (!nextEmptyCell) {
      Alert.alert("落位失败", "当前网格已经放满了，请先扩大网格或移除已有角色。");
      return;
    }
    await upsertTokenMutation.mutateAsync({
      ...nextEmptyCell,
      roleId,
    });
  };

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="82%"
      onClose={onClose}
      visible={visible}
    >
      <ThemedText style={styles.title}>地图</ThemedText>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {mapImageUrl
            ? (
                <Image contentFit="contain" source={{ uri: mapImageUrl }} style={[styles.mapPreview, { backgroundColor: theme.backgroundElement }]} />
              )
            : (
                <View style={[styles.mapPreview, { alignItems: "center", backgroundColor: theme.backgroundElement, justifyContent: "center" }]}>
                  <ThemedText themeColor="textSecondary">还没有地图</ThemedText>
                </View>
              )}

          <View style={styles.buttonRow}>
            <Pressable onPress={() => void handleUploadMap()} style={[styles.button, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="smallBold">{mapImageUrl ? "更换地图" : "上传地图"}</ThemedText>
            </Pressable>
            {mapImageUrl
              ? (
                  <Pressable
                    onPress={() => {
                      Alert.alert("清空地图", "确定清空当前地图和所有角色落位吗？", [
                        { text: "取消", style: "cancel" },
                        {
                          text: "清空",
                          style: "destructive",
                          onPress: () => void clearMapMutation.mutateAsync(),
                        },
                      ]);
                    }}
                    style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.danger }]}
                  >
                    <ThemedText style={{ color: theme.danger }} type="smallBold">清空地图</ThemedText>
                  </Pressable>
                )
              : null}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">网格设置</ThemedText>
            <View style={styles.gridSettings}>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setGridRowsInput}
                placeholder={String(map?.gridRows ?? 10)}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text, flex: 1 }]}
                value={gridRowsInput}
              />
              <TextInput
                keyboardType="number-pad"
                onChangeText={setGridColsInput}
                placeholder={String(map?.gridCols ?? 10)}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text, flex: 1 }]}
                value={gridColsInput}
              />
            </View>
            <View style={styles.colorRow}>
              {GRID_COLOR_OPTIONS.map(color => (
                <Pressable
                  key={color}
                  onPress={() => setSelectedColor(color)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: color,
                      borderColor: (selectedColor ?? map?.gridColor ?? "#808080") === color ? theme.text : "transparent",
                      borderWidth: 2,
                    },
                  ]}
                />
              ))}
            </View>
            <Pressable onPress={() => void handleSaveGrid()} style={[styles.button, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="smallBold">保存网格</ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">角色落位</ThemedText>
            {(map?.tokens ?? []).map((token) => {
              const role = roomRoles.find(item => item.roleId === token.roleId);
              return (
                <View
                  key={`${token.roleId}-${token.rowIndex}-${token.colIndex}`}
                  style={[styles.tokenRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                >
                  <View style={styles.tokenInfo}>
                    <ThemedText type="smallBold">{role?.roleName?.trim() || `角色 #${token.roleId}`}</ThemedText>
                    <ThemedText themeColor="textSecondary" type="caption">
                      第
                      {token.rowIndex + 1}
                      行，第
                      {token.colIndex + 1}
                      列
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => void removeTokenMutation.mutateAsync(token.roleId)}>
                    <ThemedText style={{ color: theme.danger }} type="caption">移除</ThemedText>
                  </Pressable>
                </View>
              );
            })}

            {unplacedRoles.map(role => (
              <Pressable
                key={role.roleId}
                onPress={() => void handlePlaceRole(role.roleId)}
                style={[styles.tokenRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.tokenInfo}>
                  <ThemedText type="smallBold">{role.roleName?.trim() || `角色 #${role.roleId}`}</ThemedText>
                  <ThemedText themeColor="textSecondary" type="caption">点击自动放到空位</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
}
