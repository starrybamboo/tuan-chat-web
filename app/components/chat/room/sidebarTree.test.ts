import { describe, expect, it } from "vitest";

import { buildDefaultSidebarTree, normalizeSidebarTree } from "./sidebarTree";

describe("sidebarTree", () => {
  it("buildDefaultSidebarTree 默认只生成频道分类", () => {
    const tree = buildDefaultSidebarTree({
      roomsInSpace: [
        { roomId: 11, name: "大厅" } as any,
      ],
      docMetas: [],
      includeDocs: false,
    });

    expect(tree.categories.map(category => category.categoryId)).toEqual(["cat:channels"]);
    expect(tree.categories[0]?.items[0]).toMatchObject({
      nodeId: "room:11",
      type: "room",
      targetId: 11,
    });
  });

  it("buildDefaultSidebarTree 在可见文档场景下保留文档分类", () => {
    const tree = buildDefaultSidebarTree({
      roomsInSpace: [
        { roomId: 11, name: "大厅" } as any,
      ],
      docMetas: [
        { id: "sdoc:22:description", title: "设定集" },
      ],
      includeDocs: true,
    });

    expect(tree.categories.map(category => category.categoryId)).toEqual(["cat:channels", "cat:docs"]);
    expect(tree.categories[1]?.items[0]).toMatchObject({
      nodeId: "doc:sdoc:22:description",
      type: "doc",
      targetId: "sdoc:22:description",
    });
  });

  it("normalizeSidebarTree 会过滤遗留的素材包分类", () => {
    const tree = normalizeSidebarTree({
      tree: {
        schemaVersion: 2,
        categories: [
          {
            categoryId: "cat:materials",
            name: "素材包",
            items: [
              {
                nodeId: "material-package:201",
                type: "material-package",
                targetId: 201,
                fallbackTitle: "角色卡",
              },
            ],
          },
        ],
      } as any,
      roomsInSpace: [],
      docMetas: [],
      includeDocs: false,
    });

    expect(tree.categories).toEqual([
      {
        categoryId: "cat:channels",
        name: "频道",
        items: [],
      },
    ]);
  });

  it("normalizeSidebarTree 会过滤遗留的素材包节点但保留其他分类", () => {
    const tree = normalizeSidebarTree({
      tree: {
        schemaVersion: 2,
        categories: [
          {
            categoryId: "cat:channels",
            name: "频道",
            items: [
              {
                nodeId: "room:11",
                type: "room",
                targetId: 11,
                fallbackTitle: "大厅",
              },
              {
                nodeId: "material-package:301",
                type: "material-package",
                targetId: 301,
                fallbackTitle: "旧素材包",
              },
            ],
          },
        ],
      } as any,
      roomsInSpace: [
        { roomId: 11, name: "大厅" } as any,
      ],
      docMetas: [],
      includeDocs: false,
    });

    expect(tree.categories).toHaveLength(1);
    expect(tree.categories[0]?.items).toEqual([
      {
        nodeId: "room:11",
        type: "room",
        targetId: 11,
        fallbackTitle: "大厅",
      },
    ]);
  });
});
