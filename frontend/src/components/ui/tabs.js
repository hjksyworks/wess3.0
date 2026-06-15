import * as React from "react";
import { cn } from "@/lib/utils";
const TabsContext = React.createContext(null);
export function Tabs({ defaultValue, className, children, }) {
    const [value, setValue] = React.useState(defaultValue);
    return (<TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>);
}
export function TabsList({ className, ...props }) {
    return (<div className={cn("inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)} {...props}/>);
}
export function TabsTrigger({ value, className, children, }) {
    const ctx = React.useContext(TabsContext);
    if (!ctx)
        throw new Error("TabsTrigger must be used within Tabs");
    const active = ctx.value === value;
    return (<button type="button" onClick={() => ctx.setValue(value)} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150", active ? "bg-background text-foreground shadow-sm" : "hover:text-foreground", className)}>
      {children}
    </button>);
}
export function TabsContent({ value, className, children, }) {
    const ctx = React.useContext(TabsContext);
    if (!ctx)
        throw new Error("TabsContent must be used within Tabs");
    if (ctx.value !== value)
        return null;
    return <div className={className}>{children}</div>;
}
