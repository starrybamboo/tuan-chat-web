import { describe, expect, it } from "vitest";

import { buttonClassName } from "./Button";

describe("buttonClassName", () => {
  it("禁用态覆盖业务附加的强调色", () => {
    const className = buttonClassName({
      variant: "outline",
      className: "border-info/45 text-info",
    });

    expect(className).toContain("disabled:border-transparent");
    expect(className).toContain("disabled:text-base-content/25");
    expect(className).toContain("disabled:shadow-none");
  });
});
