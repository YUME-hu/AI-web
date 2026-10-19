import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/*
 * 工业输入框（AGENTS.md §2）
 * `.np-input` 提供：纯白底、1px 炭黑边、左侧红色实心方块光标 █、聚焦 2px 黑边效果。
 * 光标用背景色块实现（input 不支持 ::before），所以不依赖任何 wrapper。
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "np-input h-8 w-full min-w-0 py-1 text-sm outline-none selection:bg-primary selection:text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:text-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
