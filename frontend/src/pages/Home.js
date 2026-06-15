import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Settings, ArrowRight } from "lucide-react";
const roleCards = [
    {
        href: "/login",
        icon: BookOpen,
        color: "blue",
        title: "학생",
        desc: "주차별 실습 일지를 작성하고, 지도자의 피드백을 받으세요.",
        items: ["주차별 일지 작성", "임시 저장 & 최종 제출", "피드백 확인"],
    },
    {
        href: "/login",
        icon: Users,
        color: "green",
        title: "지도자",
        desc: "학생 일지를 검토하고 맞춤형 피드백을 제공하세요.",
        items: ["일지 검토", "피드백 작성", "현황 관리"],
    },
    {
        href: "/login",
        icon: Settings,
        color: "purple",
        title: "관리자",
        desc: "전체 실습 일지를 중앙에서 효율적으로 관리하세요.",
        items: ["학생 현황 관리", "양식 설정", "일괄 다운로드"],
    },
];
const colorClasses = {
    blue: { bg: "bg-blue-100", bgHover: "group-hover:bg-blue-200", text: "text-blue-600", border: "hover:border-blue-300", btn: "bg-blue-600 hover:bg-blue-700" },
    green: { bg: "bg-green-100", bgHover: "group-hover:bg-green-200", text: "text-green-600", border: "hover:border-green-300", btn: "bg-green-600 hover:bg-green-700" },
    purple: { bg: "bg-purple-100", bgHover: "group-hover:bg-purple-200", text: "text-purple-600", border: "hover:border-purple-300", btn: "bg-purple-600 hover:bg-purple-700" },
};
export default function Home() {
    return (<div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600"/>
            <h1 className="text-2xl font-bold text-slate-900">현장실습 일지 시스템</h1>
          </div>
          <Link to="/login">
            <Button variant="outline">로그인</Button>
          </Link>
        </div>
      </header>

      <main className="container py-16">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
            역할별 기능 안내
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            학생, 지도자, 관리자 계정으로 로그인하여 각 역할별 기능을 이용할 수 있습니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {roleCards.map((card) => {
            const Icon = card.icon;
            const c = colorClasses[card.color];
            return (<Link to={card.href} key={card.title} className="group">
                <Card className={`h-full hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${c.border}`}>
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 ${c.bg} rounded-lg flex items-center justify-center mb-3 ${c.bgHover} transition-colors`}>
                      <Icon className={`w-6 h-6 ${c.text}`}/>
                    </div>
                    <CardTitle>{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600">{card.desc}</p>
                    <ul className="text-xs text-slate-500 space-y-2">
                      {card.items.map((item) => (<li key={item}>✓ {item}</li>))}
                    </ul>
                    <Button className={`w-full ${c.btn} group-hover:translate-x-1 transition-transform`}>
                      로그인하기
                      <ArrowRight className="w-4 h-4 ml-2"/>
                    </Button>
                  </CardContent>
                </Card>
              </Link>);
        })}
        </div>

        <div className="mt-16 bg-slate-900 text-white rounded-xl p-8 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">시스템 특징</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold mb-1">🔒 보안</p>
              <p className="text-slate-300">MinIO(S3 호환) 기반 안전한 파일 스토리지</p>
            </div>
            <div>
              <p className="font-semibold mb-1">📊 관리</p>
              <p className="text-slate-300">년도, 학기, 교과목별 양식 관리</p>
            </div>
            <div>
              <p className="font-semibold mb-1">🔄 마이그레이션</p>
              <p className="text-slate-300">유연한 데이터 마이그레이션 지원</p>
            </div>
            <div>
              <p className="font-semibold mb-1">📁 파일 관리</p>
              <p className="text-slate-300">주차별 파일 체계적 관리</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 mt-16">
        <div className="container text-center text-sm text-slate-600">
          <p>현장실습 일지 시스템 - Spring Boot + PostgreSQL + MinIO 기반</p>
        </div>
      </footer>
    </div>);
}
