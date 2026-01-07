import { useNavigate } from "react-router";
import { getFlow, patchFlow } from "~/utils/flowStorage";
import { DoctypeNames, type NamesFormdata } from "~/docClass/docClass";
import type { Route } from "./+types/doctypes";
import type { Doctypes } from "~/state";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Dokumententypen konfigurieren" },
    { name: "description", content: "Schritt 1: welche Dokumententypen sollen erfasst werden?" },
  ];
}

export default function DoctypeNamesPage() {
  const navigate = useNavigate()
  const names = getFlow().doctypeNames ?? [{ name: "Dokumente" }]
  const doctypes = getFlow().doctypes ?? {"Dokumente":[]}

  const onSubmit = (data: NamesFormdata) => {
    const result: Doctypes = {}
    for(const { name } of data.docTypeNames) {
      result[name] = doctypes[name] ?? [];
    }
    patchFlow({ doctypeNames: data.docTypeNames });
    navigate("/doctypeFields/0")
  };
  return <DoctypeNames onSubmit={onSubmit} onBack={() => {navigate("/")}} names={names} />;
}
