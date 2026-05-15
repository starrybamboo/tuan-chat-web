import { vi } from "vitest";

import useRoomEffectsController from "./useRoomEffectsController";

const mocks = vi.hoisted(() => ({
  toastSuccessMock: vi.fn<(...args: any[]) => any>(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    default: actual,
    useCallback: (fn: any) => fn,
    useEffect: vi.fn<(...args: any[]) => any>(),
    useState: (value: any) => [value, vi.fn<(...args: any[]) => any>()] as const,
  };
});

vi.mock("react-hot-toast", () => ({
  toast: {
    error: vi.fn<(...args: any[]) => any>(),
    success: mocks.toastSuccessMock,
  },
}));

describe("useRoomEffectsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("清除立绘发送失败时不清本地状态也不提示成功", async () => {
    const clearRealtimeFigure = vi.fn<(...args: any[]) => any>();
    const { handleClearFigure } = useRoomEffectsController({
      roomId: 1,
      sendMessageWithInsert: vi.fn<(...args: any[]) => any>(async () => null),
      isRealtimeRenderActive: true,
      clearRealtimeFigure,
    });

    await handleClearFigure();

    expect(clearRealtimeFigure).not.toHaveBeenCalled();
    expect(mocks.toastSuccessMock).not.toHaveBeenCalled();
  });
});
