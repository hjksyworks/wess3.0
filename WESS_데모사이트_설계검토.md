# 현장실습 일지 데모 사이트 — 설계 검토 & 파일럿 연동 설계

> 검토 대상: https://github.com/hjksyworks/internship-journal-design-site
> 목적: 현재 화면(Mock UI)만 존재하는 데모 사이트를 [[WESS 파일럿 프로젝트]]에서 구축 중인 백엔드(Spring Boot + PostgreSQL + MinIO + OnlyOffice, 11.11.11.99)와 연동하기 위한 설계 정리

---

## 1. 현재 데모 사이트 현황

- **스택**: React 19 + Tailwind 4 + shadcn/ui, Wouter(클라이언트 라우팅), 정적 프론트엔드 템플릿(Manus web-static)
- **모든 데이터가 하드코딩된 mock** — 백엔드 호출 없음, 로그인/인증 화면 없음
- **라우트 구조**
  - `/` Home — 학생/지도자/관리자 역할 선택
  - `/student-demo`, `/supervisor-demo`, `/admin-demo` — 역할별 소개 랜딩 페이지 (체험하기 → 대시보드로 이동)
  - `/student`, `/supervisor`, `/admin` — 실제 mock 데이터가 들어간 대시보드 (핵심 화면)

---

## 2. 화면별 기능 인벤토리 & 필요 API 매핑

### 2.1 학생 대시보드 (`/student`)

| UI 요소 | 현재 mock | 필요 API/데이터 |
|---|---|---|
| 상단 컨텍스트 카드 (년도/학기/교과목/실습명칭/실습기간) | 하드코딩 | `GET /api/students/{id}/enrollment` — 학생의 현재 배정 정보 |
| 상태 요약 (작성완료/임시저장/미작성 카운트) | journals 배열에서 계산 | journals 목록 응답에서 집계 |
| 최근 피드백 목록 | feedbacks 객체 | `GET /api/students/{id}/feedbacks?recent=true` |
| 주차별 일지 테이블 (주차/상태/제출일/피드백여부/액션) | journals 배열 | `GET /api/journals?enrollmentId=...` |
| 일지 작성 폼 (실습 시작일/종료일, 실습 내용 textarea) | formData state | `PUT /api/journals/{id}` (status=WRITING) |
| 임시 저장 | alert | `PUT /api/journals/{id}/draft` |
| 최종 제출 (제출 후 수정 불가) | alert | `PATCH /api/journals/{id}/submit` → status=SUBMITTED, 이후 서버에서 수정 차단 |
| 피드백 모달 (일지 내용 + 지도자 피드백, 이전/다음 주차 이동) | feedbacks 객체 | `GET /api/journals/{id}` (피드백 포함) |

### 2.2 지도자 대시보드 (`/supervisor`)

| UI 요소 | 현재 mock | 필요 API/데이터 |
|---|---|---|
| 통계 카드 (담당 학생/검토대기/검토완료) | studentJournals 배열 집계 | `GET /api/supervisors/{id}/journals` 응답 집계 |
| 학생별 일지 테이블 (학생명/주차/제출일/상태) | studentJournals 배열 | 동일 — status는 SUBMITTED→pending, REVIEWED→reviewed 매핑 |
| 일지 상세 + 피드백 작성 모달 (이전/다음 일지 탐색) | feedbackText state | `GET /api/journals/{id}`, `POST /api/journals/{id}/feedback` |
| 피드백 제출 | alert | `POST /api/journals/{id}/feedback` → journal.status = REVIEWED |

### 2.3 관리자 대시보드 (`/admin`)

| UI 요소 | 현재 mock | 필요 API/데이터 |
|---|---|---|
| 통계 카드 (총학생수/완료율/양식템플릿수/총일지수) | 하드코딩 | `GET /api/admin/stats` |
| 학생현황 탭 (이름/전공/학년/완료율/상태) | students 배열 | `GET /api/admin/students?year=&semester=` |
| 양식관리 탭 (양식명/년도/학기/교과목, 다운로드/설정) | formTemplates 배열 | `GET/POST/PUT /api/admin/form-templates` |
| "새 양식 추가" | 미구현 | `POST /api/admin/form-templates` — **양식 필드 정의(작성 항목) 포함 필요** |
| 일괄 다운로드 탭 (년도/학기 선택 → PDF 일괄 다운로드) | alert | `POST /api/admin/export?year=&semester=` → zip 스트리밍 |

---

## 3. 제안 데이터 모델 (PostgreSQL)

