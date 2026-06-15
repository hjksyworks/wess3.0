import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, LogOut } from "lucide-react";

const roleLabel: Record<string, string> = {
  STUDENT: "학생",
  SUPERVISOR: "지도자",
  ADMIN: "관리자",
};

export function DashboardHeader({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{title}</h1>
            <p className="text-xs text-slate-500 leading-tight">현장실습 일지 시스템</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-slate-600">
              {user.name}
              <span className="text-slate-400"> ({roleLabel[user.role]})</span>
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logout();
              navigate("/", { replace: true });
            }}
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </div>
      </div>
    </header>
  );
}
