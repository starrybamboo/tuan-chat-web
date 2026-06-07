import { describe, expect, it, vi } from "vitest";

import { installBoundWindowTimers } from "./windowTimerBinding";

describe("windowTimerBinding", () => {
  it("binds cached timer functions to the Window target", () => {
    const target = {
      clearInterval: vi.fn(function (this: any) {
        if (this !== target)
          throw new TypeError("Can only call Window.clearInterval on instances of Window");
      }),
      clearTimeout: vi.fn(function (this: any) {
        if (this !== target)
          throw new TypeError("Can only call Window.clearTimeout on instances of Window");
      }),
      setInterval: vi.fn(function (this: any) {
        if (this !== target)
          throw new TypeError("Can only call Window.setInterval on instances of Window");
        return 1 as unknown as ReturnType<Window["setInterval"]>;
      }),
      setTimeout: vi.fn(function (this: any) {
        if (this !== target)
          throw new TypeError("Can only call Window.setTimeout on instances of Window");
        return 1 as unknown as ReturnType<Window["setTimeout"]>;
      }),
    } as unknown as Window;

    installBoundWindowTimers(target);

    const { clearInterval, clearTimeout, setInterval, setTimeout } = target;

    expect(() => setTimeout(() => {}, 0)).not.toThrow();
    expect(() => clearTimeout(1)).not.toThrow();
    expect(() => setInterval(() => {}, 0)).not.toThrow();
    expect(() => clearInterval(1)).not.toThrow();
  });
});
