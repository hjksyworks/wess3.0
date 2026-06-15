import * as React from "react";
import { cn } from "@/lib/utils";
const variantClasses = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
};
const sizeClasses = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-9 px-3 text-sm",
    lg: "h-11 px-8 text-base",
    icon: "h-9 w-9",
};
export const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
    return (<button ref={ref} className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50", variantClasses[variant], sizeClasses[size], className)} {...props}/>);
});
Button.displayName = "Button";
