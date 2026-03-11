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
    <Link
      className={`bg-green-400 hover:bg-green-600 text-white col-start-3 ${buttonStyle}`}
      to="/doctypes"
      viewTransition={true}>
      Starten
    </Link>
  </Card>;
}
export default Home;
