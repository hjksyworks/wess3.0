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

---

## 7. 양식 템플릿 → 일지 작성 → PDF 다운로드 아키텍처 (2026-06-15 확정)

> 목표 흐름: **관리자가 양식 템플릿(docx) 등록 → 학생이 해당 템플릿으로 일지를 작성/저장(OnlyOffice) → 지도자가 저장된 문서 조회 → 관리자가 개별 조회 또는 PDF 일괄 다운로드**
>
> 결정사항: 기존 JSON 필드(`fields`) 기반 양식관리는 그대로 유지하고, **docx 템플릿 파일을 선택적으로 추가 첨부**하는 방식으로 확장한다 (변경 범위 최소화). 이번 단계에서 프론트엔드(React)와 백엔드(`wess-pilot` Spring Boot) API를 함께 설계/구현한다.

### 7.1 데이터 모델 변경

```
form_templates
  ... (기존 컬럼 유지: id, year, semester, subject, name, fields(JSONB), created_at)
  + template_file_key   VARCHAR  -- MinIO 객체 경로, nullable (예: templates/1/template.docx)
  + template_file_name  VARCHAR  -- 원본 파일명 (예: 현장실습_양식.docx)

journals
  ... (기존 컬럼 유지: id, enrollment_id, week, status, start_date, end_date, content(JSONB),
       submitted_at, updated_at)
  + file_key   VARCHAR  -- MinIO 객체 경로 (예: 2026/1/현장실습/student_1/week_2/log_file.docx)
  + file_name  VARCHAR  -- 에디터에 표시될 파일명 (예: 2주차_일지.docx)
```

- `file_key`는 `journals` 레코드 생성 시(= enrollment 생성 시 주차별로 일괄 생성) 미리 계산해 저장한다. 실제 MinIO 객체는 **학생이 처음 편집을 여는 시점에 지연 생성**한다(아래 7.3).
- `template_file_key`가 없는 템플릿(레거시)은 빈 docx로 초기화한다.

### 7.2 MinIO 객체 경로 규칙

```
templates/{formTemplateId}/template.docx                 -- 관리자가 업로드한 양식 원본 (읽기 전용)
{year}/{semester}/{subject}/student_{studentId}/week_{n}/log_file.docx   -- 학생별 주차 일지 (편집 대상)
```

`{subject}`는 경로 세그먼트로 사용하되 슬래시 등 특수문자는 제거/치환한다 (백엔드에서 처리).

### 7.3 OnlyOffice 연동 — 문서 스트리밍 & 저장 콜백

**핵심 원칙**: MinIO는 외부에 직접 노출하지 않고, OnlyOffice·브라우저 모두 Spring Boot(`/api/...`)를 통해서만 문서에 접근한다 (`/minio/...` 직접 경로 사용 중단).

