import { buildDefaultAudioUploadTranscodeOptions } from "@/utils/audioUploadPolicy";
import { assertAudioUploadInputSizeOrThrow } from "@/utils/audioUploadPolicy";
import { transcodeAudioFileToOpusOrThrow } from "@/utils/audioTranscodeUtils";

const root = document.getElementById("app");

if (!root) {
  throw new Error("missing app root");
}

root.innerHTML = `
  <main>
    <input data-testid="audio-input" type="file" accept="audio/*" />
    <button data-testid="run-transcode" type="button">run</button>
    <div data-testid="harness-ready">ready</div>
    <div data-testid="selected-file-name">none</div>
    <div data-testid="status">idle</div>
    <div data-testid="output-name">-</div>
    <div data-testid="output-type">-</div>
    <div data-testid="output-size">0</div>
    <pre data-testid="error-message"></pre>
  </main>
`;

const input = root.querySelector<HTMLInputElement>("[data-testid=\"audio-input\"]");
const button = root.querySelector<HTMLButtonElement>("[data-testid=\"run-transcode\"]");

if (!input || !button) {
  throw new Error("missing harness controls");
}

function setText(testId: string, value: string): void {
  const element = root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (element) {
    element.textContent = value;
  }
}

input.addEventListener("change", () => {
  const file = input.files?.[0];
  setText("selected-file-name", file?.name ?? "none");
});

button.addEventListener("click", async () => {
  const file = input.files?.[0];
  if (!file) {
    setText("status", "missing-file");
    setText("error-message", "missing file");
    return;
  }

  setText("status", "running");
  setText("error-message", "");
  setText("output-name", "-");
  setText("output-type", "-");
  setText("output-size", "0");

  try {
    assertAudioUploadInputSizeOrThrow(file.size);
    const output = await transcodeAudioFileToOpusOrThrow(
      file,
      buildDefaultAudioUploadTranscodeOptions(file.size, 1),
    );

    setText("output-name", output.name);
    setText("output-type", output.type);
    setText("output-size", String(output.size));
    setText("status", "success");
  }
  catch (error) {
    setText("status", "error");
    setText("error-message", error instanceof Error ? error.message : String(error));
  }
});
