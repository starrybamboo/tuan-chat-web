import type { AnnotationDefinition } from "@/components/chat/message/annotations/annotationCatalog";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

export type AnnotationPickerSection = {
  key: string;
  title: string;
  group?: string;
  description: string;
  groupDescription?: string;
  items: AnnotationDefinition[];
};

type SectionSpec = {
  key: string;
  title: string;
  group?: string;
  description: string;
  order?: string[];
  categories?: string[];
  match?: (item: AnnotationDefinition) => boolean;
};

const CLEAR_CONTROL_IDS = new Set(["image.clear", "background.clear", "bgm.clear", "figure.clear"]);
const DIALOG_CONTROL_IDS = new Set(["dialog.notend", "dialog.concat", "dialog.next"]);
const SCENE_TEXTBOX_ROW_ORDER = ["scene.textbox.hide", "scene.textbox.show"] as const;
const SCENE_FILM_ROW_ORDER = ["scene.film.on", "scene.film.off"] as const;
const SCENE_TEXTBOX_ROW_IDS: Set<string> = new Set(SCENE_TEXTBOX_ROW_ORDER);
const SCENE_FILM_ROW_IDS: Set<string> = new Set(SCENE_FILM_ROW_ORDER);
const BACKGROUND_ENTER_ROW_ORDER = [
  "background.anim.enter",
  "background.anim.enter-from-left",
  "background.anim.enter-from-right",
  "background.anim.blur-in",
] as const;
const BACKGROUND_EXIT_ROW_ORDER = [
  "background.anim.exit",
  "background.anim.exit-to-left",
  "background.anim.exit-to-right",
] as const;
const BACKGROUND_SPEED_ROW_ORDER = [
  "background.speed.fast",
  "background.speed.normal",
  "background.speed.slow",
] as const;
const BACKGROUND_ENTER_ROW_IDS: Set<string> = new Set(BACKGROUND_ENTER_ROW_ORDER);
const BACKGROUND_EXIT_ROW_IDS: Set<string> = new Set(BACKGROUND_EXIT_ROW_ORDER);
const BACKGROUND_SPEED_ROW_IDS: Set<string> = new Set(BACKGROUND_SPEED_ROW_ORDER);
const FIGURE_POSITION_ROW_ORDER = [
  "figure.pos.left",
  "figure.pos.left-center",
  "figure.pos.center",
  "figure.pos.right-center",
  "figure.pos.right",
  "figure.mini-avatar",
] as const;
const FIGURE_POSITION_ROW_IDS: Set<string> = new Set(FIGURE_POSITION_ROW_ORDER);

const SCENE_SECTION_SPECS: SectionSpec[] = [
  { key: "scene-textbox", group: "场景", title: "文本框", description: "隐藏或恢复 WebGAL 文本框。", order: [...SCENE_TEXTBOX_ROW_ORDER], match: item => SCENE_TEXTBOX_ROW_IDS.has(item.id) },
  { key: "scene-film", group: "场景", title: "电影", description: "开启或关闭 WebGAL 电影模式。", order: [...SCENE_FILM_ROW_ORDER], match: item => SCENE_FILM_ROW_IDS.has(item.id) },
];

const BACKGROUND_SECTION_SPECS: SectionSpec[] = [
  { key: "background-enter", group: "背景", title: "进场", description: "设置背景图的入场动画。", order: [...BACKGROUND_ENTER_ROW_ORDER], match: item => BACKGROUND_ENTER_ROW_IDS.has(item.id) },
  { key: "background-exit", group: "背景", title: "出场", description: "设置背景图替换或清除时的出场动画。", order: [...BACKGROUND_EXIT_ROW_ORDER], match: item => BACKGROUND_EXIT_ROW_IDS.has(item.id) },
  { key: "background-speed", group: "背景", title: "速度", description: "设置背景切换动画的速度。", order: [...BACKGROUND_SPEED_ROW_ORDER], match: item => BACKGROUND_SPEED_ROW_IDS.has(item.id) },
];

const TEXTUAL_SECTION_SPECS: SectionSpec[] = [
  ...SCENE_SECTION_SPECS,
  { key: "figure-position", group: "立绘", title: "位置", description: "选择本条角色立绘在舞台上的位置，或显示小头像。", order: [...FIGURE_POSITION_ROW_ORDER], match: item => FIGURE_POSITION_ROW_IDS.has(item.id) },
  { key: "figure-enter", group: "立绘", title: "进场", description: "给本条角色立绘添加入场动画。", categories: ["进场动画"] },
  { key: "figure-action", group: "立绘", title: "动作", description: "让本条角色立绘执行一次动作动画。", categories: ["动作"] },
  { key: "figure-exit", group: "立绘", title: "出场", description: "给本条角色立绘添加出场动画。", categories: ["出场动画"] },
  { key: "character-effect", group: "特效", title: "角色", description: "在角色立绘附近播放一次表情特效。", categories: ["特效"] },
  ...BACKGROUND_SECTION_SPECS,
  { key: "dialog-control", group: "控制", title: "对话", description: "控制对话自动续播下句、续接上文或立即执行后续 WebGAL 语句。", match: item => DIALOG_CONTROL_IDS.has(item.id) },
  { key: "clear-control", group: "控制", title: "清理", description: "清除当前展示图、背景、BGM 或角色立绘。", match: item => CLEAR_CONTROL_IDS.has(item.id) },
];

const IMAGE_SECTION_SPECS: SectionSpec[] = [
  { key: "image-purpose", group: "媒体", title: "图片用途", description: "决定这张图片作为 CG、背景还是常驻展示图。", categories: ["图片"] },
  ...BACKGROUND_SECTION_SPECS,
  ...SCENE_SECTION_SPECS,
];

