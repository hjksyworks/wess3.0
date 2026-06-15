import type { Role } from "@/types";
export declare function ProtectedRoute({ role, children, }: {
    role: Role;
    children: React.ReactNode;
}): import("react").JSX.Element | null;
