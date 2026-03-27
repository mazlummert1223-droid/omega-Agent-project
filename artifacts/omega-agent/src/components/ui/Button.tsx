import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'glass';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-95 font-display tracking-wider",
          {
            'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_0_15px_rgba(176,38,255,0.4)] hover:shadow-[0_0_25px_rgba(176,38,255,0.6)] hover:brightness-110 border border-primary/50': variant === 'default',
            'border border-border bg-background hover:bg-secondary hover:text-accent hover:border-accent/50': variant === 'outline',
            'hover:bg-secondary/50 hover:text-accent': variant === 'ghost',
            'glass-panel hover:bg-white/5 hover:border-primary/50 text-foreground': variant === 'glass',
            'h-10 px-4 py-2': size === 'default',
            'h-8 rounded-lg px-3 text-xs': size === 'sm',
            'h-12 rounded-xl px-8 text-base': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
