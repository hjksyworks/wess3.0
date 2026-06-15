import * as React from "react";
import { cn } from "@/lib/utils";
export function Badge({ className, ...props }) {
    return (<span className={cn("inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium transition-colors", "bg-secondary text-secondary-foreground", className)} {...props}/>);
}
