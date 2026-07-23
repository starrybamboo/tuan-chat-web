import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { Message } from "../../../../../api";

import {
  getRoomMessageEditorSyncEntry,
  resetRoomMessageEditorSyncEntries,
} from "./roomMessageEditSyncRegistry";

describe("room message editor sync registry", () => {
  it("Query 会话重置后不复用上一账号的房间 coordinator", () => {
    const queryClient = new QueryClient();
    const options = { prepareConfirmedMessage: (message: Message) => message };
    const first = getRoomMessageEditorSyncEntry(queryClient, 9, options);

    resetRoomMessageEditorSyncEntries(queryClient);
    const second = getRoomMessageEditorSyncEntry(queryClient, 9, options);

    expect(second.coordinator).not.toBe(first.coordinator);
  });
});
