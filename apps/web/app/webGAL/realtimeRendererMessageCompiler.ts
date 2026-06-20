import type { FigurePositionKey } from "@/types/voiceRenderTypes";
import type { WebgalDiceRenderPayload } from "@/types/webgalDice";

import { stripDiceResultTokens } from "@/components/common/dicer/diceTable";
import {
  buildClearBackgroundLineFromAnnotations,
  getEffectDurationMs,
} from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../api";

import { TextEnhanceSyntax } from "./realtimeRendererTextEnhance";
import { splitDiceContentToSteps } from "./realtimeRendererWorkflow";

export type RealtimeRenderMessageCompilerInput = {
  message: ChatMessageResponse["message"];
  roleName: string;
  roleId: number;
  processedContent: string;
  renderContent: string;
  isNarrator: boolean;
  isIntroText: boolean;
  isDiceMessage: boolean;
  diceRenderMode: "trpg" | "anko" | "script" | "dialog" | "narration" | null;
  diceContent: string;
  dicePayload: WebgalDiceRenderPayload | null;
  hasDiceScriptLines: boolean;
  dialogNext: boolean;
  dialogNotend: boolean;
  dialogConcat: boolean;
  introHold: boolean;
  dialogFigureIdPart: string;
  shouldClearBackground: boolean;
  isBackgroundImageMessage: boolean;
  shouldClearBgm: boolean;
  shouldClearImageFigure: boolean;
  shouldClearFigure: boolean;
  backgroundLine?: string | null;
  imageLine?: string | null;
  videoLine?: string | null;
  bgmLine?: string | null;
  soundLine?: string | null;
  chooseLines?: string[] | null;
  stateEventLines?: string[] | null;
  annotationEffect?: string;
  annotationEffectSoundLine?: string | null;
  effectTargetSlotId?: string | null;
  effectOffsetPart?: string | null;
  figurePosition?: FigurePositionKey;
  figureSlotId?: string;
  figureLine?: string | null;
  figureAnimationLines?: string[] | null;
  miniAvatarLine?: string | null;
  miniAvatarVisibleBefore: boolean;
  forceMiniAvatar: boolean;
  diceShowMiniAvatar?: boolean;
  diceShowFigure?: boolean;
  vocalPart?: string;
  diceTrpgLines?: string[] | null;
};

function appendLine(lines: string[], line: string | null | undefined): void {
  const normalized = String(line ?? "").trim();
  if (!normalized) {
    return;
  }
  lines.push(normalized);
}

function appendLines(lines: string[], fragments: string[] | null | undefined): void {
  (fragments ?? []).forEach(fragment => appendLine(lines, fragment));
}

function buildDialogLine(
  input: RealtimeRenderMessageCompilerInput,
  content: string,
  options: { useRoleLine?: boolean; forceNarrator?: boolean; useFigureId?: boolean } = {},
): string {
  const nextPart = input.dialogNext ? " -next" : "";
  const notendPart = !input.isNarrator && input.dialogNotend ? " -notend" : "";
  const concatPart = !input.isNarrator && input.dialogConcat ? " -concat" : "";
  const figureIdPart = options.useFigureId && input.shouldClearFigure === false && input.figureSlotId
    ? input.dialogFigureIdPart
    : "";
  if (options.forceNarrator || input.isNarrator || !options.useRoleLine) {
    return `:${content}${nextPart};`;
  }
  return `${input.roleName}: ${content}${figureIdPart}${notendPart}${concatPart}${nextPart};`;
}

