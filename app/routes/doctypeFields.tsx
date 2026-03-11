import { useEffect } from "react";
import { useNavigate } from "react-router";
import { DoctypeFields, type FieldsFormdata } from "~/docClass/editFields";
import { useAppState } from "~/utils/flowStorage";
import type { Route } from "./+types/doctypeFields";

export const meta = ({ }: Route.MetaArgs) => {
  return [
    { title: "Bearbeite Dokumententyp" },
    { name: "description", content: "Schritt 2: Dokumenteigenschaften festlegen" },
  ];
}

export const DoctypeFieldsPage = ({ params }: Route.ComponentProps) => {
  const navigate = useNavigate()
  const storage = useAppState()
  const doctypes = storage.contents.doctypes ?? {}
  const names = Object.keys(doctypes)
  const nextName = names[(names.indexOf(params.name) ?? 0) + 1]

  const doctypeFields = doctypes[params.name]


  useEffect(() => {
    if (doctypes[params.name] === undefined || Object.keys(doctypes).length === 0) {
      console.warn(`No doctype with name ${params.name}`)
      navigate("/doctypes")
    }
  }, [navigate])

  const next = nextName === undefined ? "/upload" : `/doctypeFields/${nextName}`
  const onSubmit = (fieldsData: FieldsFormdata) => {
    const existing = storage.contents
    const newDoctypes = { ...existing.doctypes }
    newDoctypes[params.name] = fieldsData.fields;
    storage.patchContents({ doctypes: newDoctypes })
    navigate(next)
  }

  return <DoctypeFields
    onSubmit={onSubmit}
    onBack={() => navigate("/doctypes")}
    doctypeName={params.name}
    initialFields={doctypeFields}
    isFinal={nextName === undefined} />;
}
export default DoctypeFieldsPage;
