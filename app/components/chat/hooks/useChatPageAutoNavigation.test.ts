import { shouldAutoSelectFirstRoom } from "./useChatPageAutoNavigation";

describe("useChatPageAutoNavigation", () => {
  describe("shouldAutoSelectFirstRoom", () => {
    it("returns false for doc routes", () => {
      expect(
        shouldAutoSelectFirstRoom({
          activeSpaceId: 1,
          isDocRoute: true,
          isPrivateChatMode: false,
          urlRoomId: undefined,
        }),
      ).toBe(false);
    });

    it("returns true when room id is missing in normal space routes", () => {
      expect(
        shouldAutoSelectFirstRoom({
          activeSpaceId: 1,
          isDocRoute: false,
          isPrivateChatMode: false,
          urlRoomId: undefined,
        }),
      ).toBe(true);
    });

    it("returns false when room id exists in URL", () => {
      expect(
        shouldAutoSelectFirstRoom({
          activeSpaceId: 1,
          isDocRoute: false,
          isPrivateChatMode: false,
          urlRoomId: "100",
        }),
      ).toBe(false);
    });
  });
});
