import { useState } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";

export type CodeEditorLanguage = "html" | "css" | "javascript";

const langExtension: Record<CodeEditorLanguage, Extension[]> = {
  html: [html()],
  css: [css()],
  javascript: [javascript()],
};

type CodeEditorProps = {
  language: CodeEditorLanguage;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export const CodeEditor = ({ language, value, onChange, placeholder }: CodeEditorProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="space-y-1">
      <CodeMirror
        value={value}
        extensions={langExtension[language]}
        onChange={onChange}
        placeholder={placeholder}
        basicSetup={{ lineNumbers: true, foldGutter: false }}
        theme="light"
        className="border rounded text-sm overflow-hidden"
        minHeight="120px"
      />
      {language === "html" && (
        <div>
          <button
            type="button"
            className="text-xs text-blue-600 underline"
            onClick={() => setPreviewOpen((v) => !v)}
          >
            {previewOpen ? "Vorschau ausblenden" : "HTML-Vorschau anzeigen"}
          </button>
          {previewOpen && (
            <iframe
              srcDoc={value}
              sandbox=""
              className="mt-2 w-full border rounded bg-white"
              style={{ minHeight: "150px" }}
              title="HTML-Vorschau"
            />
          )}
        </div>
      )}
    </div>
  );
};
