import { describe, expect, it } from "vitest";

import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import {
  buildCommittedRoomMessage,
  collectPersistedOptimisticDuplicateIds,
  commitOptimisticRoomMessageInList,
  createOptimisticRoomMessage,
  getNextAppendPosition,
  getRoomMessageLocalRenderKey,
  mergeRoomMessageSnapshotForLocalState,
  mergeRoomMessagesForLocalState,
  reconcileOptimisticRoomMessagesInList,
  removeRoomMessageFromList,
  removeRoomMessagesFromList,
  restoreRoomMessageInList,
  restoreRoomMessagesInList,
} from "./room-message-lifecycle";

function msg(messageId: number, position: number, overrides: Partial<Message> = {}): ChatMessageResponse {
  return {
    message: {
      content: `msg-${messageId}`,
      messageId,
      messageType: 1,
      position,
      roomId: 10,
      status: 0,
      syncId: messageId,
      userId: 5,
      ...overrides,
    },
  };
}

describe("createOptimisticRoomMessage", () => {
  it("creates a message with negative ID and correct fields", () => {
    const request: ChatMessageRequest = {
      roomId: 10,
      messageType: 1,
      content: "hello",
      roleId: 3,
      extra: {},
    };
    const result = createOptimisticRoomMessage(request, {
      optimisticId: -1,
      currentUserId: 5,
      position: 4,
    });
    expect(result.message.messageId).toBe(-1);
    expect(result.message.syncId).toBe(-1);
    expect(result.message.roomId).toBe(10);
    expect(result.message.userId).toBe(5);
    expect(result.message.roleId).toBe(3);
    expect(result.message.content).toBe("hello");
    expect(result.message.status).toBe(0);
    expect(result.message.position).toBe(4);
    expect(getRoomMessageLocalRenderKey(result.message)).toMatch(/^room-message:optimistic:-1:/);
  });

  it("uses request.position when provided", () => {
    const request: ChatMessageRequest = {
      roomId: 10,
      messageType: 1,
      position: 99,
      extra: {},
    };
    const result = createOptimisticRoomMessage(request, {
      optimisticId: -2,
      currentUserId: 5,
      position: 4,
    });
    expect(result.message.position).toBe(99);
  });
});

describe("getNextAppendPosition", () => {
  it("returns max position + 1", () => {
    const messages = [msg(1, 3), msg(2, 5), msg(3, 2)];
    expect(getNextAppendPosition(messages)).toBe(6);
  });

  it("returns 1 for empty list", () => {
    expect(getNextAppendPosition([])).toBe(1);
  });
});

describe("buildCommittedRoomMessage", () => {
  it("uses server message with optimistic position fallback", () => {
    const optimistic = msg(-1, 10, {
      tcLocalRenderKey: "room-message:optimistic:-1",
      tcLocalSyncState: "optimistic",
    } as Partial<Message>);
    const serverMessage: Message = {
      messageId: 100,
      syncId: 100,
      roomId: 10,
      userId: 5,
      content: "hello",
      messageType: 1,
      status: 0,
      position: undefined as unknown as number,
    };
    const result = buildCommittedRoomMessage(optimistic, serverMessage);
    expect(result.message.messageId).toBe(100);
    expect(result.message.position).toBe(10);
    expect(getRoomMessageLocalRenderKey(result.message)).toBe("room-message:optimistic:-1");
  });

  it("uses server position when provided", () => {
    const optimistic = msg(-1, 10);
    const serverMessage: Message = {
      messageId: 100,
      syncId: 100,
      roomId: 10,
      userId: 5,
      content: "hello",
      messageType: 1,
      status: 0,
      position: 20,
    };
    const result = buildCommittedRoomMessage(optimistic, serverMessage);
    expect(result.message.position).toBe(20);
  });
});

