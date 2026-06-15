# WESS 현장실습 일지 파일럿 시스템 — 구성 현황

> 출처: [Gemini 대화](https://gemini.google.com/share/d6223274517c) (2026-06-11 ~ 06-12, 3.1 Flash-Lite) 검토 후 정리
> 대화 분량이 매우 길어(약 25만자) 일부 중간 구간은 발췌 검토했으며, 핵심 결정사항·최종 설정·미해결 이슈를 중심으로 정리함.

## 1. 프로젝트 개요 / 요구사항

- 현장실습 일지 시스템 — 학생이 매주 일지를 작성하고 지도자가 피드백하는 오픈소스 파일럿.
- 핵심 요구사항
  - 서버: Java, 스토리지: S3(호환) — **외부에서 스토리지에 직접 접속 불가** (서버가 스트리밍으로 중계)
  - 연도/학기/교과목별 보고서 양식 관리
  - 향후 타 시스템으로 데이터 마이그레이션 고려
  - 학생 일지는 주차별 파일로 관리 (예: `{년도}/{학기}/{교과목}/week_{n}/log_file.pdf`)
  - 지도자 피드백 기능 (일지와 1:1 매핑)
  - **제출 후 수정 불가** (Immutable)
  - PDF 출력 시 "지도자 피드백 포함/제외" 옵션
  - 관리자가 다수 학생의 PDF를 일괄 다운로드 (zip)

## 2. 채택 아키텍처

| 영역 | 선택 | 비고 |
|---|---|---|
| 백엔드 | Java Spring Boot (Maven, `com.wess:wess-pilot`, Spring Boot 2.7.18) | PDF 생성, S3 연동, 상태관리 구현에 적합 |
| DB | PostgreSQL 15 | `pg_hba.conf` / `password_encryption=md5` — 외부 DB 툴(DBeaver 등) 호환 및 향후 마이그레이션 고려 |
| 스토리지 | MinIO (S3 호환, `wess-bucket`) | 외부 직접 접속 차단, Java 서버가 Streaming Response로 중계 |
| 문서 편집/뷰어 | OnlyOffice Document Server | docx 등 보고서 편집/표시용 |
| 리버스 프록시 | Nginx (SSL) | 단일 진입점, 모든 서비스 라우팅 |
| 오케스트레이션 | Docker Compose | 단일 서버에 전체 스택 구성 |

### 상태/권한 모델
- 일지 테이블에 `STATUS` 컬럼: `WRITING → SUBMITTED → REVIEWED`
- `SUBMITTED` 이후 백엔드 API에서 UPDATE 차단 (Immutable)
- `Feedback` 테이블이 일지와 1:1 매핑
- PDF 생성: OpenPDF / wkhtmltopdf / Puppeteer(HTML→PDF) — 피드백 포함 여부를 옵션으로 분기 렌더링
- 관리자 일괄 다운로드: 개별 PDF 생성 → `ZipOutputStream`으로 zip 압축 (또는 Apache PDFBox로 병합 가능)

## 3. 서버 인프라 현황

- 단일 서버(Rocky Linux 9), IP: **11.11.11.99** (테스트 클라이언트: 11.11.11.120)
- 작업 경로: `/data/pilot/`
- 방화벽: 80(HTTP), 443(HTTPS), **9001(MinIO 콘솔, nginx 경유)** 외부 오픈. Java API(8080), PostgreSQL(5432), MinIO API(9000)는 내부망 위주
- NTP: Rocky 9 기본인 `chronyd` 사용 확인/설치 (`dnf install -y chrony`, `systemctl enable --now chronyd`)
- SSL: self-signed 인증서 (`/etc/nginx/ssl/nginx.crt`, `nginx.key`)

### Docker Compose 구성 (`/data/pilot/docker-compose.yml`, 2026-06-12 현재 실제 파일)

```yaml
services:
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
      - "9001:9001"   # MinIO 콘솔 전용 포트
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./src/main/resources/static/index.html:/usr/share/nginx/html/index.html:ro
    depends_on:
      - springboot-app
      - onlyoffice-app
    networks:
      - pilot-network

  springboot-app:
    image: eclipse-temurin:8-jdk   # ※ 현재 placeholder, 실제 WESS jar로 교체 필요
    command: java -jar /app/app.jar
    volumes:
      - ./app.jar:/app/app.jar
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres-db:5432/wess
      - MINIO_ENDPOINT=http://minio-storage:9000
    networks:
      - pilot-network

  onlyoffice-app:
    image: onlyoffice/documentserver:latest
    ports:
      - "8000:80"   # 호스트 8000 -> 컨테이너 80 (테스트/example 페이지 직접 접속용)
    environment:
      - JWT_ENABLED=false
      - NODE_TLS_REJECT_UNAUTHORIZED=0   # 내부 자체서명 인증서 허용 (파일럿용)
      - JWT_SECRET=cetis_office_secret_key
    networks:
      - pilot-network

  minio-storage:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=admin_access_key
      - MINIO_ROOT_PASSWORD=admin_secret_key
      - MINIO_BROWSER_REDIRECT_URL=https://11.11.11.99:9001/
      # MINIO_SERVER_URL 사용하지 않음 (설정 시 콘솔 로그인 "unable to login due to network error" 발생)
    volumes:
      - ./minio_data:/data
    networks:
      - pilot-network

  postgres-db:
    image: postgres:15
    command: postgres -c password_encryption=md5
    environment:
      - POSTGRES_USER=wess
      - POSTGRES_PASSWORD=your_secure_password   # 실제 운영 전 변경 필요
      - POSTGRES_DB=wess
    volumes:
      - ./pg_data:/var/lib/postgresql/data
    networks:
      - pilot-network

networks:
  pilot-network:
    driver: bridge
```

### Nginx 최종 라우팅 (`/data/pilot/nginx.conf`)

- `:80` → `:443`으로 301 리다이렉트
- `location /` → 정적 테스트 페이지 (`index.html`, 호스트의 `/data/pilot/src/main/resources/static/index.html`을 마운트)
- `location /api/` → `springboot-app:8080`
- `location /minio/` → `minio-storage:9000`
- `location /web-apps/` 등 OnlyOffice 정적 경로 → `onlyoffice-app:80`
- 동적 경로(`9\.[0-9]\.[0-9]-.*` 등 OnlyOffice 버전 경로) → 정규식 location을 최상단으로 올려 OnlyOffice로 우선 프록시 (404 방지)
- `location /example/` → `onlyoffice-app:80/example/` (OnlyOffice 예제 페이지용, 마지막에 추가)
- **MinIO 콘솔**: `/minio-console/` 서브패스 방식 폐기 → **전용 `:9001` SSL 서버 블록** 신설, `minio-storage:9001` 루트로 직접 프록시 (websocket 업그레이드 헤더 포함, `proxy_buffering off`)

### 테스트 페이지 (`index.html`)
- OnlyOffice `DocsAPI.DocEditor` 사용
- `documentServerUrl: "https://11.11.11.99/"`, `documentType: "word"`
- 문서 URL: `https://11.11.11.99/minio/wess-bucket/test.docx`
- `callbackUrl: "https://11.11.11.99/api/callback"`

## 4. 진행 상황 요약 (완료)

- [x] 단일 서버 OS/방화벽/Chrony 설정
- [x] PostgreSQL 설치 및 md5 인증 설정
- [x] Docker Compose로 nginx / postgres-db / minio-storage / onlyoffice-app / springboot-app(placeholder) 기동 성공
- [x] SSL 적용, nginx 라우팅(`/api/`, `/minio/`, OnlyOffice 정적/동적 경로) 다수 반복 수정 후 정상화
- [x] OnlyOffice DocsAPI 연동용 테스트 `index.html` 작성 및 `documentServerUrl` 누락 문제 수정
- [x] `wess-pilot` Maven 프로젝트 골격(`pom.xml`, Spring Boot 2.7.18) 정의
- [x] 실제 WESS jar 빌드/배포 절차 정의: `mvnw clean package` (또는 `gradlew bootJar`) → `app.jar`로 이름 변경 → `/data/pilot/`에 SFTP 업로드 → `docker compose restart springboot-app`

## 5. 미해결 / 진행 중 이슈 (대화 종료 시점 기준)

- [x] **OnlyOffice 예제 페이지("Test example is not running")**: nginx `/example/` 프록시 추가 후 정상 동작 확인됨 (2026-06-12)
- [x] **OnlyOffice `/example/` 502 (`ds:example` STOPPED)**: `docker compose exec onlyoffice-app supervisorctl start ds:example`로 기동 후 해결 (2026-06-12). 이후 `/etc/supervisor/conf.d/ds-example.conf`의 `autostart=false → true`로 수정한 파일을 호스트(`/data/pilot/ds-example.conf`)에 두고 `onlyoffice-app`에 바인드 마운트하여 **컨테이너 재시작/재생성 후에도 자동 기동**되도록 영구 조치 완료 (2026-06-12, `supervisorctl status ds:example` → RUNNING 확인)
- [x] **OnlyOffice 동적 경로 404**: 정규식 location 우선순위 조정 적용 후 `https://11.11.11.99` 의 `index.html`에서 "편집" 클릭 시 OnlyOffice 에디터 UI(리본/툴바: Home/Insert/Draw/Layout/References/Collaboration/Protection/View)가 정상 로딩됨 (2026-06-12 스크린샷 확인)
- **문서 본문 표시 안 됨 — 원인 확인 및 일부 조치 완료**
  - Hairpin NAT는 문제 없음 (onlyoffice-app → `https://11.11.11.99` 접속/TLS 핸드셰이크 자체는 성공)
  1. [x] **자체서명 인증서 거부**: docservice 로그 `DEPTH_ZERO_SELF_SIGNED_CERT` — `onlyoffice-app` env에 `NODE_TLS_REJECT_UNAUTHORIZED=0` 추가 후 `docker compose up -d` 적용 완료. 적용 후 `/doc/abc/c/...` 폴링이 200 OK로 정상 응답 — 해결된 것으로 보임
  2. [x] **MinIO 403 AccessDenied → 해결**: `wess-bucket`이 존재하지 않아 발생한 문제로 확인. `mc mb local/wess-bucket && mc anonymous set download local/wess-bucket`으로 버킷 생성 및 다운로드 정책 적용 완료 (2026-06-12). 단, 버킷이 비어있어 `test.docx`가 없는 상태(MinIO 직접 접속 시 404) — **업로드 필요**
     - 참고: 기존에 `wess/`라는 빈 버킷이 별도로 존재 — 실제 앱(springboot)이 사용할 버킷명과 혼동 주의
  - 추가로 `onlyoffice-app`에 `8000:80` 포트 매핑 추가됨 (테스트/example 페이지 직접 접속용)
  - `minio-storage`는 호스트에 포트 게시 안 됨 (보안상 의도된 구성으로 보임 — 외부 직접 접속 차단 요구사항과 부합)
- **포트 8000 직접 접속 테스트**: OnlyOffice 컨테이너 호스트 포트(8000) 매핑/방화벽 오픈 여부 점검 중 (운영상 불필요, 테스트 목적)
- [x] **2026-06-12 전체 헬스체크**: 컨테이너 5개 모두 Up, nginx 설정 정상, 메인/API/OnlyOffice 정적 리소스 200, springboot↔postgres/minio 연결 정상(`DB OK`/`MinIO OK`)
- [x] **MinIO 콘솔 로그인 불가 → 해결 (2026-06-12)**: `/minio-console/` 서브패스 프록시 시 정적 자산이 모두 index.html(1323바이트)로 응답되어 로그인 화면이 깨짐 → `rewrite break` 시도 후에도 `/api/v1/login` 401(`invalid login`) → `MINIO_SERVER_URL` 제거 시도 중 "unable to login due to network error" → **최종: 서브패스 방식 폐기, nginx에 전용 `:9001` SSL 서버 블록 신설(`minio-storage:9001` 직접 프록시) + `MINIO_BROWSER_REDIRECT_URL=https://11.11.11.99:9001/` 설정 + `MINIO_SERVER_URL` 완전 제거**로 정상화. 콘솔 접속: `https://11.11.11.99:9001`
- [x] **실제 WESS 백엔드 배포**: 2026-06-12 로그 기준 `springboot-app`이 `com.wess.pilot.PilotController` (v1.0-SNAPSHOT, Spring Boot 2.7.18)로 기동됨 — 실제(또는 초기 골격) WESS jar로 교체된 것으로 보임. 컨트롤러 기능 범위(DB/MinIO 연동 등 실제 구현 정도)는 추가 확인 필요

## 6. 다음 단계 제안

1. OnlyOffice 에디터/예제 페이지 정상 로딩 확인 마무리
2. 실제 WESS Spring Boot 백엔드(`wess-pilot`) 빌드 → `app.jar` 교체 배포
3. DB 스키마 구현: 연도/학기/교과목/일지(`STATUS`)/피드백 테이블
4. MinIO 연동(S3 스트리밍 다운로드/업로드), PDF 생성(피드백 포함/제외 옵션), 관리자 일괄 zip 다운로드 기능 구현
5. 학생/지도자/관리자 권한·로그인 체계 구현
6. 추후 운영 서버 이전 및 데이터 마이그레이션 계획 구체화
