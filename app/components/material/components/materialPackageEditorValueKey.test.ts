import {
  buildGlobalMaterialPackageEditorValueKey,
  buildSpaceMaterialPackageEditorValueKey,
} from "./materialPackageEditorValueKey";

describe("materialPackageEditorValueKey", () => {
  it("同一个局外素材包在自动保存刷新后保持稳定 key", () => {
    const beforeRefresh = {
      packageId: 42,
      updateTime: "2026-04-10 10:00:00",
    };
    const afterRefresh = {
      packageId: 42,
      updateTime: "2026-04-10 10:00:05",
    };

    expect(buildGlobalMaterialPackageEditorValueKey("mine", beforeRefresh))
      .toBe(buildGlobalMaterialPackageEditorValueKey("mine", afterRefresh));
  });

  it("同一个局内素材包在自动保存刷新后保持稳定 key", () => {
    const beforeRefresh = {
      spacePackageId: 7,
      updateTime: "2026-04-10 10:00:00",
    };
    const afterRefresh = {
      spacePackageId: 7,
      updateTime: "2026-04-10 10:00:05",
    };

    expect(buildSpaceMaterialPackageEditorValueKey(beforeRefresh))
      .toBe(buildSpaceMaterialPackageEditorValueKey(afterRefresh));
    expect(buildSpaceMaterialPackageEditorValueKey(beforeRefresh, "sub-window"))
      .toBe(buildSpaceMaterialPackageEditorValueKey(afterRefresh, "sub-window"));
  });

  it("不同素材包仍然生成不同 key", () => {
    expect(buildGlobalMaterialPackageEditorValueKey("mine", { packageId: 1 }))
      .not.toBe(buildGlobalMaterialPackageEditorValueKey("mine", { packageId: 2 }));

    expect(buildSpaceMaterialPackageEditorValueKey({ spacePackageId: 1 }))
      .not.toBe(buildSpaceMaterialPackageEditorValueKey({ spacePackageId: 2 }));
  });
});
