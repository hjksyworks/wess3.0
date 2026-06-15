import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, LogIn } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const user = await login(loginId, password);
      const target = user.role === "STUDENT" ? "/student" : user.role === "SUPERVISOR" ? "/supervisor" : "/admin";
      navigate(target, { replace: true });
    } catch {
      setError("로그인에 실패했습니다. 아이디/비밀번호를 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>현장실습 일지 시스템</CardTitle>
          <p className="text-sm text-muted-foreground">계정으로 로그인하세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginId">아이디</Label>
              <Input
                id="loginId"
                placeholder="아이디"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              <LogIn className="w-4 h-4" />
              로그인
            </Button>
          </form>
          <p className="text-center mt-4">
            <Link to="/" className="text-sm text-primary hover:underline">
              홈으로 돌아가기
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
