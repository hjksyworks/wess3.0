import * as React from "react";
import { cn } from "@/lib/utils";
export const Select = React.forwardRef(({ className, children, ...props }, ref) => {
    return (<select ref={ref} className={cn("flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm", "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props}>
        {children}
      </select>);
});
Select.displayName = "Select";
