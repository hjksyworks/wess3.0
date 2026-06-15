import * as React from "react";
interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}
export declare function Dialog({ open, onClose, title, children, footer, className }: DialogProps): React.JSX.Element | null;
export {};