const SOUND_SECTION_SPECS: SectionSpec[] = [
  { key: "sound-purpose", group: "媒体", title: "音频用途", description: "决定这条音频作为 BGM 还是音效。", categories: ["音频"] },
];

const VIDEO_SECTION_SPECS: SectionSpec[] = [
  { key: "video-playback", group: "媒体", title: "视频", description: "控制视频播放行为。", categories: ["控制"] },
];

const EFFECT_SECTION_SPECS: SectionSpec[] = [
  ...SCENE_SECTION_SPECS,
  { key: "scene-effect", group: "场景", title: "特效", description: "开启或停止雨、雪、樱花等场景特效。", match: item => item.id.startsWith("scene.effect.") },
  ...BACKGROUND_SECTION_SPECS,
  { key: "scene-clear", group: "场景", title: "清理", description: "清除当前场景中的展示图、背景、BGM 或立绘。", match: item => CLEAR_CONTROL_IDS.has(item.id) },
];

const ALL_SECTION_SPECS: SectionSpec[] = [
  ...IMAGE_SECTION_SPECS,
  ...SOUND_SECTION_SPECS,
  { key: "video-playback", group: "媒体", title: "视频", description: "控制视频播放行为。", match: item => item.id === "video.skipoff" },
  ...TEXTUAL_SECTION_SPECS,
  ...EFFECT_SECTION_SPECS,
];

const GROUP_DESCRIPTIONS: Record<string, string> = {
  立绘: "角色立绘相关标注，控制位置、进出场、动作和小头像。",
  特效: "角色表情和场景演出相关标注。",
  控制: "影响对话推进、播放限制或清理已有演出的控制标注。",
  媒体: "决定图片、音频、视频在 WebGAL 中的用途。",
  场景: "文本框、电影模式和场景层面的演出控制。",
  背景: "背景图层的进场、出场和速度标注。",
  其他: "未归入内置分组的自定义标注。",
};

const MESSAGE_TYPE_LABELS = new Map<number, string>([
  [MESSAGE_TYPE.TEXT, "文本消息"],
  [MESSAGE_TYPE.IMG, "图片消息"],
  [MESSAGE_TYPE.SOUND, "音频消息"],
  [MESSAGE_TYPE.VIDEO, "视频消息"],
  [MESSAGE_TYPE.EFFECT, "特效消息"],
  [MESSAGE_TYPE.INTRO_TEXT, "黑屏文字"],
  [MESSAGE_TYPE.DICE, "骰子消息"],
]);

function getSectionSpecs(messageType?: number | null): SectionSpec[] {
  switch (messageType) {
    case MESSAGE_TYPE.TEXT:
    case MESSAGE_TYPE.INTRO_TEXT:
    case MESSAGE_TYPE.DICE:
      return TEXTUAL_SECTION_SPECS;
    case MESSAGE_TYPE.IMG:
      return IMAGE_SECTION_SPECS;
    case MESSAGE_TYPE.SOUND:
      return SOUND_SECTION_SPECS;
    case MESSAGE_TYPE.VIDEO:
      return VIDEO_SECTION_SPECS;
    case MESSAGE_TYPE.EFFECT:
      return EFFECT_SECTION_SPECS;
    default:
      return ALL_SECTION_SPECS;
  }
}

function matchesSection(item: AnnotationDefinition, spec: SectionSpec): boolean {
  if (spec.match?.(item)) {
    return true;
  }
  return Boolean(item.category && spec.categories?.includes(item.category));
}

function buildMatchedSections(
  catalog: AnnotationDefinition[],
  specs: SectionSpec[],
  matchedIds: Set<string>,
): AnnotationPickerSection[] {
  return specs
    .map((section): AnnotationPickerSection | null => {
      const items = catalog.filter(item => !matchedIds.has(item.id) && matchesSection(item, section));
      if (items.length === 0) {
        return null;
      }
      if (section.order) {
        const orderMap = new Map(section.order.map((id, index) => [id, index]));
        items.sort((a, b) => (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER));
      }
      items.forEach(item => matchedIds.add(item.id));
      return {
        key: section.key,
        title: section.title,
        group: section.group,
        description: section.description,
        groupDescription: section.group ? GROUP_DESCRIPTIONS[section.group] : undefined,
        items,
      };
    })
    .filter((section): section is AnnotationPickerSection => Boolean(section));
}

function buildFallbackSections(catalog: AnnotationDefinition[], matchedIds: Set<string>): AnnotationPickerSection[] {
  const grouped = new Map<string, AnnotationDefinition[]>();
  for (const item of catalog) {
    if (matchedIds.has(item.id)) {
      continue;
    }
    const category = item.category || "其他";
    const list = grouped.get(category) ?? [];
    list.push(item);
    grouped.set(category, list);
  }

  return Array.from(grouped.entries()).map(([category, items]) => ({
    key: `custom:${category}`,
    title: category,
    group: "其他",
    description: `自定义分类“${category}”中的标注。`,
    groupDescription: GROUP_DESCRIPTIONS["其他"],
    items,
  }));
}

export function buildAnnotationPickerSections(
  catalog: AnnotationDefinition[],
  messageType?: number | null,
): AnnotationPickerSection[] {
  const matchedIds = new Set<string>();
  return [
    ...buildMatchedSections(catalog, getSectionSpecs(messageType), matchedIds),
    ...buildFallbackSections(catalog, matchedIds),
  ];
}

export function getAnnotationPickerContextLabel(messageType?: number | null): string {
  if (typeof messageType !== "number" || !Number.isFinite(messageType)) {
    return "全部标注";
  }
  return MESSAGE_TYPE_LABELS.get(messageType) ?? "当前消息";
}
