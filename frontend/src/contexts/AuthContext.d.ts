import * as React from "react";
import type { AuthUser } from "@/types";
interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    /** 로그인 시도. 백엔드가 아직 없거나 응답이 없으면 데모용 mock 계정으로 동작한다. */
    login: (loginId: string, password: string) => Promise<AuthUser>;
    logout: () => void;
}
export declare function AuthProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useAuth(): AuthContextValue;
export {};
