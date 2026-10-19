import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * NASA-Punk 按钮（AGENTS.md §2）
 * - 圆角 0、1px 炭黑边框、等宽字体 + 全大写 + 加宽字距
 * - 主按钮：警示红底白字；hover 直接反转为炭黑底白字
 * - transition-none：颜色是"硬切换"，不做发光/渐变过渡
 */
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-none border bg-card font-mono text-[0.68rem] font-bold tracking-[0.14em] whitespace-nowrap uppercase outline-none select-none transition-none active:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        /* 主按钮：全站唯一鲜艳色，仅此处与关键状态使用 */
        default:
          "border-primary bg-primary text-primary-foreground hover:border-foreground hover:bg-foreground hover:text-white",
        /* 次按钮：白底黑边黑字 → hover 黑底白字 */
        outline:
          "border-foreground bg-card text-foreground hover:bg-foreground hover:text-white",
        secondary:
          "border-foreground bg-muted text-foreground hover:bg-foreground hover:text-white",
        ghost:
          "border-transparent bg-transparent text-foreground hover:border-foreground hover:bg-foreground hover:text-white",
        destructive:
          "border-destructive bg-card text-destructive hover:bg-destructive hover:text-white",
        link: "border-transparent bg-transparent px-0 text-foreground underline decoration-primary decoration-1 underline-offset-4 hover:text-chart-blue hover:no-underline",
      },
      size: {
        default: "h-8 px-3",
        xs: "h-6 px-2 text-[0.6rem] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 px-2.5 text-[0.64rem] [&_svg:not([class*='size-'])]:size-3",
        lg: "h-10 px-4",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
