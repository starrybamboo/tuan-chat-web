import { buildMaterialPackageEditorDraft } from "./materialPackageEditorDraft";

describe("materialPackageEditorDraft", () => {
  it("新建素材包时默认设为不公开", () => {
    expect(buildMaterialPackageEditorDraft().isPublic).toBe(false);
  });

  it("已有素材包时保留后端返回的公开状态", () => {
    expect(buildMaterialPackageEditorDraft({ isPublic: true }).isPublic).toBe(true);
    expect(buildMaterialPackageEditorDraft({ isPublic: false }).isPublic).toBe(false);
  });
});
