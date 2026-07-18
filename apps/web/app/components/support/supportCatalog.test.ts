import {
  SUPPORT_FAQ_IDS,
  SUPPORT_FAQS,
  SUPPORT_ISSUE_IDS,
  SUPPORT_ISSUES,
  SUPPORT_TERM_IDS,
  SUPPORT_TERMS,
} from "./supportCatalog";

describe("supportCatalog", () => {
  it("目录键与强类型 ID 清单保持一致", () => {
    expect(Object.keys(SUPPORT_TERMS)).toEqual([...SUPPORT_TERM_IDS]);
    expect(Object.keys(SUPPORT_FAQS)).toEqual([...SUPPORT_FAQ_IDS]);
    expect(Object.keys(SUPPORT_ISSUES)).toEqual([...SUPPORT_ISSUE_IDS]);
  });

  it("所有问题与 FAQ 引用都能解析", () => {
    for (const issue of Object.values(SUPPORT_ISSUES)) {
      for (const termId of issue.termIds) {
        expect(SUPPORT_TERMS[termId]).toBeDefined();
      }
      for (const faqId of issue.faqIds) {
        expect(SUPPORT_FAQS[faqId]).toBeDefined();
      }
    }

    for (const faq of Object.values(SUPPORT_FAQS)) {
      for (const termId of faq.termIds) {
        expect(SUPPORT_TERMS[termId]).toBeDefined();
      }
    }
  });

  it("开发别名与用户术语、关联术语保持不同职责", () => {
    expect(SUPPORT_TERMS["space-sidebar"]).toMatchObject({
      name: "空间栏",
      developerAliases: expect.arrayContaining(["ChatSpaceSidebar"]),
      relatedTermIds: expect.arrayContaining(["space"]),
    });
    expect(SUPPORT_TERMS.host.name).toBe("主持人");
    expect(SUPPORT_TERMS["space-owner"].name).toBe("空间所有者");
  });
});
