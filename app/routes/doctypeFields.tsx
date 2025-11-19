import { useNavigate } from "react-router";
import useLocalStorageState from "use-local-storage-state";
import { DoctypeFields, type DoctypeField } from "~/docClass/editFields";
import type { Route } from "./+types/doctypeFields";
import { useEffect } from "react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Bearbeite Dokumententyp" },
    { name: "description", content: "Schritt 2: Dokumenteigenschaften festlegen" },
  ];
}

export default function DoctypeFieldsPage({ params }: Route.ComponentProps) {
  const navigate = useNavigate()
  const [doctypeNames, _] = useLocalStorageState('doctypeNames', { defaultValue: [{ name: "Dokumente" }] })
  const index = parseInt(params.index)
  const [doctypeFields, setDoctypeFields] = useLocalStorageState<DoctypeField[]>(`doctypeFields${index}`, { defaultValue: [] })


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
    onSubmit={(fieldsData) => { setDoctypeFields(fieldsData.fields); navigate(next) }}
    onBack={() => navigate("/doctypes")}
    doctypeName={doctypeNames[index].name}
    initialFields={doctypeFields}
    isFinal={isFinalDoctype} />;
}
