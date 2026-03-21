/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClueMessage } from './ClueMessage';
import type { CommandRequestExtra } from './CommandRequestExtra';
import type { DiceResult } from './DiceResult';
import type { DocCardExtra } from './DocCardExtra';
import type { FileMessage } from './FileMessage';
import type { ForwardMessage } from './ForwardMessage';
import type { ImageMessage } from './ImageMessage';
import type { RoomJumpExtra } from './RoomJumpExtra';
import type { SoundMessage } from './SoundMessage';
import type { VideoMessage } from './VideoMessage';
import type { WebgalChoosePayload } from './WebgalChoosePayload';
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
    videoMessage?: VideoMessage;
    clueMessage?: ClueMessage;
    webgalVar?: WebgalVarPayload;
    webgalChoose?: WebgalChoosePayload;
    commandRequest?: CommandRequestExtra;
    docCard?: DocCardExtra;
    roomJump?: RoomJumpExtra;
};

