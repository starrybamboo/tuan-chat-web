import type {
  ChangeEvent,
  CompositionEvent,
  InputHTMLAttributes,
  KeyboardEvent,
} from "react";

import { forwardRef, useCallback, useRef, useState } from "react";

const DEFAULT_COMPOSITION_END_ACTION_GUARD_MS = 250;

type ImeAwareSearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "onCompositionEnd" | "onCompositionStart" | "onKeyDown" | "type" | "value"
> & {
  value: string;
  onValueChange: (value: string) => void;
  onCommitValueChange?: (value: string) => void;
  onEscape?: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSubmit?: (value: string) => void;
  type?: "text" | "search";
  actionGuardMs?: number;
};

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

/**
 * IME-aware search input: draft text always updates, but committed search text
 * waits until CJK composition finishes.
 */
export const ImeAwareSearchInput = forwardRef<HTMLInputElement, ImeAwareSearchInputProps>(
  function ImeAwareSearchInput({
    actionGuardMs = DEFAULT_COMPOSITION_END_ACTION_GUARD_MS,
    onCommitValueChange,
    onEscape,
    onKeyDown,
    onSubmit,
    onValueChange,
    type = "text",
    value,
    ...inputProps
  }, ref) {
    const isComposingRef = useRef(false);
    const actionGuardUntilRef = useRef(0);

    const shouldIgnoreActionKey = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
      return (
        isComposingRef.current
        || event.nativeEvent.isComposing
        || now() < actionGuardUntilRef.current
      );
    }, []);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.currentTarget.value;
      onValueChange(nextValue);
      if (!isComposingRef.current) {
        onCommitValueChange?.(nextValue);
      }
    };

    const handleCompositionStart = () => {
      isComposingRef.current = true;
      actionGuardUntilRef.current = Number.POSITIVE_INFINITY;
    };

    const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = false;
      actionGuardUntilRef.current = now() + actionGuardMs;
      const nextValue = event.currentTarget.value;
      onValueChange(nextValue);
      onCommitValueChange?.(nextValue);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (shouldIgnoreActionKey(event)) {
        return;
      }

      if (event.key === "Enter" && onSubmit) {
        event.preventDefault();
        onSubmit(event.currentTarget.value);
        return;
      }

      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        onEscape(event.currentTarget.value);
        return;
      }

      onKeyDown?.(event);
    };

    return (
      <input
        {...inputProps}
        ref={ref}
        type={type}
        value={value}
        onChange={handleChange}
        onCompositionEnd={handleCompositionEnd}
        onCompositionStart={handleCompositionStart}
        onKeyDown={handleKeyDown}
      />
    );
  },
);

/**
 * Keeps visible draft text separate from the committed search keyword.
 */
export function useImeSearchValue(initialValue = "") {
  const [inputValue, setInputValue] = useState(initialValue);
  const [committedValue, setCommittedValue] = useState(initialValue);

  const clear = useCallback(() => {
    setInputValue("");
    setCommittedValue("");
  }, []);

  const setValue = useCallback((value: string) => {
    setInputValue(value);
    setCommittedValue(value);
  }, []);

  return {
    clear,
    committedValue,
    inputValue,
    inputProps: {
      onCommitValueChange: setCommittedValue,
      onValueChange: setInputValue,
      value: inputValue,
    },
    setCommittedValue,
    setInputValue,
    setValue,
  };
}