```
users
  id, name, role(STUDENT|SUPERVISOR|ADMIN), login_id, password_hash, major, grade

form_templates                 -- 연도/학기/교과목별 양식
  id, year, semester, subject, name, fields(JSONB: 작성 항목 정의), created_at

enrollments                    -- 학생의 학기별 실습 배정
  id, student_id, supervisor_id, form_template_id,
  practice_name(실습명칭), start_date, end_date, total_weeks

journals                       -- 주차별 일지
  id, enrollment_id, week, status(WRITING|SUBMITTED|REVIEWED),
  start_date, end_date, content,
  file_path(MinIO: {year}/{semester}/{subject}/week_{n}/log_file.pdf),
  submitted_at, updated_at

feedbacks                      -- 일지와 1:1
  id, journal_id (unique FK), supervisor_id, content, created_at
```

- `journals.status`: `WRITING`(미작성/임시저장 구분은 content 존재 여부) → `SUBMITTED`(제출, 이후 UPDATE API 차단) → `REVIEWED`(피드백 작성 시 자동 전환)
- 현재 화면의 "작성 전 / 임시 저장 / 제출 완료" 3단계는 `WRITING` 상태를 content 유무로 다시 나눈 것 — UI 라벨 ↔ DB status 매핑 시 주의

---

## 4. WESS 파일럿 인프라(11.11.11.99) 연동 방안

기존 [[WESS 구성현황 문서 위치]]에 정리된 스택(nginx / postgres-db / minio-storage / onlyoffice-app / springboot-app)을 그대로 활용:

- **프론트 배치**: `client/` 빌드 결과(`dist/public`)를 nginx static 경로 또는 별도 컨테이너로 서빙. 현재 nginx `location /`은 테스트용 `index.html` 한 장만 마운트 중 → 데모 사이트 빌드물로 교체 필요
- **API 연동**: 프론트의 axios baseURL을 `/api`로 설정 → 기존 nginx `location /api/ → springboot-app:8080` 라우팅 그대로 사용
- **파일 저장**: 일지 본문을 파일(PDF/docx)로 관리할 경우 MinIO `wess-bucket`에 `{year}/{semester}/{subject}/week_{n}/log_file.pdf` 경로로 저장, 서버가 스트리밍 중계 (외부 직접 접근 차단 요구사항 충족)

---

## 5. 결정이 필요한 미해결 설계 이슈

1. **로그인/인증**: 현재 화면엔 로그인 페이지가 전혀 없음. 학생/지도자/관리자 구분을 어떻게 인증할지(자체 로그인 vs SSO/OAuth), 세션/JWT 방식 결정 필요. 결정 전까지 `/student`, `/supervisor`, `/admin`은 누구나 접근 가능한 상태.
2. **일지 본문 저장 방식**: 현재 UI는 textarea(plain text, DB 저장)인데, 원 요구사항은 "주차별 파일"(PDF, MinIO 경로) + OnlyOffice 연동. 두 가지 중 택1 또는 혼합(DB 텍스트 입력 → 서버가 PDF 생성하여 MinIO 저장) 결정 필요.
3. **양식 커스터마이징**: 학생 작성 항목("주요 수행 업무 / 학습 내용 / 느낀 점")이 현재 코드에 하드코딩됨. 관리자 "양식관리"에서 정의한 `fields`가 학생 작성 폼에 동적으로 반영되도록 구현 필요.
4. **PDF 일괄 다운로드 옵션**: 요구사항의 "지도자 피드백 포함/제외" 옵션 UI가 관리자 화면에 없음 — 추가 필요.
5. **권한별 접근 제어**: 로그인 연동 후 역할 기반 라우트 가드(학생이 `/admin` 접근 불가 등) 적용 필요.

---

## 6. 다음 단계 제안

1. 인증 방식 확정 → 로그인 화면 추가, JWT 발급/검증 API 설계
2. 위 ERD 확정 → Spring Boot JPA 엔티티 + Flyway 마이그레이션 작성 (`wess-pilot` 프로젝트)
3. API 명세(OpenAPI) 확정 → 프론트 axios 연동, mock 데이터를 실 API 호출로 교체
4. 일지 작성 폼을 양식 템플릿(`form_templates.fields`) 기반 동적 폼으로 전환
5. 일지 본문 저장 방식(텍스트 vs 파일) 결정 후 MinIO/OnlyOffice 연동 구현
6. 빌드된 프론트를 11.11.11.99 nginx에 배치, `/api` 라우팅 연결 후 통합 테스트
