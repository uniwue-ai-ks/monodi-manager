import { Link } from "react-router";
import { Card, CardTitle } from "~/components/card";
import { useAppState, slugify } from "~/utils/flowStorage";
import type { Route } from "./+types/home";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "Monodi RDF Generator" },
    { name: "description", content: "Konfigurieren Sie Ihren Monodi-Viewer." },
  ];
};

export const LandingPage = () => {
  const storage = useAppState();
  const doctypes = storage.contents.doctypes ?? [];

  return (
    <div className="w-full max-w-3xl space-y-6">
      <Card>
        <CardTitle>Monodi-Konfigurator</CardTitle>
        <p>
          Mit Monodi können Sie Ihre Dokumente durchsuchen und tabellarisch anzeigen. Definieren Sie für
          jeden Dokumententyp die Felder, importieren Sie Metadaten und exportieren Sie die RDF-Konfiguration.
        </p>
      </Card>

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
    </div>
  );
};

export default LandingPage;
