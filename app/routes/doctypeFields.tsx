import { useEffect } from "react";
import { useNavigate } from "react-router";
import { DoctypeFields } from "~/docClass/editFields";
import { getFlow, patchFlow } from "~/utils/flowStorage";
import type { Route } from "./+types/doctypeFields";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Bearbeite Dokumententyp" },
    { name: "description", content: "Schritt 2: Dokumenteigenschaften festlegen" },
  ];
}

export default function DoctypeFieldsPage({ params }: Route.ComponentProps) {
  const navigate = useNavigate()
  const doctypeNames = getFlow().doctypeNames ?? [{ name: "Dokumente" }]
  const index = parseInt(params.index)
  const doctypeFields = getFlow().doctypeFields?.[index] ?? []


  useEffect(() => {
    if (doctypeNames.length === 0) {
      navigate("/doctypes")
    } else if (isNaN(index) || index >= doctypeNames.length) {
      console.log("index is", index)
      navigate("/doctypeFields/0")
    }
  }, [navigate])
  const isFinalDoctype = index >= doctypeNames.length - 1
  const next = isFinalDoctype ? "/step3" : `/doctypeFields/${index + 1}`

  return <DoctypeFields
    onSubmit={(fieldsData) => { const existing = getFlow(); patchFlow({ doctypeFields: { ...(existing.doctypeFields ?? {}), [index]: fieldsData.fields } }); navigate(next) }}
    onBack={() => navigate("/doctypes")}
    doctypeName={doctypeNames[index].name}
    initialFields={doctypeFields}
    isFinal={isFinalDoctype} />;
}
