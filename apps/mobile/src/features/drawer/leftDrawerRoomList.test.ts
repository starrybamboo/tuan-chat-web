import { describe, expect, it } from "vitest";

import { buildRoomListItems } from "./leftDrawerRoomList";

describe("buildRoomListItems", () => {
  it("按 sidebarTree 分类和顺序渲染移动端房间列表", () => {
    const items = buildRoomListItems({
      collapsedSections: {},
      currentSpaceId: 10,
      rooms: [
        { roomId: 1, name: "全员", roomType: 2 } as any,
        { roomId: 2, name: "游玩", roomType: 1 } as any,
        { roomId: 3, name: "备忘", roomType: 2 } as any,
      ],
      roomsIsError: false,
      roomsIsPending: false,
      sidebarTree: {
        schemaVersion: 2,
        categories: [
          {
            categoryId: "cat:story",
            name: "剧情",
            items: [
              { nodeId: "room:2", type: "room", targetId: 2 },
              { nodeId: "doc:9", type: "doc", targetId: "9" },
            ],
          },
          {
            categoryId: "cat:ooc",
            name: "场外",
            items: [
              { nodeId: "room:1", type: "room", targetId: 1 },
              { nodeId: "room:3", type: "room", targetId: 3 },
            ],
          },
        ],
      },
    });

    expect(items.map(item => item.type === "room" ? item.room.name : item.type === "section" ? item.label : item.type)).toEqual([
      "剧情",
      "游玩",
      "场外",
      "全员",
      "备忘",
    ]);
  });

  it("没有 sidebarTree 时回退到默认频道分类", () => {
    const items = buildRoomListItems({
      collapsedSections: {},
      currentSpaceId: 10,
      onCreateRoom: () => {},
      rooms: [
        { roomId: 1, name: "全员", roomType: 2 } as any,
      ],
      roomsIsError: false,
      roomsIsPending: false,
      sidebarTree: null,
    });

    expect(items).toMatchObject([
      { type: "section", label: "频道" },
      { type: "room", room: { roomId: 1 } },
      { type: "create-room" },
    ]);
  });
});
