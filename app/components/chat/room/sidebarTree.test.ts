import { describe, expect, it } from "vitest";

import { MATERIALS_CATEGORY_ID, buildDefaultSidebarTree, normalizeSidebarTree } from "./sidebarTree";

describe("sidebarTree", () => {
  it("buildDefaultSidebarTree 会为局内素材包生成默认分类", () => {
    const tree = buildDefaultSidebarTree({
      roomsInSpace: [
        { roomId: 11, name: "大厅" } as any,
      ],
      docMetas: [],
      includeDocs: false,
      materialPackages: [
        { id: 101, title: "角色设定集", imageUrl: "https://example.com/a.png" },
        { id: 102, title: "场景参考" },
      ],
    });

    expect(tree.categories.map(category => category.categoryId)).toContain(MATERIALS_CATEGORY_ID);
    const materialCategory = tree.categories.find(category => category.categoryId === MATERIALS_CATEGORY_ID);
    expect(materialCategory?.items.map(item => item.nodeId)).toEqual([
      "material-package:101",
      "material-package:102",
    ]);
  });

  it("buildDefaultSidebarTree 在没有素材包时也会保留空的素材包分类", () => {
    const tree = buildDefaultSidebarTree({
      roomsInSpace: [
        { roomId: 11, name: "大厅" } as any,
      ],
      docMetas: [],
      includeDocs: false,
      materialPackages: [],
    });

    const materialCategory = tree.categories.find(category => category.categoryId === MATERIALS_CATEGORY_ID);
    expect(materialCategory).toBeTruthy();
    expect(materialCategory?.items).toEqual([]);
  });

  it("normalizeSidebarTree 会自动补齐缺失的素材包节点", () => {
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
            ],
          },
        ],
      },
      roomsInSpace: [
        { roomId: 11, name: "大厅" } as any,
      ],
      docMetas: [],
      includeDocs: false,
      materialPackages: [
        { id: 201, title: "角色卡" },
      ],
    });

    const materialCategory = tree.categories.find(category => category.categoryId === MATERIALS_CATEGORY_ID);
    expect(materialCategory?.items).toHaveLength(1);
    expect(materialCategory?.items[0]).toMatchObject({
      nodeId: "material-package:201",
      type: "material-package",
      targetId: 201,
      fallbackTitle: "角色卡",
    });
  });

  it("normalizeSidebarTree 会过滤已失效的素材包节点", () => {
    const tree = normalizeSidebarTree({
      tree: {
        schemaVersion: 2,
        categories: [
          {
            categoryId: MATERIALS_CATEGORY_ID,
            name: "素材包",
            items: [
              {
                nodeId: "material-package:301",
                type: "material-package",
                targetId: 301,
                fallbackTitle: "旧素材包",
              },
            ],
          },
        ],
      },
      roomsInSpace: [],
      docMetas: [],
      includeDocs: false,
      materialPackages: [],
    });

    expect(tree.categories).toHaveLength(1);
    expect(tree.categories[0]?.items).toHaveLength(0);
  });
});
