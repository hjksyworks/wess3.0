import * as React from "react";

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        placeholderId: string,
        config: Record<string, unknown>,
      ) => { destroyEditor: () => void };
    };
  }
}

export interface OnlyOfficeEditorProps {
  /** OnlyOffice 문서 서버가 접근 가능한 문서 URL (절대 경로) */
  documentUrl: string;
  /** 문서 버전을 식별하는 고유 키 (내용이 바뀌면 값도 바뀌어야 함) */
  documentKey: string;
  /** 에디터 상단에 표시되는 파일명 */
  title?: string;
  /** docx, xlsx 등 */
  fileType?: string;
  mode?: "edit" | "view";
  callbackUrl?: string;
  className?: string;
  /** 편집 중 미저장 여부. true=사용자가 편집 중(미저장), false=문서서버로 전송됨 */
  onDirtyChange?: (dirty: boolean) => void;
  /** 문서 로딩 완료 */
  onReady?: () => void;
  /** 모바일 최적화 편집기 사용(기본: 화면폭으로 자동 판정) */
  mobile?: boolean;
}

const DOCS_API_SCRIPT_ID = "onlyoffice-docsapi-script";

function getServerUrl(): string {
  const origin = window.location.origin;
  return origin.endsWith("/") ? origin : `${origin}/`;
}

function loadDocsApiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.DocsAPI) {
      resolve();
      return;
    }
    const existing = document.getElementById(DOCS_API_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.DocsAPI) {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error("OnlyOffice 문서 서버에 연결할 수 없습니다.")),
        );
      }
      return;
    }
    const script = document.createElement("script");
    script.id = DOCS_API_SCRIPT_ID;
    script.src = `${getServerUrl()}web-apps/apps/api/documents/api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("OnlyOffice 문서 서버에 연결할 수 없습니다."));
    document.body.appendChild(script);
  });
}

let placeholderSeq = 0;

/** OnlyOffice Document Server의 DocsAPI 에디터를 임베드하는 컴포넌트 */
export function OnlyOfficeEditor({
  documentUrl,
  documentKey,
  onDirtyChange,
  onReady,
  mobile,
  title = "document.docx",
  fileType = "docx",
  mode = "view",
  callbackUrl,
  className,
}: OnlyOfficeEditorProps) {
  const placeholderId = React.useRef(`onlyoffice-editor-${++placeholderSeq}`);
  const editorRef = React.useRef<{ destroyEditor: () => void } | null>(null);
  // 콜백은 ref로 유지: config에 인라인 함수를 직접 넣으면 부모 리렌더 때
  // 편집기가 재생성(destroyEditor)될 위험이 있다.
  const dirtyCb = React.useRef(onDirtyChange);
  const readyCb = React.useRef(onReady);
  React.useEffect(() => { dirtyCb.current = onDirtyChange; readyCb.current = onReady; });
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);

    loadDocsApiScript()
      .then(() => {
        if (cancelled || !window.DocsAPI) return;
        const isMobile =
          mobile ??
          (typeof window !== "undefined" &&
            (window.matchMedia("(max-width: 767px)").matches ||
              /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)));

        editorRef.current = new window.DocsAPI.DocEditor(placeholderId.current, {
          document: {
            fileType,
            key: documentKey,
            title,
            url: documentUrl,
          },
          documentType: "word",
          // type 은 editorConfig 가 아니라 최상위 파라미터다(desktop|mobile|embedded).
          // 주의: OnlyOffice Community Edition 은 모바일 편집기가 "보기 전용"이다
          // (편집하려면 유료 라이선스 필요). 따라서 편집이 필요한 경우에는 모바일에서도
          // desktop 번들을 사용하고, 조회(마감 후 등)에서만 모바일 번들을 쓴다.
          type: isMobile && mode === "view" ? "mobile" : "desktop",
          editorConfig: {
            mode,
            lang: "ko",
            coEditing: { mode: "fast", change: true },
            customization: {
              autosave: true,
              forcesave: true,
              // 페이지 안에 끼워 넣을 때 로드 시 편집기로 스크롤 점프하는 것을 막는다
              integrationMode: "embed",
              // 모바일 문서편집기는 기본이 보기모드(forceView=true)라 명시적으로 꺼야 편집 가능.
              mobile: { forceView: false },
            },
            ...(callbackUrl ? { callbackUrl } : {}),
          },
          events: {
            // event.data: true=사용자가 편집 중(미저장), false=문서서버로 변경분 전송됨
            onDocumentStateChange: (e: { data?: boolean }) => dirtyCb.current?.(!!e?.data),
            onDocumentReady: () => readyCb.current?.(),
          },
          height: "100%",
          width: "100%",
        });
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
      try {
        editorRef.current?.destroyEditor();
      } catch {
        // 이미 정리된 경우 무시
      }
      editorRef.current = null;
    };
  }, [documentUrl, documentKey, fileType, mode, callbackUrl, title]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center text-center text-sm font-medium text-red-400 bg-red-50 rounded-md p-4 ${className ?? ""}`}
      >
        OnlyOffice 에디터를 불러올 수 없습니다.
        <br />
        {error}
      </div>
    );
  }

  return <div id={placeholderId.current} className={className} />;
}
