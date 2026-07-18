export const SUPPORT_TERM_IDS = [
  "space",
  "room",
  "space-sidebar",
  "space-owner",
  "host",
  "space-archive",
  "narration",
  "room-jump",
  "local-message-cache",
] as const;

/** FAQ 与问题目录可以引用的用户术语 ID。 */
export type SupportTermId = typeof SUPPORT_TERM_IDS[number];

/** 用户术语正文以及只供维护者定位代码的开发别名。 */
export type SupportTermDefinition = {
  name: string;
  definition: string;
  developerAliases: readonly string[];
  relatedTermIds?: readonly SupportTermId[];
};

export const SUPPORT_TERMS = {
  space: {
    name: "空间",
    definition: "组织相关房间、成员、角色、规则、素材和文档的长期协作范围。",
    developerAliases: ["Space", "SpaceContext"],
    relatedTermIds: ["room", "space-sidebar", "space-owner"],
  },
  room: {
    name: "房间",
    definition: "成员、角色、权限、消息和现场状态共同生效的具体协作场景。",
    developerAliases: ["Room", "RoomContext"],
    relatedTermIds: ["space"],
  },
  "space-sidebar": {
    name: "空间栏",
    definition: "用于切换空间并进入空间内容的界面入口，它展示空间，但不是空间本身。",
    developerAliases: ["ChatSpaceSidebar", "空间侧边栏"],
    relatedTermIds: ["space", "room"],
  },
  "space-owner": {
    name: "空间所有者",
    definition: "负责空间生命周期和空间级治理的成员身份。",
    developerAliases: ["space owner", "isSpaceOwner"],
    relatedTermIds: ["space", "host"],
  },
  host: {
    name: "主持人",
    definition: "负责控场和管理当前协作现场的成员职责。",
    developerAliases: ["KP", "isKP"],
    relatedTermIds: ["space-owner", "room", "narration"],
  },
  "space-archive": {
    name: "空间归档",
    definition: "用于结束或冻结空间当前协作结果的状态，普通成员不能继续新增消息。",
    developerAliases: ["space archive", "isSpaceArchived"],
    relatedTermIds: ["space", "host"],
  },
  narration: {
    name: "旁白",
    definition: "不绑定具体角色、用于描述场景或推进剧情的主持人消息。",
    developerAliases: ["narrator", "noRole"],
    relatedTermIds: ["host", "room"],
  },
  "room-jump": {
    name: "群聊跳转",
    definition: "发送一个可点击入口，让成员从当前群聊进入指定空间或房间。",
    developerAliases: ["roomJump", "roomjump"],
    relatedTermIds: ["space", "room"],
  },
  "local-message-cache": {
    name: "本地消息缓存",
    definition: "浏览器保留的消息历史副本，用于更快显示最近内容；服务器仍保存正式消息。",
    developerAliases: ["chatHistoryDb", "IndexedDB", "localDb"],
    relatedTermIds: ["room"],
  },
} satisfies Record<SupportTermId, SupportTermDefinition>;

export const SUPPORT_FAQ_IDS = [
  "local-message-cache-unavailable",
  "space-archived-messaging",
  "narration-permission",
  "room-jump-format",
] as const;

/** 本地 FAQ 的稳定 ID。 */
export type SupportFaqId = typeof SUPPORT_FAQ_IDS[number];

/** 按用户问题组织的 FAQ 内容。 */
export type SupportFaqDefinition = {
  question: string;
  answer: string;
  steps: readonly string[];
  termIds: readonly SupportTermId[];
};

