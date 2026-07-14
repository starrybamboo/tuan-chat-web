import { shouldShowRoomSelectionLoading } from "./chatPageLoadingState";

describe("shouldShowRoomSelectionLoading", () => {
  it("keeps loading visible until the sidebar tree is ready", () => {
    expect(shouldShowRoomSelectionLoading({
      activeSpaceId: 1,
      activeRoomId: null,
      isSidebarTreeReady: false,
      isUserRoomsPending: false,
    })).toBe(true);
  });

  it("keeps loading visible while the room list is pending", () => {
    expect(shouldShowRoomSelectionLoading({
      activeSpaceId: 1,
      activeRoomId: null,
      isSidebarTreeReady: true,
      isUserRoomsPending: true,
    })).toBe(true);
  });

  it("ends loading after room selection sources settle", () => {
    expect(shouldShowRoomSelectionLoading({
      activeSpaceId: 1,
      activeRoomId: null,
      isSidebarTreeReady: true,
      isUserRoomsPending: false,
    })).toBe(false);
  });

  it("ends loading when a room is selected or no space is active", () => {
    expect(shouldShowRoomSelectionLoading({
      activeSpaceId: 1,
      activeRoomId: 2,
      isSidebarTreeReady: false,
      isUserRoomsPending: true,
    })).toBe(false);
    expect(shouldShowRoomSelectionLoading({
      activeSpaceId: null,
      activeRoomId: null,
      isSidebarTreeReady: false,
      isUserRoomsPending: true,
    })).toBe(false);
  });
});
