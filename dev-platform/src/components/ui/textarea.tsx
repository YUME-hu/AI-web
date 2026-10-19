import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * 工业多行输入框（AGENTS.md §2）
 * 与 Input 同款：纯白底、1px 炭黑边、聚焦 2px 黑边效果；
 * 红色方块光标贴首行左侧，而不是垂直居中。
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "np-input np-textarea flex field-sizing-content min-h-16 w-full py-2 text-sm outline-none selection:bg-primary selection:text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:text-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
