import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { imageLowUrl } from "@/utils/media/mediaUrl";

import type { UserRole } from "../../../../api";

export type ChatMentionDescriptor = {
  role: UserRole;
  token: string;
};

export type ChatMentionSegment =
  | { kind: "text"; text: string }
  | { kind: "mention"; role: UserRole };

export const CHAT_MENTION_SELECTOR = "span[data-role]";
export const CHAT_MENTION_SELECTED_CLASS = "chat-at-mention--selected";

function resolveMentionRoleName(role: UserRole): string {
  return role.roleName?.trim() || `角色 ${role.roleId}`;
}

export function findChatMentionElement(
  target: EventTarget | Node | null,
  root?: Node | null,
): HTMLSpanElement | null {
  if (!(target instanceof Node)) {
    return null;
  }

  const element = target.nodeType === Node.ELEMENT_NODE
    ? target as Element
    : target.parentElement;
  const mention = element?.closest<HTMLSpanElement>(CHAT_MENTION_SELECTOR) ?? null;
  if (!mention || (root && !root.contains(mention))) {
    return null;
  }
  return mention;
}

function selectionBelongsToEditor(editor: Node, selection: Selection): boolean {
  return Boolean(
    (selection.anchorNode && editor.contains(selection.anchorNode))
    || (selection.focusNode && editor.contains(selection.focusNode)),
  );
}

function rangeIntersectsMention(range: Range, mention: HTMLSpanElement): boolean {
  if (range.collapsed && !mention.contains(range.startContainer)) {
    return false;
  }

  try {
    return range.intersectsNode(mention);
  }
  catch {
    return false;
  }
}

export function getSelectedChatMentionElements(
  editor: HTMLElement,
  selection: Selection | null = editor.ownerDocument.getSelection(),
): HTMLSpanElement[] {
  if (!selection || selection.rangeCount === 0 || !selectionBelongsToEditor(editor, selection)) {
    return [];
  }

  const mentions = Array.from(editor.querySelectorAll<HTMLSpanElement>(CHAT_MENTION_SELECTOR));
  const selectedMentions = new Set<HTMLSpanElement>();
  for (let index = 0; index < selection.rangeCount; index += 1) {
    const range = selection.getRangeAt(index);
    mentions.forEach((mention) => {
      if (rangeIntersectsMention(range, mention)) {
        selectedMentions.add(mention);
      }
    });
  }
  return mentions.filter(mention => selectedMentions.has(mention));
}

export function syncChatMentionSelectionState(
  editor: HTMLElement,
  selection: Selection | null = editor.ownerDocument.getSelection(),
): HTMLSpanElement[] {
  const selectedMentions = getSelectedChatMentionElements(editor, selection);
  const selectedMentionSet = new Set(selectedMentions);
  editor.querySelectorAll<HTMLSpanElement>(CHAT_MENTION_SELECTOR).forEach((mention) => {
    const selected = selectedMentionSet.has(mention);
    mention.classList.toggle(CHAT_MENTION_SELECTED_CLASS, selected);
    if (selected) {
      mention.dataset.selected = "true";
    }
    else {
      delete mention.dataset.selected;
    }
  });
  return selectedMentions;
}

export function selectChatMentionElement(mention: HTMLSpanElement): boolean {
  const selection = mention.ownerDocument.getSelection();
  if (!selection) {
    return false;
  }

  const range = mention.ownerDocument.createRange();
  range.selectNode(mention);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

export function segmentChatMentionContent(
  content: string,
  mentions: ChatMentionDescriptor[],
): ChatMentionSegment[] {
  const remaining = mentions.filter(mention => mention.token.length > 0);
  const segments: ChatMentionSegment[] = [];
  let cursor = 0;

  while (cursor < content.length && remaining.length > 0) {
    let nextIndex = -1;
    let nextMentionIndex = -1;

    remaining.forEach((mention, index) => {
      const matchIndex = content.indexOf(mention.token, cursor);
      if (matchIndex < 0) {
        return;
      }
      if (nextIndex < 0 || matchIndex < nextIndex) {
        nextIndex = matchIndex;
        nextMentionIndex = index;
      }
    });

    if (nextMentionIndex < 0) {
      break;
    }
    if (nextIndex > cursor) {
      segments.push({ kind: "text", text: content.slice(cursor, nextIndex) });
    }

    const [mention] = remaining.splice(nextMentionIndex, 1);
    segments.push({ kind: "mention", role: mention.role });
    cursor = nextIndex + mention.token.length;
  }

  if (cursor < content.length) {
    segments.push({ kind: "text", text: content.slice(cursor) });
  }

  return segments;
}

export function createChatMentionElement(
  role: UserRole,
): HTMLSpanElement {
  const roleName = resolveMentionRoleName(role);
  const mention = document.createElement("span");
  mention.className = "chat-at-mention";
  mention.contentEditable = "false";
  mention.dataset.role = JSON.stringify({
    ...role,
    roleName,
  });
  mention.setAttribute("aria-label", `@${roleName}`);
  mention.title = `@${roleName}`;

  const semanticMarker = document.createElement("span");
  semanticMarker.className = "chat-at-mention__semantic-marker";
  semanticMarker.textContent = "@";

  const avatar = document.createElement("span");
  avatar.className = "chat-at-mention__avatar";
  avatar.setAttribute("aria-hidden", "true");
  if (role.roleId === -9999) {
    avatar.classList.add("chat-at-mention__avatar--all");
    avatar.textContent = "@";
  }
  else {
    const avatarUrl = imageLowUrl(role.avatarFileId) || ROLE_DEFAULT_AVATAR_URL;
    avatar.style.backgroundImage = `url("${avatarUrl}")`;
  }

  const label = document.createElement("span");
  label.className = "chat-at-mention__label";
  label.textContent = roleName;

  mention.append(semanticMarker, avatar, label);
  return mention;
}

export function buildChatMentionContentHtml(
  content: string,
  mentions: ChatMentionDescriptor[],
): string {
  const container = document.createElement("div");
  segmentChatMentionContent(content, mentions).forEach((segment) => {
    if (segment.kind === "text") {
      container.append(document.createTextNode(segment.text));
      return;
    }
    container.append(createChatMentionElement(segment.role));
  });
  return container.innerHTML;
}
