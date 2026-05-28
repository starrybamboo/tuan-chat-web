export type CreateRoomSubmitPhase = "creating" | "syncingState" | "importing" | null;

export type InitialImportProgress = { sent: number; total: number };

type RunCreateRoomPostCreateStepsParams<TMessage> = {
  roomId?: number;
  initialImportMessages: TMessage[];
  importInitialMessages: (
    roomId: number,
    messages: TMessage[],
    onProgress: (sent: number, total: number) => void,
  ) => Promise<void>;
  onImportError: (error: unknown) => void;
  onImportSuccess: () => void;
  onSuccess?: (roomId?: number) => void;
  runStateSync?: () => Promise<void>;
  setImportProgress: (progress: InitialImportProgress | null) => void;
  setSubmitPhase: (phase: CreateRoomSubmitPhase) => void;
};

export async function runCreateRoomPostCreateSteps<TMessage>({
  importInitialMessages,
  initialImportMessages,
  onImportError,
  onImportSuccess,
  onSuccess,
  roomId,
  runStateSync,
  setImportProgress,
  setSubmitPhase,
}: RunCreateRoomPostCreateStepsParams<TMessage>) {
  if (typeof roomId === "number" && runStateSync) {
    setSubmitPhase("syncingState");
    await runStateSync();
  }

  if (typeof roomId === "number" && initialImportMessages.length > 0) {
    setSubmitPhase("importing");
    try {
      await importInitialMessages(roomId, initialImportMessages, (sent, total) => {
        setImportProgress({ sent, total });
      });
      onImportSuccess();
    }
    catch (error) {
      onImportError(error);
    }
  }

  onSuccess?.(roomId);
}
