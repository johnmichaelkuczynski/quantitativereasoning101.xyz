import React, { useRef, useState, useEffect, useCallback } from "react";
import { KeystrokeTrace } from "@workspace/api-client-react";
import { MathKeyboard } from "@/components/MathKeyboard";
import { QuickPickBar } from "@/components/QuickPickBar";

interface AnswerInputProps {
  value: string;
  onChange: (val: string, trace: KeystrokeTrace) => void;
  placeholder?: string;
  disabled?: boolean;
  promptSource?: string;
  /**
   * Prose mode: for substantive multi-sentence written answers. Uses a
   * readable serif/sans body font instead of the large monospace math style,
   * and hides the math keyboard + quick-pick symbol bar.
   */
  prose?: boolean;
}

export function AnswerInput({ value, onChange, placeholder, disabled, promptSource, prose }: AnswerInputProps) {
  const [sessionValue, setSessionValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const traceRef = useRef<KeystrokeTrace>({
    keystrokeCount: 0,
    eraseCount: 0,
    bulkInsertCount: 0,
    longestBulkInsertChars: 0,
    rewriteSegments: 0,
    durationMs: 0,
  });

  const sessionStartRef = useRef<number>(Date.now());
  const lastKeyWasEraseRef = useRef<boolean>(false);

  useEffect(() => {
    setSessionValue(value);
  }, [value]);

  const emitChange = useCallback(
    (newVal: string) => {
      const trace = {
        ...traceRef.current,
        durationMs: Date.now() - sessionStartRef.current,
      };
      onChange(newVal, trace);
    },
    [onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const diff = newVal.length - sessionValue.length;

    if (diff > 5) {
      traceRef.current.bulkInsertCount = (traceRef.current.bulkInsertCount || 0) + 1;
      if (diff > (traceRef.current.longestBulkInsertChars || 0)) {
        traceRef.current.longestBulkInsertChars = diff;
      }
    }

    setSessionValue(newVal);
    emitChange(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isErase = e.key === "Backspace" || e.key === "Delete";

    if (isErase) {
      traceRef.current.eraseCount += 1;
      if (!lastKeyWasEraseRef.current) {
        traceRef.current.rewriteSegments = (traceRef.current.rewriteSegments || 0) + 1;
      }
      lastKeyWasEraseRef.current = true;
    } else if (e.key.length === 1 || e.key === "Enter") {
      traceRef.current.keystrokeCount += 1;
      lastKeyWasEraseRef.current = false;
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => e.preventDefault();

  const insertAtCursor = useCallback(
    (text: string) => {
      if (!text) return;
      const ta = textareaRef.current;
      const current = sessionValue;
      let next: string;
      let nextCaret: number;
      if (ta && document.activeElement === ta) {
        const start = ta.selectionStart ?? current.length;
        const end = ta.selectionEnd ?? current.length;
        next = current.slice(0, start) + text + current.slice(end);
        nextCaret = start + text.length;
      } else {
        next = current + text;
        nextCaret = next.length;
      }
      traceRef.current.keystrokeCount += text.length;
      setSessionValue(next);
      emitChange(next);
      requestAnimationFrame(() => {
        if (!ta) return;
        ta.focus();
        try {
          ta.setSelectionRange(nextCaret, nextCaret);
        } catch {}
      });
    },
    [sessionValue, emitChange],
  );

  const backspaceAtCursor = useCallback(() => {
    const ta = textareaRef.current;
    const current = sessionValue;
    let next: string;
    let nextCaret: number;
    if (ta && document.activeElement === ta) {
      const start = ta.selectionStart ?? current.length;
      const end = ta.selectionEnd ?? current.length;
      if (start === end) {
        if (start === 0) return;
        next = current.slice(0, start - 1) + current.slice(end);
        nextCaret = start - 1;
      } else {
        next = current.slice(0, start) + current.slice(end);
        nextCaret = start;
      }
    } else {
      if (current.length === 0) return;
      next = current.slice(0, -1);
      nextCaret = next.length;
    }
    traceRef.current.eraseCount += 1;
    if (!lastKeyWasEraseRef.current) {
      traceRef.current.rewriteSegments = (traceRef.current.rewriteSegments || 0) + 1;
    }
    lastKeyWasEraseRef.current = true;
    setSessionValue(next);
    emitChange(next);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      try {
        ta.setSelectionRange(nextCaret, nextCaret);
      } catch {}
    });
  }, [sessionValue, emitChange]);

  const clearAll = useCallback(() => {
    traceRef.current.eraseCount += sessionValue.length;
    setSessionValue("");
    emitChange("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [sessionValue.length, emitChange]);

  return (
    <div className="flex flex-col gap-2 w-full">
      {promptSource && !disabled && !prose && (
        <QuickPickBar source={promptSource} onInsert={insertAtCursor} />
      )}
      <textarea
        ref={textareaRef}
        value={sessionValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onDrop={handleDrop}
        placeholder={
          placeholder ||
          (prose
            ? "Write your answer in a few complete sentences…"
            : "Type your answer here...")
        }
        disabled={disabled}
        className={
          prose
            ? "w-full min-h-[200px] p-4 bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-base leading-relaxed resize-y"
            : "w-full min-h-[180px] p-5 bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-2xl leading-relaxed resize-y"
        }
      />
      <span className="text-xs text-muted-foreground px-1">Pasting is disabled.</span>
      {!disabled && !prose && (
        <MathKeyboard
          onInsert={insertAtCursor}
          onBackspace={backspaceAtCursor}
          onClear={clearAll}
        />
      )}
    </div>
  );
}
