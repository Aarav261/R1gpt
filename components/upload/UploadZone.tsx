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
      className={`flex flex-col rounded-lg border bg-bg-surface p-4 transition-colors ${
        dragging
          ? "border-accent-blue bg-accent-blue/5"
          : file
            ? "border-accent-green/50"
            : "border-border hover:border-border-active"
      } ${disabled ? "opacity-60" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="font-sans text-sm font-semibold text-text-primary">
          {config.label}
        </h3>
        <DocumentTag required={config.required} />
      </div>

      <p className="mb-1 font-sans text-xs text-text-secondary">
        {config.description}
      </p>

      {config.psmg && (
        <p className="mb-3 font-mono text-[11px] text-accent-purple">
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
          <div className="flex items-center justify-between gap-2 rounded border border-accent-green/40 bg-accent-green/10 px-3 py-2">
            <span className="truncate font-mono text-xs text-accent-green">
              ✓ {file.name}
            </span>
            <button
              type="button"
              onClick={() => onFile(null)}
              disabled={disabled}
              className="font-mono text-xs text-text-muted hover:text-accent-red"
            >
              remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="w-full rounded border border-dashed border-border px-3 py-2 font-mono text-xs text-text-muted transition-colors hover:border-border-active hover:text-text-secondary"
          >
            Drop file or click to browse
          </button>
        )}
      </div>
    </div>
  );
}
