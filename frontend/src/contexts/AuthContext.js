import * as React from "react";
import { api } from "@/lib/api";
const AuthContext = React.createContext(null);
const STORAGE_USER = "wess_user";
const STORAGE_TOKEN = "wess_token";
// 백엔드 /api/auth/login 이 아직 준비되지 않았을 때를 위한 데모 계정.
// 아이디 접두사로 역할을 구분한다: student1 / supervisor1 / admin1
function mockLogin(loginId) {
    const id = loginId.trim().toLowerCase();
    let role = "STUDENT";
    let name = "이준호";
    if (id.startsWith("supervisor") || id.startsWith("teacher")) {
        role = "SUPERVISOR";
        name = "김지은 교수";
    }
    else if (id.startsWith("admin")) {
        role = "ADMIN";
        name = "관리자";
    }
    return { id: 1, name, role };
}
export function AuthProvider({ children }) {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
        const stored = localStorage.getItem(STORAGE_USER);
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            }
            catch {
                localStorage.removeItem(STORAGE_USER);
            }
        }
        setLoading(false);
    }, []);
    const login = React.useCallback(async (loginId, password) => {
        let authUser;
        let token = "";
        try {
            // 설계검토 문서 기준 예상 엔드포인트: POST /api/auth/login
            const res = await api.post("/auth/login", { loginId, password });
            authUser = res.data.user;
            token = res.data.token;
        }
        catch {
            // 백엔드 미연동 상태에서는 데모 계정으로 대체
            authUser = mockLogin(loginId);
            token = "demo-token";
        }
        localStorage.setItem(STORAGE_USER, JSON.stringify(authUser));
        localStorage.setItem(STORAGE_TOKEN, token);
        setUser(authUser);
        return authUser;
    }, []);
    const logout = React.useCallback(() => {
        localStorage.removeItem(STORAGE_USER);
        localStorage.removeItem(STORAGE_TOKEN);
        setUser(null);
    }, []);
    return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const ctx = React.useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
