"use client";

import { useState } from "react";
import { X } from "lucide-react";

/** 标签输入：回车添加 chip，chip 带 x 删除（项目库 / 博客表单共用） */
export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const item = draft.trim();
    if (item && !value.includes(item)) {
      onChange([...value, item]);
    }
    setDraft("");
  }

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-sm border border-input bg-input/30 px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      {value.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-secondary-foreground"
        >
          {item}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== item))}
            aria-label={`删除 ${item}`}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        // 失焦时把草稿收进列表，避免遗漏
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
