import { useEffect } from "react";
import { useNavigate } from "react-router";
import { DoctypeFields, type FieldsFormdata } from "~/docClass/editFields";
import { useAppState } from "~/utils/flowStorage";
import type { Route } from "./+types/doctypeFields";

export const meta = ({ }: Route.MetaArgs) => {
  return [
    { title: "Bearbeite Dokumententyp" },
    { name: "description", content: "Schritt 3: Dokumenteigenschaften festlegen" },
  ];
}

export const DoctypeFieldsPage = ({ params }: Route.ComponentProps) => {
  const navigate = useNavigate()
  const storage = useAppState()
  const doctypes = storage.contents.doctypes ?? {}
  const names = Object.keys(doctypes)
  const nextName = names[(names.indexOf(params.name) ?? 0) + 1]
  const isCsvWorkflow = storage.contents.workflow === "csv"

  const doctypeFields = doctypes[params.name]

  // Detect whether HTML was uploaded for this doctype
  const mainDocumentType = (storage.contents.mainDocumentTypes ?? {})[params.name]
  const allowHtml = mainDocumentType === "html"

  useEffect(() => {
    if (doctypes[params.name] === undefined || Object.keys(doctypes).length === 0) {
      console.warn(`No doctype with name ${params.name}`)
      navigate("/doctypes")
    }
  }, [navigate])

  const next = nextName === undefined
    ? "/enterData"
    : `/doctypeFields/${nextName}`

  const onSubmit = (fieldsData: FieldsFormdata) => {
    const existing = storage.contents
    const newDoctypes = { ...existing.doctypes }
    newDoctypes[params.name] = fieldsData.fields;
    const newMainDocTypes = {
      ...(existing.mainDocumentTypes ?? {}),
      [params.name]: fieldsData.mainDocumentType,
    };
    storage.patchContents({ doctypes: newDoctypes, mainDocumentTypes: newMainDocTypes })
    if (nextName === undefined && isCsvWorkflow) {
      navigate("/enterData", { state: { uploadSkipped: true } })
    } else {
      navigate(next)
    }
  }

  return <DoctypeFields
    onSubmit={onSubmit}
    onBack={() => navigate(isCsvWorkflow ? "/csvUpload" : "/upload")}
    doctypeName={params.name}
    initialFields={doctypeFields}
    initialMainDocumentType={mainDocumentType}
    allowHtml={allowHtml}
    isFinal={nextName === undefined} />;
}
export default DoctypeFieldsPage;
