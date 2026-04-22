import { useCallback, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router";
import { Button, TabItem, Tabs } from "flowbite-react";
import { Card, CardTitle } from "~/components/card";
import { useAppState } from "~/utils/flowStorage";
import {
  collectPdfNames,
  createPdfNamesByDoctype,
  mergePdfNames,
  type PdfNamesByDoctype,
} from "~/utils/pdfUploads";
import type { Route } from "./+types/upload";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "PDF-Dateien hinzufügen" },
    { name: "description", content: "Schritt 3: PDF-Dateien hochladen" },
  ];
}

type DropZoneProps = {
  files: string[];
  onAdd: (newFiles: FileList | null) => void;
  onRemove: (name: string) => void;
};

const DropZone = ({ files, onAdd, onRemove }: DropZoneProps) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    onAdd(e.dataTransfer.files);
  }, [onAdd]);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  return (
    <div className="space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors select-none ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <p className="text-gray-500">
          PDF-Dateien hier ablegen oder klicken zum Auswählen
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            onAdd(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {files.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between bg-gray-50 rounded px-3 py-2"
            >
              <span className="text-sm truncate">{name}</span>
              <button
                type="button"
                aria-label={`${name} entfernen`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(name);
                }}
                className="text-red-500 hover:text-red-700 ml-2 text-sm font-bold shrink-0"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const PdfUploadPage = () => {
  const navigate = useNavigate();
  const storage = useAppState();
  const doctypeNames = Object.keys(storage.contents.doctypes ?? {});

  const [filesByDoctype, setFilesByDoctype] = useState<PdfNamesByDoctype>(
    () => createPdfNamesByDoctype(doctypeNames),
  );

  const addFiles = async (doctype: string, newFiles: FileList | null) => {
    const pdfNames = await collectPdfNames(doctype, newFiles);
    if (pdfNames.length === 0) return;

    setFilesByDoctype((prev) => {
      const next = { ...prev };
      next[doctype] = mergePdfNames(prev[doctype] ?? [], pdfNames);
      return next;
    });
  };

  const removeFile = (doctype: string, name: string) => {
    setFilesByDoctype((prev) => ({
      ...prev,
      [doctype]: (prev[doctype] ?? []).filter((filename) => filename !== name),
    }));
  };

  const totalFiles = Object.values(filesByDoctype).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <Card className="max-w-200 pb-4 grid grid-cols-3 gap-4">
      <div className="col-span-3 space-y-4">
        <CardTitle>PDF-Dateien hinzufügen</CardTitle>
        <p>
          Wählen Sie PDF-Dateien aus, damit ihre Dateinamen in den folgenden Schritten
          verwendet werden. Die PDF-Inhalte werden aktuell nicht gespeichert.
        </p>

        {doctypeNames.length <= 1 ? (
          <DropZone
            files={filesByDoctype[doctypeNames[0]] ?? []}
            onAdd={(f) => {
              void addFiles(doctypeNames[0], f);
            }}
            onRemove={(name) => removeFile(doctypeNames[0], name)}
          />
        ) : (
          <Tabs>
            {doctypeNames.map((name) => (
              <TabItem key={name} title={`${name} (${(filesByDoctype[name] ?? []).length})`}>
                <DropZone
                  files={filesByDoctype[name] ?? []}
                  onAdd={(f) => {
                    void addFiles(name, f);
                  }}
                  onRemove={(fname) => removeFile(name, fname)}
                />
              </TabItem>
            ))}
          </Tabs>
        )}
      </div>

      <hr className="text-gray-300 col-span-3" />
      <Button color="light" onClick={() => navigate(-1)}>
        zurück
      </Button>
      <Button
        color="light"
        className="col-start-2"
        onClick={() => navigate("/enterData", { state: { uploadSkipped: true } })}
      >
        überspringen
      </Button>
      <Button
        className="col-start-3"
        disabled={totalFiles === 0}
        onClick={() => navigate("/enterData", { state: { filesByDoctype } })}
      >
        weiter
      </Button>
    </Card>
  );
}

export default PdfUploadPage;
