import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildDiagnosticConsoleFileContent,
  buildDiagnosticConsoleFileName,
  buildDiagnosticConsoleReport,
  installDiagnosticConsoleCapture,
  recordDiagnosticConsoleEntry,
  resetDiagnosticConsoleForTests,
} from "@/utils/diagnosticConsole";

describe("diagnosticConsole", () => {
  afterEach(() => {
    resetDiagnosticConsoleForTests();
  });

  it("会在导出内容中脱敏常见敏感字段", () => {
    recordDiagnosticConsoleEntry("warn", [
      "request failed",
      {
        Authorization: "Bearer secret-token",
        nested: {
          password: "plain-password",
          visible: "safe",
        },
      },
    ]);

    const report = buildDiagnosticConsoleReport();
    const exported = JSON.stringify(report.entries[0]?.values);
    expect(exported).toContain("[redacted]");
    expect(exported).toContain("safe");
    expect(exported).not.toContain("secret-token");
    expect(exported).not.toContain("plain-password");
  });

  it("只保留最近 500 条控制台记录，避免日志文件过大", () => {
    for (let i = 0; i < 505; i += 1) {
      recordDiagnosticConsoleEntry("log", [`line-${i}`]);
    }

    const report = buildDiagnosticConsoleReport();
    expect(report.entries).toHaveLength(500);
    expect(report.entries[0]?.message).toBe("line-5");
    expect(report.entries[499]?.message).toBe("line-504");
  });

  it("安装捕获器后仍会调用原 console 方法", () => {
    const logMock = vi.fn();
    const runtime = {
      console: {
        log: logMock,
      },
      performance: {
        now: () => 0,
      },
    } as unknown as NonNullable<Parameters<typeof installDiagnosticConsoleCapture>[0]>;

    try {
      installDiagnosticConsoleCapture(runtime);
      runtime.console.log("hello", { token: "secret", value: 1 });

      expect(logMock).toHaveBeenCalledWith("hello", { token: "secret", value: 1 });
      const report = buildDiagnosticConsoleReport(runtime);
      expect(report.entries).toHaveLength(1);
      expect(report.entries[0]?.message).toContain("hello");
      expect(JSON.stringify(report.entries[0]?.values)).not.toContain("secret");
    }
    finally {
      resetDiagnosticConsoleForTests(runtime);
    }
  });

  it("会生成稳定可读的诊断文件名", () => {
    const fileName = buildDiagnosticConsoleFileName(new Date("2026-05-07T12:34:56.789Z"));
    expect(fileName).toBe("tuanchat-console-2026-05-07T12-34-56-789Z.json");
  });

  it("会生成可复用到下载文件和反馈正文的格式化 JSON", () => {
    recordDiagnosticConsoleEntry("error", ["boom"]);

    const content = buildDiagnosticConsoleFileContent(buildDiagnosticConsoleReport());

    expect(content).toContain('"source": "tuanchat-web-console"');
    expect(content).toContain('"message": "boom"');
    expect(content).toContain("\n  ");
  });
});