describe("commitOptimisticRoomMessageInList", () => {
  it("replaces optimistic message with server message", () => {
    const messages = [msg(1, 1), msg(-1, 2)];
    const serverMessage: Message = {
      messageId: 50,
      syncId: 50,
      roomId: 10,
      userId: 5,
      content: "committed",
      messageType: 1,
      status: 0,
      position: 2,
    };
    const result = commitOptimisticRoomMessageInList(messages, -1, serverMessage);
    expect(result.length).toBe(2);
    expect(result.find(m => m.message.messageId === -1)).toBeUndefined();
    expect(result.find(m => m.message.messageId === 50)).toBeDefined();
  });

  it("handles WebSocket-before-HTTP: server message already present", () => {
    const messages = [msg(1, 1), msg(-1, 2), msg(50, 3)];
    const serverMessage: Message = {
      messageId: 50,
      syncId: 50,
      roomId: 10,
      userId: 5,
      content: "committed",
      messageType: 1,
      status: 0,
      position: 3,
    };
    const result = commitOptimisticRoomMessageInList(messages, -1, serverMessage);
    const ids = result.map(m => m.message.messageId);
    expect(ids).not.toContain(-1);
    expect(ids.filter(id => id === 50).length).toBe(1);
  });

  it("preserves render key when HTTP commit follows an already reconciled WebSocket message", () => {
    const messages = [
      msg(1, 1),
      msg(50, 2, {
        content: "committed",
        tcLocalRenderKey: "room-message:optimistic:-1",
      } as Partial<Message>),
    ];
    const serverMessage: Message = {
      messageId: 50,
      syncId: 50,
      roomId: 10,
      userId: 5,
      content: "committed",
      messageType: 1,
      status: 0,
      position: 2,
    };

    const result = commitOptimisticRoomMessageInList(messages, -1, serverMessage);

    expect(result.map(m => m.message.messageId)).toEqual([1, 50]);
    expect(getRoomMessageLocalRenderKey(result[1].message)).toBe("room-message:optimistic:-1");
  });
});

describe("reconcileOptimisticRoomMessagesInList", () => {
  it("removes a matching optimistic message when WebSocket server message arrives first", () => {
    const optimistic = createOptimisticRoomMessage({
      content: "hello",
      messageType: 1,
      roomId: 10,
      roleId: 3,
      extra: {},
    }, {
      currentUserId: 5,
      optimisticId: -1,
      position: 2,
    });
    const optimisticRenderKey = getRoomMessageLocalRenderKey(optimistic.message);
    const incoming = msg(50, 2, {
      content: "hello",
      roleId: 3,
      roomId: 10,
      syncId: 50,
      userId: 5,
    });

    const result = reconcileOptimisticRoomMessagesInList([msg(1, 1), optimistic], [incoming]);

    expect(result.map(item => item.message.messageId)).toEqual([1, 50]);
    expect(getRoomMessageLocalRenderKey(result[1].message)).toBe(optimisticRenderKey);
  });

  it("reconciles optimistic image messages even when local preview extra differs from server extra", () => {
    const optimistic = createOptimisticRoomMessage({
      content: "本地说明",
      messageType: 2,
      roomId: 10,
      roleId: 3,
      extra: {
        imageMessage: {
          source: { kind: "internal", fileId: -1 },
          localFile: { name: "scene.png", size: 12 },
          width: 1,
          height: 1,
          background: false,
        },
      } as any,
    }, {
      currentUserId: 5,
      optimisticId: -1,
      position: 2,
    });
    const optimisticRenderKey = getRoomMessageLocalRenderKey(optimistic.message);
    const incoming = msg(50, 2, {
      content: "",
      messageType: 2,
      roleId: 3,
      roomId: 10,
      syncId: 50,
      userId: 5,
      extra: {
        imageMessage: {
          source: { kind: "internal", fileId: 45 },
          width: 640,
          height: 480,
          background: false,
        },
      } as any,
    });

    const result = reconcileOptimisticRoomMessagesInList([msg(1, 1), optimistic], [incoming]);

    expect(result.map(item => item.message.messageId)).toEqual([1, 50]);
    expect(getRoomMessageLocalRenderKey(result[1].message)).toBe(optimisticRenderKey);
  });

  it("keeps non-matching optimistic messages", () => {
    const optimistic = createOptimisticRoomMessage({
      content: "hello",
      messageType: 1,
      roomId: 10,
      extra: {},
    }, {
      currentUserId: 5,
      optimisticId: -1,
      position: 2,
    });
    const incoming = msg(50, 3, {
      content: "different",
      roomId: 10,
      syncId: 50,
      userId: 5,
    });

    const result = reconcileOptimisticRoomMessagesInList([msg(1, 1), optimistic], [incoming]);

    expect(result.map(item => item.message.messageId)).toEqual([1, -1, 50]);
  });

  it("prefers the optimistic message with matching position when identical texts are sent consecutively", () => {
    const firstOptimistic = createOptimisticRoomMessage({
      content: "same",
      messageType: 1,
      roomId: 10,
      extra: {},
    }, {
      currentUserId: 5,
      optimisticId: -1,
      position: 2,
    });
    const secondOptimistic = createOptimisticRoomMessage({
      content: "same",
      messageType: 1,
      roomId: 10,
      extra: {},
    }, {
      currentUserId: 5,
      optimisticId: -2,
      position: 3,
    });
    const secondRenderKey = getRoomMessageLocalRenderKey(secondOptimistic.message);
    const incomingSecond = msg(50, 3, {
      content: "same",
      roomId: 10,
      syncId: 50,
      userId: 5,
    });

    const result = reconcileOptimisticRoomMessagesInList(
      [msg(1, 1), firstOptimistic, secondOptimistic],
      [incomingSecond],
    );

    expect(result.map(item => item.message.messageId)).toEqual([1, -1, 50]);
    expect(getRoomMessageLocalRenderKey(result[2].message)).toBe(secondRenderKey);
  });
});

