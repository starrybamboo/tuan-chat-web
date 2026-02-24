import type { InferRequest } from "@/tts/engines/index/apiClient";

import { createTTSApi } from "@/tts/engines/index/apiClient";
import {
  getFigurePositionFromAnnotations,
  isImageMessageBackground,
} from "@/types/messageAnnotations";

import type { ChatMessageResponse } from "../../api";

import { getFileExtensionFromUrl } from "./fileOperator";

/**
 * Premiere Export Options
 */
export type PremiereExportOptions = {
  /** Sequence Name */
  sequenceName: string;
  /** Frame Rate (default 30) */
  frameRate?: number;
  /** Width (default 1920) */
  width?: number;
  /** Height (default 1080) */
  height?: number;
  /** TTS API URL (Optional) */
  ttsApiUrl?: string;
};

/**
 * Resource File internal representation
 */
type ResourceFile = {
  id: string; // Internal ID (file-1)
  name: string; // Filename on disk (bg.png)
  url: string; // Source URL to download
  type: "audio" | "image" | "video";
  width?: number; // Estimated width (for XML metadata)
  height?: number; // Estimated height
};

/**
 * Clip on a track
 */
type TrackClip = {
  id: string;
  name: string;
  start: number; // Timeline Start (seconds)
  end: number; // Timeline End (seconds)
  in: number; // Source In (seconds)
  out: number; // Source Out (seconds)
  fileId?: string; // Reference to ResourceFile
  type: "audio" | "video";

  // Motion / Transform properties (Normalized 0-1 relative to screen)
  position?: { x: number; y: number };
  scale?: number; // percentage, e.g. 100

  // Generator properties (if no fileId)
  generator?: {
    type: "color" | "text";
    text?: string;
    fontSize?: number;
    fontColor?: { r: number; g: number; b: number };
  };
};

export type AvatarFetchFn = (avatarId: number) => Promise<{
  spriteUrl?: string;
  avatarUrl?: string;
  originUrl?: string;
  spriteScale?: number;
} | undefined | null>;
export type RoleNameFetchFn = (roleId?: number) => Promise<string | undefined | null>;
export type UserNameFetchFn = (userId?: number) => Promise<string | undefined | null>;
export type RoleRefVocalFetchFn = (roleId: number) => Promise<File | undefined>;
export type RoleFetchFn = (roleId: number) => Promise<{ avatarId?: number; type?: number } | undefined | null>;

type DialogEntry = {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
};

/**
 * Premiere (FCPXML) Exporter
 * Refactored to match robust XML structure seen in reference projects (like TRPG-Replay-Generator).
 * Implements explicit sample characteristics and Basic Motion coordinates.
 */
export class PremiereExporter {
  private resources: ResourceFile[] = [];
  private fps: number = 30;
  private width: number = 1920;
  private height: number = 1080;
  private ttsApiUrl?: string;
  public generatedAudioAssets: Record<string, Uint8Array> = {};

  public getResources() {
    return this.resources;
  }

  private resourceMap = new Map<string, string>(); // url -> id
  private clipIdCounter = 0;
  private dialogs: DialogEntry[] = [];
  private names: DialogEntry[] = [];

  // Tracks definition
  private tracks = {
    background: [] as TrackClip[], // V1
    figures: { // V2-V4
      left: [] as TrackClip[],
      center: [] as TrackClip[],
      right: [] as TrackClip[],
    },
    voice: [] as TrackClip[], // A1
  };

  constructor(options?: Partial<PremiereExportOptions>) {
    this.fps = options?.frameRate || 30;
    this.width = options?.width || 1920;
    this.height = options?.height || 1080;
    this.ttsApiUrl = options?.ttsApiUrl;
  }

