import { useCallback, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import JSZip from "jszip";
import { Button } from "flowbite-react";
import { Card, CardTitle } from "~/components/card";
import { useAppState } from "~/utils/flowStorage";
import { generateTtl } from "~/utils/exportTtl";
import type { Route } from "./+types/export";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "Export" },
    { name: "description", content: "Schritt 5: RDF und PDF-Dateien exportieren" },
  ];
};

/** Trigger a browser download of a Blob/File under the given filename. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type DropZoneProps = {
  filesByDoctype: Record<string, File[]>;
  doctypeNames: string[];
  onChange: (updated: Record<string, File[]>) => void;
};

const PdfDropZones = ({ filesByDoctype, doctypeNames, onChange }: DropZoneProps) => {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addFiles = (doctype: string, newFiles: FileList | null) => {
    if (!newFiles) return;
    const pdfs = Array.from(newFiles).filter((f) => f.type === "application/pdf");
    onChange({
      ...filesByDoctype,
      [doctype]: [
        ...(filesByDoctype[doctype] ?? []),
        ...pdfs.filter((f) => !(filesByDoctype[doctype] ?? []).some((e) => e.name === f.name)),
      ],
    });
  };

  const removeFile = (doctype: string, name: string) => {
    onChange({
      ...filesByDoctype,
      [doctype]: (filesByDoctype[doctype] ?? []).filter((f) => f.name !== name),
    });
  };

  return (
    <div className="space-y-4">
      {doctypeNames.map((doctype) => {
        const files = filesByDoctype[doctype] ?? [];
        return (
          <div key={doctype}>
            <p className="font-medium text-sm mb-1">{doctype}</p>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
              onClick={() => inputRefs.current[doctype]?.click()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(doctype, e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <p className="text-gray-500 text-sm">PDFs für „{doctype}" ablegen oder klicken</p>
              <input
                ref={(el) => { inputRefs.current[doctype] = el; }}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => addFiles(doctype, e.target.files)}
              />
            </div>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {files.map((f) => (
                  <li key={f.name} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1 text-sm">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      aria-label={`${f.name} entfernen`}
                      onClick={(e) => { e.stopPropagation(); removeFile(doctype, f.name); }}
                      className="text-red-500 hover:text-red-700 ml-2 font-bold shrink-0"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const ExportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { filesByDoctype?: Record<string, File[]> } | null;

  const storage = useAppState();
  const state = storage.contents;
  const doctypeNames = Object.keys(state.doctypes ?? {});

  const [filesByDoctype, setFilesByDoctype] = useState<Record<string, File[]>>(
    () =>
      locationState?.filesByDoctype ??
      Object.fromEntries(doctypeNames.map((n) => [n, []]))
  );

  const ttl = generateTtl(state);

  const totalFiles = Object.values(filesByDoctype).reduce((sum, arr) => sum + arr.length, 0);

  const handleDownloadTtl = useCallback(() => {
    const blob = new Blob([ttl], { type: "text/turtle;charset=utf-8" });
    downloadBlob(blob, "data.ttl");
  }, [ttl]);

  const handleDownloadZip = useCallback(async () => {
    const zip = new JSZip();
    zip.file("data.ttl", ttl);

    for (const [doctype, files] of Object.entries(filesByDoctype)) {
      for (const file of files) {
        zip.file(`${doctype}/${file.name}`, file);
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "monodi-export.zip");
  }, [ttl, filesByDoctype]);

  return (
    <Card className="pb-4 max-w-3xl w-full space-y-6">
      <CardTitle>Export</CardTitle>
      <p>
        Im letzten Schritt können Sie die erzeugte RDF-Datei und Ihre PDF-Dateien herunterladen.
      </p>

      {/* TTL preview */}
      <div>
        <h2 className="font-semibold mb-2">RDF-Turtle Vorschau</h2>
        <pre className="bg-gray-50 border rounded p-4 text-xs overflow-x-auto max-h-64 whitespace-pre">
          {ttl}
        </pre>
      </div>

      {/* TTL download */}
      <div className="flex items-center gap-4">
        <Button onClick={handleDownloadTtl}>
          data.ttl herunterladen
        </Button>
        <p className="text-sm text-gray-500">Nur die RDF-Datei ohne PDFs</p>
      </div>

      <hr className="text-gray-300" />

      {/* ZIP section */}
      <div className="space-y-4">
        <h2 className="font-semibold">ZIP-Archiv (RDF + PDFs)</h2>
        <p className="text-sm text-gray-600">
          Fügen Sie die PDF-Dateien hinzu, die in das ZIP-Archiv aufgenommen werden sollen.
          Die Dateien werden nach Dokumententyp in Unterordner sortiert.
        </p>

        <PdfDropZones
          filesByDoctype={filesByDoctype}
          doctypeNames={doctypeNames}
          onChange={setFilesByDoctype}
        />

        <Button
          disabled={totalFiles === 0}
          onClick={handleDownloadZip}
        >
          monodi-export.zip herunterladen
        </Button>
        {totalFiles === 0 && (
          <p className="text-sm text-gray-400">
            Bitte fügen Sie PDFs hinzu, um das ZIP-Archiv herunterladen zu können.
          </p>
        )}
      </div>

      <hr className="text-gray-300" />
      <Button color="light" onClick={() => navigate(-1)}>
        zurück
      </Button>
    </Card>
  );
};

export default ExportPage;
