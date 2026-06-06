"use client";

import { useCallback, useRef, useState } from "react";
import { DocumentTag } from "./DocumentTag";

export interface DocSlotConfig {
  type: string;
  label: string;
  description: string;
  psmg: string | null;
  required: boolean;
}

interface UploadZoneProps {
  config: DocSlotConfig;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}

export function UploadZone({
  config,
  file,
  onFile,
  disabled,
}: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) onFile(dropped);
    },
    [onFile, disabled]
  );

  return (
    <div
      className={`flex flex-col rounded-none border bg-surface-1 p-4 transition-colors ${
        dragging
          ? "border-ibm-blue bg-ibm-blue/5"
          : file
            ? "border-success/50"
            : "border-hairline hover:border-ibm-blue"
      } ${disabled ? "opacity-60" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="font-sans text-sm font-semibold text-ink">
          {config.label}
        </h3>
        <DocumentTag required={config.required} />
      </div>

      <p className="mb-1 font-sans text-xs text-ink-muted">
        {config.description}
      </p>

      {config.psmg && (
        <p className="mb-3 font-mono text-[11px] text-ibm-blue">
          {config.psmg}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt"
        className="hidden"
        disabled={disabled}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      <div className="mt-auto">
        {file ? (
          <div className="flex items-center justify-between gap-2 rounded-none border border-success/40 bg-success/10 px-3 py-2">
            <span className="truncate font-mono text-xs text-success">
              ✓ {file.name}
            </span>
            <button
              type="button"
              onClick={() => onFile(null)}
              disabled={disabled}
              className="font-sans text-xs text-ink-subtle hover:text-error"
            >
              remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="w-full rounded-none border border-dashed border-hairline px-3 py-2 font-sans text-xs text-ink-subtle transition-colors hover:border-ibm-blue hover:text-ink-muted"
          >
            Drop file or click to browse
          </button>
        )}
      </div>
    </div>
  );
}
