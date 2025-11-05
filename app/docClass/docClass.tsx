import { FormProvider, useForm } from "react-hook-form";
import { CardTitle } from "~/components/card";
import { FormCard, Input, MultiSubForm } from "../components/forms";

export type NamesFormdata = {
  docTypeNames: { name: string }[];
}

export type DoctypeNamesProps = {
  onSubmit: (data: NamesFormdata) => void;
  onBack?: () => void;
  initialNames: { name: string }[];
}

export const DoctypeNames = ({ onSubmit, onBack, initialNames }: DoctypeNamesProps) => {
  const methods = useForm<NamesFormdata>({ defaultValues: { docTypeNames: initialNames } });

  return <FormProvider {...methods}>
    <FormCard methods={methods}
      next="nächster Schritt"
      onSubmit={onSubmit}
      onBack={onBack}
    >
      <CardTitle>Definiere Dokumententypen</CardTitle>
      <p>
        Dokumententypen sind die Grundlage für die Strukturierung von Inhalten in
        Monodi. Sie definieren, welche Informationen zu einem Dokument hinterlegt werden sollen und wie sie angezeigt werden sollen.
      </p>
      <p>
        Falls alle Dokumente gemeinsam durchsuchbar sein sollen, reicht ein einzelner Dokumententyp. Mehrere Typen sind
        dann nötig, wenn verschiedene Arten von Dokumenten nach verschiedenen Kriterien durchsuchbar sein sollen.
        Ein Beispiel wäre ein Typ für Textdokumente und einer für Tabellen, wo letztere eine Suche nach Spalten anbieten könnten.
      </p>
      <p>
        Wählen Sie zuerst aus, welche Dokumententypen es geben soll.
      </p>
      <MultiSubForm form={methods} name="docTypeNames" addText="weiteren Typ hinzufügen" empty={{ name: "" }}>{
        (register, _, index) =>
          <Input type="text" {...register(`docTypeNames.${index}.name`)} label={`Dokumententyp ${index + 1}`} />
      }</MultiSubForm>
    </FormCard>
  </FormProvider>
}