describe("mergeRoomMessagesForLocalState", () => {
  it("同 ID 增量缺少服务端字段时保留本地已有快照字段", () => {
    const existing = msg(10, 10, {
      annotations: ["a"],
      createTime: "2026-05-29T00:00:00.000Z",
      extra: { imageMessage: { source: { fileId: 1, kind: "internal" } } } as any,
      syncId: 20,
      updateTime: "2026-05-29T00:00:01.000Z",
    });
    const incoming = msg(10, 10, {
      annotations: undefined,
      content: "updated",
      createTime: undefined,
      extra: undefined,
      position: undefined,
      syncId: undefined,
      updateTime: undefined,
    } as Partial<Message>);

    const result = mergeRoomMessageSnapshotForLocalState(existing, incoming);

    expect(result.message.content).toBe("updated");
    expect(result.message.createTime).toBe("2026-05-29T00:00:00.000Z");
    expect(result.message.updateTime).toBe("2026-05-29T00:00:01.000Z");
    expect(result.message.syncId).toBe(20);
    expect(result.message.position).toBe(10);
    expect(result.message.annotations).toEqual(["a"]);
    expect(result.message.extra).toEqual(existing.message.extra);
  });

  it("本地 tombstone 不会被后续旧快照复活", () => {
    const deleted = msg(10, 10, { content: "deleted", status: 1, syncId: 10 });
    const stale = msg(10, 10, { content: "stale", status: 0, syncId: 9 });

    expect(mergeRoomMessagesForLocalState([deleted], [stale])).toEqual([deleted]);
  });

  it("WebSocket 真消息替换匹配乐观消息并保留本地 render key", () => {
    const optimistic = createOptimisticRoomMessage({
      content: "hello",
      extra: {},
      messageType: 1,
      roomId: 10,
      roleId: 3,
    }, {
      currentUserId: 5,
      optimisticId: -1,
      position: 2,
    });
    const optimisticRenderKey = getRoomMessageLocalRenderKey(optimistic.message);
    const incoming = msg(50, 2, {
      content: "hello",
      roleId: 3,
      roomId: 10,
      syncId: 50,
      userId: 5,
    });

    const result = mergeRoomMessagesForLocalState([msg(1, 1), optimistic], [incoming]);

    expect(result.map(item => item.message.messageId)).toEqual([1, 50]);
    expect(getRoomMessageLocalRenderKey(result[1].message)).toBe(optimisticRenderKey);
  });
});

describe("removeRoomMessageFromList / removeRoomMessagesFromList", () => {
  it("removes a single message by ID", () => {
    const messages = [msg(1, 1), msg(2, 2), msg(3, 3)];
    const result = removeRoomMessageFromList(messages, 2);
    expect(result.length).toBe(2);
    expect(result.map(m => m.message.messageId)).toEqual([1, 3]);
  });

  it("removes multiple messages by IDs", () => {
    const messages = [msg(1, 1), msg(2, 2), msg(3, 3)];
    const result = removeRoomMessagesFromList(messages, [1, 3]);
    expect(result.length).toBe(1);
    expect(result[0].message.messageId).toBe(2);
  });
});

