import * as React from "react";
export declare function Tabs({ defaultValue, className, children, }: {
    defaultValue: string;
    className?: string;
    children: React.ReactNode;
}): React.JSX.Element;
export declare function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;
export declare function TabsTrigger({ value, className, children, }: {
    value: string;
    className?: string;
    children: React.ReactNode;
}): React.JSX.Element;
export declare function TabsContent({ value, className, children, }: {
    value: string;
    className?: string;
    children: React.ReactNode;
}): React.JSX.Element | null;