- `GET /api/journals/{id}/file`
  - 권한 체크(학생 본인 / 담당 지도자 / 관리자) 후 MinIO에서 `journals.file_key` 스트리밍 응답 (`Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
  - 객체가 아직 없는 경우:
    - `form_templates.template_file_key`가 있으면 해당 템플릿 docx를 그대로 스트리밍 (학생이 처음 여는 화면 = 빈 양식)
    - 템플릿도 없으면 서버에 내장된 기본 빈 docx 스트리밍
  - **단, 이 단계에서 MinIO에 복사본을 미리 만들지 않는다** — 실제 객체 생성은 최초 저장(콜백) 시점에 이루어짐

- `POST /api/journals/{id}/callback` (OnlyOffice `editorConfig.callbackUrl`)
  - OnlyOffice가 보내는 `status` 필드 처리: `2`(MustSave) / `6`(MustForceSave) 일 때 `url`에서 편집된 docx를 다운로드하여 `journals.file_key`에 업로드(최초 저장 시 객체 생성)
  - `journals.updated_at` 갱신 → `documentKey` 재계산에 사용
  - 응답: `{"error": 0}` (OnlyOffice 규격)

- `documentKey` 계산: 프론트에서 추정하지 않고 **백엔드가 journal 응답에 `documentKey` 필드를 포함**하여 내려준다 (`journal-{id}-{updatedAtEpochSeconds}`). 저장 후 목록을 다시 불러오면 key가 바뀌어 OnlyOffice가 최신 버전을 다시 로드한다.

- `documentUrl` = `${window.location.origin}/api/journals/{id}/file` (절대 URL, OnlyOffice 컨테이너가 nginx를 거쳐 접근 가능)

### 7.4 제출/조회 권한 (Immutable 규칙)

- `status = SUBMITTED | REVIEWED` 인 journal은 `mode: "view"`로만 OnlyOffice를 띄운다 (기존 프론트 로직 유지).
- 백엔드 `/api/journals/{id}/callback`도 journal 상태가 `SUBMITTED|REVIEWED`이면 저장을 거부(`{"error": 1}`)하여 제출 후 수정 불가 규칙을 강제한다 — OnlyOffice를 `view` 모드로 띄워도 별도 경로로 저장 요청이 올 수 있으므로 서버 측에서도 재검증한다.

### 7.5 PDF 일괄 다운로드 (관리자)

- `GET /api/export/journals?year=&semester=&includeFeedback=`
  1. 조건에 맞는 `journals`(SUBMITTED/REVIEWED) 조회
  2. 각 journal에 대해 OnlyOffice **ConvertService**(`POST {documentServerUrl}/ConvertService.ashx`, internal URL `http://onlyoffice-app/ConvertService.ashx`)로 `file_key` docx → pdf 변환 요청
     - 요청 바디: `{ "async": false, "filetype": "docx", "outputtype": "pdf", "key": "<unique>", "url": "http://springboot-app:8080/api/journals/{id}/file" }`
  3. `includeFeedback=true`이면 변환된 PDF 뒤에 피드백 내용을 별도 페이지로 추가 (OpenPDF/PDFBox로 병합)
  4. 파일명 규칙: `{studentName}_{week}주차_일지.pdf`
  5. 전체를 `ZipOutputStream`으로 묶어 `journals_{year}_{semester}.zip` 으로 스트리밍 응답

- `GET /api/journals/{id}/pdf?includeFeedback=` — 관리자/지도자의 **개별 조회/다운로드**용 단건 PDF 엔드포인트 (위 2~3단계와 동일 로직 재사용)

### 7.6 API 변경 요약

| 메서드 | 경로 | 설명 | 비고 |
|---|---|---|---|
| GET | `/api/form-templates` | 템플릿 목록 (fields + templateFileKey/Name) | 기존 |
| POST | `/api/form-templates` | 템플릿 메타데이터 등록 | 기존 |
| POST | `/api/form-templates/{id}/file` | docx 템플릿 파일 업로드 (multipart) | **신규** |
| GET | `/api/journals` | 목록 (role/enrollmentId 필터) | 기존, 응답에 `fileName`, `documentKey` 추가 |
| GET | `/api/journals/{id}/file` | 문서 스트리밍 (OnlyOffice document.url) | **신규** |
| PUT | `/api/journals/{id}` | content/날짜/상태(WRITING↔SUBMITTED) 갱신 | 기존 |
| POST | `/api/journals/{id}/callback` | OnlyOffice 저장 콜백 | **신규** |
| POST | `/api/journals/{id}/feedback` | 피드백 등록 → status=REVIEWED | 기존 |
| GET | `/api/journals/{id}/feedback` | 피드백 조회 | 기존 |
| GET | `/api/journals/{id}/pdf` | 단건 PDF (피드백 포함 옵션) | **신규** |
| GET | `/api/export/journals` | 일괄 PDF zip 다운로드 | 기존(구현 보강) |
| GET | `/api/admin/stats`, `/api/admin/students` | 관리자 통계/학생목록 | 기존 |

### 7.7 프론트엔드 변경 범위

- `OnlyOfficeEditor`에 전달하는 `documentUrl`/`callbackUrl`을 `/minio/...` → `/api/journals/{id}/file`, `/api/journals/{id}/callback`으로 변경
- `documentKey`는 journal 응답의 `documentKey` 필드를 그대로 사용 (프론트에서 조합하지 않음)
- 관리자 "양식관리" 다이얼로그에 docx 템플릿 파일 업로드 input 추가 (선택 항목) → 등록 후 `/api/form-templates/{id}/file`로 업로드
