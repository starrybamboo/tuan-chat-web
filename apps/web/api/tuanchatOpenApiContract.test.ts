import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type PathItem = Record<string, unknown>;

type OpenApiSpec = {
  components?: {
    schemas?: Record<string, { properties?: Record<string, unknown> } | undefined>;
  };
  paths?: Record<string, PathItem | undefined>;
};

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const specFiles = [
  ["api OpenAPI JSON", "apps/web/api/tuanchat_OpenAPI.json"],
  ["generated client OpenAPI JSON", "packages/tuanchat-openapi-client/tuanchat_OpenAPI.json"],
] as const;

const removedExactPaths = [
  "/chat/rooms/{roomId}/messages/patch",
  "/chat/message/batch",
  "/chat/message/page",
  "/chat/message/all",
  "/chat/messages/batch",
];

const removedPathPrefixes = [
  "/chat/message-stream",
  "/chat/rooms/{roomId}/messages/snapshot",
  "/doc-room",
];

function readSpec(relativePath: string): OpenApiSpec {
  const raw = readFileSync(resolve(workspaceRoot, relativePath), "utf8");
  return JSON.parse(raw);
}

describe("chat OpenAPI contract", () => {
  for (const [label, relativePath] of specFiles) {
    it(`${label} exposes current room message APIs without obsolete paths`, () => {
      const paths = readSpec(relativePath).paths ?? {};

      expect(paths["/chat/message/patch"]?.post).toBeDefined();
      expect(paths["/chat/message/history"]?.post).toBeDefined();
      expect(paths["/chat/message/sync"]?.get).toBeDefined();
      expect(paths["/chat/message/sync"]?.post).toBeUndefined();

      for (const path of removedExactPaths) {
        expect(paths[path]).toBeUndefined();
      }

      for (const path of Object.keys(paths)) {
        expect(removedPathPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))).toBe(false);
      }
    });

    it(`${label} exposes canonical space and ability APIs without trailing-slash duplicates`, () => {
      const paths = readSpec(relativePath).paths ?? {};

      expect(paths["/space"]?.post).toBeDefined();
      expect(paths["/space"]?.put).toBeDefined();
      expect(paths["/space/archive"]?.put).toBeDefined();
      expect(paths["/space/"]).toBeUndefined();

      expect(paths["/role/ability"]?.put).toBeUndefined();
      expect(paths["/role/ability/field"]).toBeUndefined();
      expect(paths["/role/ability/"]).toBeUndefined();
      expect(paths["/role/ability/byRule"]).toBeUndefined();
      expect(paths["/role/ability/byRule/field"]).toBeUndefined();
      expect(paths["/role/ability/by-rule"]?.get).toBeDefined();
      expect(paths["/role/ability/by-rule"]?.put).toBeDefined();
      expect(paths["/role/ability/by-rule/field"]?.put).toBeDefined();

      expect(paths["/room"]?.put).toBeDefined();
      expect(paths["/room/member"]?.post).toBeDefined();
      expect(paths["/room/member"]?.delete).toBeDefined();
      expect(paths["/room/role"]?.post).toBeDefined();
      expect(paths["/room/role"]?.delete).toBeDefined();
      expect(paths["/space/member"]?.post).toBeDefined();
      expect(paths["/space/member"]?.delete).toBeDefined();
      expect(paths["/room/"]).toBeUndefined();
      expect(paths["/room/member/"]).toBeUndefined();
      expect(paths["/room/role/"]).toBeUndefined();
      expect(paths["/space/member/"]).toBeUndefined();

      const trailingSlashPaths = Object.keys(paths)
        .filter(path => path.length > 1 && path.endsWith("/"))
        .sort();
      expect(trailingSlashPaths).toEqual([]);

      const rawPathsByNormalizedPath = new Map<string, string[]>();
      for (const path of Object.keys(paths)) {
        const normalized = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
        rawPathsByNormalizedPath.set(normalized, [...(rawPathsByNormalizedPath.get(normalized) ?? []), path]);
      }

      const duplicatePaths = [...rawPathsByNormalizedPath.values()].filter(rawPaths => rawPaths.length > 1);
      expect(duplicatePaths).toEqual([]);
    });

    it(`${label} keeps room membership identity out of RoomMember`, () => {
      const schemas = readSpec(relativePath).components?.schemas ?? {};
      const roomMemberProperties = schemas.RoomMember?.properties ?? {};

      expect(roomMemberProperties.roomId).toBeDefined();
      expect(roomMemberProperties.userId).toBeDefined();
      expect(roomMemberProperties.memberType).toBeUndefined();
    });

    it(`${label} keeps legacy role voice URL out of role schemas`, () => {
      const schemas = readSpec(relativePath).components?.schemas ?? {};
      const userRoleProperties = schemas.UserRole?.properties ?? {};
      const roleUpdateProperties = schemas.RoleUpdateRequest?.properties ?? {};

      expect(userRoleProperties.voiceFileId).toBeDefined();
      expect(userRoleProperties.voiceUrl).toBeUndefined();
      expect(roleUpdateProperties.voiceFileId).toBeDefined();
      expect(roleUpdateProperties.voiceUrl).toBeUndefined();
    });

    it(`${label} keeps legacy avatar URLs out of fileId-backed avatar schemas`, () => {
      const schemas = readSpec(relativePath).components?.schemas ?? {};
      const schemaNames = [
        "UserInfoResponse",
        "UserPrivateInfoResponse",
        "UserProfileInfoResponse",
        "Room",
        "Space",
        "RoomMember",
        "SpaceMember",
        "UserRole",
      ];
      const legacyAvatarFields = [
        "avatar",
        "originalAvatar",
        "avatarUrl",
        "avatarThumbUrl",
      ];

      for (const schemaName of schemaNames) {
        const properties = schemas[schemaName]?.properties ?? {};

        expect(properties.avatarFileId, schemaName).toBeDefined();
        for (const legacyField of legacyAvatarFields) {
          expect(properties[legacyField], `${schemaName}.${legacyField}`).toBeUndefined();
        }
      }
    });

    it(`${label} keeps moment feed image URLs out of create request schema`, () => {
      const schemas = readSpec(relativePath).components?.schemas ?? {};
      const momentFeedProperties = schemas.MomentFeedRequest?.properties ?? {};

      expect(momentFeedProperties.imageFileIds).toBeDefined();
      expect(momentFeedProperties.imageUrls).toBeUndefined();
      expect(momentFeedProperties.originalImageUrls).toBeUndefined();
    });

    it(`${label} keeps derived map image URLs out of state event schema`, () => {
      const schemas = readSpec(relativePath).components?.schemas ?? {};
      const stateEventAtomProperties = schemas.StateEventAtom?.properties ?? {};

      expect(stateEventAtomProperties.mapFileId).toBeDefined();
      expect(stateEventAtomProperties.imageUrl).toBeUndefined();
    });
  }
});
