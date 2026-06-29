import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const shareMock = vi.fn();
const platformState = { OS: "ios" };
const clipboardMock = vi.fn();

const fileSystemMock = vi.hoisted(() => {
  const directories = new Set<string>(["file:///mock/document"]);
  const files = new Map<string, string>();

  function getUriPart(part: string | { uri: string }): string {
    return typeof part === "string" ? part : part.uri;
  }

  function joinUri(...parts: (string | { uri: string })[]): string {
    return parts
      .map(getUriPart)
      .filter(Boolean)
      .map((part, index) => index === 0 ? part.replace(/\/+$/, "") : part.replace(/^\/+|\/+$/g, ""))
      .join("/");
  }

  class MockDirectory {
    static pickDirectoryAsync = vi.fn(async () => new MockDirectory("file:///picked"));

    readonly uri: string;

    constructor(...parts: (string | { uri: string })[]) {
      this.uri = joinUri(...parts);
    }

    get exists() {
      return directories.has(this.uri);
    }

    create() {
      directories.add(this.uri);
    }
  }

  class MockFile {
    readonly uri: string;

    constructor(...parts: (string | { uri: string })[]) {
      this.uri = joinUri(...parts);
    }

    get exists() {
      return files.has(this.uri);
    }

    delete() {
      files.delete(this.uri);
    }

    write(content: string) {
      files.set(this.uri, content);
    }
  }

  return {
    directories,
    files,
    MockDirectory,
    MockFile,
  };
});

vi.mock("expo-file-system", () => ({
  Directory: fileSystemMock.MockDirectory,
  File: fileSystemMock.MockFile,
  Paths: {
    get document() {
      return new fileSystemMock.MockDirectory("file:///mock/document");
    },
  },
}));

vi.mock("react-native", () => ({
  Platform: platformState,
  Share: {
    share: (...args: unknown[]) => shareMock(...args),
  },
}));

vi.mock("@/lib/clipboard", () => ({
  setStringAsync: (text: string) => clipboardMock(text),
}));

describe("mobile logger", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.setSystemTime(new Date("2026-05-07T12:34:56.789Z"));
    shareMock.mockReset();
    clipboardMock.mockReset();
    platformState.OS = "ios";
    fileSystemMock.directories.clear();
    fileSystemMock.directories.add("file:///mock/document");
    fileSystemMock.files.clear();
    fileSystemMock.MockDirectory.pickDirectoryAsync.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("生成稳定可读的日志文件名", async () => {
    const { buildLogFileName } = await import("./logger");

    expect(buildLogFileName(new Date("2026-05-07T12:34:56.789Z"))).toBe(
      "tuanchat-mobile-log-2026-05-07T12-34-56-789Z.txt",
    );
  });

  it("会把问题描述和当前日志组合成反馈正文", async () => {
    const { buildFeedbackLogContent, logError } = await import("./logger");
    logError(new Error("boom"), "ErrorBoundary");

    const content = buildFeedbackLogContent("  点击房间后崩溃  ");

    expect(content).toContain("【问题描述】\n点击房间后崩溃");
    expect(content).toContain("【日志】");
    expect(content).toContain("[ErrorBoundary] boom");
  });

  it("会写入日志文件并创建导出目录", async () => {
    const { writeLogFile } = await import("./logger");

    const result = writeLogFile("hello logs");

    expect(result.fileName).toBe("tuanchat-mobile-log-2026-05-07T12-34-56-789Z.txt");
    expect(result.uri).toBe("file:///mock/document/feedback-logs/tuanchat-mobile-log-2026-05-07T12-34-56-789Z.txt");
    expect(fileSystemMock.directories.has("file:///mock/document/feedback-logs")).toBe(true);
    expect(fileSystemMock.files.get(result.uri)).toBe("hello logs");
  });

  it("会导出日志到用户选择的目录", async () => {
    const { exportLogsToPickedDirectory } = await import("./logger");

    const result = await exportLogsToPickedDirectory("picked logs");

    expect(fileSystemMock.MockDirectory.pickDirectoryAsync).toHaveBeenCalledWith("file:///mock/document");
    expect(result.uri).toBe("file:///picked/tuanchat-mobile-log-2026-05-07T12-34-56-789Z.txt");
    expect(fileSystemMock.files.get(result.uri)).toBe("picked logs");
  });
});
