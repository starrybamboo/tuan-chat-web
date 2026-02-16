import { getDocRouteInfo, getSpaceDetailRouteTab, parsePositiveNumber } from "./chatPageRouteUtils";

describe("chatPageRouteUtils", () => {
  describe("parsePositiveNumber", () => {
    it("returns number for positive numeric strings", () => {
      expect(parsePositiveNumber("1")).toBe(1);
      expect(parsePositiveNumber("001")).toBe(1);
    });

    it("returns null for invalid values", () => {
      expect(parsePositiveNumber()).toBeNull();
      expect(parsePositiveNumber("")).toBeNull();
      expect(parsePositiveNumber("0")).toBeNull();
      expect(parsePositiveNumber("-1")).toBeNull();
      expect(parsePositiveNumber("abc")).toBeNull();
    });
  });

  describe("getSpaceDetailRouteTab", () => {
    it("returns tab for valid space detail route", () => {
      expect(getSpaceDetailRouteTab({ isPrivateChatMode: false, urlRoomId: "members" })).toBe("members");
      expect(getSpaceDetailRouteTab({ isPrivateChatMode: false, urlRoomId: "workflow" })).toBe("workflow");
      expect(getSpaceDetailRouteTab({ isPrivateChatMode: false, urlRoomId: "webgal" })).toBe("webgal");
    });

    it("returns null when private chat or message id provided", () => {
      expect(getSpaceDetailRouteTab({ isPrivateChatMode: true, urlRoomId: "members" })).toBeNull();
      expect(getSpaceDetailRouteTab({ isPrivateChatMode: false, urlRoomId: "members", urlMessageId: "1" })).toBeNull();
    });

    it("returns null for non-detail tabs", () => {
      expect(getSpaceDetailRouteTab({ isPrivateChatMode: false, urlRoomId: "unknown" })).toBeNull();
    });
  });

  describe("getDocRouteInfo", () => {
    it("returns empty info when not doc route", () => {
      expect(getDocRouteInfo({ isDocRoute: false })).toEqual({
        decodedDocId: null,
        activeDocId: null,
        isInvalidSpaceDocId: false,
      });
    });

    it("parses numeric doc id to space doc id", () => {
      expect(getDocRouteInfo({ isDocRoute: true, rawDocId: "12" })).toEqual({
        decodedDocId: "12",
        activeDocId: "sdoc:12:description",
        isInvalidSpaceDocId: false,
      });
    });

    it("flags independent space doc ids as invalid", () => {
      expect(getDocRouteInfo({ isDocRoute: true, rawDocId: "sdoc:5:description" })).toEqual({
        decodedDocId: "sdoc:5:description",
        activeDocId: null,
        isInvalidSpaceDocId: true,
      });
    });

    it("keeps non-independent space doc ids", () => {
      expect(getDocRouteInfo({ isDocRoute: true, rawDocId: "room:3:description" })).toEqual({
        decodedDocId: "room:3:description",
        activeDocId: "room:3:description",
        isInvalidSpaceDocId: false,
      });
    });
  });
});
