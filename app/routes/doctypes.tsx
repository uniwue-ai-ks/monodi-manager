import { useNavigate } from "react-router";
import useLocalStorageState from "use-local-storage-state";
import { DoctypeNames, type NamesFormdata } from "~/docClass/docClass";
import type { Route } from "./+types/doctypes";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Dokumententypen konfigurieren" },
    { name: "description", content: "Schritt 1: welche Dokumententypen sollen erfasst werden?" },
  ];
}

export default function DoctypeNamesPage() {
  const navigate = useNavigate()
  const [doctypeNames, setDoctypeNames] = useLocalStorageState('doctypeNames', { defaultValue: [{ name: "Dokumente" }] })

  const onSubmit = (data: NamesFormdata) => {
    setDoctypeNames(data.docTypeNames);
    navigate("/doctypeFields/0")
  };
  return <DoctypeNames onSubmit={onSubmit} onBack={() => {navigate("/")}} names={doctypeNames} />;
}
