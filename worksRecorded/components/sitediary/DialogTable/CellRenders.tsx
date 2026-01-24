// components/site-diary/CellRenders.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const MAX_FREE_TEXT = 100;

export function dropdownRender(args: {
  value: string;
  placeholder: string;
  widthClass?: string;
  options: { value: string; label: string }[];
  allowCustom?: boolean;
  customValue?: string;
  mode?: "select" | "manual";
  onModeChange?: (mode: "select" | "manual") => void;
  onCustomChange?: (v: string) => void;
  onValueChange: (v: string) => void;
  customTriggerValue?: string;
  customLabel?: string;
  customPlaceholder?: string;
  customWidthClass?: string;
}) {
  const {
    value,
    placeholder,
    widthClass = "w-full",
    options,
    allowCustom = false,
    mode = "select",
    onModeChange,
    customValue = "",
    onCustomChange,
    onValueChange,
    customTriggerValue = "__custom__",
    customLabel = "+ Custom…",
    customPlaceholder = "Type…",
    customWidthClass = "w-[180px]",
  } = args;

  if (allowCustom && mode === "manual") {
    return (
      <div className="flex gap-2">
        <Input
          className={customWidthClass}
          placeholder={customValue || value || placeholder}
          maxLength={MAX_FREE_TEXT}
          value={customValue || value || ""}
          onChange={(e) => onCustomChange?.(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onModeChange?.("select");
            onCustomChange?.("");
          }}
        >
          Use list
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value || ""}
      onValueChange={(val) => {
        if (allowCustom && val === customTriggerValue) {
          onModeChange?.("manual");
          onValueChange("");
          return;
        }
        onModeChange?.("select");
        onValueChange(val);
      }}
    >
      <SelectTrigger className={widthClass}>
        {/* show current value if empty selection */}
        <SelectValue placeholder={value || placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
        {allowCustom && (
          <SelectItem value={customTriggerValue}>{customLabel}</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

export function textInputRender(args: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const { value, placeholder = "", onChange } = args;

  return (
    <Textarea
      rows={1}
      className="w-full max-w-full min-h-0 resize-y overflow-x-hidden overflow-y-hidden break-words whitespace-pre-wrap"
      placeholder={value || placeholder}
      value={value ?? ""}
      onInput={(e) => {
        const t = e.currentTarget;
        t.style.height = "auto";
        t.style.height = `${t.scrollHeight}px`;
      }}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function floatRender(args: {
  value: any;
  placeholder?: string;
  onChange: (v: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const { value, placeholder = "", onChange, inputMode = "decimal" } = args;

  return (
    <Input
      className="w-full text-center"
      inputMode={inputMode}
      placeholder={String(value ?? "") || placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
