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
  title = "document.docx",
  fileType = "docx",
  mode = "view",
  callbackUrl,
  className,
}: OnlyOfficeEditorProps) {
  const placeholderId = React.useRef(`onlyoffice-editor-${++placeholderSeq}`);
  const editorRef = React.useRef<{ destroyEditor: () => void } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);

    loadDocsApiScript()
      .then(() => {
        if (cancelled || !window.DocsAPI) return;
        editorRef.current = new window.DocsAPI.DocEditor(placeholderId.current, {
          document: {
            fileType,
            key: documentKey,
            title,
            url: documentUrl,
          },
          documentType: "word",
          editorConfig: {
            mode,
            lang: "ko",
            ...(callbackUrl ? { callbackUrl } : {}),
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
