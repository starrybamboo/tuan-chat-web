import type { MessageTypeValue } from "../messageType";

export type AnnotationTone = "neutral" | "info" | "success" | "warning" | "accent" | "primary";

export type AnnotationDefinition = {
  id: string;
  label: string;
  category?: string;
  messageTypes?: readonly MessageTypeValue[];
  iconUrl?: string;
  tone?: AnnotationTone;
  showInNormalMode?: boolean;
  source?: "builtin" | "custom";
  hideLabel?: boolean;
  effectFrames?: number;
};
