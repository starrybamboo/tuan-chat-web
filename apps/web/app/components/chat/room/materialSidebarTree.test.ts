import { describe, expect, it } from "vitest";

import { MaterialNode as MaterialNodeModel } from "@tuanchat/openapi-client/models/MaterialNode";

import { buildMaterialSidebarTree, collectMaterialExpandableKeys } from "./materialSidebarTree";

describe("materialSidebarTree", () => {
  it("会把素材包内容镜像成可渲染的虚拟树", () => {
    const tree = buildMaterialSidebarTree({
      spacePackageId: 12,
      nodes: [
        {
          type: MaterialNodeModel.type.FOLDER,
          name: "角色",
          children: [
            {
              type: MaterialNodeModel.type.MATERIAL,
              name: "阿青立绘",
              messages: [{ messageType: 2 }, { messageType: 2 }],
            },
          ],
        },
      ],
    });

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      key: "material-package:12:0",
      kind: "folder",
      label: "角色",
      depth: 1,
    });
    expect(tree[0]?.children[0]).toMatchObject({
      key: "material-package:12:0.0",
      kind: "material",
      label: "阿青立绘",
      depth: 2,
      messageCount: 2,
      children: [],
    });
  });

  it("只收集文件夹节点作为可展开 key", () => {
    const tree = buildMaterialSidebarTree({
      spacePackageId: 3,
      nodes: [
        {
          type: MaterialNodeModel.type.FOLDER,
          name: "场景",
          children: [
            {
              type: MaterialNodeModel.type.FOLDER,
              name: "白天",
              children: [],
            },
            {
              type: MaterialNodeModel.type.MATERIAL,
              name: "街道背景",
              messages: [{ messageType: 2 }],
            },
          ],
        },
      ],
    });

    expect(collectMaterialExpandableKeys(tree)).toEqual([
      "material-package:3:0",
    ]);
  });
});
