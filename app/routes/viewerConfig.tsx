import { useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { Button, TextInput, Label } from "flowbite-react";
import { Card, CardTitle } from "~/components/card";
import { CodeEditor } from "~/components/CodeEditor";
import { useAppState, defaultFrontmatter, type FrontmatterData } from "~/utils/flowStorage";
import type { Route } from "./+types/viewerConfig";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "Viewer-Konfiguration" },
    { name: "description", content: "Schritt 5: Viewer-Eigenschaften konfigurieren" },
  ];
};

type FieldMeta = {
  key: keyof FrontmatterData;
  label: string;
  description?: string;
  kind: "text" | "html" | "css" | "javascript";
};

const FIELDS: FieldMeta[] = [
  { key: "tabTitle",             label: "Tab-Titel",                   kind: "text",       description: "Wird im Browser-Tab angezeigt." },
  { key: "headerTitle",          label: "Seitentitel",                  kind: "text",       description: "Überschrift im Header der Seite." },
  { key: "copyright",            label: "Copyright (Footer)",           kind: "text",       description: "Urheberrechtshinweis im Seitenfuß." },
  { key: "footer",               label: "Fußzeile (HTML)",              kind: "html",       description: "Zusätzlicher HTML-Inhalt im Footer." },
  { key: "mainPagePreSearches",  label: "Startseite – vor der Suche",   kind: "html",       description: "HTML, das auf der Startseite vor der Dokumentenliste angezeigt wird." },
  { key: "mainPagePostSearches", label: "Startseite – nach der Suche",  kind: "html",       description: "HTML, das auf der Startseite nach der Dokumentenliste angezeigt wird." },
  { key: "customCss",            label: "Eigenes CSS",                  kind: "css",        description: "Zusätzliche CSS-Stile für den Viewer." },
  { key: "customJavascript",     label: "Eigenes JavaScript",           kind: "javascript", description: "Zusätzliches JavaScript für den Viewer." },
];

export const ViewerConfigPage = () => {
  const navigate = useNavigate();
  const storage = useAppState();
  const existing = storage.contents.frontmatter ?? defaultFrontmatter;

  const { control, handleSubmit } = useForm<FrontmatterData>({
    defaultValues: existing,
  });

  const onSubmit = (data: FrontmatterData) => {
    storage.patchContents({ frontmatter: data });
    navigate("/step5");
  };

  return (
    <Card className="pb-4 max-w-3xl w-full space-y-6">
      <CardTitle>Viewer-Konfiguration</CardTitle>
      <p>
        Legen Sie optionale Eigenschaften für den Viewer fest. Alle Felder sind optional –
        leere Felder werden als leere Strings in die RDF-Datei übernommen.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {FIELDS.map(({ key, label, description, kind }) => (
          <div key={key}>
            <Label htmlFor={key} className="mb-1 block font-medium">
              {label}
            </Label>
            {description && (
              <p className="text-xs text-gray-500 mb-1">{description}</p>
            )}
            <Controller
              control={control}
              name={key}
              render={({ field }) =>
                kind === "text" ? (
                  <TextInput
                    id={key}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                ) : (
                  <CodeEditor
                    language={kind}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )
              }
            />
          </div>
        ))}

        <hr className="text-gray-300" />
        <div className="flex justify-between">
          <Button color="light" onClick={() => navigate(-1)}>
            zurück
          </Button>
          <Button type="submit">weiter</Button>
        </div>
      </form>
    </Card>
  );
};

export default ViewerConfigPage;
