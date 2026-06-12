import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import AudioMessage from "./AudioMessage";

describe("audioMessage", () => {
  it("shows one compact time value between the play button and waveform in default layout", () => {
    const html = renderToStaticMarkup(createElement(AudioMessage, {
      url: "https://static.example.com/voice.webm",
      duration: 9,
      cacheKey: "audio-default",
    }));

    expect(html).toContain("0:09");
    expect(html).not.toContain("0:00 / 0:09");
    expect(html).toContain("min-w-[220px]");
  });

  it("keeps document audio as a full-width small-radius row with a delete action", () => {
    const html = renderToStaticMarkup(createElement(AudioMessage, {
      url: "https://static.example.com/voice.webm",
      duration: 9,
      cacheKey: "audio-document",
      layout: "document",
      onDelete: () => {},
      deleteLabel: "删除音频块",
    }));

    expect(html).toContain("0:00 / 0:09");
    expect(html).toContain("rounded-md");
    expect(html).not.toContain("rounded-full");
    expect(html).toContain("删除音频块");
  });
});
