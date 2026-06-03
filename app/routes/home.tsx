import { Link, useNavigate, useLoaderData } from "react-router";
import { useState } from "react";
import { Card, CardTitle } from "~/components/card";
import { useAppState, slugify } from "~/utils/flowStorage";
import { isStandalone, getSnapshots, loadSnapshot } from "~/utils/api";
import type { AppState } from "~/utils/flowStorage";
import type { Route } from "./+types/home";

export const meta = ({ }: Route.MetaArgs) => {
  return [
    { title: "Monodi RDF Generator" },
    { name: "description", content: "Konfigurieren Sie Ihren Monodi-Viewer." },
  ];
};

export const clientLoader = async (): Promise<string[]> => {
  if (isStandalone) return [];
  try {
    return await getSnapshots();
  } catch {
    return [];
  }
};

/** Parse a display string from a snapshot filename like `state_2024-01-15T10-30-00-000Z.json`. */
function formatSnapshotDate(filename: string): string {
  const match = filename.match(/^state_(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-\d+-?Z?\.json$/);
  if (!match) return filename;
  const [, date, hh, mm, ss] = match;
  return `${date} ${hh}:${mm}:${ss} UTC`;
}

export const LandingPage = () => {
  const storage = useAppState();
  const navigate = useNavigate();
  const snapshots = useLoaderData<typeof clientLoader>();
  const doctypes = storage.contents.doctypes ?? [];

  const [loadingSnapshot, setLoadingSnapshot] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const handleLoadSnapshot = async (filename: string) => {
    setLoadingSnapshot(filename);
    setSnapshotError(null);
    try {
      const state = await loadSnapshot(filename);
      storage.setContents(state as AppState);
      navigate("/");
    } catch (err) {
      setSnapshotError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
    } finally {
      setLoadingSnapshot(null);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-6">
      <Card>
        <CardTitle>Monodi-Konfigurator</CardTitle>
        <p>
          Mit Monodi können Sie Ihre Dokumente durchsuchen und tabellarisch anzeigen. Definieren Sie für
          jeden Dokumententyp die Felder, importieren Sie Metadaten und exportieren Sie die RDF-Konfiguration.
        </p>

        {snapshots.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-700">Gespeicherte Zustände</h2>
            {snapshotError && (
              <p className="text-red-600 text-sm">{snapshotError}</p>
            )}
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              {snapshots.map((filename) => (
                <button
                  key={filename}
                  onClick={() => handleLoadSnapshot(filename)}
                  disabled={loadingSnapshot !== null}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors text-sm text-gray-800 flex items-center justify-between group disabled:opacity-50"
                >
                  <span className="font-medium group-hover:text-blue-700 transition-colors">
                    {formatSnapshotDate(filename)}
                  </span>
                  {loadingSnapshot === filename ? (
                    <span className="text-xs text-gray-400">Lade…</span>
                  ) : (
                    <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">Laden →</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-700">Dokumententypen</h2>
          {doctypes.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Keine Dokumententypen vorhanden. Klicken Sie auf „+" in der Navigationsleiste, um einen anzulegen.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {doctypes.map((dt) => {
                const slug = slugify(dt.name);
                return (
                  <Link
                    key={slug}
                    to={`/${slug}/import`}
                    className="block bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md hover:border-blue-300 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
                        {dt.name}
                      </h3>
                    </div>
                    <div className="mt-2 flex gap-4 text-sm text-gray-500">
                      <span>
                        <span className="font-medium text-gray-700">{dt.fields.length}</span>{" "}
                        {dt.fields.length === 1 ? "Feld" : "Felder"}
                      </span>
                      <span>
                        <span className="font-medium text-gray-700">{dt.documents.length}</span>{" "}
                        {dt.documents.length === 1 ? "Dokument" : "Dokumente"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LandingPage;