describe("restoreRoomMessageInList / restoreRoomMessagesInList", () => {
  it("restores a message that exists in the list", () => {
    const original = msg(2, 2, { content: "original" });
    const modified = [msg(1, 1), msg(2, 2, { content: "modified" }), msg(3, 3)];
    const result = restoreRoomMessageInList(modified, original);
    expect(result.find(m => m.message.messageId === 2)?.message.content).toBe("original");
  });

  it("adds back a message that was removed", () => {
    const snapshot = msg(2, 2);
    const current = [msg(1, 1), msg(3, 3)];
    const result = restoreRoomMessageInList(current, snapshot);
    expect(result.length).toBe(3);
    expect(result.map(m => m.message.messageId).sort()).toEqual([1, 2, 3]);
  });

  it("restores multiple messages", () => {
    const snapshots = [msg(2, 2), msg(4, 4)];
    const current = [msg(1, 1), msg(3, 3)];
    const result = restoreRoomMessagesInList(current, snapshots);
    expect(result.length).toBe(4);
  });
});

describe("collectPersistedOptimisticDuplicateIds", () => {
  it("identifies negative-ID duplicates of positive-ID messages", () => {
    const messages = [
      msg(100, 1, { roomId: 10, userId: 5, roleId: 3, content: "hello" }),
      msg(-1, 2, { roomId: 10, userId: 5, roleId: 3, content: "hello" }),
    ];
    const duplicates = collectPersistedOptimisticDuplicateIds(messages);
    expect(duplicates).toEqual([-1]);
  });

  it("does not flag non-matching negative-ID messages", () => {
    const messages = [
      msg(100, 1, { roomId: 10, userId: 5, content: "hello" }),
      msg(-1, 2, { roomId: 10, userId: 5, content: "different" }),
    ];
    const duplicates = collectPersistedOptimisticDuplicateIds(messages);
    expect(duplicates).toEqual([]);
  });

  it("ignores deleted positive messages", () => {
    const messages = [
      msg(100, 1, { roomId: 10, userId: 5, content: "hello", status: 1 }),
      msg(-1, 2, { roomId: 10, userId: 5, content: "hello" }),
    ];
    const duplicates = collectPersistedOptimisticDuplicateIds(messages);
    expect(duplicates).toEqual([]);
  });

  it("uses loose matching for media messages (ignores content/annotations)", () => {
    const messages = [
      msg(100, 1, { roomId: 10, userId: 5, messageType: 2, content: "url1", annotations: ["a"] }),
      msg(-1, 2, { roomId: 10, userId: 5, messageType: 2, content: "url2", annotations: ["b"] }),
    ];
    const duplicates = collectPersistedOptimisticDuplicateIds(messages);
    expect(duplicates).toEqual([-1]);
  });

  it("uses loose matching for media messages when optimistic and server extras differ", () => {
    const messages = [
      msg(100, 1, {
        roomId: 10,
        userId: 5,
        messageType: 2,
        content: "",
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: 45 },
            width: 640,
            height: 480,
            background: false,
          },
        } as any,
      }),
      msg(-1, 2, {
        roomId: 10,
        userId: 5,
        messageType: 2,
        content: "本地说明",
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: -1 },
            localFile: { name: "scene.png", size: 12 },
            width: 1,
            height: 1,
            background: false,
          },
        } as any,
      }),
    ];
    const duplicates = collectPersistedOptimisticDuplicateIds(messages);
    expect(duplicates).toEqual([-1]);
  });

  it("uses loose matching for dice messages (ignores replyMessageId/extra)", () => {
    const messages = [
      msg(100, 1, { roomId: 10, userId: 5, messageType: 6, content: "1d20", replyMessageId: 5, extra: { diceResult: { result: "15" } } as any }),
      msg(-1, 2, { roomId: 10, userId: 5, messageType: 6, content: "1d20", replyMessageId: undefined, extra: { diceResult: { result: "8" } } as any }),
    ];
    const duplicates = collectPersistedOptimisticDuplicateIds(messages);
    expect(duplicates).toEqual([-1]);
  });
});
