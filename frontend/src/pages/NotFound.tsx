import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <FileQuestion className="w-12 h-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-muted-foreground">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <Link to="/">
        <Button>홈으로 이동</Button>
      </Link>
    </div>
  );
}
