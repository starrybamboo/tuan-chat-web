import { X } from "phosphor-react-native";
import { useCallback, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { StShowCardModel, StShowCardSection } from "../../components/common/dicer/cmdExe/stShowCard";

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  carousel: {
    flexGrow: 0,
  },
  carouselFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dot: {
    borderRadius: Radius.full,
    height: 7,
    width: 7,
  },
  emptyPanel: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
  },
  row: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.lg,
    minHeight: 38,
    paddingVertical: Spacing.sm,
  },
  rowKey: {
    flex: 1,
  },
  rowValue: {
    minWidth: 72,
    textAlign: "right",
  },
  sectionPage: {
    paddingRight: Spacing.md,
  },
  section: {
    borderRadius: Radius.md,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  sectionHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionRows: {
    paddingHorizontal: Spacing.lg,
  },
  sheet: {
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
  },
});

type MobileStShowCardSheetProps = {
  model: StShowCardModel | null;
  onClose: () => void;
};

export function MobileStShowCardSheet({ model, onClose }: MobileStShowCardSheetProps) {
  const theme = useTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const carouselRef = useRef<FlatList<StShowCardSection>>(null);
  const sections = model?.sections ?? [];
  const totalRows = sections.reduce((total, section) => total + section.rows.length, 0);
  const pageWidth = Math.max(280, windowWidth - Spacing.xl * 2);
  const carouselHeight = Math.max(280, Math.min(windowHeight * 0.62, 520));
  const pageCount = sections.length;
  const resolvedActiveSectionIndex = pageCount === 0 ? 0 : Math.min(activeSectionIndex, pageCount - 1);
  const displayIndex = pageCount === 0 ? 0 : resolvedActiveSectionIndex + 1;

  const handleScrollEnd = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setActiveSectionIndex(Math.max(0, Math.min(nextIndex, pageCount - 1)));
  }, [pageCount, pageWidth]);

  const handleDotPress = useCallback((index: number) => {
    carouselRef.current?.scrollToOffset({ animated: true, offset: pageWidth * index });
    setActiveSectionIndex(index);
  }, [pageWidth]);

  const getSectionLayout = useCallback((_: ArrayLike<StShowCardSection> | null | undefined, index: number) => ({
    index,
    length: pageWidth,
    offset: pageWidth * index,
  }), [pageWidth]);

  const renderSectionCard = useCallback(({ item: section }: { item: StShowCardSection }) => (
    <View style={[styles.sectionPage, { width: pageWidth }]}>
      <View
        style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      >
        <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
          <ThemedText type="smallBold">{section.title}</ThemedText>
          <ThemedText themeColor="textSecondary" type="caption">
            {section.rows.length}
            {" 项"}
          </ThemedText>
        </View>
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
          <View style={styles.sectionRows}>
            {section.rows.map((row, index) => (
              <View
                key={`${section.title}-${row.key}`}
                style={[
                  styles.row,
                  { borderBottomColor: theme.border },
                  index === section.rows.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <ThemedText style={styles.rowKey}>{row.key}</ThemedText>
                <ThemedText style={styles.rowValue} type="smallBold">{row.value}</ThemedText>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  ), [pageWidth, theme.backgroundElement, theme.border]);

  if (!model) {
    return null;
  }

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="92%"
      onClose={onClose}
      sheetStyle={styles.sheet}
      visible={model !== null}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="heading">{model.roleName}</ThemedText>
          <ThemedText themeColor="textSecondary" type="caption">
            属性卡
            {" · "}
            {totalRows}
            {" 项"}
          </ThemedText>
        </View>
        <Pressable
          accessibilityLabel="关闭属性卡"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
          ]}
        >
          <X color={theme.textSecondary} size={18} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {pageCount === 0
          ? (
              <View style={[styles.emptyPanel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText themeColor="textSecondary">没有可显示的属性。</ThemedText>
              </View>
            )
          : (
              <>
                <View style={styles.carouselFooter}>
                  <View style={styles.dots}>
                    {sections.map((section, index) => {
                      const active = index === resolvedActiveSectionIndex;
                      return (
                        <Pressable
                          key={section.title}
                          accessibilityLabel={`切换到${section.title}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => handleDotPress(index)}
                          style={[
                            styles.dot,
                            { backgroundColor: active ? theme.accent : theme.border },
                            active && { width: 18 },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <ThemedText themeColor="textSecondary" type="caption">
                    {displayIndex}
                    /
                    {pageCount}
                  </ThemedText>
                </View>
                <FlatList
                  ref={carouselRef}
                  data={sections}
                  getItemLayout={getSectionLayout}
                  horizontal
                  keyExtractor={section => section.title}
                  onMomentumScrollEnd={handleScrollEnd}
                  pagingEnabled
                  renderItem={renderSectionCard}
                  showsHorizontalScrollIndicator={false}
                  snapToAlignment="start"
                  style={[styles.carousel, { height: carouselHeight }]}
                />
              </>
            )}
      </View>
    </BottomSheetModal>
  );
}
