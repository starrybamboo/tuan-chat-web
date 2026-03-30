import { buildMaterialPackageImportSuccessMessage, getMaterialPackageDisplayName } from "./materialPackageImportFeedback";

describe("materialPackageImportFeedback", () => {
  it("会为导入成功提示补齐素材包名称", () => {
    expect(buildMaterialPackageImportSuccessMessage("  场景整包  ")).toBe("已将「场景整包」导入到当前空间");
  });

  it("会为空名称回退未命名素材包", () => {
    expect(getMaterialPackageDisplayName("   ")).toBe("未命名素材包");
    expect(buildMaterialPackageImportSuccessMessage()).toBe("已将「未命名素材包」导入到当前空间");
  });
});