export const SUPPORT_FAQS = {
  "local-message-cache-unavailable": {
    question: "本地消息缓存不可用会影响聊天吗？",
    answer: "不会影响正常收发消息。当前设备可能无法保留离线历史，刷新后会重新从服务器拉取消息。",
    steps: [
      "先继续使用聊天，确认新消息仍能正常发送和接收。",
      "如果历史消息显示异常，刷新页面后重新进入当前房间。",
      "问题持续出现时，通过本页反馈入口提交诊断日志。",
    ],
    termIds: ["local-message-cache", "room"],
  },
  "space-archived-messaging": {
    question: "为什么空间归档后不能继续发言？",
    answer: "归档用于冻结当前协作结果。普通成员不能新增消息，主持人仍可以处理收尾或解除归档。",
    steps: [
      "确认当前空间是否已经结束或进入只读阶段。",
      "需要继续协作时，联系主持人解除归档。",
      "暂时无法解除时，可以请主持人代为发送必要内容。",
    ],
    termIds: ["space", "space-archive", "host"],
  },
  "narration-permission": {
    question: "为什么我不能发送旁白？",
    answer: "旁白不绑定具体角色，并承担场景描述和剧情推进职责，因此当前只允许主持人发送。",
    steps: [
      "从输入区选择你在当前房间使用的角色。",
      "如果内容必须以旁白发送，请联系主持人代为发送。",
    ],
    termIds: ["narration", "host", "room"],
  },
  "room-jump-format": {
    question: "群聊跳转指令应该怎么写？",
    answer: "指令需要提供目标房间；跨空间跳转时还需要提供目标空间。标题可以省略。",
    steps: [
      "同一空间使用：/roomjump <roomId> [标题]。",
      "跨空间使用：/roomjump <spaceId> <roomId> [标题]。",
      "确认空间 ID 和房间 ID 都是有效数字后重新发送。",
    ],
    termIds: ["room-jump", "space", "room"],
  },
} satisfies Record<SupportFaqId, SupportFaqDefinition>;

export const SUPPORT_ISSUE_IDS = [
  "local-message-cache-unavailable",
  "space-archived",
  "narration-host-only",
  "room-jump-invalid-format",
] as const;

/** 结构化 Toast 可以引用的问题 ID。 */
export type SupportIssueId = typeof SUPPORT_ISSUE_IDS[number];

/** 连接 Toast、术语和 FAQ 的问题定义。 */
export type SupportIssueDefinition = {
  title: string;
  explanation: string;
  suggestions: readonly [string, ...string[]];
  termIds: readonly SupportTermId[];
  faqIds: readonly SupportFaqId[];
};

export const SUPPORT_ISSUES = {
  "local-message-cache-unavailable": {
    title: "本地消息缓存不可用",
    explanation: "当前设备无法使用浏览器本地消息缓存，但服务器消息和正常收发不受影响。",
    suggestions: ["可以继续聊天；历史消息异常时刷新页面重试。"],
    termIds: ["local-message-cache", "room"],
    faqIds: ["local-message-cache-unavailable"],
  },
  "space-archived": {
    title: "当前空间已归档",
    explanation: "空间已经进入归档状态，普通成员不能继续新增消息。",
    suggestions: ["联系主持人解除归档，或请主持人代为发送。"],
    termIds: ["space", "space-archive", "host"],
    faqIds: ["space-archived-messaging"],
  },
  "narration-host-only": {
    title: "无法发送旁白",
    explanation: "旁白承担场景描述和剧情推进职责，当前只允许主持人发送。",
    suggestions: ["选择你的角色后发送，或请主持人代为发送。"],
    termIds: ["narration", "host", "room"],
    faqIds: ["narration-permission"],
  },
  "room-jump-invalid-format": {
    title: "群聊跳转格式错误",
    explanation: "群聊跳转指令缺少有效的空间或房间编号，无法生成跳转入口。",
    suggestions: ["按 /roomjump <roomId> [标题] 的格式重新发送。"],
    termIds: ["room-jump", "space", "room"],
    faqIds: ["room-jump-format"],
  },
} satisfies Record<SupportIssueId, SupportIssueDefinition>;

/** 获取一个已经通过强类型目录校验的问题。 */
export function getSupportIssue(issueId: SupportIssueId) {
  return SUPPORT_ISSUES[issueId];
}

/** 获取一个已经通过强类型目录校验的 FAQ。 */
export function getSupportFaq(faqId: SupportFaqId) {
  return SUPPORT_FAQS[faqId];
}

/** 获取一个已经通过强类型目录校验的用户术语。 */
export function getSupportTerm(termId: SupportTermId) {
  return SUPPORT_TERMS[termId];
}
