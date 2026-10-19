import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * 工业标签（AGENTS.md §2）
 * - 10px、全大写、等宽、黑色细边框、圆角 0、无过渡动画
 * - hazard 变体使用黑白斜纹底纹表示"重要/警告"
 */
const badgeVariants = cva(
  "group/badge inline-flex h-[18px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border border-foreground px-1.5 font-mono text-[10px] leading-none font-bold tracking-[0.14em] whitespace-nowrap uppercase select-none has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&>svg]:pointer-events-none [&>svg]:size-2.5!",
  {
    variants: {
      variant: {
        /* 强调：黑底米白字 */
        default: "bg-foreground text-background",
        /* 常驻：白底黑边黑字 */
        outline: "bg-card text-foreground",
        /* 重要/警告：黑白斜纹底 */
        hazard: "hazard-stripes bg-card text-foreground",
        secondary: "border-foreground/60 bg-muted text-foreground",
        destructive: "border-primary bg-card text-primary",
        ghost: "border-transparent text-foreground",
        link: "border-transparent text-foreground underline underline-offset-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
