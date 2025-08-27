import { FormProvider, useForm } from "react-hook-form"
import { MultiField, Submit } from "../components/forms";

export type Inputs = {
  docTypeName: string[]
}

export const DocClass = () => {
  const methods = useForm<Inputs>();
  const onSubmit = (data: Inputs) => { console.log(data); };

  return <FormProvider {...methods}>
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Definiere Dokumententypen</h2>
        <p>
          Dokumententypen sind die Grundlage für die Strukturierung von Inhalten in
          Monodi. Sie definieren, welche Informationen zu einem Dokument hinterlegt werden sollen und wie sie angezeigt werden sollen.
        </p>
        <p>
          Wähle zuerst aus, welche Dokumententypen es geben soll.
        </p>
        <MultiField label="Name des Dokumententyps" name="docTypeName" addText="weiteren Typ hinzufügen" />
        <br />
        <Submit>Weiter</Submit>
      </div>
    </form>
  </FormProvider>
}
