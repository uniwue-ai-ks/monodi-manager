import { useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "flowbite-react";
import { Card, CardTitle } from "~/components/card";
import { useAppState } from "~/utils/flowStorage";
import { generateTtl } from "~/utils/exportTtl";
import type { Route } from "./+types/export";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "Export" },
    { name: "description", content: "Schritt 5: RDF exportieren" },
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

export const ExportPage = () => {
  const navigate = useNavigate();
  const storage = useAppState();
  const state = storage.contents;
  const ttl = generateTtl(state);
  const documentCount = state.documents?.length ?? 0;

  const handleDownloadTtl = useCallback(() => {
    const blob = new Blob([ttl], { type: "text/turtle;charset=utf-8" });
    downloadBlob(blob, "data.ttl");
  }, [ttl]);

  return (
    <Card className="pb-4 max-w-3xl w-full space-y-6">
      <CardTitle>Export</CardTitle>
      <p>
        Im letzten Schritt können Sie die erzeugte RDF-Datei herunterladen. PDF-Dateien
        werden aktuell nur ueber ihre Dateinamen referenziert.
      </p>
      <p className="text-sm text-gray-500">
        Enthalten sind {documentCount} Dokument{documentCount === 1 ? "" : "e"}.
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
        <p className="text-sm text-gray-500">Die RDF-Datei enthaelt die Referenzen auf Ihre PDFs.</p>
      </div>

      <hr className="text-gray-300" />
      <Button color="light" onClick={() => navigate(-1)}>
        zurück
      </Button>
    </Card>
  );
};

export default ExportPage;