  // --- Helpers ---

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (Number.isFinite(audio.duration)) {
          resolve(audio.duration);
        }
        else {
          resolve(2.0);
        }
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(2.0);
      };
      // 触发加载
      audio.load();
    });
  }

  private getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: this.width, height: this.height });
      img.src = url;
    });
  }

  // --- Resource Management ---

  private addResource(url: string, type: "audio" | "image", nameHint?: string): string {
    if (!url)
      return "";
    if (this.resourceMap.has(url)) {
      return this.resourceMap.get(url)!;
    }

    const id = `file-${this.resources.length + 1}`;
    let ext = type === "audio" ? "wav" : "png";
    try {
      const urlExt = getFileExtensionFromUrl(url, "");
      if (urlExt)
        ext = urlExt;
    }
    catch {}

    let name = nameHint || `res_${id}`;
    name = name.replace(/[\\/:*?"<>|]/g, "_"); // Sanitize
    if (!name.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
      name += `.${ext}`;
    }

    this.resources.push({
      id,
      name,
      url,
      type,
      width: this.width, // Assume full resolution for metadata safety
      height: this.height,
    });
    this.resourceMap.set(url, id);
    return id;
  }

  // --- Helpers ---

  private toFrames(seconds: number): number {
    return Math.round(seconds * this.fps);
  }

  private estimateDuration(text: string): number {
    if (!text)
      return 2.0;
    const len = text.length;
    return Math.min(Math.max(2.0, len * 0.25), 10.0);
  }

  private escapeXML(str: string | undefined): string {
    if (!str)
      return "";
    return str.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private getNextClipId(): string {
    this.clipIdCounter++;
    return `clipitem-${this.clipIdCounter}`;
  }

  // --- XML Generation ---

  /**
   * Generates the "Basic Motion" filter XML block.
   * Coordinate System: Premiere's "Center" parameter in "Basic Motion".
   * Center (0,0) represents the center of the screen.
   * Range: -0.5 (Left/Top) to +0.5 (Right/Bottom) relative to screen dimensions.
   */
  private getBasicMotionXML(scale: number, x: number, y: number): string {
    // Current positions from logic are 0.2 (Left), 0.5 (Center), 0.8 (Right) in 0-1 space.
    // Premiere X: (0.2 * W - 0.5 * W) / W = 0.2 - 0.5 = -0.3
    // Premiere Y: (0.55 * H - 0.5 * H) / H = 0.55 - 0.5 = 0.05

    // Normalized input (0 to 1) -> Centered output (-0.5 to 0.5)
    const horiz = (x - 0.5);
    const vert = (y - 0.5);

    return `
            <filter>
              <effect>
                <name>Basic Motion</name>
                <effectid>basic</effectid>
                <effectcategory>motion</effectcategory>
                <effecttype>motion</effecttype>
                <mediatype>video</mediatype>
                <parameter>
                  <parameterid>scale</parameterid>
                  <name>Scale</name>
                  <valuemin>0</valuemin>
                  <valuemax>1000</valuemax>
                  <value>${scale}</value>
                </parameter>
                <parameter>
                  <parameterid>center</parameterid>
                  <name>Center</name>
                  <value>
                    <horiz>${horiz.toFixed(5)}</horiz>
                    <vert>${vert.toFixed(5)}</vert>
                  </value>
                </parameter>
              </effect>
            </filter>`;
  }

  private renderClipXML(clip: TrackClip): string {
    const frameStart = this.toFrames(clip.start);
    const frameEnd = this.toFrames(clip.end);
    const frameDuration = frameEnd - frameStart;
    const clipName = this.escapeXML(clip.name);

    // 1. Generator Content (Text / Color)
    if (clip.generator) {
      // Universal Solution: Use a Reference File (placeholder).
      // Generators like Text/Color/Slug often fail in modern Premiere versions via XML.
      // We will point to a specific file "assets/placeholder.png" which we will auto-generate/download.
      // This ensures the clip is treated as a standard Footage clip, which never causes import errors.

      const fileIdName = "placeholder.png";
      const placeholderPath = `file://localhost/C:/PROJECT_ROOT/assets/${fileIdName}`;

      return `
          <clipitem id="${clip.id}">
            <name>${clipName}</name>
            <duration>${frameDuration}</duration>
            <rate><timebase>${this.fps}</timebase></rate>
            <start>${frameStart}</start>
            <end>${frameEnd}</end>
            <in>0</in>
            <out>${frameDuration}</out>
            <file id="placeholder_file">
                <name>${fileIdName}</name>
                <pathurl>${placeholderPath}</pathurl>
                <rate><timebase>${this.fps}</timebase></rate>
                <media>
                    <video>
                        <samplecharacteristics>
                            <width>${this.width}</width>
                            <height>${this.height}</height>
                            <pixelaspectratio>square</pixelaspectratio>
                        </samplecharacteristics>
                    </video>
                </media>
            </file>
            ${(clip.position || (clip.generator.type === "text")) ? this.getBasicMotionXML(clip.scale || 100, clip.position?.x ?? 0.5, clip.position?.y ?? 0.5) : ""}
          </clipitem>`;
    }

    // 2. File Content
    const res = this.resources.find(r => r.id === clip.fileId);
    if (!res)
      return ""; // Should not happen

    // Use a generic logic for local path. User must relink or download to this path.
    // Ensure drive letter is present for Windows XML validity.
    const pathUrl = `file://localhost/C:/PROJECT_ROOT/assets/${res.name}`;

    // Determine media tracks based on resource type
    const hasVideo = res.type === "image" || res.type === "video";
    const hasAudio = res.type === "audio" || res.type === "video";

    return `
      <clipitem id="${clip.id}">
        <name>${clipName}</name>
        <duration>${frameDuration}</duration>
        <rate><timebase>${this.fps}</timebase></rate>
        <start>${frameStart}</start>
        <end>${frameEnd}</end>
        <in>0</in>
        <out>${frameDuration}</out>
        <file id="${res.id}">
          <name>${this.escapeXML(res.name)}</name>
          <pathurl>${pathUrl}</pathurl>
          <rate><timebase>${this.fps}</timebase></rate>
          <media>
             ${hasVideo
                ? `<video>
                <samplecharacteristics>
                  <width>${res.width}</width>
                  <height>${res.height}</height>
                  <pixelaspectratio>square</pixelaspectratio>
                </samplecharacteristics>
             </video>`
                : ""}
             ${hasAudio
                ? `<audio>
                <samplecharacteristics>
                   <depth>16</depth>
                   <samplerate>44100</samplerate>
                </samplecharacteristics>
             </audio>`
                : ""}
          </media>
        </file>
        ${(clip.position && clip.scale) ? this.getBasicMotionXML(clip.scale, clip.position.x, clip.position.y) : ""}
      </clipitem>`;
  }

  // --- Main Process Logic ---

  public async processMessages(
    messages: ChatMessageResponse[],
    fetchAvatar?: AvatarFetchFn,
    fetchRoleName?: RoleNameFetchFn,
    fetchUserName?: UserNameFetchFn,
    fetchRoleRefVocal?: RoleRefVocalFetchFn,
    fetchRole?: RoleFetchFn,
    initialBackgroundUrl?: string,
  ) {
    let currentTime = 0;

    // Active clips trackers
    let activeBgClip: TrackClip | null = null;

    // POS Constants need to be accessed for initial BG
    const POS = {
      LEFT: { x: 0.20, y: 0.55 },
      CENTER: { x: 0.50, y: 0.55 },
      RIGHT: { x: 0.80, y: 0.55 },
      BG: { x: 0.50, y: 0.50 },
      NAME: { x: 0.20, y: 0.80 },
      DIALOGUE: { x: 0.50, y: 0.85 },
    };

    if (initialBackgroundUrl) {
      try {
        // Treat as a file resource
        const fileId = this.addResource(initialBackgroundUrl, "image", "bg_initial");

        let bgScale = 100;
        try {
          const dims = await this.getImageDimensions(initialBackgroundUrl);
          const scaleX = (this.width / dims.width) * 100;
          const scaleY = (this.height / dims.height) * 100;
          bgScale = Math.min(scaleX, scaleY);
        }
        catch {}

        activeBgClip = {
          id: this.getNextClipId(),
          name: "BG Initial",
          start: 0,
          end: 0,
          in: 0,
          out: 0,
          fileId,
          type: "video",
          position: POS.BG,
          scale: bgScale,
        };
      }
      catch (e) {
        console.warn("[PremiereExporter] Failed to load initial background", e);
      }
    }

    const activeFigureClips: {
      left: TrackClip | null;
      center: TrackClip | null;
      right: TrackClip | null;
    } = {
      left: null,
      center: null,
      right: null,
    };

    const posToTrackMap: Record<string, "left" | "center" | "right"> = {
      "left": "left",
      "left-center": "left",
      "center": "center",
      "right": "right",
      "right-center": "right",
    };

    // Track for the single-track speaker mode (if desired by user logic implies)
    // But standard VN keeps previous characters.
    // The user said "Role track only needs one... i.e. the speaker".
    // This implies we should CLEAR previous characters if they are not the current speaker?
    // Let's implement this: Only the current speaker is shown.

    for (const item of messages) {
      if (item.message.webgal?.ignore)
        continue;

      const msg = item.message;

      let audioDuration: number | undefined;
      let vocalFileId: string | undefined;

      // Try Generate TTS
      if (this.ttsApiUrl && msg.content && msg.roleId && msg.roleId > 0 && fetchRoleRefVocal) {
        try {
          const refAudioFile = await fetchRoleRefVocal(msg.roleId);
          if (refAudioFile) {
            const refBase64 = await this.fileToBase64(refAudioFile);
            const api = createTTSApi(this.ttsApiUrl);

            const voiceSettings = msg.webgal?.voiceRenderSettings as { emotionVector?: number[] } | undefined;
            const ttsReq: InferRequest = {
              text: msg.content,
              prompt_audio_base64: refBase64,
              return_audio_base64: true,
              emo_mode: 2,
              emo_weight: 0.8,
              temperature: 0.8,
              top_p: 0.8,
              emo_vector: voiceSettings?.emotionVector,
            };

            const res = await api.infer(ttsReq);
            if (res.code === 0 && res.data?.audio_base64) {
              const audioStr = atob(res.data.audio_base64);
              const len = audioStr.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = audioStr.charCodeAt(i);
              }

              const blob = new Blob([bytes], { type: "audio/wav" });
              const dur = await this.getAudioDuration(blob);
              audioDuration = dur;

              const filename = `voice_${msg.messageId}.wav`;
              this.generatedAudioAssets[filename] = bytes;

              const fakeUrl = `internal://${filename}`;
              vocalFileId = this.addResource(fakeUrl, "audio", filename);

              // Fixup resource name
              const r = this.resources.find(x => x.id === vocalFileId);
              if (r)
                r.name = filename;
            }
          }
        }
        catch (e) {
          console.error(`[PremiereExporter] TTS Gen Failed for ${msg.messageId}`, e);
        }
      }

      const duration = audioDuration ?? this.estimateDuration(msg.content);
      const startTime = currentTime;
      const endTime = currentTime + duration;

      if (vocalFileId) {
        this.tracks.voice.push({
          id: this.getNextClipId(),
          name: `Voice ${msg.messageId}`,
          start: startTime,
          end: endTime,
          in: 0,
          out: duration,
          fileId: vocalFileId,
          type: "audio",
        });
      }

      if (msg.content) {
        this.dialogs.push({
          id: msg.messageId,
          startTime,
          endTime,
          text: msg.content,
        });
      }

      // 1. Background
      let bgUrl: string | undefined;
      // Note: isImageMessageBackground might rely on the second argument or annotation.
      // If imageMessage is present in msg.extra, pass it.
      const isBgAnnotation = isImageMessageBackground(msg.annotations, msg.extra?.imageMessage);

      // Strict Check: ONLY specifically tagged BGs or explicit WebGAL settings
      if ((msg.webgal as any)?.bgUrl) {
        bgUrl = (msg.webgal as any).bgUrl;
      }
      else if (isBgAnnotation) {
        // If tagged as BG, try to get URL from standard ImageMessage location or Fallback to content regex
        bgUrl = msg.extra?.imageMessage?.url;
        if (!bgUrl) {
          // Fallback: If annotations say BG but no structured imageMessage, check content
          const match = msg.content.match(/https?:\/\/[^\s)]+/);
          if (match)
            bgUrl = match[0];
        }
      }

      if (bgUrl) {
        const fileId = this.addResource(bgUrl, "image", `bg_${msg.messageId}`);
        if (activeBgClip && activeBgClip.fileId !== fileId) {
          activeBgClip.end = startTime;
          this.tracks.background.push(activeBgClip);
          activeBgClip = null;
        }
        if (!activeBgClip) {
          // Calculate scale to Contain (Fit inside 1920x1080 without overflow)
          // User Request: "Fill screen" AND "No overflow".
          // Since Basic Motion only supports uniform scale, we must choose Contain (Math.min) to avoid overflow.
          // This fulfills "judging whether to fill width or height" (whichever hits the edge first).
          let bgScale = 100;
          try {
            const dims = await this.getImageDimensions(bgUrl);
            const scaleX = (this.width / dims.width) * 100;
            const scaleY = (this.height / dims.height) * 100;
            bgScale = Math.min(scaleX, scaleY);
          }
          catch {}

          activeBgClip = {
            id: this.getNextClipId(),
            name: `BG ${msg.messageId}`,
            start: startTime,
            end: endTime,
            in: 0,
            out: duration,
            fileId,
            type: "video",
            position: POS.BG,
            scale: bgScale,
          };
        }
        else {
          activeBgClip.end = endTime;
        }
      }
      else if (activeBgClip) {
        activeBgClip.end = endTime;
      }

      // 2. Figures
      let avatarUrl = (msg as any)._avatarUrl || (msg.webgal as any)?.avatarUrl;

      // We need to resolve the effective avatar details to determine scaling
      let isDefaultAvatar = true; // Assume default unless proven otherwise (safest default)
      let effectiveAvatarId = msg.avatarId;

      // Logic: If msg has ID, check if it equals role default.
      if (msg.roleId && fetchRole) {
        try {
          // Fetch Role Default ID to compare
          const roleInfo = await fetchRole(msg.roleId);
          const roleDefaultId = roleInfo?.avatarId ? Number(roleInfo.avatarId) : undefined;

          // If we have an explicit message avatar ID...
          if (effectiveAvatarId && effectiveAvatarId > 0) {
            const msgAvatarId = Number(effectiveAvatarId);

            // Logic Update:
            // User correction: Even for Player Roles (Type 0), the logic holds:
            // - Default Avatar (msg.avatarId == role.avatarId) should be BASE SIZE (100%).
            // - Non-Default Avatars (Variants) should be SCALED UP (150%).
            // The previous bug where Type 0 characters were always scaled up implies that
            // for those characters, msg.avatarId was NOT matching roleDefaultId.

            // Safety Check: if roleDefaultId is missing, assume Default (100%) instead of Variant.
            if (roleDefaultId && roleDefaultId > 0) {
              if (msgAvatarId !== roleDefaultId) {
                // Explicit ID different from default -> Non-Default (Variant) -> 150%
                isDefaultAvatar = false;
              }
              else {
                // ID Matches default -> Default -> 100%
                isDefaultAvatar = true;
              }
            }
            else {
              // Role has NO valid default avatar ID set (e.g. 0 or null).
              // Safety Fallback: Treat as Default (100%) to avoid blowing up arbitrary images.
              isDefaultAvatar = true;
            }
          }
          else {
            // No explicit ID in message -> Falls back to role default -> Is Default
            isDefaultAvatar = true;
            if (roleDefaultId)
              effectiveAvatarId = roleDefaultId;
          }
        }
        catch (e) {
          console.warn(`[PremiereExporter] Role fetch failed for ${msg.roleId}`, e);
        }
      }

      let correctionScale = 1.0;

      // Always try to fetch if we have an ID to get metadata (Scale) and URL
      if (effectiveAvatarId && effectiveAvatarId > 0 && fetchAvatar) {
        try {
          const info = await fetchAvatar(effectiveAvatarId);
          if (info) {
            if (!avatarUrl) {
              avatarUrl = info.originUrl || info.spriteUrl || info.avatarUrl;
            }
            if (typeof info.spriteScale === "number") {
              correctionScale = info.spriteScale;
            }
          }
        }
        catch {}
      }

      if (avatarUrl) {
        const rawPos = getFigurePositionFromAnnotations(msg.annotations) || "center";
        const trackKey = posToTrackMap[rawPos] || "center";

        // Fix: Use messageId in resource name to ensure uniqueness if the user uses different sprites for the same role across messages.
        // Or better: Use hash of url or just rely on addResource deduplication but give it a better hint.
        // Actually addResource deduplicates by URL. If URL is different, it gets a new ID.
        // The issue might be the nameHint being the same "char_{roleId}" might cause filename collisions on export script if not handled carefully?
        // addResource uses nameHint to generate 'name'.
        // If multiple URLs map to the same name "char_11.png", they will overwrite each other on disk in the export folder!
        // We need unique filenames for different sprites.

        // Let's use avatarId in the name hint if available
        const avatarSuffix = effectiveAvatarId ? `_${effectiveAvatarId}` : `_msg${msg.messageId}`;
        const fileId = this.addResource(avatarUrl, "image", `char_${msg.roleId}${avatarSuffix}`);

        // --- CHANGE START: Only keep the current speaker's figure ---
        // Close other tracks (Left/Right/Center) that are NOT this one, because "only one person speaks"
        for (const key of (Object.keys(activeFigureClips) as Array<keyof typeof activeFigureClips>)) {
          if (key !== trackKey && activeFigureClips[key]) {
            const clip = activeFigureClips[key]!;
            clip.end = startTime;
            this.tracks.figures[key].push(clip);
            activeFigureClips[key] = null;
          }
        }
        // --- CHANGE END ---

        const currentClip = activeFigureClips[trackKey];

        // Scale Logic: Non-Default gets 1.5x boost
        const baseScale = isDefaultAvatar ? 100 : 150;
        const clipScale = baseScale * correctionScale;

        if (!currentClip || currentClip.fileId !== fileId) {
          if (currentClip) {
            currentClip.end = startTime;
            this.tracks.figures[trackKey].push(currentClip);
          }
          activeFigureClips[trackKey] = {
            id: this.getNextClipId(),
            name: `Fig ${msg.messageId}`,
            start: startTime,
            end: endTime,
            in: 0,
            out: duration,
            fileId,
            type: "video",
            scale: clipScale,
            position: trackKey === "left" ? POS.LEFT : (trackKey === "right" ? POS.RIGHT : POS.CENTER),
          };
        }
        else {
          activeFigureClips[trackKey]!.end = endTime;
        }
      }
      else {
        // Clear figures - if no speaker (narrator), clear all figures as per "only speaker shown" rule
        for (const key of (Object.keys(activeFigureClips) as Array<keyof typeof activeFigureClips>)) {
          const clip = activeFigureClips[key];
          if (clip) {
            clip.end = startTime;
            this.tracks.figures[key].push(clip);
            activeFigureClips[key] = null;
          }
        }
      }

      // 3. UI (Name & Dialogue)
      if (msg.content) {
        // A: Name (Try custom name, then role name, then user name)
        let roleName = msg.customRoleName;
        // 1. Fetch Role Name
        if (!roleName && msg.roleId && fetchRoleName) {
          try {
            const fetched = await fetchRoleName(msg.roleId);
            if (fetched)
              roleName = fetched;
          }
          catch {}
        }
        // 2. Fetch User Name (Fallback if no role name)
        if (!roleName && msg.userId && fetchUserName) {
          try {
            const fetched = await fetchUserName(msg.userId);
            if (fetched)
              roleName = fetched;
          }
          catch {}
        }

        if (roleName) {
          this.names.push({
            id: msg.messageId,
            startTime,
            endTime,
            text: roleName,
          });
        }
      }

      currentTime = endTime;
    }

    // Close open clips
    if (activeBgClip)
      this.tracks.background.push(activeBgClip);
    for (const key of (Object.keys(activeFigureClips) as Array<keyof typeof activeFigureClips>)) {
      if (activeFigureClips[key])
        this.tracks.figures[key].push(activeFigureClips[key]!);
    }
  }

  // --- Output ---

  public generateXML(): string {
    const renderTrack = (clips: TrackClip[]) => {
      if (clips.length === 0)
        return "<track><enabled>TRUE</enabled><locked>FALSE</locked></track>";
      return `<track>\n${clips.map(c => this.renderClipXML(c)).join("\n")}\n</track>`;
    };

    // Calculate full duration
    let maxDuration = 0;
    const allClips = [
      ...this.tracks.background,
      ...this.tracks.figures.left,
      ...this.tracks.figures.center,
      ...this.tracks.figures.right,
      ...this.tracks.voice,
    ];
    if (allClips.length > 0) {
      maxDuration = Math.max(...allClips.map(c => c.end));
    }
    const durationFrames = this.toFrames(maxDuration);

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
<sequence id="sequence-1">
  <name>WebGAL Export</name>
  <duration>${durationFrames}</duration>
  <rate>
    <timebase>${this.fps}</timebase>
    <ntsc>FALSE</ntsc>
  </rate>
  <media>
    <video>
      <format>
        <samplecharacteristics>
          <rate><timebase>${this.fps}</timebase></rate>
          <width>${this.width}</width>
          <height>${this.height}</height>
          <pixelaspectratio>square</pixelaspectratio>
        </samplecharacteristics>
      </format>
      <!-- V1: Background -->
      ${renderTrack(this.tracks.background)}
      <!-- V2: Figure Left -->
      ${renderTrack(this.tracks.figures.left)}
      <!-- V3: Figure Center -->
      ${renderTrack(this.tracks.figures.center)}
      <!-- V4: Figure Right -->
      ${renderTrack(this.tracks.figures.right)}
    </video>
    <audio>
      <!-- A1: Voice -->
      ${renderTrack(this.tracks.voice)}
    </audio>
  </media>
</sequence>
</xmeml>`;
  }

  public generateDownloadScript(): string {
    let script = `# PowerShell Download Script\n$Dest = Join-Path $PSScriptRoot "assets"\nif (!(Test-Path $Dest)) { New-Item -ItemType Directory -Force -Path $Dest }\n\n`;

    // Auto-create/download the placeholder image for texts to prevent "Media Offline"
    script += `Write-Host "Creating text placeholder image..."\n`;
    script += `# Download a 1x1 transparent PNG or create a simple placeholder is safest\n`;
    script += `$placeholderPath = Join-Path $Dest "placeholder.png"\n`;
    script += `if (!(Test-Path $placeholderPath)) {\n`;
    // Base64 for a 1x1 black transparent PNG
    script += `  $base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="\n`;
    script += `  [System.IO.File]::WriteAllBytes($placeholderPath, [System.Convert]::FromBase64String($base64Png))\n`;
    script += `  Write-Host "Created placeholder.png"\n`;
    script += `}\n\n`;

    script += `Write-Host "Downloading ${this.resources.length} assets..."\n`;

    for (const res of this.resources) {
      if (res.url.startsWith("http")) {
        const fileName = res.name;
        script += `try { Invoke-WebRequest -Uri "${res.url}" -OutFile (Join-Path $Dest "${fileName}") -ErrorAction Stop; Write-Host "Downloaded ${fileName}" } catch { Write-Warning "Failed to download ${fileName}: $_" }\n`;
      }
    }
    script += `\nWrite-Host "Done! Import .xml to Premiere Pro. Ensure assets folder is in the same directory."\nPause\n`;
    return script;
  }

  public generateSRT(): string {
    const formatTime = (seconds: number) => {
      const date = new Date(0);
      date.setMilliseconds(seconds * 1000);
      const hh = String(date.getUTCHours()).padStart(2, "0");
      const mm = String(date.getUTCMinutes()).padStart(2, "0");
      const ss = String(date.getUTCSeconds()).padStart(2, "0");
      const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
      return `${hh}:${mm}:${ss},${ms}`;
    };

    return this.dialogs.map((d, index) => {
      return `${index + 1}\n${formatTime(d.startTime)} --> ${formatTime(d.endTime)}\n${d.text}\n`;
    }).join("\n");
  }

  public generateNameSRT(): string {
    const formatTime = (seconds: number) => {
      const date = new Date(0);
      date.setMilliseconds(seconds * 1000);
      const hh = String(date.getUTCHours()).padStart(2, "0");
      const mm = String(date.getUTCMinutes()).padStart(2, "0");
      const ss = String(date.getUTCSeconds()).padStart(2, "0");
      const ms = String(date.getUTCMilliseconds()).padStart(3, "0");
      return `${hh}:${mm}:${ss},${ms}`;
    };

    return this.names.map((d, index) => {
      return `${index + 1}\n${formatTime(d.startTime)} --> ${formatTime(d.endTime)}\n${d.text}\n`;
    }).join("\n");
  }
}
