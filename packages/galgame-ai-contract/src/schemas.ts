import { z } from "zod";

export const GALGAME_AUTHORING_SCENE = "galgame_authoring" as const;

export const galMessagePurposeSchema = z.enum([
  "dialogue",
  "narration",
  "background",
  "cg",
  "se",
  "bgm",
  "control",
  "choice",
  "unknown",
]);

const unknownRecordSchema = z.record(z.string(), z.unknown());

export const galReferenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("message"),
    messageId: z.string(),
    mode: z.enum(["target", "reference"]).optional(),
    label: z.string().optional(),
  }).strict(),
  z.object({
    kind: z.literal("role"),
    roleId: z.string(),
    label: z.string().optional(),
  }).strict(),
  z.object({
    kind: z.literal("room"),
    roomId: z.string(),
    label: z.string().optional(),
  }).strict(),
  z.object({
    kind: z.literal("doc"),
    docId: z.string(),
    label: z.string().optional(),
    title: z.string().optional(),
    excerpt: z.string().optional(),
  }).strict(),
]);

export const galAnnotationSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.string().optional(),
  source: z.enum(["builtin", "custom"]),
  appliesTo: z.array(galMessagePurposeSchema).optional(),
  description: z.string().optional(),
}).strict();

export const galMessageViewSchema = z.object({
  messageId: z.string(),
  position: z.number(),
  roomId: z.string(),
  messageType: z.number().int(),
  purpose: galMessagePurposeSchema,
  roleId: z.string().optional(),
  roleName: z.string().optional(),
  customRoleName: z.string().optional(),
  avatarId: z.string().optional(),
  content: z.string(),
  annotations: z.array(z.string()),
  webgal: unknownRecordSchema.optional(),
  extra: unknownRecordSchema.optional(),
}).strict();

export const galRoleAvatarVariantSchema = z.object({
  roleId: z.string().optional(),
  avatarId: z.string(),
  avatarTitle: z.record(z.string(), z.string()).optional(),
  category: z.string().optional(),
}).strict();

export const galRoomRoleSchema = z.object({
  roleId: z.string(),
  roleName: z.string().optional(),
  type: z.number().optional(),
  role: z.boolean().optional(),
  npc: z.boolean().optional(),
  diceMaiden: z.boolean().optional(),
  description: z.string().optional(),
  avatarId: z.string().optional(),
  avatarVariants: z.array(galRoleAvatarVariantSchema),
}).strict();

export const galNarratorSchema = z.object({
  roleId: z.literal("narrator"),
  roleName: z.literal("旁白"),
  kind: z.literal("narrator"),
}).strict();

export const galReferenceRoomContextSchema = z.object({
  refId: z.string(),
  room: z.object({
    spaceId: z.string(),
    roomId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
  }).strict(),
  messages: z.array(galMessageViewSchema),
  roles: z.object({
    roomRoles: z.array(galRoomRoleSchema),
    narrator: galNarratorSchema,
  }).strict(),
  truncation: z.object({
    originalMessageCount: z.number().int().nonnegative(),
    includedMessageCount: z.number().int().nonnegative(),
    strategy: z.enum(["full", "head_tail_key_nodes"]),
  }).strict().optional(),
}).strict();

export const galPatchMessageInputSchema = z.object({
  messageType: z.number().int(),
  purpose: galMessagePurposeSchema.optional(),
  roleId: z.string().optional(),
  customRoleName: z.string().optional(),
  avatarId: z.string().optional(),
  content: z.string().optional(),
  annotations: z.array(z.string()).optional(),
  webgal: unknownRecordSchema.optional(),
  extra: unknownRecordSchema.optional(),
}).strict();

export const galStoryPatchOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("replace_content"),
    messageId: z.string(),
    content: z.string(),
  }).strict(),
  z.object({
    op: z.literal("insert_before"),
    beforeMessageId: z.string(),
    message: galPatchMessageInputSchema,
  }).strict(),
  z.object({
    op: z.literal("insert_after"),
    afterMessageId: z.string(),
    message: galPatchMessageInputSchema,
  }).strict(),
  z.object({
    op: z.literal("delete"),
    messageId: z.string(),
  }).strict(),
  z.object({
    op: z.literal("move"),
    messageId: z.string(),
    beforeMessageId: z.string().optional(),
    afterMessageId: z.string().optional(),
  }).strict(),
  z.object({
    op: z.literal("update_annotations"),
    messageId: z.string(),
    annotations: z.array(z.string()),
  }).strict(),
  z.object({
    op: z.literal("update_role"),
    messageId: z.string(),
    roleId: z.string(),
    customRoleName: z.string().optional(),
  }).strict(),
  z.object({
    op: z.literal("update_avatar"),
    messageId: z.string(),
    avatarId: z.string().optional(),
  }).strict(),
  z.object({
    op: z.literal("replace_message"),
    messageId: z.string(),
    message: galPatchMessageInputSchema,
  }).strict(),
]);

export const galStoryPatchSchema = z.object({
  operations: z.array(galStoryPatchOperationSchema).max(80),
}).strict();

export const galMessageSelectorSchema = z.object({
  messageId: z.string().optional(),
  position: z.number().optional(),
  ordinal: z.enum([
    "first",
    "last",
    "first_dialogue",
    "last_dialogue",
    "first_narration",
    "last_narration",
  ]).optional(),
  textIncludes: z.string().optional(),
  roleName: z.string().optional(),
}).strict();

