/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClueMessage } from './ClueMessage';
import type { CommandRequestExtra } from './CommandRequestExtra';
import type { DiceResult } from './DiceResult';
import type { EffectMessage } from './EffectMessage';
import type { FileMessage } from './FileMessage';
import type { ForwardMessage } from './ForwardMessage';
import type { ImageMessage } from './ImageMessage';
import type { SoundMessage } from './SoundMessage';
import type { WebgalVarPayload } from './WebgalVarPayload';
/**
 * 不同类型消息持有的额外信息
 */
export type MessageExtra = {
    diceResult?: DiceResult;
    fileMessage?: FileMessage;
    imageMessage?: ImageMessage;
    forwardMessage?: ForwardMessage;
    soundMessage?: SoundMessage;
    clueMessage?: ClueMessage;
    effectMessage?: EffectMessage;
    webgalVar?: WebgalVarPayload;
    commandRequest?: CommandRequestExtra;
};

