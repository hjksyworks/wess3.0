# WESS 현장실습 일지 시스템 - 프론트엔드

Vite + React 19 + TypeScript + Tailwind CSS v4 기반의 신규 프론트엔드 프로젝트입니다.
`WESS_데모사이트_설계검토.md` 에서 정리한 화면/API 설계를 기준으로 처음부터 새로 구성했습니다.

## ⚠️ 설치 전 확인

이 폴더에 `node_modules` 디렉터리가 이미 존재한다면(설계 검증 과정에서 생성된 손상된 폴더일 수 있음)
**먼저 삭제한 뒤** `npm install`을 실행하세요.

```bash
rm -rf node_modules package-lock.json   # Windows: 폴더 직접 삭제
```

## 1. 설치

```bash
npm install
```

## 2. 개발 서버 실행

```bash
npm run dev
```

- 기본적으로 `/api` 요청은 `http://11.11.11.99:8080` (WESS 파일럿 백엔드)으로 프록시됩니다.
- 다른 서버를 바라보게 하려면 환경변수로 지정하세요.

```bash
VITE_API_PROXY_TARGET=http://localhost:8080 npm run dev
```

## 3. 빌드

```bash
npm run build
```

- 결과물은 `dist/` 폴더에 생성됩니다.
- 정적 파일이므로 nginx(WESS Docker Compose 스택의 nginx 컨테이너) 등에서 서빙하면 됩니다.
  예: `dist/` 내용을 nginx의 정적 파일 경로로 복사 후, `/api/` 는 기존처럼 springboot-app:8080 으로 라우팅.

## 4. 미리보기 (빌드 결과 확인)

```bash
npm run preview
```

## 데모(오프라인) 로그인 계정

백엔드 `/api/auth/login` 이 아직 없거나 응답하지 않으면, 아이디 접두사로 역할이 결정되는
데모 계정으로 동작합니다. 비밀번호는 임의의 값을 입력하면 됩니다.

| 아이디 접두사 | 역할 | 예시 아이디 |
| --- | --- | --- |
| (기본) | 학생 | `student1` |
| `supervisor` 또는 `teacher` | 지도자 | `supervisor1` |
| `admin` | 관리자 | `admin1` |

각 대시보드는 학생/지도자/관리자 화면 모두 백엔드 API 호출을 우선 시도하고,
실패 시(백엔드 미연동) 화면 표시용 mock 데이터로 자동 대체됩니다 (`src/lib/mockData.ts`).

## 화면 구성

| 경로 | 화면 | 접근 권한 |
| --- | --- | --- |
| `/` | 홈(역할 안내) | 전체 |
| `/login` | 로그인 | 전체 |
| `/student` | 학생 대시보드 | STUDENT |
| `/supervisor` | 지도자 대시보드 | SUPERVISOR |
| `/admin` | 관리자 대시보드 | ADMIN |

학생 대시보드는 관리자가 등록한 양식 템플릿(`FormTemplate.fields`)에 따라 일지 작성 항목이
동적으로 구성됩니다(기존 데모의 고정 항목 → 동적 항목으로 개선).

## 백엔드 API 매핑 참조

설계검토 문서 기준으로 프론트가 호출하는 엔드포인트입니다. 백엔드(Spring Boot) 구현 시 참고하세요.

| 메서드 | 엔드포인트 | 설명 | 사용 화면 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 로그인 (loginId, password → user, token) | Login |
| GET | `/api/enrollments/me` | 로그인한 학생의 학기 배정 정보 | 학생 |
| GET | `/api/journals?enrollmentId={id}` | 학생 본인의 주차별 일지 목록 | 학생 |
| GET | `/api/journals/{id}/feedback` | 특정 일지의 피드백 조회 | 학생 |
| PUT | `/api/journals/{id}` | 일지 임시저장/최종제출 (status: WRITING/SUBMITTED) | 학생 |
| GET | `/api/journals?role=supervisor` | 담당 학생들의 제출 일지 목록 | 지도자 |
| POST | `/api/journals/{id}/feedback` | 피드백 등록/수정 (status → REVIEWED) | 지도자 |
| GET | `/api/admin/stats` | 전체 통계(총학생수/완료율/양식수/일지수) | 관리자 |
| GET | `/api/admin/students` | 학생별 실습 현황 목록 | 관리자 |
| GET | `/api/form-templates` | 양식 템플릿 목록 | 관리자 |
| POST | `/api/form-templates` | 양식 템플릿 신규 등록 (동적 FormField[]) | 관리자 |
| GET | `/api/export/journals?year=&semester=&includeFeedback=` | 일지 일괄 다운로드(zip, blob) | 관리자 |

인증 토큰은 `Authorization: Bearer <token>` 헤더로 전송됩니다 (`src/lib/api.ts`).

## 프로젝트 구조

```
src/
  components/      공통 UI 컴포넌트(Button, Card, Dialog, Tabs 등) + DashboardHeader, ProtectedRoute
  contexts/         AuthContext (로그인 상태, mock 로그인 fallback)
  lib/              api 클라이언트, mockData, cn 유틸
  pages/            Home, Login, NotFound, StudentDashboard, SupervisorDashboard, AdminDashboard
  types/            데이터 모델 타입 정의
  App.tsx           라우팅 설정
```
