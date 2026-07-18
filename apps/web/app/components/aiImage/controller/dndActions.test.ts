import { describe, expect, it, vi } from "vitest";

import { pageImageDragOverAction } from "@/components/aiImage/controller/dndActions";

function createDragEvent(dataTransfer: DataTransfer | null) {
  return {
    dataTransfer,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as DragEvent;
}

describe("pageImageDragOverAction", () => {
  it("ignores drag events without data transfer state", () => {
    const event = createDragEvent(null);
    const setIsPageImageDragOver = vi.fn();

    pageImageDragOverAction({
      event,
      isDirectorToolsOpen: false,
      isPageImageDragOver: false,
      setIsPageImageDragOver,
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(setIsPageImageDragOver).not.toHaveBeenCalled();
  });

  it("marks supported file drags as copy operations", () => {
    const dataTransfer = {
      types: ["Files"],
      dropEffect: "none",
    } as unknown as DataTransfer;
    const event = createDragEvent(dataTransfer);
    const setIsPageImageDragOver = vi.fn();

    pageImageDragOverAction({
      event,
      isDirectorToolsOpen: false,
      isPageImageDragOver: false,
      setIsPageImageDragOver,
    });

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(dataTransfer.dropEffect).toBe("copy");
    expect(setIsPageImageDragOver).toHaveBeenCalledWith(true);
  });
});
