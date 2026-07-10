import { describe, expect, it } from "vitest";

import {
  buildDefaultSidebarTree,
  collectExistingDocIds,
  findSidebarCategoryIdForTarget,
  extractDocMetasFromSidebarTree,
  normalizeSidebarTree,
} from "./sidebarTree";

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
        {
          id: "22",
          title: "设定集",
          imageUrl: "https://legacy.example.com/cover.png",
          imageFileId: 42,
          imageMediaType: "image",
        },
      ],
      includeDocs: true,
    });

    expect(tree.categories.map(category => category.categoryId)).toEqual(["cat:channels", "cat:docs"]);
    expect(tree.categories[1]?.items[0]).toMatchObject({
      nodeId: "doc:22",
      type: "doc",
      targetId: "22",
      fallbackImageFileId: 42,
      fallbackImageMediaType: "image",
    });
    expect(tree.categories[1]?.items[0]).not.toHaveProperty("fallbackImageUrl");
  });

  it("normalizeSidebarTree 会过滤未知类型节点但保留其他分类", () => {
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

  it("文档侧边栏缓存有 fileId 时不会继续固化 legacy fallbackImageUrl", () => {
    const tree = normalizeSidebarTree({
      tree: {
        schemaVersion: 2,
        categories: [
          {
            categoryId: "cat:docs",
            name: "文档",
            items: [{
              nodeId: "doc:22",
              type: "doc",
              targetId: "22",
              fallbackTitle: "设定集",
              fallbackImageUrl: "https://legacy.example.com/cover.png",
              fallbackImageFileId: 42,
              fallbackImageMediaType: "image",
            }],
          },
        ],
      },
      roomsInSpace: [],
      docMetas: [{
        id: "22",
        title: "设定集",
        imageUrl: "https://legacy.example.com/meta-cover.png",
        imageFileId: 42,
        imageMediaType: "image",
      }],
      includeDocs: true,
    });

    expect(tree.categories[0]?.items[0]).toMatchObject({
      fallbackImageFileId: 42,
      fallbackImageMediaType: "image",
    });
    expect(tree.categories[0]?.items[0]).not.toHaveProperty("fallbackImageUrl");
    expect(extractDocMetasFromSidebarTree(tree)[0]).toEqual({
      id: "22",
      title: "设定集",
      imageFileId: 42,
      imageMediaType: "image",
    });
  });

  it("normalizeSidebarTree 会把 numeric targetId 统一成规范字符串", () => {
    const tree = normalizeSidebarTree({
      tree: {
        schemaVersion: 2,
        categories: [
          {
            categoryId: "cat:docs",
            name: "文档",
            items: [
              {
                nodeId: "doc:23",
                type: "doc",
                targetId: 23,
                fallbackTitle: "数字文档",
              },
            ],
          },
        ],
      } as any,
      roomsInSpace: [],
      docMetas: [
        { id: "23", title: "数字文档" },
      ],
      includeDocs: true,
    });

    expect(tree.categories[0]?.items).toEqual([
      {
        nodeId: "doc:23",
        type: "doc",
        targetId: "23",
        fallbackTitle: "数字文档",
      },
    ]);
    expect(extractDocMetasFromSidebarTree(tree)).toEqual([
      { id: "23", title: "数字文档" },
    ]);
    expect(collectExistingDocIds(tree)).toEqual(new Set(["23"]));
  });

  it("extractDocMetasFromSidebarTree 会忽略未 remap 的 legacy sdoc 节点", () => {
    const tree = {
      schemaVersion: 2,
      categories: [
        {
          categoryId: "cat:docs",
          name: "文档",
          items: [
            {
              nodeId: "doc:sdoc:22:description",
              type: "doc",
              targetId: "sdoc:22:description",
              fallbackTitle: "旧文档",
            },
          ],
        },
      ],
    } as any;

    expect(extractDocMetasFromSidebarTree(tree)).toEqual([]);
    expect(collectExistingDocIds(tree)).toEqual(new Set());
  });

  it("findSidebarCategoryIdForTarget 可以定位 room 和 doc 所在分类", () => {
    const tree = {
      schemaVersion: 2,
      categories: [
        {
          categoryId: "cat:alpha",
          name: "A",
          items: [
            { nodeId: "room:11", type: "room", targetId: 11 },
          ],
        },
        {
          categoryId: "cat:beta",
          name: "B",
          items: [
            { nodeId: "doc:22", type: "doc", targetId: "22" },
          ],
        },
      ],
    } satisfies Parameters<typeof findSidebarCategoryIdForTarget>[0];

    expect(findSidebarCategoryIdForTarget(tree, { type: "room", id: 11 })).toBe("cat:alpha");
    expect(findSidebarCategoryIdForTarget(tree, { type: "doc", id: "22" })).toBe("cat:beta");
    expect(findSidebarCategoryIdForTarget(tree, { type: "room", id: 99 })).toBeNull();
  });
});
