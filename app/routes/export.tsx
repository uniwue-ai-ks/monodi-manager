import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button } from "flowbite-react";
import { HiCheckCircle, HiExclamationCircle } from "react-icons/hi2";
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

type DeployStatus = "idle" | "loading" | "success" | "error";

export const ExportPage = () => {
  const navigate = useNavigate();
  const storage = useAppState();
  const state = storage.contents;
  const ttl = generateTtl(state);
  const documentCount = (state.doctypes ?? []).reduce((sum, dt) => sum + dt.documents.length, 0);

  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
  const [deployError, setDeployError] = useState<string>("");

  const handleDownloadTtl = useCallback(() => {
    const blob = new Blob([ttl], { type: "text/turtle;charset=utf-8" });
    downloadBlob(blob, "data.ttl");
  }, [ttl]);

  const handleDeploy = useCallback(async () => {
    setDeployStatus("loading");
    setDeployError("");
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttl, state }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }
      setDeployStatus("success");
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : String(err));
      setDeployStatus("error");
    }
  }, [ttl, state]);

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

      {/* Actions */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button onClick={handleDownloadTtl}>
            data.ttl herunterladen
          </Button>
          <p className="text-sm text-gray-500">Die RDF-Datei enthaelt die Referenzen auf Ihre PDFs.</p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            color="success"
            onClick={() => void handleDeploy()}
            disabled={deployStatus === "loading"}
          >
            {deployStatus === "loading" ? "Wird deployed…" : "Deploy"}
          </Button>
          <p className="text-sm text-gray-500">
            RDF und aktuellen Stand auf dem Server speichern.
          </p>
        </div>

        {deployStatus === "success" && (
          <Alert color="success" icon={HiCheckCircle}>
            Erfolgreich deployed.
          </Alert>
        )}
        {deployStatus === "error" && (
          <Alert color="failure" icon={HiExclamationCircle}>
            Deploy fehlgeschlagen: {deployError}
          </Alert>
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
