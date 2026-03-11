import { useNavigate } from "react-router";
import { DoctypeNames, type NamesFormdata } from "~/docClass/docClass";
import type { Doctypes } from "~/state";
import { useAppState } from "~/utils/flowStorage";
import type { Route } from "./+types/doctypes";

export const meta = ({ }: Route.MetaArgs) => {
  return [
    { title: "Dokumententypen konfigurieren" },
    { name: "description", content: "Schritt 1: welche Dokumententypen sollen erfasst werden?" },
  ];
}

export const DoctypeNamesPage = () => {
  const navigate = useNavigate()
  const storage = useAppState()
  const doctypes = storage.contents.doctypes ?? {}
  const names = Object.keys(doctypes).map((n) => ({ name: n }))

  const onSubmit = (data: NamesFormdata) => {
    const newDoctypes: Doctypes = Object.fromEntries(
      data.docTypeNames.map(({name}) => [name, doctypes[name] ?? []])
    )
    storage.patchContents({ doctypes: newDoctypes });
    navigate(`/doctypeFields/${data.docTypeNames[0].name}`)
  };
  return <DoctypeNames onSubmit={onSubmit} onBack={() => { navigate("/") }} names={names} />;
}
export default DoctypeNamesPage;