export function compileRealtimeRenderMessageLines(input: RealtimeRenderMessageCompilerInput): string[] {
  const lines: string[] = [];
  const msg = input.message;

  if (msg.status === 1) {
    return lines;
  }

  if (input.shouldClearBackground && !input.isBackgroundImageMessage) {
    appendLine(lines, buildClearBackgroundLineFromAnnotations(msg.annotations));
  }
  if (input.shouldClearBgm) {
    appendLine(lines, "bgm:none -next;");
  }
  if (input.shouldClearImageFigure) {
    appendLine(lines, `changeFigure:none -id=${"image_message"} -next;`);
  }

  switch (msg.messageType as number) {
    case MESSAGE_TYPE.IMG: {
      appendLine(lines, input.backgroundLine);
      appendLine(lines, input.imageLine);
      return lines;
    }
    case MESSAGE_TYPE.VIDEO: {
      appendLine(lines, input.videoLine);
      return lines;
    }
    case MESSAGE_TYPE.SOUND: {
      appendLine(lines, input.bgmLine);
      appendLine(lines, input.soundLine);
      return lines;
    }
    case MESSAGE_TYPE.WEBGAL_CHOOSE: {
      appendLines(lines, input.chooseLines);
      return lines;
    }
    case MESSAGE_TYPE.STATE_EVENT: {
      appendLines(lines, input.stateEventLines);
      return lines;
    }
    case MESSAGE_TYPE.DICE: {
      if (input.diceRenderMode === "script" && input.hasDiceScriptLines) {
        if (input.soundLine) {
          appendLine(lines, input.soundLine);
        }
        appendLines(lines, input.dicePayload?.lines);
        return lines;
      }

      const useDialogDice = input.diceRenderMode === "dialog";
      const modePart = input.diceRenderMode ? ` -mode=${input.diceRenderMode}` : "";
      const appendDiceOverlayLine = (content: string) => {
        appendLine(lines, `dice:${content}${modePart};`);
      };
      const appendDiceDialogLine = (content: string, notend: boolean = false, concat: boolean = false) => {
        const notendPart = !input.isNarrator && notend ? " -notend" : "";
        const concatPart = !input.isNarrator && concat ? " -concat" : "";
        const nextPart = input.dialogNext ? " -next" : "";
        if (input.isNarrator) {
          appendLine(lines, `:${content}${nextPart};`);
        }
        else {
          appendLine(lines, `${input.roleName}: ${content}${input.dialogFigureIdPart}${notendPart}${concatPart}${nextPart};`);
        }
      };

      if (input.diceRenderMode === "trpg") {
        appendLines(lines, input.diceTrpgLines ?? []);
        return lines;
      }

      if (input.diceRenderMode === "anko") {
        const finalProcessed = TextEnhanceSyntax.processContent(input.diceContent);
        if (input.soundLine) {
          appendLine(lines, input.soundLine);
        }
        if (useDialogDice) {
          appendDiceDialogLine(finalProcessed, input.dialogNotend, input.dialogConcat);
        }
        else {
          appendDiceOverlayLine(finalProcessed);
        }
        return lines;
      }

      const stepLines = splitDiceContentToSteps(input.diceContent);
      const shouldTwoStep = stepLines.length > 1 && input.dicePayload?.twoStep !== false;
      if (shouldTwoStep) {
        const previewRaw = stripDiceResultTokens(input.diceContent);
        const previewProcessed = TextEnhanceSyntax.processContent(previewRaw);
        const finalProcessed = TextEnhanceSyntax.processContent(input.diceContent);
        if (previewProcessed.trim() && previewProcessed !== finalProcessed) {
          if (useDialogDice) {
            appendDiceDialogLine(previewProcessed);
          }
          else {
            appendDiceOverlayLine(previewProcessed);
          }
          if (input.soundLine) {
            appendLine(lines, input.soundLine);
          }
        }
        else if (input.soundLine) {
          appendLine(lines, input.soundLine);
        }
        if (useDialogDice) {
          appendDiceDialogLine(finalProcessed, input.dialogNotend, input.dialogConcat);
        }
        else {
          appendDiceOverlayLine(finalProcessed);
        }
        return lines;
      }
      if (input.soundLine) {
        appendLine(lines, input.soundLine);
      }
      if (useDialogDice) {
        appendDiceDialogLine(input.processedContent, input.dialogNotend, input.dialogConcat);
      }
      else {
        appendDiceOverlayLine(input.processedContent);
      }
      return lines;
    }
    case MESSAGE_TYPE.INTRO_TEXT:
    case MESSAGE_TYPE.TEXT:
    default:
      break;
  }

  if (input.isIntroText) {
    const introContent = input.processedContent.replace(/ +/g, "|");
    appendLine(lines, `intro:${introContent}${input.introHold ? " -hold" : ""};`);
    return lines;
  }

  const shouldShowFigure = Boolean(input.figureLine && input.figurePosition && !input.shouldClearFigure);
  if (shouldShowFigure) {
    appendLine(lines, input.figureLine);
    appendLines(lines, input.figureAnimationLines);
  }

  if (input.annotationEffect) {
    appendLine(lines, input.annotationEffectSoundLine);
    const durationPart = getEffectDurationMs(input.annotationEffect)
      ? ` -duration=${getEffectDurationMs(input.annotationEffect)}`
      : "";
    const targetPart = input.effectTargetSlotId ? ` -target=${input.effectTargetSlotId}` : "";
    const offsetPart = input.effectOffsetPart ?? "";
    appendLine(
      lines,
      `pixiPerform:${input.annotationEffect}${targetPart}${offsetPart} -once${durationPart} -next;`,
    );
  }

  if (input.miniAvatarLine) {
    appendLine(lines, input.miniAvatarLine);
  }
  else if (input.miniAvatarVisibleBefore || input.forceMiniAvatar || input.diceShowMiniAvatar === false) {
    appendLine(lines, "miniAvatar:none;");
  }

  const dialogLine = input.isNarrator
    ? buildDialogLine(input, input.processedContent, { forceNarrator: true })
    : `${input.roleName}: ${input.processedContent}${input.vocalPart ?? ""}${input.dialogFigureIdPart}${
      input.dialogNotend ? " -notend" : ""
    }${input.dialogConcat ? " -concat" : ""}${input.dialogNext ? " -next" : ""};`;

  if (input.isNarrator) {
    appendLine(lines, dialogLine);
    return lines;
  }

  appendLine(lines, dialogLine);
  return lines;
}
