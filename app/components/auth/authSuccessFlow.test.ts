import { describe, expect, it, vi } from "vitest";

import { runAuthSuccessFlow } from "./authSuccessFlow";

describe("runAuthSuccessFlow", () => {
  it("runs route-specific success handler without closing the modal first", () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const invalidateRouter = vi.fn();

    const result = runAuthSuccessFlow({
      invalidateRouter,
      onClose,
      onSuccess,
    });

    expect(result).toBe("custom-success");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(invalidateRouter).not.toHaveBeenCalled();
  });

  it("closes popup login and refreshes router data by default", () => {
    const onClose = vi.fn();
    const invalidateRouter = vi.fn();

    const result = runAuthSuccessFlow({
      invalidateRouter,
      onClose,
    });

    expect(result).toBe("default-close");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(invalidateRouter).toHaveBeenCalledTimes(1);
  });
});
