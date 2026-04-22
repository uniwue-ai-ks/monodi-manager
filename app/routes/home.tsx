import { Link } from "react-router";
import { Card, CardTitle } from "~/components/card";
import { buttonStyle } from "~/components/forms";
import type { Route } from "./+types/home";

export const meta = ({ }: Route.MetaArgs) => {
  return [
    { title: "Monodi RDF Generator" },
    { name: "description", content: "Konfigurieren Sie Ihren Monodi-Viewer." },
  ];
}

export const Home = () => {
  return <Card>
    <CardTitle>Monodi-Konfigurator</CardTitle>
    <p>
      Mit Monodi können Sie Ihre Dokumente durchsuchen und tabellarisch anzeigen. Hierzu muss zuerst definiert werden, welche Attribute die Dokumente haben.
    </p>
    <p className="font-medium mt-4">Wie möchten Sie vorgehen?</p>
    <div className="flex flex-col gap-3 mt-2 sm:flex-row">
      <Link
        className={`bg-blue-500 hover:bg-blue-700 text-white flex-1 text-center ${buttonStyle}`}
        to="/doctypes"
        viewTransition={true}>
        <span className="block font-semibold">Manuell konfigurieren</span>
        <span className="block text-xs font-normal mt-0.5 opacity-90">Dokumententypen und Felder selbst definieren</span>
      </Link>
      <Link
        className={`bg-green-500 hover:bg-green-700 text-white flex-1 text-center ${buttonStyle}`}
        to="/csvUpload"
        viewTransition={true}>
        <span className="block font-semibold">CSV hochladen</span>
        <span className="block text-xs font-normal mt-0.5 opacity-90">Felder automatisch aus einer CSV-Datei ableiten</span>
      </Link>
    </div>
  </Card>;
}
export default Home;
