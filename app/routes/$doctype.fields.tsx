import { useNavigate } from "react-router";
import { DoctypeFields, type FieldsFormdata } from "~/docClass/editFields";
import { useAppState, getDoctypeBySlug, updateDoctype } from "~/utils/flowStorage";
import type { Route } from "./+types/$doctype.fields";

export const meta = ({}: Route.MetaArgs) => {
  return [
    { title: "Felder konfigurieren" },
    { name: "description", content: "Felder und Eigenschaften des Dokumententyps festlegen" },
  ];
};

export const DoctypeFieldsPage = ({ params }: Route.ComponentProps) => {
  const navigate = useNavigate();
  const storage = useAppState();
  const doctypes = storage.contents.doctypes ?? [];
  const doctype = getDoctypeBySlug(doctypes, params.doctype);

  if (!doctype) {
    return null;
  }

  const onSubmit = (fieldsData: FieldsFormdata) => {
    const updatedDoctypes = updateDoctype(doctypes, params.doctype, {
      fields: fieldsData.fields,
      mainDocumentType: fieldsData.mainDocumentType,
    });
    storage.patchContents({ doctypes: updatedDoctypes });
    navigate(`/${params.doctype}/data`);
  };

  return (
    <DoctypeFields
      onSubmit={onSubmit}
      onBack={() => navigate(`/${params.doctype}/import`)}
      doctypeName={doctype.name}
      initialFields={doctype.fields}
      initialMainDocumentType={doctype.mainDocumentType}
      allowHtml={doctype.mainDocumentType === "html"}
      isFinal={true}
    />
  );
};

export default DoctypeFieldsPage;
