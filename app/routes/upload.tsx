import { useCallback, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "react-router";
import { Button, TabItem, Tabs } from "flowbite-react";
import { Card, CardTitle } from "~/components/card";
import { useAppState } from "~/utils/flowStorage";
import type { Route } from "./+types/upload";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "PDF-Dateien hinzufügen" },
    { name: "description", content: "Schritt 3: PDF-Dateien hochladen" },
  ];
}

type DropZoneProps = {
  files: File[];
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
          onChange={(e) => onAdd(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {files.map((f) => (
            <li
              key={f.name}
              className="flex items-center justify-between bg-gray-50 rounded px-3 py-2"
            >
              <span className="text-sm truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`${f.name} entfernen`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(f.name);
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

  const [filesByDoctype, setFilesByDoctype] = useState<Record<string, File[]>>(
    () => Object.fromEntries(doctypeNames.map((n) => [n, []]))
  );

  const addFiles = (doctype: string, newFiles: FileList | null) => {
    if (!newFiles) return;
    const pdfs = Array.from(newFiles).filter((f) => f.type === "application/pdf");
    setFilesByDoctype((prev) => {
      const existing = new Set((prev[doctype] ?? []).map((f) => f.name));
      return { ...prev, [doctype]: [...(prev[doctype] ?? []), ...pdfs.filter((f) => !existing.has(f.name))] };
    });
  };

  const removeFile = (doctype: string, name: string) => {
    setFilesByDoctype((prev) => ({
      ...prev,
      [doctype]: (prev[doctype] ?? []).filter((f) => f.name !== name),
    }));
  };

  const totalFiles = Object.values(filesByDoctype).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <Card className="max-w-200 pb-4 grid grid-cols-3 gap-4">
      <div className="col-span-3 space-y-4">
        <CardTitle>PDF-Dateien hinzufügen</CardTitle>
        <p>
          Fügen Sie die PDF-Dateien hinzu, die in Monodi verfügbar sein sollen.
        </p>

        {doctypeNames.length <= 1 ? (
          <DropZone
            files={filesByDoctype[doctypeNames[0]] ?? []}
            onAdd={(f) => addFiles(doctypeNames[0], f)}
            onRemove={(name) => removeFile(doctypeNames[0], name)}
          />
        ) : (
          <Tabs>
            {doctypeNames.map((name) => (
              <TabItem key={name} title={`${name} (${(filesByDoctype[name] ?? []).length})`}>
                <DropZone
                  files={filesByDoctype[name] ?? []}
                  onAdd={(f) => addFiles(name, f)}
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
