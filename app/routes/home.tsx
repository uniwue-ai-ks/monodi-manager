import { DoctypeNames } from "~/docClass/docClass";
import type { Route } from "./+types/home";
import { Card, CardTitle } from "~/components/card";
import { Link } from "react-router";
import { buttonStyle } from "~/components/forms";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Monodi RDF Generator" },
    { name: "description", content: "Konfigurieren Sie Ihren Monodi-Viewer." },
  ];
}

export default function Home() {
  return <Card>
    <CardTitle>Monodi-Konfigurator</CardTitle>
    <p>
      Mit Monodi können Sie Ihre Dokumente durchsuchen und tabellarisch anzeigen. Hierzu muss zuerst definiert werden, welche Attribute die Dokumente haben.
    </p>
    <Link
      className={`bg-green-400 hover:bg-green-600 text-white col-start-3 ${buttonStyle}`}
      to="/doctypes"
      viewTransition={true}>
      Starten
    </Link>
  </Card>;
}
