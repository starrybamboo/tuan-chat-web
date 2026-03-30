import { buildGlobalMaterialPackageCardModel, buildSpaceMaterialPackageCardModel } from "./materialPackageLibraryModels";

describe("materialPackageLibraryModels", () => {
  it("会为公开素材包生成统一卡片模型", () => {
    const model = buildGlobalMaterialPackageCardModel({
      packageId: 12,
      name: "  古堡场景  ",
      username: "  Alice  ",
      materialCount: 4,
      folderCount: 2,
      messageCount: 9,
    }, "public");

    expect(model.name).toBe("古堡场景");
    expect(model.subtitle).toBe("贡献人 · Alice");
    expect(model.badgeLabel).toBe("公开素材");
    expect(model.placeholderIcon).toBe("package");
    expect(model.placeholderSeed).toBe("古堡场景12");
  });

  it("会为局内导入副本生成统一卡片模型", () => {
    const model = buildSpaceMaterialPackageCardModel({
      spacePackageId: 18,
      name: "  审讯室副本  ",
      sourcePackageId: 91,
      materialCount: 3,
      folderCount: 1,
      messageCount: 5,
    });

    expect(model.name).toBe("审讯室副本");
    expect(model.subtitle).toBe("来源局外素材包 #91");
    expect(model.badgeLabel).toBe("导入副本");
    expect(model.placeholderIcon).toBe("house");
    expect(model.placeholderSeed).toBe("审讯室副本18");
  });
});