export const galCopilotMessageDraftSchema = z.object({
  content: z.string().optional(),
  speaker: z.string().optional(),
  roleId: z.string().optional(),
  customRoleName: z.string().optional(),
  purpose: galMessagePurposeSchema.optional(),
  messageType: z.number().int().optional(),
  avatarId: z.string().optional(),
  annotations: z.array(z.string()).optional(),
  webgal: unknownRecordSchema.optional(),
  extra: unknownRecordSchema.optional(),
}).strict();

export const galCopilotIntentSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("rewrite"),
    target: galMessageSelectorSchema,
    content: z.string(),
  }).strict(),
  z.object({
    action: z.literal("insert_after"),
    anchor: galMessageSelectorSchema,
    message: galCopilotMessageDraftSchema,
  }).strict(),
  z.object({
    action: z.literal("insert_before"),
    anchor: galMessageSelectorSchema,
    message: galCopilotMessageDraftSchema,
  }).strict(),
  z.object({
    action: z.literal("delete"),
    target: galMessageSelectorSchema,
  }).strict(),
  z.object({
    action: z.literal("change_speaker"),
    target: galMessageSelectorSchema,
    speaker: z.string().optional(),
    roleId: z.string().optional(),
    customRoleName: z.string().optional(),
  }).strict(),
  z.object({
    action: z.literal("change_avatar"),
    target: galMessageSelectorSchema,
    avatarId: z.string().optional(),
    avatarLabel: z.string().optional(),
  }).strict(),
  z.object({
    action: z.literal("set_annotations"),
    target: galMessageSelectorSchema,
    annotations: z.array(z.string()),
  }).strict(),
  z.object({
    action: z.literal("add_annotations"),
    target: galMessageSelectorSchema,
    annotations: z.array(z.string()),
  }).strict(),
  z.object({
    action: z.literal("remove_annotations"),
    target: galMessageSelectorSchema,
    annotations: z.array(z.string()),
  }).strict(),
  z.object({
    action: z.literal("move_after"),
    target: galMessageSelectorSchema,
    anchor: galMessageSelectorSchema,
  }).strict(),
  z.object({
    action: z.literal("move_before"),
    target: galMessageSelectorSchema,
    anchor: galMessageSelectorSchema,
  }).strict(),
]);

export const galCopilotIntentResponseSchema = z.object({
  intents: z.array(galCopilotIntentSchema).max(80),
}).strict();

export const galPatchValidationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  operationIndex: z.number().int().optional(),
  messageId: z.string().optional(),
}).strict();

export const galPatchProposalSummarySchema = z.object({
  proposalId: z.string(),
  status: z.enum(["draft", "accepted", "discarded", "expired"]),
  added: z.number().int().nonnegative(),
  deleted: z.number().int().nonnegative(),
  modified: z.number().int().nonnegative(),
  moved: z.number().int().nonnegative(),
  metadataChanged: z.number().int().nonnegative(),
}).strict();

export const galAuthoringContextSchema = z.object({
  staticGuide: z.object({
    schemaVersion: z.string(),
    fieldGuide: z.string(),
    patchGuide: z.string(),
    validationGuide: z.string(),
  }).strict(),
  space: z.object({
    spaceId: z.string(),
    name: z.string().optional(),
    rooms: z.array(z.object({
      roomId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
    }).strict()),
    annotationCatalog: z.array(galAnnotationSchema),
    roomMap: z.record(z.string(), z.array(z.string())).optional(),
  }).strict(),
  room: z.object({
    spaceId: z.string(),
    roomId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
  }).strict(),
  messages: z.array(galMessageViewSchema),
  roles: z.object({
    roomRoles: z.array(galRoomRoleSchema),
    narrator: galNarratorSchema,
  }).strict(),
  annotations: z.array(galAnnotationSchema),
  flow: z.object({
    rawRoomMap: z.record(z.string(), z.array(z.string())),
    validationWarnings: z.array(z.string()).optional(),
  }).strict().optional(),
  attachmentRefs: z.array(galReferenceSchema),
  referenceRooms: z.array(galReferenceRoomContextSchema).optional(),
  activeProposal: galPatchProposalSummarySchema.optional(),
}).strict();

export const galCopilotPatchRequestSchema = z.object({
  instruction: z.string().trim().min(1).max(8000),
  context: galAuthoringContextSchema,
  model: z.string().trim().min(1).optional(),
}).strict();

export const galCopilotPatchRepairRequestSchema = z.object({
  instruction: z.string().trim().min(1).max(8000),
  context: galAuthoringContextSchema,
  patch: galStoryPatchSchema,
  validationErrors: z.array(galPatchValidationErrorSchema).min(1),
  model: z.string().trim().min(1).optional(),
}).strict();

export const galCopilotPatchResponseSchema = z.object({
  patch: galStoryPatchSchema,
  assistantMessage: z.string().optional(),
  model: z.string().optional(),
  usage: z.object({
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    totalTokens: z.number().optional(),
  }).strict().optional(),
}).strict();

export const galCopilotPatchStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("status"),
    status: z.enum([
      "analyzing_context",
      "drafting_patch",
      "validating_patch",
      "repairing_patch",
    ]),
    message: z.string(),
  }).strict(),
  z.object({
    type: z.literal("text_delta"),
    text: z.string(),
  }).strict(),
  z.object({
    type: z.literal("patch"),
    response: galCopilotPatchResponseSchema,
  }).strict(),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }).strict(),
  z.object({
    type: z.literal("done"),
  }).strict(),
]);
